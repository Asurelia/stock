/**
 * Synchronization logic for offline mode
 * Handles syncing local changes with Supabase when online
 */

import { supabase } from '../supabase'
import {
    offlineDB,
    type CachedProduct,
    type CachedOutput,
    type CachedTemperatureReading,
    type CachedRecipe,
    type CachedMenu,
    type CachedTemperatureEquipment,
    type PendingMutation,
    getPendingMutations,
    removeMutation,
    updateMutationRetry,
    updateSyncMeta,
    nowISO,
    isLocalId
} from './db'

// ============================================
// Types
// ============================================

export interface SyncResult {
    success: boolean
    syncedMutations: number
    failedMutations: number
    errors: string[]
}

export interface CacheResult {
    success: boolean
    table: string
    count: number
    error?: string
}

// ============================================
// Online status detection
// ============================================

let _isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
const _onlineListeners: Set<(online: boolean) => void> = new Set()

/**
 * Check if the app is currently online
 */
export function isOnline(): boolean {
    return _isOnline
}

/**
 * Subscribe to online status changes
 */
export function subscribeToOnlineStatus(callback: (online: boolean) => void): () => void {
    _onlineListeners.add(callback)
    return () => _onlineListeners.delete(callback)
}

/**
 * Initialize online status listeners
 */
export function initOnlineStatusListeners(): void {
    if (typeof window === 'undefined') return

    const updateStatus = (online: boolean) => {
        _isOnline = online
        _onlineListeners.forEach(cb => cb(online))
    }

    window.addEventListener('online', () => updateStatus(true))
    window.addEventListener('offline', () => updateStatus(false))
}

// ============================================
// Cache from server (download)
// ============================================

/**
 * Cache all products from the server
 */
export async function cacheProducts(): Promise<CacheResult> {
    if (!supabase) {
        return { success: false, table: 'products', count: 0, error: 'Supabase not configured' }
    }

    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('name')

        if (error) throw error

        const now = nowISO()
        const cachedProducts: CachedProduct[] = (data || []).map(p => ({
            ...p,
            _synced: true,
            _syncedAt: now
        }))

        // Clear and replace all products
        await offlineDB.transaction('rw', offlineDB.products, async () => {
            await offlineDB.products.clear()
            await offlineDB.products.bulkAdd(cachedProducts)
        })

        await updateSyncMeta('products', 'success')
        return { success: true, table: 'products', count: cachedProducts.length }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        await updateSyncMeta('products', 'error', errorMsg)
        return { success: false, table: 'products', count: 0, error: errorMsg }
    }
}

/**
 * Cache recent outputs from the server (last 7 days)
 */
export async function cacheOutputs(): Promise<CacheResult> {
    if (!supabase) {
        return { success: false, table: 'outputs', count: 0, error: 'Supabase not configured' }
    }

    try {
        // Get outputs from last 7 days
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const { data, error } = await supabase
            .from('outputs')
            .select(`
                *,
                products (name)
            `)
            .gte('output_date', sevenDaysAgo.toISOString().split('T')[0])
            .order('output_date', { ascending: false })

        if (error) throw error

        const now = nowISO()
        const cachedOutputs: CachedOutput[] = (data || []).map(o => ({
            id: o.id,
            product_id: o.product_id,
            quantity: o.quantity,
            reason: o.reason,
            recipe_id: o.recipe_id,
            output_date: o.output_date,
            created_at: o.created_at,
            productName: (o.products as { name: string } | null)?.name,
            _synced: true,
            _syncedAt: now
        }))

        // Clear and replace outputs (keeping unsynced local ones)
        await offlineDB.transaction('rw', offlineDB.outputs, async () => {
            // Keep unsynced local outputs
            const unsyncedLocal = await offlineDB.outputs
                .filter(o => !o._synced && isLocalId(o.id))
                .toArray()

            await offlineDB.outputs.clear()
            await offlineDB.outputs.bulkAdd(cachedOutputs)

            // Re-add unsynced local outputs
            if (unsyncedLocal.length > 0) {
                await offlineDB.outputs.bulkPut(unsyncedLocal)
            }
        })

        await updateSyncMeta('outputs', 'success')
        return { success: true, table: 'outputs', count: cachedOutputs.length }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        await updateSyncMeta('outputs', 'error', errorMsg)
        return { success: false, table: 'outputs', count: 0, error: errorMsg }
    }
}

/**
 * Cache temperature equipment from the server
 */
export async function cacheTemperatureEquipment(): Promise<CacheResult> {
    if (!supabase) {
        return { success: false, table: 'temperature_equipment', count: 0, error: 'Supabase not configured' }
    }

    try {
        const { data, error } = await supabase
            .from('temperature_equipment')
            .select('*')
            .order('name')

        if (error) throw error

        const now = nowISO()
        const cachedEquipment: CachedTemperatureEquipment[] = (data || []).map(e => ({
            ...e,
            _synced: true,
            _syncedAt: now
        }))

        await offlineDB.transaction('rw', offlineDB.temperatureEquipment, async () => {
            await offlineDB.temperatureEquipment.clear()
            await offlineDB.temperatureEquipment.bulkAdd(cachedEquipment)
        })

        await updateSyncMeta('temperature_equipment', 'success')
        return { success: true, table: 'temperature_equipment', count: cachedEquipment.length }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        await updateSyncMeta('temperature_equipment', 'error', errorMsg)
        return { success: false, table: 'temperature_equipment', count: 0, error: errorMsg }
    }
}

/**
 * Cache recent temperature readings (last 7 days)
 */
export async function cacheTemperatureReadings(): Promise<CacheResult> {
    if (!supabase) {
        return { success: false, table: 'temperature_readings', count: 0, error: 'Supabase not configured' }
    }

    try {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const { data, error } = await supabase
            .from('temperature_readings')
            .select(`
                *,
                temperature_equipment (name)
            `)
            .gte('recorded_at', sevenDaysAgo.toISOString())
            .order('recorded_at', { ascending: false })

        if (error) throw error

        const now = nowISO()
        const cachedReadings: CachedTemperatureReading[] = (data || []).map(r => ({
            id: r.id,
            equipment_id: r.equipment_id,
            temperature: r.temperature,
            is_compliant: r.is_compliant,
            recorded_by: r.recorded_by,
            notes: r.notes,
            recorded_at: r.recorded_at,
            created_at: r.created_at,
            equipmentName: (r.temperature_equipment as { name: string } | null)?.name,
            _synced: true,
            _syncedAt: now
        }))

        await offlineDB.transaction('rw', offlineDB.temperatureReadings, async () => {
            // Keep unsynced local readings
            const unsyncedLocal = await offlineDB.temperatureReadings
                .filter(r => !r._synced && isLocalId(r.id))
                .toArray()

            await offlineDB.temperatureReadings.clear()
            await offlineDB.temperatureReadings.bulkAdd(cachedReadings)

            if (unsyncedLocal.length > 0) {
                await offlineDB.temperatureReadings.bulkPut(unsyncedLocal)
            }
        })

        await updateSyncMeta('temperature_readings', 'success')
        return { success: true, table: 'temperature_readings', count: cachedReadings.length }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        await updateSyncMeta('temperature_readings', 'error', errorMsg)
        return { success: false, table: 'temperature_readings', count: 0, error: errorMsg }
    }
}

/**
 * Cache recipes (read-only)
 */
export async function cacheRecipes(): Promise<CacheResult> {
    if (!supabase) {
        return { success: false, table: 'recipes', count: 0, error: 'Supabase not configured' }
    }

    try {
        const { data, error } = await supabase
            .from('recipes')
            .select(`
                *,
                recipe_ingredients (
                    id,
                    product_id,
                    quantity,
                    unit,
                    products (name)
                )
            `)
            .order('name')

        if (error) throw error

        const now = nowISO()
        const cachedRecipes: CachedRecipe[] = (data || []).map(r => ({
            id: r.id,
            name: r.name,
            description: r.description,
            category: r.category,
            servings: r.servings,
            prep_time: r.prep_time,
            cook_time: r.cook_time,
            instructions: r.instructions,
            created_at: r.created_at,
            updated_at: r.updated_at,
            ingredients: (r.recipe_ingredients || []).map((ing: {
                id: string
                product_id: string
                quantity: number
                unit: string | null
                products: { name: string } | null
            }) => ({
                id: ing.id,
                product_id: ing.product_id,
                productName: ing.products?.name || '',
                quantity: Number(ing.quantity),
                unit: ing.unit
            })),
            _synced: true,
            _syncedAt: now
        }))

        await offlineDB.transaction('rw', offlineDB.recipes, async () => {
            await offlineDB.recipes.clear()
            await offlineDB.recipes.bulkAdd(cachedRecipes)
        })

        await updateSyncMeta('recipes', 'success')
        return { success: true, table: 'recipes', count: cachedRecipes.length }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        await updateSyncMeta('recipes', 'error', errorMsg)
        return { success: false, table: 'recipes', count: 0, error: errorMsg }
    }
}

/**
 * Cache menus (read-only, last 30 days + next 7 days)
 */
export async function cacheMenus(): Promise<CacheResult> {
    if (!supabase) {
        return { success: false, table: 'menus', count: 0, error: 'Supabase not configured' }
    }

    try {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const sevenDaysAhead = new Date()
        sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7)

        const { data, error } = await supabase
            .from('menus')
            .select(`
                *,
                menu_recipes (
                    id,
                    recipe_id,
                    servings,
                    recipes (name)
                )
            `)
            .gte('menu_date', thirtyDaysAgo.toISOString().split('T')[0])
            .lte('menu_date', sevenDaysAhead.toISOString().split('T')[0])
            .order('menu_date', { ascending: false })

        if (error) throw error

        const now = nowISO()
        const cachedMenus: CachedMenu[] = (data || []).map(m => ({
            id: m.id,
            name: m.name,
            menu_date: m.menu_date,
            meal_type: m.meal_type,
            notes: m.notes,
            created_at: m.created_at,
            updated_at: m.updated_at,
            recipes: (m.menu_recipes || []).map((mr: {
                id: string
                recipe_id: string
                servings: number
                recipes: { name: string } | null
            }) => ({
                id: mr.id,
                recipe_id: mr.recipe_id,
                recipeName: mr.recipes?.name || 'Recette inconnue',
                servings: mr.servings
            })),
            _synced: true,
            _syncedAt: now
        }))

        await offlineDB.transaction('rw', offlineDB.menus, async () => {
            await offlineDB.menus.clear()
            await offlineDB.menus.bulkAdd(cachedMenus)
        })

        await updateSyncMeta('menus', 'success')
        return { success: true, table: 'menus', count: cachedMenus.length }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        await updateSyncMeta('menus', 'error', errorMsg)
        return { success: false, table: 'menus', count: 0, error: errorMsg }
    }
}

/**
 * Cache all data from the server
 */
export async function cacheAllData(): Promise<CacheResult[]> {
    const results = await Promise.all([
        cacheProducts(),
        cacheOutputs(),
        cacheTemperatureEquipment(),
        cacheTemperatureReadings(),
        cacheRecipes(),
        cacheMenus()
    ])
    return results
}

// ============================================
// Sync mutations to server (upload)
// ============================================

/**
 * Process a single pending mutation
 */
async function processMutation(mutation: PendingMutation): Promise<boolean> {
    if (!supabase) {
        throw new Error('Supabase not configured')
    }

    switch (mutation.type) {
        case 'create_output': {
            const data = mutation.data as {
                product_id: string
                quantity: number
                reason: string
                output_date: string
            }

            // Get current product stock from server
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('quantity')
                .eq('id', data.product_id)
                .single()

            if (productError) throw productError

            const currentStock = Number(product.quantity) || 0
            const newStock = currentStock - data.quantity

            if (newStock < 0) {
                throw new Error('Stock insuffisant sur le serveur')
            }

            // Create the output
            const { data: newOutput, error: outputError } = await supabase
                .from('outputs')
                .insert([{
                    product_id: data.product_id,
                    quantity: data.quantity,
                    reason: data.reason,
                    output_date: data.output_date
                }])
                .select()
                .single()

            if (outputError) throw outputError

            // Update product stock on server
            const { error: updateError } = await supabase
                .from('products')
                .update({ quantity: newStock })
                .eq('id', data.product_id)

            if (updateError) throw updateError

            // Update local cache with real ID
            if (mutation.localId) {
                await offlineDB.outputs.delete(mutation.localId)
                await offlineDB.outputs.put({
                    ...data,
                    id: newOutput.id,
                    recipe_id: null,
                    created_at: newOutput.created_at,
                    _synced: true,
                    _syncedAt: nowISO()
                })
            }

            return true
        }

        case 'delete_output': {
            const outputId = mutation.remoteId
            if (!outputId) throw new Error('No remote ID for delete operation')

            // Get the output to restore stock
            const { data: output, error: fetchError } = await supabase
                .from('outputs')
                .select('product_id, quantity')
                .eq('id', outputId)
                .single()

            if (fetchError) throw fetchError

            // Get current product stock
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('quantity')
                .eq('id', output.product_id)
                .single()

            if (productError) throw productError

            // Restore stock
            const restoredStock = Number(product.quantity) + Number(output.quantity)

            const { error: updateError } = await supabase
                .from('products')
                .update({ quantity: restoredStock })
                .eq('id', output.product_id)

            if (updateError) throw updateError

            // Delete the output
            const { error: deleteError } = await supabase
                .from('outputs')
                .delete()
                .eq('id', outputId)

            if (deleteError) throw deleteError

            return true
        }

        case 'update_product': {
            const { id, ...updateData } = mutation.data as {
                id: string
                quantity?: number
                name?: string
                category?: string
                unit?: string
                min_stock?: number
                price?: number
                emoji?: string
            }

            const { error } = await supabase
                .from('products')
                .update(updateData)
                .eq('id', id)

            if (error) throw error

            // Update local cache
            await offlineDB.products.update(id, {
                ...updateData,
                _synced: true,
                _syncedAt: nowISO()
            })

            return true
        }

        case 'create_temperature_reading': {
            const data = mutation.data as {
                equipment_id: string
                temperature: number
                is_compliant?: boolean
                recorded_by?: string
                notes?: string
                recorded_at?: string
            }

            const { data: newReading, error } = await supabase
                .from('temperature_readings')
                .insert([data])
                .select()
                .single()

            if (error) throw error

            // Update local cache with real ID
            if (mutation.localId) {
                await offlineDB.temperatureReadings.delete(mutation.localId)
                await offlineDB.temperatureReadings.put({
                    id: newReading.id,
                    equipment_id: newReading.equipment_id,
                    temperature: newReading.temperature,
                    is_compliant: newReading.is_compliant,
                    recorded_by: newReading.recorded_by,
                    notes: newReading.notes,
                    recorded_at: newReading.recorded_at,
                    created_at: newReading.created_at,
                    _synced: true,
                    _syncedAt: nowISO()
                })
            }

            return true
        }

        default:
            throw new Error(`Unknown mutation type: ${mutation.type}`)
    }
}

/**
 * Sync all pending mutations to the server
 */
export async function syncPendingMutations(): Promise<SyncResult> {
    const result: SyncResult = {
        success: true,
        syncedMutations: 0,
        failedMutations: 0,
        errors: []
    }

    if (!isOnline()) {
        return {
            ...result,
            success: false,
            errors: ['Application hors ligne']
        }
    }

    const mutations = await getPendingMutations()

    for (const mutation of mutations) {
        try {
            await processMutation(mutation)
            await removeMutation(mutation.id!)
            result.syncedMutations++
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error'
            result.errors.push(`Mutation ${mutation.type}: ${errorMsg}`)
            result.failedMutations++
            result.success = false

            // Update retry count (max 5 retries before giving up)
            if (mutation.retryCount < 5) {
                await updateMutationRetry(mutation.id!, errorMsg)
            } else {
                // Remove mutation after too many failures
                await removeMutation(mutation.id!)
                result.errors.push(`Mutation abandonnee apres 5 tentatives: ${mutation.type}`)
            }
        }
    }

    return result
}

/**
 * Full sync: upload pending mutations then download fresh data
 */
export async function fullSync(): Promise<{
    upload: SyncResult
    download: CacheResult[]
}> {
    // First, sync pending mutations
    const uploadResult = await syncPendingMutations()

    // Then, refresh cache from server
    const downloadResults = await cacheAllData()

    return {
        upload: uploadResult,
        download: downloadResults
    }
}

// ============================================
// Offline operations (write to local cache)
// ============================================

/**
 * Create an output while offline
 */
export async function createOutputOffline(data: {
    productId: string
    quantity: number
    reason: string
    date?: string
}): Promise<CachedOutput> {
    const localId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const outputDate = data.date || new Date().toISOString()

    // Get product from cache for name
    const product = await offlineDB.products.get(data.productId)
    if (!product) {
        throw new Error('Produit non trouve dans le cache')
    }

    // Check local stock
    const localStock = product.quantity
    if (localStock - data.quantity < 0) {
        throw new Error('Stock insuffisant')
    }

    // Create local output
    const output: CachedOutput = {
        id: localId,
        product_id: data.productId,
        quantity: data.quantity,
        reason: data.reason,
        recipe_id: null,
        output_date: outputDate,
        created_at: new Date().toISOString(),
        productName: product.name,
        _synced: false,
        _syncedAt: null,
        _localId: localId
    }

    // Update local product stock
    await offlineDB.products.update(data.productId, {
        quantity: localStock - data.quantity,
        _synced: false
    })

    // Add output to cache
    await offlineDB.outputs.add(output)

    // Queue mutation for sync
    await offlineDB.pendingMutations.add({
        type: 'create_output',
        table: 'outputs',
        data: {
            product_id: data.productId,
            quantity: data.quantity,
            reason: data.reason,
            output_date: outputDate
        },
        localId,
        createdAt: new Date().toISOString(),
        retryCount: 0
    })

    return output
}

/**
 * Create a temperature reading while offline
 */
export async function createTemperatureReadingOffline(data: {
    equipmentId: string
    temperature: number
    isCompliant?: boolean
    recordedBy?: string
    notes?: string
}): Promise<CachedTemperatureReading> {
    const localId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // Get equipment from cache for name
    const equipment = await offlineDB.temperatureEquipment.get(data.equipmentId)

    const reading: CachedTemperatureReading = {
        id: localId,
        equipment_id: data.equipmentId,
        temperature: data.temperature,
        is_compliant: data.isCompliant ?? null,
        recorded_by: data.recordedBy ?? null,
        notes: data.notes ?? null,
        recorded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        equipmentName: equipment?.name,
        _synced: false,
        _syncedAt: null,
        _localId: localId
    }

    // Add to cache
    await offlineDB.temperatureReadings.add(reading)

    // Queue mutation
    await offlineDB.pendingMutations.add({
        type: 'create_temperature_reading',
        table: 'temperature_readings',
        data: {
            equipment_id: data.equipmentId,
            temperature: data.temperature,
            is_compliant: data.isCompliant,
            recorded_by: data.recordedBy,
            notes: data.notes,
            recorded_at: reading.recorded_at
        },
        localId,
        createdAt: new Date().toISOString(),
        retryCount: 0
    })

    return reading
}

/**
 * Update product quantity while offline
 */
export async function updateProductOffline(
    id: string,
    updates: Partial<{
        quantity: number
        name: string
        category: string
        unit: string
        min_stock: number
        price: number
        emoji: string
    }>
): Promise<void> {
    // Update local cache
    await offlineDB.products.update(id, {
        ...updates,
        _synced: false
    })

    // Queue mutation
    await offlineDB.pendingMutations.add({
        type: 'update_product',
        table: 'products',
        data: { id, ...updates },
        remoteId: id,
        createdAt: new Date().toISOString(),
        retryCount: 0
    })
}

// ============================================
// Read from cache
// ============================================

/**
 * Get all products from cache
 */
export async function getProductsFromCache(): Promise<CachedProduct[]> {
    return await offlineDB.products.orderBy('name').toArray()
}

/**
 * Get product by ID from cache
 */
export async function getProductFromCache(id: string): Promise<CachedProduct | undefined> {
    return await offlineDB.products.get(id)
}

/**
 * Get outputs from cache (optionally filtered by date range)
 */
export async function getOutputsFromCache(from?: string, to?: string): Promise<CachedOutput[]> {
    let query = offlineDB.outputs.orderBy('output_date').reverse()

    if (from && to) {
        const outputs = await query.toArray()
        return outputs.filter(o => {
            if (!o.output_date) return false
            const date = o.output_date.split('T')[0]
            return date >= from && date <= to
        })
    }

    return await query.toArray()
}

/**
 * Get today's outputs from cache
 */
export async function getTodayOutputsFromCache(): Promise<CachedOutput[]> {
    const today = new Date().toISOString().split('T')[0]
    return await getOutputsFromCache(today, today)
}

/**
 * Get temperature readings from cache
 */
export async function getTemperatureReadingsFromCache(
    equipmentId?: string
): Promise<CachedTemperatureReading[]> {
    if (equipmentId) {
        return await offlineDB.temperatureReadings
            .where('equipment_id')
            .equals(equipmentId)
            .reverse()
            .sortBy('recorded_at')
    }
    return await offlineDB.temperatureReadings.orderBy('recorded_at').reverse().toArray()
}

/**
 * Get temperature equipment from cache
 */
export async function getTemperatureEquipmentFromCache(): Promise<CachedTemperatureEquipment[]> {
    return await offlineDB.temperatureEquipment.orderBy('name').toArray()
}

/**
 * Get recipes from cache
 */
export async function getRecipesFromCache(): Promise<CachedRecipe[]> {
    return await offlineDB.recipes.orderBy('name').toArray()
}

/**
 * Get menus from cache
 */
export async function getMenusFromCache(date?: string): Promise<CachedMenu[]> {
    if (date) {
        return await offlineDB.menus.where('menu_date').equals(date).toArray()
    }
    return await offlineDB.menus.orderBy('menu_date').reverse().toArray()
}
