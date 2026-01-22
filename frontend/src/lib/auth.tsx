import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { supabase } from './supabase'

export type UserRole = 'gerant' | 'cuisinier' | 'plongeur'

export interface AuthUser {
    id: string
    displayName: string
    role: UserRole
    avatarEmoji: string
    staffId?: string | null
    isActive: boolean
}

interface AuthContextType {
    user: AuthUser | null
    isLoading: boolean
    isAuthenticated: boolean
    isGerant: boolean
    login: (pinCode: string) => Promise<{ success: boolean; error?: string }>
    logout: () => void
    refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = 'stockpro_auth_user'

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const loadUserFromStorage = useCallback(async () => {
        try {
            const stored = localStorage.getItem(AUTH_STORAGE_KEY)
            if (stored) {
                const parsedUser = JSON.parse(stored) as AuthUser
                // Verify user still exists and is active in database
                const { data, error } = await supabase!
                    .from('user_profiles')
                    .select('id, display_name, role, avatar_emoji, staff_id, is_active')
                    .eq('id', parsedUser.id)
                    .eq('is_active', true)
                    .single()

                if (data && !error) {
                    const refreshedUser: AuthUser = {
                        id: data.id,
                        displayName: data.display_name,
                        role: data.role as UserRole,
                        avatarEmoji: data.avatar_emoji || '👤',
                        staffId: data.staff_id,
                        isActive: data.is_active ?? true
                    }
                    setUser(refreshedUser)
                    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(refreshedUser))
                } else {
                    // User no longer valid, clear storage
                    localStorage.removeItem(AUTH_STORAGE_KEY)
                    setUser(null)
                }
            }
        } catch (error) {
            console.error('Error loading user from storage:', error)
            localStorage.removeItem(AUTH_STORAGE_KEY)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadUserFromStorage()
    }, [loadUserFromStorage])

    const login = async (pinCode: string): Promise<{ success: boolean; error?: string }> => {
        if (!supabase) {
            return { success: false, error: 'Connexion à la base de données non disponible' }
        }

        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('id, display_name, role, avatar_emoji, staff_id, is_active')
                .eq('pin_code', pinCode)
                .eq('is_active', true)
                .single()

            if (error || !data) {
                return { success: false, error: 'Code PIN invalide' }
            }

            const authUser: AuthUser = {
                id: data.id,
                displayName: data.display_name,
                role: data.role as UserRole,
                avatarEmoji: data.avatar_emoji || '👤',
                staffId: data.staff_id,
                isActive: data.is_active ?? true
            }

            // Update last login
            await supabase
                .from('user_profiles')
                .update({ last_login: new Date().toISOString() })
                .eq('id', data.id)

            setUser(authUser)
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser))

            return { success: true }
        } catch (error) {
            console.error('Login error:', error)
            return { success: false, error: 'Erreur lors de la connexion' }
        }
    }

    const logout = () => {
        setUser(null)
        localStorage.removeItem(AUTH_STORAGE_KEY)
    }

    const refreshUser = async () => {
        if (user) {
            await loadUserFromStorage()
        }
    }

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated: !!user,
        isGerant: user?.role === 'gerant',
        login,
        logout,
        refreshUser
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

// Helper to check if user has access (gerant has all access, cuisinier and plongeur have same access)
export function hasAccess(user: AuthUser | null, requiredRole?: UserRole): boolean {
    if (!user) return false
    if (user.role === 'gerant') return true // Gérant has full access
    if (!requiredRole) return true // No specific role required
    // Cuisinier and plongeur have same access level
    if (requiredRole === 'cuisinier' || requiredRole === 'plongeur') {
        return user.role === 'cuisinier' || user.role === 'plongeur'
    }
    return user.role === requiredRole
}
