/**
 * Status Indicator Components
 * Shows online/offline status - all data is stored locally
 */

import { useOnlineStatus } from '@/hooks/useOfflineSync'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
    Database,
    Wifi,
    WifiOff,
    HardDrive
} from 'lucide-react'

export function SyncIndicator() {
    const isOnline = useOnlineStatus()

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="relative gap-2 px-2"
                    aria-label={isOnline ? 'En ligne - Données locales' : 'Hors ligne - Données locales'}
                >
                    <Database className="h-4 w-4 text-green-500" />
                    <span className="sr-only">
                        {isOnline ? 'En ligne' : 'Hors ligne'} - Base de données locale
                    </span>
                </Button>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-64">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                            <HardDrive className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-medium">Base locale</p>
                            <p className="text-sm text-muted-foreground">
                                Données stockées sur l'appareil
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {isOnline ? (
                            <Wifi className="h-4 w-4 text-green-500" />
                        ) : (
                            <WifiOff className="h-4 w-4 text-orange-500" />
                        )}
                        <span>{isOnline ? 'Connecté à internet' : 'Hors ligne'}</span>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}

export function SyncIndicatorCompact() {
    const isOnline = useOnlineStatus()

    return (
        <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={isOnline ? 'En ligne' : 'Hors ligne'}
        >
            <Database className={cn(
                "h-5 w-5",
                isOnline ? "text-green-500" : "text-orange-500"
            )} />
            <span className="sr-only">
                {isOnline ? 'En ligne' : 'Hors ligne'}
            </span>
        </Button>
    )
}

export function OfflineBanner() {
    const isOnline = useOnlineStatus()

    if (isOnline) return null

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium safe-area-top">
            <WifiOff className="h-4 w-4" />
            <span>Mode hors ligne — vos données restent accessibles</span>
        </div>
    )
}

export default SyncIndicator
