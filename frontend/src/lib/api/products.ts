import { getSupabase } from './core'

export interface Product {
    id: string
    name: string
    category: string
    quantity: number
    unit: string
    minStock: number
    avgConsumption: number
    price: number
    emoji?: string
    requiresTraceabilityPhoto: boolean
}

const getAllProducts = async (): Promise<Product[]> => {
    const { data, error } = await getSupabase()
        .from('products')
        .select('*')
        .order('name')

    if (error) throw error
    return (data || []).map(p => {
        const rec = p as Record<string, unknown>
        return {
            id: p.id,
            name: p.name,
            category: p.category,
            quantity: p.quantity,
            unit: p.unit,
            minStock: p.min_stock,
            avgConsumption: 0,
            price: p.price,
            emoji: p.emoji,
            requiresTraceabilityPhoto: rec.requires_traceability_photo !== false
        }
    })
}

export const productsApi = {
    getAll: getAllProducts,

    getById: async (id: string): Promise<Product> => {
        const { data, error } = await getSupabase()
            .from('products')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error
        const rec = data as Record<string, unknown>
        return {
            id: data.id,
            name: data.name,
            category: data.category,
            quantity: data.quantity,
            unit: data.unit,
            minStock: data.min_stock,
            avgConsumption: 0,
            price: data.price,
            emoji: data.emoji,
            requiresTraceabilityPhoto: rec.requires_traceability_photo !== false
        }
    },

    create: async (productData: Omit<Product, 'id'>): Promise<Product> => {
        const { data, error } = await getSupabase()
            .from('products')
            .insert([{
                name: productData.name,
                category: productData.category,
                quantity: productData.quantity,
                unit: productData.unit,
                min_stock: productData.minStock,
                price: productData.price,
                emoji: productData.emoji || null,
                requires_traceability_photo: productData.requiresTraceabilityPhoto !== false
            }])
            .select()
            .single()

        if (error) throw error
        const rec = data as Record<string, unknown>
        return {
            id: data.id,
            name: data.name,
            category: data.category,
            quantity: data.quantity,
            unit: data.unit,
            minStock: data.min_stock,
            avgConsumption: 0,
            price: data.price,
            emoji: data.emoji,
            requiresTraceabilityPhoto: rec.requires_traceability_photo !== false
        }
    },

    update: async (id: string, productData: Partial<Product>): Promise<void> => {
        const updateData: Record<string, unknown> = {}
        if (productData.name) updateData.name = productData.name
        if (productData.category) updateData.category = productData.category
        if (productData.quantity !== undefined) updateData.quantity = productData.quantity
        if (productData.unit) updateData.unit = productData.unit
        if (productData.minStock !== undefined) updateData.min_stock = productData.minStock
        if (productData.price !== undefined) updateData.price = productData.price
        if (productData.emoji !== undefined) updateData.emoji = productData.emoji
        if (productData.requiresTraceabilityPhoto !== undefined) updateData.requires_traceability_photo = productData.requiresTraceabilityPhoto

        const { error } = await getSupabase()
            .from('products')
            .update(updateData)
            .eq('id', id)

        if (error) throw error
    },

    delete: async (id: string): Promise<void> => {
        const { error } = await getSupabase()
            .from('products')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    getCritical: async (): Promise<Product[]> => {
        const products = await getAllProducts()
        return products.filter(p => p.quantity <= 0 || (p.minStock > 0 && p.quantity <= p.minStock))
    },

    getLowStock: async (): Promise<Product[]> => {
        const products = await getAllProducts()
        return products.filter(p => {
            if (p.quantity <= 0) return true
            if (p.minStock > 0 && p.quantity <= p.minStock * 1.5) return true
            return false
        })
    },

    getTotalValue: async (): Promise<number> => {
        const products = await getAllProducts()
        return products.reduce((sum, p) => sum + (p.quantity * p.price), 0)
    }
}
