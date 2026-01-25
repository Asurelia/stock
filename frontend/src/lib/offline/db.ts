/**
 * IndexedDB configuration using Dexie.js
 * Provides offline storage for StockPro application
 */

import Dexie, { type Table } from 'dexie'

// ============================================
// Types for cached data
// ============================================

export interface CachedProduct {
    id: string
    name: string
    category: string | null
    unit: string | null
    quantity: number
    min_stock: number | null
    supplier_id: string | null
    price: number
    emoji: string | null
    requires_traceability_photo?: boolean
    created_at: string | null
    updated_at: string | null
    // Sync metadata
    _synced: boolean
    _syncedAt: string | null
}

export interface CachedOutput {
    id: string
    product_id: string
    quantity: number
    reason: string | null
    recipe_id: string | null
    output_date: string | null
    created_at: string | null
    // Cache metadata
    productName?: string
    // Sync metadata
    _synced: boolean
    _syncedAt: string | null
    _localId?: string // For outputs created offline
}

export interface CachedTemperatureReading {
    id: string
    equipment_id: string
    temperature: number
    is_compliant: boolean | null
    recorded_by: string | null
    notes: string | null
    recorded_at: string | null
    created_at: string | null
    // Cache metadata
    equipmentName?: string
    // Sync metadata
    _synced: boolean
    _syncedAt: string | null
    _localId?: string
}

export interface CachedRecipe {
    id: string
    name: string
    description: string | null
    category: string | null
    servings: number | null
    prep_time: number | null
    cook_time: number | null
    instructions: string | null
    created_at: string | null
    updated_at: string | null
    // Cached ingredients for offline display
    ingredients?: {
        id: string
        product_id: string
        productName: string
        quantity: number
        unit: string | null
    }[]
    // Sync metadata (read-only, always synced)
    _synced: boolean
    _syncedAt: string | null
}

export interface CachedMenu {
    id: string
    name: string
    menu_date: string
    meal_type: string | null
    notes: string | null
    created_at: string | null
    updated_at: string | null
    // Cached recipes for offline display
    recipes?: {
        id: string
        recipe_id: string
        recipeName: string
        servings: number
    }[]
    // Sync metadata (read-only, always synced)
    _synced: boolean
    _syncedAt: string | null
}

export interface CachedTemperatureEquipment {
    id: string
    name: string
    type: string
    location: string | null
    min_temp: number
    max_temp: number
    is_active: boolean | null
    created_at: string | null
    updated_at: string | null
    _synced: boolean
    _syncedAt: string | null
}

// ============================================
// Pending mutations queue
// ============================================

export type MutationType =
    | 'create_output'
    | 'delete_output'
    | 'update_product'
    | 'create_temperature_reading'

export interface PendingMutation {
    id?: number // Auto-incremented
    type: MutationType
    table: 'products' | 'outputs' | 'temperature_readings'
    data: Record<string, unknown>
    localId?: string // For create operations
    remoteId?: string // For update/delete operations
    createdAt: string
    retryCount: number
    lastError?: string
}

// ============================================
// Sync metadata
// ============================================

export interface SyncMeta {
    id: string // Table name
    lastSyncedAt: string | null
    lastSyncStatus: 'success' | 'error' | 'pending'
    lastError?: string
}

// ============================================
// Dexie Database Class
// ============================================

export class StockProOfflineDB extends Dexie {
    // Tables
    products!: Table<CachedProduct, string>
    outputs!: Table<CachedOutput, string>
    temperatureReadings!: Table<CachedTemperatureReading, string>
    temperatureEquipment!: Table<CachedTemperatureEquipment, string>
    recipes!: Table<CachedRecipe, string>
    menus!: Table<CachedMenu, string>
    pendingMutations!: Table<PendingMutation, number>
    syncMeta!: Table<SyncMeta, string>

    constructor() {
        super('stockpro-offline')

        this.version(1).stores({
            // Products - indexed by id, category for filtering
            products: 'id, category, name, _synced',

            // Outputs - indexed by id, product_id, date for filtering
            outputs: 'id, product_id, output_date, _synced, _localId',

            // Temperature readings - indexed by equipment_id, date
            temperatureReadings: 'id, equipment_id, recorded_at, _synced, _localId',

            // Temperature equipment
            temperatureEquipment: 'id, type, is_active',

            // Recipes - read only cache
            recipes: 'id, name, category',

            // Menus - read only cache
            menus: 'id, menu_date, meal_type',

            // Pending mutations queue
            pendingMutations: '++id, type, table, createdAt',

            // Sync metadata
            syncMeta: 'id'
        })
    }
}

// Singleton instance
export const offlineDB = new StockProOfflineDB()

// ============================================
// Utility functions
// ============================================

/**
 * Generate a local ID for offline-created records
 */
export function generateLocalId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Check if an ID is a local (offline) ID
 */
export function isLocalId(id: string): boolean {
    return id.startsWith('local_')
}

/**
 * Get current ISO timestamp
 */
export function nowISO(): string {
    return new Date().toISOString()
}

/**
 * Clear all cached data (useful for logout or reset)
 */
export async function clearAllCache(): Promise<void> {
    await offlineDB.transaction(
        'rw',
        [
            offlineDB.products,
            offlineDB.outputs,
            offlineDB.temperatureReadings,
            offlineDB.temperatureEquipment,
            offlineDB.recipes,
            offlineDB.menus,
            offlineDB.syncMeta
        ],
        async () => {
            await offlineDB.products.clear()
            await offlineDB.outputs.clear()
            await offlineDB.temperatureReadings.clear()
            await offlineDB.temperatureEquipment.clear()
            await offlineDB.recipes.clear()
            await offlineDB.menus.clear()
            await offlineDB.syncMeta.clear()
        }
    )
}

/**
 * Clear pending mutations (after successful sync)
 */
export async function clearPendingMutations(): Promise<void> {
    await offlineDB.pendingMutations.clear()
}

/**
 * Get count of pending mutations
 */
export async function getPendingMutationsCount(): Promise<number> {
    return await offlineDB.pendingMutations.count()
}

/**
 * Get all pending mutations ordered by creation time
 */
export async function getPendingMutations(): Promise<PendingMutation[]> {
    return await offlineDB.pendingMutations.orderBy('createdAt').toArray()
}

/**
 * Add a mutation to the pending queue
 */
export async function queueMutation(
    mutation: Omit<PendingMutation, 'id' | 'createdAt' | 'retryCount'>
): Promise<number> {
    return await offlineDB.pendingMutations.add({
        ...mutation,
        createdAt: nowISO(),
        retryCount: 0
    })
}

/**
 * Update mutation retry count after failed sync attempt
 */
export async function updateMutationRetry(
    id: number,
    error: string
): Promise<void> {
    const mutation = await offlineDB.pendingMutations.get(id)
    if (mutation) {
        await offlineDB.pendingMutations.update(id, {
            retryCount: mutation.retryCount + 1,
            lastError: error
        })
    }
}

/**
 * Remove a mutation from the queue (after successful sync)
 */
export async function removeMutation(id: number): Promise<void> {
    await offlineDB.pendingMutations.delete(id)
}

/**
 * Update sync metadata for a table
 */
export async function updateSyncMeta(
    table: string,
    status: 'success' | 'error' | 'pending',
    error?: string
): Promise<void> {
    await offlineDB.syncMeta.put({
        id: table,
        lastSyncedAt: status === 'success' ? nowISO() : (await offlineDB.syncMeta.get(table))?.lastSyncedAt || null,
        lastSyncStatus: status,
        lastError: error
    })
}

/**
 * Get sync metadata for a table
 */
export async function getSyncMeta(table: string): Promise<SyncMeta | undefined> {
    return await offlineDB.syncMeta.get(table)
}

/**
 * Check if database is available
 */
export async function isDBAvailable(): Promise<boolean> {
    try {
        await offlineDB.open()
        return true
    } catch {
        return false
    }
}
