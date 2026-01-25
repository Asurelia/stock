/**
 * OfflineProvider Component
 * Initializes offline sync and provides caching on app startup
 */

import { useEffect, useRef, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    initOnlineStatusListeners,
    cacheAllData,
    isOnline as checkIsOnline,
    subscribeToOnlineStatus,
    syncPendingMutations
} from '@/lib/offline/sync'
import { getPendingMutationsCount, isDBAvailable } from '@/lib/offline/db'

interface OfflineProviderProps {
    children: ReactNode
    /**
     * Whether to auto-cache data on mount when online
     * @default true
     */
    autoCacheOnMount?: boolean
    /**
     * Whether to auto-sync when coming back online
     * @default true
     */
    autoSyncOnReconnect?: boolean
    /**
     * Interval for background sync in ms (0 to disable)
     * @default 60000 (1 minute)
     */
    backgroundSyncInterval?: number
}

export function OfflineProvider({
    children,
    autoCacheOnMount = true,
    autoSyncOnReconnect = true,
    backgroundSyncInterval = 60000
}: OfflineProviderProps) {
    const queryClient = useQueryClient()
    const initialized = useRef(false)
    const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Initialize on mount
    useEffect(() => {
        if (initialized.current) return
        initialized.current = true

        const init = async () => {
            // Check if IndexedDB is available
            const dbAvailable = await isDBAvailable()
            if (!dbAvailable) {
                console.warn('IndexedDB not available, offline mode disabled')
                return
            }

            // Initialize online status listeners
            initOnlineStatusListeners()

            // Auto-cache if online
            if (autoCacheOnMount && checkIsOnline()) {
                try {
                    await cacheAllData()
                    console.log('Initial cache completed')
                } catch (error) {
                    console.error('Failed to cache data on mount:', error)
                }
            }

            // Check for pending mutations
            const pendingCount = await getPendingMutationsCount()
            if (pendingCount > 0 && checkIsOnline()) {
                toast.info(`${pendingCount} modification(s) en attente de synchronisation`)
                // Try to sync
                syncPendingMutations().catch(console.error)
            }
        }

        init()
    }, [autoCacheOnMount])

    // Auto-sync when coming back online
    useEffect(() => {
        if (!autoSyncOnReconnect) return

        const unsubscribe = subscribeToOnlineStatus(async (online) => {
            if (online) {
                const pendingCount = await getPendingMutationsCount()
                if (pendingCount > 0) {
                    toast.info('Connexion retablie - Synchronisation en cours...')
                    try {
                        const result = await syncPendingMutations()
                        if (result.syncedMutations > 0) {
                            toast.success(`${result.syncedMutations} modification(s) synchronisee(s)`)
                        }
                        if (result.failedMutations > 0) {
                            toast.error(`${result.failedMutations} erreur(s) de synchronisation`)
                        }
                        // Invalidate queries to refresh data
                        queryClient.invalidateQueries()
                    } catch (error) {
                        console.error('Sync failed:', error)
                        toast.error('Echec de la synchronisation')
                    }
                }

                // Refresh cache
                try {
                    await cacheAllData()
                } catch (error) {
                    console.error('Failed to refresh cache:', error)
                }
            }
        })

        return () => unsubscribe()
    }, [autoSyncOnReconnect, queryClient])

    // Background sync interval
    useEffect(() => {
        if (backgroundSyncInterval <= 0) return

        syncIntervalRef.current = setInterval(async () => {
            if (!checkIsOnline()) return

            const pendingCount = await getPendingMutationsCount()
            if (pendingCount > 0) {
                try {
                    const result = await syncPendingMutations()
                    if (result.syncedMutations > 0) {
                        queryClient.invalidateQueries()
                    }
                } catch (error) {
                    console.error('Background sync failed:', error)
                }
            }
        }, backgroundSyncInterval)

        return () => {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current)
            }
        }
    }, [backgroundSyncInterval, queryClient])

    return <>{children}</>
}

export default OfflineProvider
