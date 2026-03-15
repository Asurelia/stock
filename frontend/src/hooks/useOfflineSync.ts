/**
 * React hooks for online/offline status and database info
 * All data is stored locally in IndexedDB - no remote sync
 */

import { useState, useEffect } from 'react'

export function useOnlineStatus() {
    const [online, setOnline] = useState(navigator.onLine)

    useEffect(() => {
        const handleOnline = () => setOnline(true)
        const handleOffline = () => setOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    return online
}

export interface OfflineSyncState {
    isOnline: boolean
    isSyncing: boolean
    pendingCount: number
    lastSyncTime: string | null
    syncError: string | null
}

export function useOfflineSync() {
    const isOnline = useOnlineStatus()

    return {
        isOnline,
        isSyncing: false,
        pendingCount: 0,
        lastSyncTime: null,
        syncError: null,
        sync: async () => {},
        cacheAll: async () => {},
    }
}

export function usePendingMutationsCount() {
    return 0
}

export function useAutoSync() {
    // No-op: all data is local
}

export default useOfflineSync
