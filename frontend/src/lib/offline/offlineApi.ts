/**
 * Offline-aware API wrapper
 * Uses IndexedDB when offline, syncs when online
 */

import { api, type Output, type Product } from '@/lib/api'
import {
    isOnline,
    createOutputOffline,
    createTemperatureReadingOffline,
    updateProductOffline,
    getProductsFromCache,
    getProductFromCache,
    getOutputsFromCache,
    getTodayOutputsFromCache,
    getTemperatureReadingsFromCache,
    getTemperatureEquipmentFromCache,
    getRecipesFromCache,
    getMenusFromCache,
    cacheProducts,
    cacheOutputs,
    cacheTemperatureReadings,
    cacheTemperatureEquipment
} from './sync'
import { type CachedProduct, type CachedOutput } from './db'

// ============================================
// Helper to convert cached data to API format
// ============================================

function cachedProductToProduct(p: CachedProduct): Product {
    return {
        id: p.id,
        name: p.name,
        category: p.category || '',
        quantity: p.quantity,
        unit: p.unit || '',
        minStock: p.min_stock || 0,
        avgConsumption: 0,
        price: p.price,
        emoji: p.emoji || undefined,
        requiresTraceabilityPhoto: p.requires_traceability_photo !== false
    }
}

function cachedOutputToOutput(o: CachedOutput): Output {
    return {
        id: o.id,
        productId: o.product_id,
        productName: o.productName,
        quantity: o.quantity,
        reason: o.reason || 'Service midi',
        date: o.output_date || new Date().toISOString(),
        createdAt: o.created_at || new Date().toISOString()
    }
}

// ============================================
// Offline-aware Products API
// ============================================

export const offlineProductsApi = {
    /**
     * Get all products (from cache if offline, from server if online)
     */
    getAll: async (): Promise<Product[]> => {
        if (isOnline()) {
            // Online: fetch from server and update cache
            try {
                const products = await api.products.getAll()
                // Update cache in background
                cacheProducts().catch(console.error)
                return products
            } catch (error) {
                // If server fails, fallback to cache
                console.warn('Failed to fetch products from server, using cache:', error)
                const cached = await getProductsFromCache()
                return cached.map(cachedProductToProduct)
            }
        } else {
            // Offline: use cache
            const cached = await getProductsFromCache()
            return cached.map(cachedProductToProduct)
        }
    },

    /**
     * Get product by ID
     */
    getById: async (id: string): Promise<Product | null> => {
        if (isOnline()) {
            try {
                return await api.products.getById(id)
            } catch {
                const cached = await getProductFromCache(id)
                return cached ? cachedProductToProduct(cached) : null
            }
        } else {
            const cached = await getProductFromCache(id)
            return cached ? cachedProductToProduct(cached) : null
        }
    },

    /**
     * Update product (queues for sync if offline)
     */
    update: async (id: string, updates: Partial<Product>): Promise<void> => {
        if (isOnline()) {
            await api.products.update(id, updates)
            // Update cache
            cacheProducts().catch(console.error)
        } else {
            // Queue for sync
            await updateProductOffline(id, {
                quantity: updates.quantity,
                name: updates.name,
                category: updates.category,
                unit: updates.unit,
                min_stock: updates.minStock,
                price: updates.price,
                emoji: updates.emoji
            })
        }
    }
}

// ============================================
// Offline-aware Outputs API
// ============================================

export const offlineOutputsApi = {
    /**
     * Get today's outputs
     */
    getToday: async (): Promise<Output[]> => {
        if (isOnline()) {
            try {
                const outputs = await api.outputs.getToday()
                cacheOutputs().catch(console.error)
                return outputs
            } catch (error) {
                console.warn('Failed to fetch outputs from server, using cache:', error)
                const cached = await getTodayOutputsFromCache()
                return cached.map(cachedOutputToOutput)
            }
        } else {
            const cached = await getTodayOutputsFromCache()
            return cached.map(cachedOutputToOutput)
        }
    },

    /**
     * Get outputs by date range
     */
    getByDateRange: async (from: string, to: string): Promise<Output[]> => {
        if (isOnline()) {
            try {
                const outputs = await api.outputs.getByDateRange(from, to)
                cacheOutputs().catch(console.error)
                return outputs
            } catch (error) {
                console.warn('Failed to fetch outputs from server, using cache:', error)
                const cached = await getOutputsFromCache(from, to)
                return cached.map(cachedOutputToOutput)
            }
        } else {
            const cached = await getOutputsFromCache(from, to)
            return cached.map(cachedOutputToOutput)
        }
    },

    /**
     * Get all outputs
     */
    getAll: async (): Promise<Output[]> => {
        if (isOnline()) {
            try {
                const outputs = await api.outputs.getAll()
                cacheOutputs().catch(console.error)
                return outputs
            } catch (error) {
                console.warn('Failed to fetch outputs from server, using cache:', error)
                const cached = await getOutputsFromCache()
                return cached.map(cachedOutputToOutput)
            }
        } else {
            const cached = await getOutputsFromCache()
            return cached.map(cachedOutputToOutput)
        }
    },

    /**
     * Create output (queues for sync if offline)
     */
    create: async (data: {
        productId: string
        quantity: number
        reason: string
        date?: string
    }): Promise<Output> => {
        if (isOnline()) {
            const output = await api.outputs.create(data)
            // Update caches
            cacheOutputs().catch(console.error)
            cacheProducts().catch(console.error)
            return output
        } else {
            // Create offline
            const cached = await createOutputOffline(data)
            return cachedOutputToOutput(cached)
        }
    },

    /**
     * Delete output (only works online for now)
     */
    delete: async (id: string): Promise<void> => {
        if (!isOnline()) {
            throw new Error('Suppression impossible en mode hors ligne')
        }
        await api.outputs.delete(id)
        cacheOutputs().catch(console.error)
        cacheProducts().catch(console.error)
    }
}

// ============================================
// Offline-aware Temperature API
// ============================================

export const offlineTemperatureApi = {
    equipment: {
        getAll: async () => {
            if (isOnline()) {
                try {
                    const equipment = await api.temperatureEquipment.getAll()
                    cacheTemperatureEquipment().catch(console.error)
                    return equipment
                } catch (error) {
                    console.warn('Failed to fetch equipment from server, using cache:', error)
                    return await getTemperatureEquipmentFromCache()
                }
            } else {
                return await getTemperatureEquipmentFromCache()
            }
        }
    },

    readings: {
        getByEquipment: async (equipmentId: string) => {
            if (isOnline()) {
                try {
                    const readings = await api.temperatureReadings.getByEquipment(equipmentId)
                    cacheTemperatureReadings().catch(console.error)
                    return readings
                } catch (error) {
                    console.warn('Failed to fetch readings from server, using cache:', error)
                    return await getTemperatureReadingsFromCache(equipmentId)
                }
            } else {
                return await getTemperatureReadingsFromCache(equipmentId)
            }
        },

        create: async (data: {
            equipmentId: string
            temperature: number
            isCompliant?: boolean
            recordedBy?: string
            notes?: string
        }) => {
            if (isOnline()) {
                const reading = await api.temperatureReadings.create({
                    equipment_id: data.equipmentId,
                    temperature: data.temperature,
                    is_compliant: data.isCompliant,
                    recorded_by: data.recordedBy,
                    notes: data.notes
                })
                cacheTemperatureReadings().catch(console.error)
                return reading
            } else {
                return await createTemperatureReadingOffline(data)
            }
        }
    }
}

// ============================================
// Offline-aware Read-only APIs
// ============================================

export const offlineRecipesApi = {
    getAll: async () => {
        if (isOnline()) {
            try {
                return await api.recipes.getAll()
            } catch (error) {
                console.warn('Failed to fetch recipes from server, using cache:', error)
                const cached = await getRecipesFromCache()
                return cached.map(r => ({
                    id: r.id,
                    name: r.name,
                    portions: r.servings || 1,
                    photoUrl: null,
                    dietaryTags: [],
                    instructions: r.instructions || '',
                    ingredients: r.ingredients || []
                }))
            }
        } else {
            const cached = await getRecipesFromCache()
            return cached.map(r => ({
                id: r.id,
                name: r.name,
                portions: r.servings || 1,
                photoUrl: null,
                dietaryTags: [],
                instructions: r.instructions || '',
                ingredients: r.ingredients || []
            }))
        }
    }
}

export const offlineMenusApi = {
    getAll: async () => {
        if (isOnline()) {
            try {
                return await api.menus.getAll()
            } catch (error) {
                console.warn('Failed to fetch menus from server, using cache:', error)
                const cached = await getMenusFromCache()
                return cached.map(m => ({
                    id: m.id,
                    name: m.name,
                    menuDate: m.menu_date,
                    mealType: m.meal_type as 'breakfast' | 'lunch' | 'dinner' | 'snack' | null,
                    notes: m.notes,
                    recipes: m.recipes || []
                }))
            }
        } else {
            const cached = await getMenusFromCache()
            return cached.map(m => ({
                id: m.id,
                name: m.name,
                menuDate: m.menu_date,
                mealType: m.meal_type as 'breakfast' | 'lunch' | 'dinner' | 'snack' | null,
                notes: m.notes,
                recipes: m.recipes || []
            }))
        }
    },

    getByDate: async (date: string) => {
        if (isOnline()) {
            try {
                return await api.menus.getByDate(date)
            } catch (error) {
                console.warn('Failed to fetch menus from server, using cache:', error)
                const cached = await getMenusFromCache(date)
                return cached.map(m => ({
                    id: m.id,
                    name: m.name,
                    menuDate: m.menu_date,
                    mealType: m.meal_type as 'breakfast' | 'lunch' | 'dinner' | 'snack' | null,
                    notes: m.notes,
                    recipes: m.recipes || []
                }))
            }
        } else {
            const cached = await getMenusFromCache(date)
            return cached.map(m => ({
                id: m.id,
                name: m.name,
                menuDate: m.menu_date,
                mealType: m.meal_type as 'breakfast' | 'lunch' | 'dinner' | 'snack' | null,
                notes: m.notes,
                recipes: m.recipes || []
            }))
        }
    }
}

// ============================================
// Combined offline API
// ============================================

export const offlineApi = {
    products: offlineProductsApi,
    outputs: offlineOutputsApi,
    temperature: offlineTemperatureApi,
    recipes: offlineRecipesApi,
    menus: offlineMenusApi
}

export default offlineApi
