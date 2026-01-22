import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api, ACTION_LABELS, type ActivityAction } from "@/lib/api"
import { format, subDays, addDays } from "date-fns"
import { fr } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Calendar, Clock, FileText, Loader2 } from "lucide-react"

export default function ActivityLogPage() {
    const [selectedDate, setSelectedDate] = useState(new Date())
    const dateStr = format(selectedDate, 'yyyy-MM-dd')

    const { data: logs = [], isLoading } = useQuery({
        queryKey: ['activity-log', dateStr],
        queryFn: () => api.activityLog.getByDate(dateStr)
    })

    const goToPreviousDay = () => setSelectedDate(prev => subDays(prev, 1))
    const goToNextDay = () => setSelectedDate(prev => addDays(prev, 1))
    const goToToday = () => setSelectedDate(new Date())

    const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

    // Group logs by hour
    const logsByHour = logs.reduce((acc, log) => {
        const hour = format(new Date(log.createdAt), 'HH:00')
        if (!acc[hour]) acc[hour] = []
        acc[hour].push(log)
        return acc
    }, {} as Record<string, typeof logs>)

    const getActionColor = (action: string): string => {
        if (action.includes('created') || action.includes('login')) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        if (action.includes('deleted') || action.includes('logout')) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        if (action.includes('updated') || action.includes('configured')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
        if (action.includes('executed') || action.includes('recorded')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }

    const formatDetails = (details: Record<string, unknown> | null): string => {
        if (!details) return ''
        const parts: string[] = []
        if (details.productName) parts.push(`Produit: ${details.productName}`)
        if (details.quantity) parts.push(`Quantité: ${details.quantity}`)
        if (details.reason) parts.push(`Raison: ${details.reason}`)
        if (details.temperature) parts.push(`Temp: ${details.temperature}°C`)
        if (details.equipmentName) parts.push(`Équipement: ${details.equipmentName}`)
        if (details.supplierName) parts.push(`Fournisseur: ${details.supplierName}`)
        if (details.staffName) parts.push(`Collaborateur: ${details.staffName}`)
        if (details.recipeName) parts.push(`Recette: ${details.recipeName}`)
        return parts.join(' • ')
    }

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <FileText className="h-8 w-8 text-primary" />
                        Journal d'activité
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Historique de toutes les actions effectuées
                    </p>
                </div>
            </div>

            {/* Date Navigation */}
            <Card>
                <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                        <Button variant="outline" onClick={goToPreviousDay}>
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Jour précédent
                        </Button>
                        
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-lg font-semibold">
                                <Calendar className="h-5 w-5 text-primary" />
                                {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
                            </div>
                            {!isToday && (
                                <Button variant="outline" size="sm" onClick={goToToday}>
                                    Aujourd'hui
                                </Button>
                            )}
                        </div>

                        <Button 
                            variant="outline" 
                            onClick={goToNextDay}
                            disabled={isToday}
                        >
                            Jour suivant
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{logs.length}</div>
                        <div className="text-sm text-muted-foreground">Actions totales</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">
                            {logs.filter(l => l.action.includes('created')).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Créations</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-blue-600">
                            {logs.filter(l => l.action.includes('updated') || l.action.includes('configured')).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Modifications</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-purple-600">
                            {logs.filter(l => l.action.includes('executed') || l.action.includes('recorded')).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Exécutions</div>
                    </CardContent>
                </Card>
            </div>

            {/* Activity Log */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Activités du jour
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Aucune activité enregistrée pour cette journée</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(logsByHour)
                                .sort(([a], [b]) => b.localeCompare(a))
                                .map(([hour, hourLogs]) => (
                                    <div key={hour}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Badge variant="outline" className="font-mono">
                                                {hour}
                                            </Badge>
                                            <span className="text-sm text-muted-foreground">
                                                {hourLogs.length} action(s)
                                            </span>
                                        </div>
                                        <div className="space-y-2 ml-4 border-l-2 border-muted pl-4">
                                            {hourLogs.map(log => (
                                                <div 
                                                    key={log.id}
                                                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                                >
                                                    <div className="text-2xl">{log.userEmoji}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-medium">{log.userName}</span>
                                                            <Badge className={getActionColor(log.action)}>
                                                                {ACTION_LABELS[log.action as ActivityAction] || log.action}
                                                            </Badge>
                                                            <span className="text-xs text-muted-foreground font-mono">
                                                                {format(new Date(log.createdAt), 'HH:mm:ss')}
                                                            </span>
                                                        </div>
                                                        {log.details && (
                                                            <p className="text-sm text-muted-foreground mt-1 truncate">
                                                                {formatDetails(log.details)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
