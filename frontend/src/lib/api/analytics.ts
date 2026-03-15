import { apiClient } from './core'

export const analyticsApi = {
    getStats: (from: string, to: string): Promise<{
        totalMovements: number
        totalOutputs: number
        totalEntries: number
        categoryStats: Array<{ category: string; count: number; totalValue: number }>
        topConsumption: Array<{ productId: string; productName: string; totalQuantity: number }>
    }> => apiClient.get(`/analytics/stats?from=${from}&to=${to}`),
}
