import { getSupabase } from './core'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getUntypedSupabase = () => getSupabase() as any

// Available permissions in the app
export const AVAILABLE_PERMISSIONS = [
    // Pages access
    { key: 'page_products', label: 'Produits', category: 'Pages', description: 'Accès à la page des produits' },
    { key: 'page_outputs', label: 'Sorties', category: 'Pages', description: 'Accès à la page des sorties' },
    { key: 'page_deliveries', label: 'Livraisons', category: 'Pages', description: 'Accès à la page des livraisons' },
    { key: 'page_suppliers', label: 'Fournisseurs', category: 'Pages', description: 'Accès à la page des fournisseurs' },
    { key: 'page_temperatures', label: 'Températures', category: 'Pages', description: 'Accès à la page des températures' },
    { key: 'page_recipes', label: 'Recettes', category: 'Pages', description: 'Accès à la page des recettes' },
    { key: 'page_menus', label: 'Menus', category: 'Pages', description: 'Accès à la page des menus' },
    { key: 'page_production', label: 'Production', category: 'Pages', description: 'Accès à la page de production' },
    { key: 'page_traceability', label: 'Traçabilité', category: 'Pages', description: 'Accès à la page de traçabilité' },
    { key: 'page_planning', label: 'Planning', category: 'Pages', description: 'Accès à la page du planning' },
    { key: 'page_analytics', label: 'Analytics', category: 'Pages', description: 'Accès à la page des analytics' },
    
    // Actions
    { key: 'action_create_output', label: 'Créer sortie', category: 'Actions', description: 'Peut créer des sorties de stock' },
    { key: 'action_delete_output', label: 'Supprimer sortie', category: 'Actions', description: 'Peut supprimer des sorties' },
    { key: 'action_record_temperature', label: 'Enregistrer température', category: 'Actions', description: 'Peut enregistrer des relevés de température' },
    { key: 'action_create_delivery', label: 'Créer livraison', category: 'Actions', description: 'Peut créer des livraisons' },
    { key: 'action_manage_products', label: 'Gérer produits', category: 'Actions', description: 'Peut ajouter/modifier/supprimer des produits' },
    { key: 'action_manage_recipes', label: 'Gérer recettes', category: 'Actions', description: 'Peut ajouter/modifier/supprimer des recettes' },
    { key: 'action_manage_menus', label: 'Gérer menus', category: 'Actions', description: 'Peut ajouter/modifier/supprimer des menus' },
    { key: 'action_manage_planning', label: 'Gérer planning', category: 'Actions', description: 'Peut modifier le planning' },
] as const

export type PermissionKey = typeof AVAILABLE_PERMISSIONS[number]['key']

export interface UserPermission {
    id: string
    userProfileId: string
    permissionKey: PermissionKey
    isEnabled: boolean
}

export interface UserWithPermissions {
    id: string
    displayName: string
    role: string
    avatarEmoji: string
    isActive: boolean
    permissions: Record<PermissionKey, boolean>
}

// Get default permissions based on role
export const getDefaultPermissions = (role: string): Record<string, boolean> => {
    const defaults: Record<string, boolean> = {}
    
    AVAILABLE_PERMISSIONS.forEach(p => {
        if (role === 'gerant') {
            // Gérant has all permissions by default
            defaults[p.key] = true
        } else if (role === 'cuisinier') {
            // Cuisinier default permissions
            defaults[p.key] = [
                'page_outputs', 'page_temperatures', 'page_recipes', 'page_menus',
                'page_traceability', 'page_planning',
                'action_create_output', 'action_record_temperature'
            ].includes(p.key)
        } else {
            // Plongeur - minimal permissions
            defaults[p.key] = [
                'page_outputs', 'page_temperatures',
                'action_create_output', 'action_record_temperature'
            ].includes(p.key)
        }
    })
    
    return defaults
}

export const permissionsApi = {
    // Get all users with their permissions
    getAllUsersWithPermissions: async (): Promise<UserWithPermissions[]> => {
        const supabase = getSupabase()
        const untypedSupabase = getUntypedSupabase()
        
        // Get all users
        const { data: users, error: usersError } = await supabase
            .from('user_profiles')
            .select('id, display_name, role, avatar_emoji, is_active')
            .order('display_name')
        
        if (usersError) throw usersError
        
        // Get all permissions (using untyped client for non-generated table)
        const { data: permissions, error: permError } = await untypedSupabase
            .from('user_permissions')
            .select('*')
        
        if (permError && permError.code !== 'PGRST116') {
            // Table might not exist yet, return users with default permissions
            console.warn('user_permissions table may not exist:', permError)
        }
        
        // Map users with their permissions
        return (users || []).map(user => {
            const userPerms = (permissions || []).filter((p: { user_profile_id: string }) => p.user_profile_id === user.id)
            const defaultPerms = getDefaultPermissions(user.role)
            
            // Merge default permissions with stored permissions
            const mergedPerms: Record<string, boolean> = { ...defaultPerms }
            userPerms.forEach((p: { permission_key: string; is_enabled: boolean }) => {
                mergedPerms[p.permission_key] = p.is_enabled
            })
            
            return {
                id: user.id,
                displayName: user.display_name,
                role: user.role,
                avatarEmoji: user.avatar_emoji || '👤',
                isActive: user.is_active ?? true,
                permissions: mergedPerms as Record<PermissionKey, boolean>
            }
        })
    },
    
    // Get permissions for a specific user
    getUserPermissions: async (userId: string): Promise<Record<PermissionKey, boolean>> => {
        const supabase = getSupabase()
        const untypedSupabase = getUntypedSupabase()
        
        // Get user role for defaults
        const { data: user, error: userError } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', userId)
            .single()
        
        if (userError) throw userError
        
        const defaultPerms = getDefaultPermissions(user.role)
        
        // Get stored permissions
        const { data: permissions, error: permError } = await untypedSupabase
            .from('user_permissions')
            .select('permission_key, is_enabled')
            .eq('user_profile_id', userId)
        
        if (permError && permError.code !== 'PGRST116') {
            console.warn('Error fetching permissions:', permError)
        }
        
        // Merge
        const mergedPerms: Record<string, boolean> = { ...defaultPerms }
        ;(permissions || []).forEach((p: { permission_key: string; is_enabled: boolean }) => {
            mergedPerms[p.permission_key] = p.is_enabled
        })
        
        return mergedPerms as Record<PermissionKey, boolean>
    },
    
    // Update a single permission
    updatePermission: async (userId: string, permissionKey: string, isEnabled: boolean): Promise<void> => {
        const untypedSupabase = getUntypedSupabase()
        
        // Upsert the permission
        const { error } = await untypedSupabase
            .from('user_permissions')
            .upsert({
                user_profile_id: userId,
                permission_key: permissionKey,
                is_enabled: isEnabled
            }, {
                onConflict: 'user_profile_id,permission_key'
            })
        
        if (error) throw error
    },
    
    // Update multiple permissions at once
    updatePermissions: async (userId: string, permissions: Record<string, boolean>): Promise<void> => {
        const untypedSupabase = getUntypedSupabase()
        
        const updates = Object.entries(permissions).map(([key, enabled]) => ({
            user_profile_id: userId,
            permission_key: key,
            is_enabled: enabled
        }))
        
        const { error } = await untypedSupabase
            .from('user_permissions')
            .upsert(updates, {
                onConflict: 'user_profile_id,permission_key'
            })
        
        if (error) throw error
    },
    
    // Update user active status
    updateUserStatus: async (userId: string, isActive: boolean): Promise<void> => {
        const supabase = getSupabase()
        
        const { error } = await supabase
            .from('user_profiles')
            .update({ is_active: isActive })
            .eq('id', userId)
        
        if (error) throw error
    }
}
