import { db, generateId, nowISO } from './core'

export interface ActivityLog {
    id: string
    userProfileId: string | null
    userName?: string
    userEmoji?: string
    action: string
    entityType: string | null
    entityId: string | null
    details: Record<string, unknown> | null
    createdAt: string
}

export type ActivityAction =
    | 'output_created'
    | 'output_deleted'
    | 'temperature_recorded'
    | 'delivery_created'
    | 'delivery_deleted'
    | 'product_created'
    | 'product_updated'
    | 'product_deleted'
    | 'recipe_created'
    | 'recipe_updated'
    | 'recipe_deleted'
    | 'menu_created'
    | 'menu_deleted'
    | 'staff_created'
    | 'staff_updated'
    | 'staff_deleted'
    | 'schedule_event_created'
    | 'schedule_event_updated'
    | 'schedule_event_deleted'
    | 'recurring_output_configured'
    | 'recurring_output_executed'
    | 'user_login'
    | 'user_logout'

export type EntityType =
    | 'output'
    | 'temperature'
    | 'delivery'
    | 'product'
    | 'recipe'
    | 'menu'
    | 'staff'
    | 'schedule_event'
    | 'recurring_output'
    | 'user'

export const activityLogApi = {
    // Log an activity
    log: async (params: {
        action: ActivityAction
        entityType?: EntityType
        entityId?: string
        details?: Record<string, unknown>
    }): Promise<void> => {
        try {
            const userStr = localStorage.getItem('stockpro_auth_user')
            const user = userStr ? JSON.parse(userStr) : null

            await db.activityLog.add({
                id: generateId(),
                user_profile_id: user?.id || null,
                action: params.action,
                entity_type: params.entityType || null,
                entity_id: params.entityId || null,
                details: params.details || null,
                created_at: nowISO()
            })
        } catch (error) {
            console.error('Failed to log activity:', error)
        }
    },

    // Get logs for a specific date
    getByDate: async (date: string): Promise<ActivityLog[]> => {
        const startOfDay = `${date}T00:00:00.000Z`
        const endOfDay = `${date}T23:59:59.999Z`

        const rows = await db.activityLog
            .where('created_at')
            .between(startOfDay, endOfDay, true, true)
            .reverse()
            .toArray()

        const profileIds = [...new Set(rows.map(r => r.user_profile_id as string).filter(Boolean))]
        const profiles = profileIds.length > 0
            ? await db.userProfiles.where('id').anyOf(profileIds).toArray()
            : []
        const profileMap = new Map<string, { display_name: string; avatar_emoji: string }>(
            profiles.map(p => [p.id as string, { display_name: p.display_name as string, avatar_emoji: p.avatar_emoji as string }])
        )

        return rows.map(log => {
            const profile = log.user_profile_id ? profileMap.get(log.user_profile_id as string) : null
            return {
                id: log.id as string,
                userProfileId: log.user_profile_id as string | null,
                userName: profile?.display_name || 'Système',
                userEmoji: profile?.avatar_emoji || '🤖',
                action: log.action as string,
                entityType: log.entity_type as string | null,
                entityId: log.entity_id as string | null,
                details: log.details as Record<string, unknown> | null,
                createdAt: (log.created_at as string) || nowISO()
            }
        })
    },

    // Get logs for a date range
    getByDateRange: async (from: string, to: string): Promise<ActivityLog[]> => {
        const startDate = `${from}T00:00:00.000Z`
        const endDate = `${to}T23:59:59.999Z`

        const rows = await db.activityLog
            .where('created_at')
            .between(startDate, endDate, true, true)
            .reverse()
            .toArray()

        const profileIds = [...new Set(rows.map(r => r.user_profile_id as string).filter(Boolean))]
        const profiles = profileIds.length > 0
            ? await db.userProfiles.where('id').anyOf(profileIds).toArray()
            : []
        const profileMap = new Map<string, { display_name: string; avatar_emoji: string }>(
            profiles.map(p => [p.id as string, { display_name: p.display_name as string, avatar_emoji: p.avatar_emoji as string }])
        )

        return rows.map(log => {
            const profile = log.user_profile_id ? profileMap.get(log.user_profile_id as string) : null
            return {
                id: log.id as string,
                userProfileId: log.user_profile_id as string | null,
                userName: profile?.display_name || 'Système',
                userEmoji: profile?.avatar_emoji || '🤖',
                action: log.action as string,
                entityType: log.entity_type as string | null,
                entityId: log.entity_id as string | null,
                details: log.details as Record<string, unknown> | null,
                createdAt: (log.created_at as string) || nowISO()
            }
        })
    }
}

// Action labels in French
export const ACTION_LABELS: Record<ActivityAction, string> = {
    'output_created': 'Sortie de stock',
    'output_deleted': 'Suppression de sortie',
    'temperature_recorded': 'Relevé de température',
    'delivery_created': 'Livraison enregistrée',
    'delivery_deleted': 'Livraison supprimée',
    'product_created': 'Produit créé',
    'product_updated': 'Produit modifié',
    'product_deleted': 'Produit supprimé',
    'recipe_created': 'Recette créée',
    'recipe_updated': 'Recette modifiée',
    'recipe_deleted': 'Recette supprimée',
    'menu_created': 'Menu créé',
    'menu_deleted': 'Menu supprimé',
    'staff_created': 'Collaborateur ajouté',
    'staff_updated': 'Collaborateur modifié',
    'staff_deleted': 'Collaborateur supprimé',
    'schedule_event_created': 'Événement planning créé',
    'schedule_event_updated': 'Événement planning modifié',
    'schedule_event_deleted': 'Événement planning supprimé',
    'recurring_output_configured': 'Configuration sortie récurrente',
    'recurring_output_executed': 'Exécution sortie récurrente',
    'user_login': 'Connexion',
    'user_logout': 'Déconnexion'
}

// Entity type labels in French
export const ENTITY_LABELS: Record<EntityType, string> = {
    'output': 'Sortie',
    'temperature': 'Température',
    'delivery': 'Livraison',
    'product': 'Produit',
    'recipe': 'Recette',
    'menu': 'Menu',
    'staff': 'Collaborateur',
    'schedule_event': 'Planning',
    'recurring_output': 'Sortie récurrente',
    'user': 'Utilisateur'
}
