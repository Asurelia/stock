import { db, generateId } from './core'

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
        const [users, permissions] = await Promise.all([
            db.userProfiles.orderBy('display_name').toArray(),
            db.userPermissions.toArray()
        ])

        return users.map(user => {
            const userPerms = permissions.filter(p => p.user_profile_id === user.id)
            const defaultPerms = getDefaultPermissions(user.role as string)

            const mergedPerms: Record<string, boolean> = { ...defaultPerms }
            userPerms.forEach(p => {
                mergedPerms[p.permission_key as string] = p.is_enabled as boolean
            })

            return {
                id: user.id as string,
                displayName: user.display_name as string,
                role: user.role as string,
                avatarEmoji: (user.avatar_emoji as string) || '👤',
                isActive: (user.is_active as boolean) ?? true,
                permissions: mergedPerms as Record<PermissionKey, boolean>
            }
        })
    },

    // Get permissions for a specific user
    getUserPermissions: async (userId: string): Promise<Record<PermissionKey, boolean>> => {
        const [user, permissions] = await Promise.all([
            db.userProfiles.get(userId),
            db.userPermissions.where('user_profile_id').equals(userId).toArray()
        ])

        if (!user) throw new Error(`UserProfile not found: ${userId}`)

        const defaultPerms = getDefaultPermissions(user.role as string)

        const mergedPerms: Record<string, boolean> = { ...defaultPerms }
        permissions.forEach(p => {
            mergedPerms[p.permission_key as string] = p.is_enabled as boolean
        })

        return mergedPerms as Record<PermissionKey, boolean>
    },

    // Update a single permission
    updatePermission: async (userId: string, permissionKey: string, isEnabled: boolean): Promise<void> => {
        const existing = await db.userPermissions
            .where({ user_profile_id: userId, permission_key: permissionKey })
            .first()

        if (existing) {
            await db.userPermissions.update(existing.id as string, { is_enabled: isEnabled })
        } else {
            await db.userPermissions.add({
                id: generateId(),
                user_profile_id: userId,
                permission_key: permissionKey,
                is_enabled: isEnabled
            })
        }
    },

    // Update multiple permissions at once
    updatePermissions: async (userId: string, permissions: Record<string, boolean>): Promise<void> => {
        const existing = await db.userPermissions
            .where('user_profile_id')
            .equals(userId)
            .toArray()

        const existingMap = new Map<string, string>(
            existing.map(p => [p.permission_key as string, p.id as string])
        )

        for (const [key, enabled] of Object.entries(permissions)) {
            const existingId = existingMap.get(key)
            if (existingId) {
                await db.userPermissions.update(existingId, { is_enabled: enabled })
            } else {
                await db.userPermissions.add({
                    id: generateId(),
                    user_profile_id: userId,
                    permission_key: key,
                    is_enabled: enabled
                })
            }
        }
    },

    // Update user active status
    updateUserStatus: async (userId: string, isActive: boolean): Promise<void> => {
        await db.userProfiles.update(userId, { is_active: isActive })
    }
}
