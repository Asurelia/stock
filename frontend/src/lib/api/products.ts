import { db, generateId } from './core'

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(p: any): Product {
    return {
        id: p.id,
        name: p.name,
        category: p.category,
        quantity: p.quantity ?? 0,
        unit: p.unit ?? '',
        minStock: p.min_stock ?? 0,
        avgConsumption: 0,
        price: p.price ?? 0,
        emoji: p.emoji,
        requiresTraceabilityPhoto: p.requires_traceability_photo !== false
    }
}

const getAllProducts = async (): Promise<Product[]> => {
    const rows = await db.products.orderBy('name').toArray()
    return rows.map(mapRow)
}

export const productsApi = {
    getAll: getAllProducts,

    getById: async (id: string): Promise<Product> => {
        const row = await db.products.get(id)
        if (!row) throw new Error(`Product not found: ${id}`)
        return mapRow(row)
    },

    create: async (productData: Omit<Product, 'id'>): Promise<Product> => {
        const id = generateId()
        const record = {
            id,
            name: productData.name,
            category: productData.category,
            quantity: productData.quantity,
            unit: productData.unit,
            min_stock: productData.minStock,
            price: productData.price,
            emoji: productData.emoji ?? null,
            requires_traceability_photo: productData.requiresTraceabilityPhoto !== false
        }
        await db.products.add(record)
        return mapRow(record)
    },

    update: async (id: string, productData: Partial<Product>): Promise<void> => {
        const updateData: Record<string, unknown> = {}
        if (productData.name !== undefined) updateData.name = productData.name
        if (productData.category !== undefined) updateData.category = productData.category
        if (productData.quantity !== undefined) updateData.quantity = productData.quantity
        if (productData.unit !== undefined) updateData.unit = productData.unit
        if (productData.minStock !== undefined) updateData.min_stock = productData.minStock
        if (productData.price !== undefined) updateData.price = productData.price
        if (productData.emoji !== undefined) updateData.emoji = productData.emoji
        if (productData.requiresTraceabilityPhoto !== undefined) updateData.requires_traceability_photo = productData.requiresTraceabilityPhoto
        await db.products.update(id, updateData)
    },

    delete: async (id: string): Promise<void> => {
        await db.transaction('rw', [db.products, db.outputs, db.deliveries, db.recipeIngredients, db.recurringOutputConfigs, db.dailyRecurringOutputs], async () => {
            await db.outputs.where('product_id').equals(id).delete()
            await db.deliveries.where('product_id').equals(id).delete()
            await db.recipeIngredients.where('product_id').equals(id).delete()
            await db.recurringOutputConfigs.where('product_id').equals(id).delete()
            await db.dailyRecurringOutputs.where('product_id').equals(id).delete()
            await db.products.delete(id)
        })
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
