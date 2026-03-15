import { apiClient } from './core'

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
    log: async (params: { action: ActivityAction; entityType?: EntityType; entityId?: string; details?: Record<string, any> }): Promise<void> => {
        try {
            await apiClient.post('/activity-log', params)
        } catch {
            // fire and forget, like the original
        }
    },
    getByDate: (date: string): Promise<any[]> => apiClient.get(`/activity-log?date=${date}`),
    getByDateRange: (from: string, to: string): Promise<any[]> => apiClient.get(`/activity-log?from=${from}&to=${to}`),
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
