/**
 * OfflineProvider Component
 * Initializes local database and requests persistent storage
 */

import { useEffect, useRef, type ReactNode } from 'react'
import { isDBAvailable, requestPersistentStorage } from '@/lib/offline/db'

interface OfflineProviderProps {
    children: ReactNode
}

export function OfflineProvider({ children }: OfflineProviderProps) {
    const initialized = useRef(false)

    useEffect(() => {
        if (initialized.current) return
        initialized.current = true

        const init = async () => {
            const dbAvailable = await isDBAvailable()
            if (!dbAvailable) {
                console.warn('IndexedDB not available')
                return
            }
            await requestPersistentStorage()
        }

        init()
    }, [])

    return <>{children}</>
}

export default OfflineProvider
