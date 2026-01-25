/**
 * SyncIndicator Component
 * Displays the current sync status and pending mutations count
 */

import { useOfflineSync } from '@/hooks/useOfflineSync'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
    Cloud,
    CloudOff,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Clock
} from 'lucide-react'

export function SyncIndicator() {
    const {
        isOnline,
        isSyncing,
        pendingCount,
        lastSyncTime,
        syncError,
        sync,
        cacheAll
    } = useOfflineSync()

    // Format last sync time
    const formatLastSync = (time: string | null) => {
        if (!time) return 'Jamais'
        const date = new Date(time)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)

        if (diffMins < 1) return 'A l\'instant'
        if (diffMins < 60) return `Il y a ${diffMins} min`
        if (diffMins < 1440) return `Il y a ${Math.floor(diffMins / 60)} h`
        return date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        'relative gap-2 px-2',
                        !isOnline && 'text-orange-500',
                        syncError && 'text-red-500'
                    )}
                >
                    {isSyncing ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : isOnline ? (
                        <Cloud className="h-4 w-4" />
                    ) : (
                        <CloudOff className="h-4 w-4" />
                    )}

                    {pendingCount > 0 && (
                        <Badge
                            variant="secondary"
                            className={cn(
                                'h-5 min-w-5 px-1.5 text-xs',
                                !isOnline && 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                                syncError && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            )}
                        >
                            {pendingCount}
                        </Badge>
                    )}

                    <span className="sr-only">
                        {isOnline ? 'En ligne' : 'Hors ligne'}
                        {pendingCount > 0 ? ` - ${pendingCount} en attente` : ''}
                    </span>
                </Button>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-72">
                <div className="space-y-4">
                    {/* Status Header */}
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-full',
                            isOnline
                                ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                        )}>
                            {isOnline ? (
                                <Cloud className="h-5 w-5" />
                            ) : (
                                <CloudOff className="h-5 w-5" />
                            )}
                        </div>
                        <div>
                            <p className="font-medium">
                                {isOnline ? 'En ligne' : 'Hors ligne'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {isOnline
                                    ? 'Connecte au serveur'
                                    : 'Mode hors ligne actif'
                                }
                            </p>
                        </div>
                    </div>

                    {/* Pending Mutations */}
                    {pendingCount > 0 && (
                        <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1">
                                <p className="text-sm font-medium">
                                    {pendingCount} modification{pendingCount > 1 ? 's' : ''} en attente
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {isOnline
                                        ? 'Sera synchronise automatiquement'
                                        : 'Sera synchronise quand en ligne'
                                    }
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Sync Error */}
                    {syncError && (
                        <div className="flex items-start gap-3 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                                    Erreur de synchronisation
                                </p>
                                <p className="text-xs text-red-600 dark:text-red-300">
                                    {syncError}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Last Sync */}
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Derniere synchronisation</span>
                        <span className="flex items-center gap-1.5">
                            {lastSyncTime && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            )}
                            {formatLastSync(lastSyncTime)}
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => cacheAll()}
                            disabled={isSyncing || !isOnline}
                        >
                            <RefreshCw className={cn(
                                'h-4 w-4 mr-2',
                                isSyncing && 'animate-spin'
                            )} />
                            Rafraichir cache
                        </Button>
                        <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => sync()}
                            disabled={isSyncing || !isOnline || pendingCount === 0}
                        >
                            {isSyncing ? (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Sync...
                                </>
                            ) : (
                                <>
                                    <Cloud className="h-4 w-4 mr-2" />
                                    Synchroniser
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}

/**
 * Compact sync indicator for mobile nav
 */
export function SyncIndicatorCompact() {
    const { isOnline, isSyncing, pendingCount, sync } = useOfflineSync()

    return (
        <Button
            variant="ghost"
            size="icon"
            className={cn(
                'relative',
                !isOnline && 'text-orange-500'
            )}
            onClick={() => isOnline && pendingCount > 0 && sync()}
            disabled={isSyncing || !isOnline}
        >
            {isSyncing ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
            ) : isOnline ? (
                <Cloud className="h-5 w-5" />
            ) : (
                <CloudOff className="h-5 w-5" />
            )}

            {pendingCount > 0 && (
                <span className={cn(
                    'absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium',
                    isOnline
                        ? 'bg-blue-500 text-white'
                        : 'bg-orange-500 text-white'
                )}>
                    {pendingCount > 9 ? '9+' : pendingCount}
                </span>
            )}

            <span className="sr-only">
                {isOnline ? 'En ligne' : 'Hors ligne'}
                {pendingCount > 0 ? ` - ${pendingCount} en attente` : ''}
            </span>
        </Button>
    )
}

/**
 * Offline banner displayed when offline
 */
export function OfflineBanner() {
    const { isOnline, pendingCount } = useOfflineSync()

    if (isOnline) return null

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium safe-area-top">
            <CloudOff className="h-4 w-4" />
            <span>Mode hors ligne</span>
            {pendingCount > 0 && (
                <span>
                    - {pendingCount} modification{pendingCount > 1 ? 's' : ''} en attente
                </span>
            )}
        </div>
    )
}

export default SyncIndicator
