import { inventoryApi } from './inventory'
import { productsApi } from './products'
import { traceabilityApi } from './traceability'

export const analyticsApi = {
    getStats: async (from: string, to: string): Promise<{
        totalMovements: number
        totalOutputs: number
        totalEntries: number
        categoryStats: Record<string, { count: number; value: number }>
        topConsumption: { name: string; quantity: number }[]
    }> => {
        const [outputs, deliveries, products] = await Promise.all([
            traceabilityApi.outputs.getByDateRange(from, to),
            inventoryApi.deliveries.getAll(),
            productsApi.getAll()
        ])

        const filteredDeliveries = deliveries.filter(d => d.date >= from && d.date <= to)

        const totalOutputs = outputs.reduce((sum, o) => sum + o.quantity, 0)
        const totalEntries = filteredDeliveries.reduce((sum, d) =>
            sum + d.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)

        const categoryStats = products.reduce((acc, p) => {
            const cat = p.category || 'Autre'
            if (!acc[cat]) acc[cat] = { count: 0, value: 0 }
            acc[cat].count++
            acc[cat].value += p.quantity * p.price
            return acc
        }, {} as Record<string, { count: number; value: number }>)

        const topConsumption = outputs.reduce((acc, o) => {
            const key = o.productName || o.productId
            if (!acc[key]) acc[key] = 0
            acc[key] += o.quantity
            return acc
        }, {} as Record<string, number>)

        const topConsumptionArray = Object.entries(topConsumption)
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10)

        return {
            totalMovements: outputs.length + filteredDeliveries.length,
            totalOutputs,
            totalEntries,
            categoryStats,
            topConsumption: topConsumptionArray
        }
    }
}
