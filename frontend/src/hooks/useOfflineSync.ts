/**
 * React hook for offline synchronization
 * Provides offline status, pending mutations count, and sync functions
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    isOnline,
    subscribeToOnlineStatus,
    initOnlineStatusListeners,
    syncPendingMutations,
    cacheAllData,
    fullSync,
    createOutputOffline,
    createTemperatureReadingOffline,
    updateProductOffline,
    getProductsFromCache,
    getOutputsFromCache,
    getTodayOutputsFromCache,
    getTemperatureReadingsFromCache,
    getTemperatureEquipmentFromCache,
    getRecipesFromCache,
    getMenusFromCache,
    type SyncResult,
    type CacheResult
} from '@/lib/offline/sync'
import {
    getPendingMutationsCount,
    getSyncMeta,
    type SyncMeta
} from '@/lib/offline/db'

// ============================================
// Types
// ============================================

export interface OfflineSyncState {
    isOnline: boolean
    isSyncing: boolean
    pendingCount: number
    lastSyncTime: string | null
    syncError: string | null
}

export interface OfflineSyncActions {
    sync: () => Promise<void>
    cacheAll: () => Promise<void>
    createOutputOffline: typeof createOutputOffline
    createTemperatureReadingOffline: typeof createTemperatureReadingOffline
    updateProductOffline: typeof updateProductOffline
}

export interface OfflineCacheGetters {
    getProducts: typeof getProductsFromCache
    getOutputs: typeof getOutputsFromCache
    getTodayOutputs: typeof getTodayOutputsFromCache
    getTemperatureReadings: typeof getTemperatureReadingsFromCache
    getTemperatureEquipment: typeof getTemperatureEquipmentFromCache
    getRecipes: typeof getRecipesFromCache
    getMenus: typeof getMenusFromCache
}

// ============================================
// Initialize listeners once
// ============================================

let listenersInitialized = false

function ensureListenersInitialized() {
    if (!listenersInitialized) {
        initOnlineStatusListeners()
        listenersInitialized = true
    }
}

// ============================================
// Main Hook
// ============================================

export function useOfflineSync() {
    const queryClient = useQueryClient()

    // State
    const [state, setState] = useState<OfflineSyncState>({
        isOnline: isOnline(),
        isSyncing: false,
        pendingCount: 0,
        lastSyncTime: null,
        syncError: null
    })

    // Refs for tracking
    const syncInProgress = useRef(false)
    const autoSyncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Initialize listeners
    useEffect(() => {
        ensureListenersInitialized()
    }, [])

    // Update pending count
    const updatePendingCount = useCallback(async () => {
        try {
            const count = await getPendingMutationsCount()
            setState(prev => ({ ...prev, pendingCount: count }))
        } catch (error) {
            console.error('Failed to get pending count:', error)
        }
    }, [])

    // Update last sync time from meta
    const updateLastSyncTime = useCallback(async () => {
        try {
            const meta = await getSyncMeta('products')
            setState(prev => ({
                ...prev,
                lastSyncTime: meta?.lastSyncedAt || null
            }))
        } catch (error) {
            console.error('Failed to get sync meta:', error)
        }
    }, [])

    // Subscribe to online status changes
    useEffect(() => {
        const unsubscribe = subscribeToOnlineStatus((online) => {
            setState(prev => ({ ...prev, isOnline: online }))

            if (online) {
                // Auto-sync when coming back online
                toast.info('Connexion retablie - Synchronisation en cours...')
                performSync()
            } else {
                toast.warning('Mode hors ligne active', {
                    description: 'Les modifications seront synchronisees quand la connexion sera retablie'
                })
            }
        })

        return () => unsubscribe()
    }, [])

    // Initial load
    useEffect(() => {
        updatePendingCount()
        updateLastSyncTime()
    }, [updatePendingCount, updateLastSyncTime])

    // Periodic pending count update
    useEffect(() => {
        const interval = setInterval(updatePendingCount, 10000) // Every 10 seconds
        return () => clearInterval(interval)
    }, [updatePendingCount])

    // Perform sync
    const performSync = useCallback(async () => {
        if (syncInProgress.current || !isOnline()) {
            return
        }

        syncInProgress.current = true
        setState(prev => ({ ...prev, isSyncing: true, syncError: null }))

        try {
            const result = await fullSync()

            // Invalidate React Query cache to refetch fresh data
            queryClient.invalidateQueries({ queryKey: ['products'] })
            queryClient.invalidateQueries({ queryKey: ['outputs'] })
            queryClient.invalidateQueries({ queryKey: ['temperature'] })
            queryClient.invalidateQueries({ queryKey: ['recipes'] })
            queryClient.invalidateQueries({ queryKey: ['menus'] })

            await updatePendingCount()
            await updateLastSyncTime()

            const totalSynced = result.upload.syncedMutations
            const totalFailed = result.upload.failedMutations
            const cacheSuccess = result.download.filter(r => r.success).length
            const cacheFailed = result.download.filter(r => !r.success).length

            if (totalFailed === 0 && cacheFailed === 0) {
                if (totalSynced > 0) {
                    toast.success(`Synchronisation reussie`, {
                        description: `${totalSynced} modification(s) envoyee(s)`
                    })
                }
            } else {
                setState(prev => ({
                    ...prev,
                    syncError: result.upload.errors.join(', ')
                }))
                toast.error('Erreurs de synchronisation', {
                    description: `${totalFailed} echec(s) de mutation, ${cacheFailed} echec(s) de cache`
                })
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue'
            setState(prev => ({ ...prev, syncError: errorMsg }))
            toast.error('Echec de la synchronisation', { description: errorMsg })
        } finally {
            syncInProgress.current = false
            setState(prev => ({ ...prev, isSyncing: false }))
        }
    }, [queryClient, updatePendingCount, updateLastSyncTime])

    // Cache all data
    const performCacheAll = useCallback(async () => {
        setState(prev => ({ ...prev, isSyncing: true }))

        try {
            const results = await cacheAllData()
            const totalCached = results.reduce((sum, r) => sum + r.count, 0)
            const failed = results.filter(r => !r.success)

            await updateLastSyncTime()

            if (failed.length === 0) {
                toast.success('Cache mis a jour', {
                    description: `${totalCached} elements caches`
                })
            } else {
                toast.warning('Cache partiellement mis a jour', {
                    description: `${failed.length} table(s) en echec`
                })
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue'
            toast.error('Echec du cache', { description: errorMsg })
        } finally {
            setState(prev => ({ ...prev, isSyncing: false }))
        }
    }, [updateLastSyncTime])

    // Wrapped offline operations that update pending count
    const wrappedCreateOutputOffline = useCallback(async (
        data: Parameters<typeof createOutputOffline>[0]
    ) => {
        const result = await createOutputOffline(data)
        await updatePendingCount()
        return result
    }, [updatePendingCount])

    const wrappedCreateTemperatureReadingOffline = useCallback(async (
        data: Parameters<typeof createTemperatureReadingOffline>[0]
    ) => {
        const result = await createTemperatureReadingOffline(data)
        await updatePendingCount()
        return result
    }, [updatePendingCount])

    const wrappedUpdateProductOffline = useCallback(async (
        id: string,
        updates: Parameters<typeof updateProductOffline>[1]
    ) => {
        await updateProductOffline(id, updates)
        await updatePendingCount()
    }, [updatePendingCount])

    // Return values
    const actions: OfflineSyncActions = {
        sync: performSync,
        cacheAll: performCacheAll,
        createOutputOffline: wrappedCreateOutputOffline,
        createTemperatureReadingOffline: wrappedCreateTemperatureReadingOffline,
        updateProductOffline: wrappedUpdateProductOffline
    }

    const cache: OfflineCacheGetters = {
        getProducts: getProductsFromCache,
        getOutputs: getOutputsFromCache,
        getTodayOutputs: getTodayOutputsFromCache,
        getTemperatureReadings: getTemperatureReadingsFromCache,
        getTemperatureEquipment: getTemperatureEquipmentFromCache,
        getRecipes: getRecipesFromCache,
        getMenus: getMenusFromCache
    }

    return {
        ...state,
        ...actions,
        cache
    }
}

// ============================================
// Simpler status-only hook
// ============================================

export function useOnlineStatus() {
    const [online, setOnline] = useState(isOnline())

    useEffect(() => {
        ensureListenersInitialized()
        const unsubscribe = subscribeToOnlineStatus(setOnline)
        return () => unsubscribe()
    }, [])

    return online
}

// ============================================
// Pending mutations count hook
// ============================================

export function usePendingMutationsCount() {
    const [count, setCount] = useState(0)

    useEffect(() => {
        const update = async () => {
            try {
                const c = await getPendingMutationsCount()
                setCount(c)
            } catch {
                // Ignore errors
            }
        }

        update()
        const interval = setInterval(update, 5000)
        return () => clearInterval(interval)
    }, [])

    return count
}

// ============================================
// Auto-sync hook (syncs when online and has pending)
// ============================================

export function useAutoSync(intervalMs = 30000) {
    const { isOnline, pendingCount, sync, isSyncing } = useOfflineSync()

    useEffect(() => {
        if (!isOnline || pendingCount === 0 || isSyncing) {
            return
        }

        // Initial sync attempt
        sync()

        // Set up periodic sync
        const interval = setInterval(() => {
            if (isOnline && pendingCount > 0 && !isSyncing) {
                sync()
            }
        }, intervalMs)

        return () => clearInterval(interval)
    }, [isOnline, pendingCount, sync, isSyncing, intervalMs])
}

export default useOfflineSync
