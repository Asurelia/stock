/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from './core'

export interface TraceabilityPhoto {
    id: string
    output_id: string
    storage_path: string
    url: string
    blob?: File | Blob
    captured_at: string
    notes: string | null
    created_at: string
}

export const OUTPUT_REASONS = [
    'Service midi',
    'Service soir',
    'Petit déjeuner',
    'Petit déjeuner perso',
    'Goûter clinique',
    'Repas perso jour',
    'Perte',
    'Casse',
    'Péremption',
    'Autre'
] as const

export const DAILY_OUTPUT_CATEGORIES = [
    { id: 'petit-dej', label: 'Petit déjeuner', reason: 'Petit déjeuner', icon: '🥐', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
    { id: 'petit-dej-perso', label: 'Petit déj perso', reason: 'Petit déjeuner perso', icon: '🍳', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
    { id: 'gouter', label: 'Goûter clinique', reason: 'Goûter clinique', icon: '🍪', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300' },
    { id: 'repas-perso', label: 'Repas perso jour', reason: 'Repas perso jour', icon: '🍽️', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
] as const

export type DailyOutputCategory = typeof DAILY_OUTPUT_CATEGORIES[number]['id']

export interface RecurringOutputConfig {
    id: string
    category: DailyOutputCategory
    productId: string
    productName?: string
    quantity: number
    isActive: boolean
    createdAt: string
}

export interface DailyRecurringOutput {
    id: string
    date: string
    category: DailyOutputCategory
    productId: string
    productName?: string
    quantity: number
    isExecuted: boolean
    executedAt?: string | null
    outputId?: string | null
}

export interface Output {
    id: string
    productId: string
    productName?: string
    product?: { name: string; category: string; quantity: number; unit: string; price: number }
    quantity: number
    reason: string
    recipeId?: string | null
    recipeName?: string
    date: string
    createdAt: string
}

export const traceabilityApi = {
    outputs: {
        getAll: (): Promise<Output[]> => apiClient.get('/outputs'),
        getByDateRange: (from: string, to: string): Promise<Output[]> => apiClient.get(`/outputs?from=${from}&to=${to}`),
        getToday: (): Promise<Output[]> => apiClient.get('/outputs/today'),
        create: (data: { productId: string; quantity: number; reason: string; outputDate: string }): Promise<Output> => apiClient.post('/outputs', data),
        delete: (id: string): Promise<void> => apiClient.del(`/outputs/${id}`).then(() => {}),
    },
    traceabilityPhotos: {
        upload: async (file: File, outputId: string, notes?: string): Promise<any> => {
            const token = localStorage.getItem('stockpro_auth_token')
            const formData = new FormData()
            formData.append('file', file)
            formData.append('outputId', outputId)
            if (notes) formData.append('notes', notes)
            const res = await fetch('/api/traceability/photos', {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: formData,
            })
            if (!res.ok) throw new Error('Upload failed')
            return res.json()
        },
        getByOutput: (outputId: string): Promise<any[]> => apiClient.get(`/traceability/photos?outputId=${outputId}`),
        getByDateRange: (from: string, to: string): Promise<any[]> => apiClient.get(`/traceability/photos?from=${from}&to=${to}`),
        delete: (id: string): Promise<void> => apiClient.del(`/traceability/photos/${id}`).then(() => {}),
    },
}

export const recurringOutputsApi = {
    configs: {
        getAll: (): Promise<RecurringOutputConfig[]> => apiClient.get('/recurring-outputs/configs'),
        getByCategory: (category: string): Promise<RecurringOutputConfig[]> => apiClient.get(`/recurring-outputs/configs?category=${category}`),
        upsert: (config: Partial<RecurringOutputConfig>): Promise<RecurringOutputConfig> => apiClient.put('/recurring-outputs/configs', config),
        delete: (id: string): Promise<void> => apiClient.del(`/recurring-outputs/configs/${id}`).then(() => {}),
        updateQuantity: (id: string, quantity: number): Promise<void> => apiClient.patch(`/recurring-outputs/configs/${id}`, { quantity }).then(() => {}),
    },
    daily: {
        getForDate: (date: string): Promise<DailyRecurringOutput[]> => apiClient.get(`/recurring-outputs/daily?date=${date}`),
        initializeForDate: (date: string): Promise<DailyRecurringOutput[]> => apiClient.post('/recurring-outputs/daily/initialize', { date }),
        syncForDate: (date: string): Promise<DailyRecurringOutput[]> => apiClient.post('/recurring-outputs/daily/sync', { date }),
        updateQuantity: (id: string, quantity: number): Promise<void> => apiClient.patch(`/recurring-outputs/daily/${id}`, { quantity }).then(() => {}),
        execute: (dailyOutput: DailyRecurringOutput): Promise<void> => apiClient.post(`/recurring-outputs/daily/${dailyOutput.id}/execute`).then(() => {}),
        executeCategory: (date: string, category: string): Promise<number> => apiClient.post<{executed: number}>('/recurring-outputs/daily/execute-category', { date, category }).then(r => r.executed),
        executeAll: (date: string): Promise<number> => apiClient.post<{executed: number}>('/recurring-outputs/daily/execute-all', { date }).then(r => r.executed),
    },
}
