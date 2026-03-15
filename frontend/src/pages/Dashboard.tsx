import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ACTION_LABELS } from "@/lib/api/activityLog"
import type { ActivityAction } from "@/lib/api/activityLog"
import { StatCard } from "@/components/dashboard/StatCard"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, ShoppingCart, DollarSign, AlertTriangle, TrendingDown, Clock } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

export function Dashboard() {
    const { data: products } = useQuery({
        queryKey: ['products'],
        queryFn: api.products.getAll
    })

    const { data: todayOutputs } = useQuery({
        queryKey: ['outputs', 'today'],
        queryFn: api.outputs.getToday
    })

    const { data: recentLogs } = useQuery({
        queryKey: ['activity-log', 'recent'],
        queryFn: () => api.activityLog.getByDate(format(new Date(), 'yyyy-MM-dd'))
    })

    // Stats
    const totalProducts = products?.length || 0
    const totalValue = products?.reduce((acc, p) => acc + (p.price * p.quantity), 0) || 0
    const lowStockProducts = products?.filter(p => p.minStock > 0 && p.quantity <= p.minStock && p.quantity > 0) || []
    const outOfStockProducts = products?.filter(p => p.quantity === 0) || []
    const todayOutputCount = todayOutputs?.length || 0

    const formattedValue = new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
    }).format(totalValue)

    // Category distribution
    const categoryStats = products?.reduce((acc, p) => {
        const cat = p.category || 'Autre'
        acc[cat] = (acc[cat] || 0) + 1
        return acc
    }, {} as Record<string, number>) || {}

    const sortedCategories = Object.entries(categoryStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)

    const maxCategoryCount = Math.max(...sortedCategories.map(([, v]) => v), 1)

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h2>
                    <p className="text-muted-foreground text-sm">
                        {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
                    </p>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Produits"
                    value={totalProducts}
                    icon={Package}
                    description="Articles référencés"
                />
                <StatCard
                    title="Valeur Stock"
                    value={formattedValue}
                    icon={DollarSign}
                    description="Valeur totale"
                />
                <StatCard
                    title="Stock Faible"
                    value={lowStockProducts.length}
                    icon={AlertTriangle}
                    description="À recommander"
                    trend={lowStockProducts.length > 0 ? "warning" : undefined}
                />
                <StatCard
                    title="Ruptures"
                    value={outOfStockProducts.length}
                    icon={ShoppingCart}
                    description="Articles épuisés"
                    trend={outOfStockProducts.length > 0 ? "danger" : undefined}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Stock Alerts */}
                <Card className="col-span-1 lg:col-span-2 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            Alertes Stock
                        </h3>
                        <Link to="/products">
                            <Button variant="ghost" size="sm">Voir tout</Button>
                        </Link>
                    </div>

                    {outOfStockProducts.length === 0 && lowStockProducts.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                            Aucune alerte — tous les stocks sont suffisants
                        </p>
                    ) : (
                        <div className="space-y-2 max-h-[280px] overflow-y-auto">
                            {outOfStockProducts.slice(0, 5).map(p => (
                                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-950/30">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{p.emoji || '📦'}</span>
                                        <span className="text-sm font-medium">{p.name}</span>
                                    </div>
                                    <Badge variant="destructive">Rupture</Badge>
                                </div>
                            ))}
                            {lowStockProducts.slice(0, 5).map(p => (
                                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{p.emoji || '📦'}</span>
                                        <span className="text-sm font-medium">{p.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">
                                            {p.quantity}/{p.minStock}
                                        </span>
                                        <Badge className="bg-orange-500 hover:bg-orange-600">Faible</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Category Distribution */}
                <Card className="p-6">
                    <h3 className="font-semibold mb-4">Répartition par catégorie</h3>
                    {sortedCategories.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">Aucun produit</p>
                    ) : (
                        <div className="space-y-3">
                            {sortedCategories.map(([category, count]) => (
                                <div key={category} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="truncate">{category}</span>
                                        <span className="text-muted-foreground font-medium">{count}</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full transition-all"
                                            style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Today's Activity */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-blue-500" />
                            Sorties du jour
                        </h3>
                        <Badge variant="secondary">{todayOutputCount}</Badge>
                    </div>
                    {todayOutputCount === 0 ? (
                        <p className="text-sm text-muted-foreground py-2 text-center">
                            Aucune sortie enregistrée aujourd'hui
                        </p>
                    ) : (
                        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                            {todayOutputs?.slice(0, 8).map(o => (
                                <div key={o.id} className="flex items-center justify-between text-sm py-1.5">
                                    <span className="truncate">{o.productName || 'Produit'}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">-{o.quantity}</span>
                                        <span className="text-xs text-muted-foreground">{o.reason}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Clock className="h-4 w-4 text-green-500" />
                            Activité récente
                        </h3>
                        <Link to="/activity-log">
                            <Button variant="ghost" size="sm">Voir tout</Button>
                        </Link>
                    </div>
                    {(!recentLogs || recentLogs.length === 0) ? (
                        <p className="text-sm text-muted-foreground py-2 text-center">
                            Aucune activité aujourd'hui
                        </p>
                    ) : (
                        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                            {recentLogs?.slice(0, 8).map(log => (
                                <div key={log.id} className="flex items-center justify-between text-sm py-1.5">
                                    <span className="truncate">
                                        {ACTION_LABELS[log.action as ActivityAction] || log.action}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {log.createdAt ? format(new Date(log.createdAt), 'HH:mm') : ''}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    )
}
