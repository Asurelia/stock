import { AlertsPanel } from '@/components/alerts/AlertsPanel'
import { OrderSuggestions } from '@/components/orders/OrderSuggestions'
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { apiClient } from "@/lib/api/core"
import { ACTION_LABELS } from "@/lib/api/activityLog"
import type { ActivityAction } from "@/lib/api/activityLog"
import { StatCard } from "@/components/dashboard/StatCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, ShoppingCart, DollarSign, AlertTriangle, TrendingDown, Clock, Thermometer } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, CartesianGrid
} from 'recharts'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

interface ExpiringLot {
    id: string
    productName: string
    lotNumber: string
    expiryDate: string
}

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

    const { data: expiringLots } = useQuery({
        queryKey: ['product-lots', 'expiring'],
        queryFn: () => apiClient.get<ExpiringLot[]>('/product-lots/expiring?days=7')
    })

    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const { data: todayReadings } = useQuery({
        queryKey: ['temperature-readings', 'today'],
        queryFn: () => api.temperatureReadings.getByDateRange(todayStr, todayStr)
    })

    const nonCompliantReadings = todayReadings?.filter(r => r.is_compliant === false) || []

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

    // Category distribution data for charts
    const categoryMap = products?.reduce((acc, p) => {
        const cat = p.category || 'Autre'
        if (!acc[cat]) acc[cat] = { count: 0, totalValue: 0 }
        acc[cat].count += 1
        acc[cat].totalValue += p.price * p.quantity
        return acc
    }, {} as Record<string, { count: number; totalValue: number }>) || {}

    const categoryData = Object.entries(categoryMap)
        .map(([category, stats]) => ({
            category,
            count: stats.count,
            totalValue: stats.totalValue,
        }))
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 8)

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

            {/* Stock Alerts + Expiring Lots */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Stock Alerts */}
                <Card className="p-6">
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

                {/* Expiring Lots */}
                {expiringLots && expiringLots.length > 0 ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-orange-500" />
                                DLC/DDM à surveiller
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-0 max-h-[280px] overflow-y-auto">
                                {expiringLots.map(lot => (
                                    <div key={lot.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                        <span className="text-sm">{lot.productName} — Lot {lot.lotNumber}</span>
                                        <Badge variant="destructive">{lot.expiryDate}</Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle className="h-4 w-4 text-green-500" />
                            <h3 className="font-semibold">DLC/DDM</h3>
                        </div>
                        <p className="text-sm text-muted-foreground py-4 text-center">
                            Aucun produit n'expire dans les 7 prochains jours
                        </p>
                    </Card>
                )}
            </div>

            {/* Temperature Alerts */}
            {nonCompliantReadings.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Thermometer className="h-5 w-5 text-red-500" />
                            Alertes température du jour
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-0 max-h-[200px] overflow-y-auto">
                            {nonCompliantReadings.map(reading => (
                                <div key={reading.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">
                                            {reading.temperature_equipment?.name || 'Équipement'}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            ({reading.temperature_equipment?.type || '—'})
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="destructive">{reading.temperature}°C</Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {format(new Date(reading.recorded_at), 'HH:mm')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Charts: Bar + Pie side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Value Bar Chart */}
                <Card className="p-6">
                    <h3 className="font-semibold mb-4">Valeur stock par catégorie</h3>
                    {categoryData.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">Aucun produit</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={categoryData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="category" fontSize={12} />
                                <YAxis />
                                <Tooltip formatter={(v: number) => [`${v.toFixed(2)} \u20ac`, 'Valeur']} />
                                <Bar dataKey="totalValue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </Card>

                {/* Category Distribution Pie Chart */}
                <Card className="p-6">
                    <h3 className="font-semibold mb-4">Répartition par catégorie</h3>
                    {categoryData.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">Aucun produit</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    dataKey="count"
                                    nameKey="category"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={({ name, percent }: any) =>
                                        `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`
                                    }
                                >
                                    {categoryData.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </Card>
            </div>

            {/* Today's Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            {/* Alertes et suggestions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AlertsPanel />
                <OrderSuggestions />
            </div>
        </div>
    )
}
