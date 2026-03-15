import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

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
    login: (pinCode: string, userId?: string) => Promise<{ success: boolean; error?: string }>
    logout: () => void
    refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = 'stockpro_auth_user'
const AUTH_TOKEN_KEY = 'stockpro_auth_token'

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const loadUserFromStorage = useCallback(async () => {
        try {
            const token = localStorage.getItem(AUTH_TOKEN_KEY)
            if (token) {
                const res = await fetch('/api/auth/me', {
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (res.ok) {
                    const data = await res.json()
                    setUser(data.user as AuthUser)
                    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user))
                } else {
                    localStorage.removeItem(AUTH_TOKEN_KEY)
                    localStorage.removeItem(AUTH_STORAGE_KEY)
                    setUser(null)
                }
            }
        } catch (error) {
            console.error('Error loading user from storage:', error)
            localStorage.removeItem(AUTH_TOKEN_KEY)
            localStorage.removeItem(AUTH_STORAGE_KEY)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadUserFromStorage()
    }, [loadUserFromStorage])

    const login = async (pinCode: string, userId?: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pinCode, userId }),
            })
            const data = await res.json()
            if (!res.ok) {
                return { success: false, error: data.error || 'Code PIN invalide' }
            }
            localStorage.setItem(AUTH_TOKEN_KEY, data.token)
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user))
            setUser(data.user as AuthUser)
            return { success: true }
        } catch (error) {
            console.error('Login error:', error)
            return { success: false, error: 'Erreur lors de la connexion' }
        }
    }

    const logout = async () => {
        try {
            const token = localStorage.getItem(AUTH_TOKEN_KEY)
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
        } catch {
            // ignore logout errors
        } finally {
            setUser(null)
            localStorage.removeItem(AUTH_TOKEN_KEY)
            localStorage.removeItem(AUTH_STORAGE_KEY)
        }
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

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

// Helper to check if user has access (gerant has all access, cuisinier and plongeur have same access)
// eslint-disable-next-line react-refresh/only-export-components
export function hasAccess(user: AuthUser | null, requiredRole?: UserRole): boolean {
    if (!user) return false
    if (user.role === 'gerant') return true // Gérant has full access
    if (!requiredRole) return true // No specific role required
    // Cuisinier and plongeur have same access level
    if (requiredRole === 'cuisinier' || requiredRole === 'plongeur') {
        return user.role === 'cuisinier' || user.role === 'plongeur'
    }
    return user.role === (requiredRole as UserRole)
}
