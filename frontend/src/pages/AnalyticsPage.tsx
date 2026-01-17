import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { format, subDays } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, TrendingUp, TrendingDown, Package, Truck, BarChart3 } from "lucide-react"

export function AnalyticsPage() {
    const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
    const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))

    const { data: stats, isLoading } = useQuery({
        queryKey: ['analytics', dateFrom, dateTo],
        queryFn: () => api.analytics.getStats(dateFrom, dateTo)
    })

    const { data: products } = useQuery({
        queryKey: ['products'],
        queryFn: api.products.getAll
    })

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
    }

    // Calculate total stock value
    const totalStockValue = products?.reduce((sum, p) => sum + (p.quantity * p.price), 0) || 0

    // Get category colors
    const categoryColors: Record<string, string> = {
        'Légumes': 'bg-green-500',
        'Fruits': 'bg-yellow-500',
        'Viandes': 'bg-red-500',
        'Poissons': 'bg-blue-500',
        'Produits laitiers': 'bg-amber-500',
        'Épicerie sèche': 'bg-orange-500',
        'Surgelés': 'bg-indigo-500',
        'Boissons': 'bg-cyan-500',
        'Condiments': 'bg-pink-500',
        'Autre': 'bg-gray-500',
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
                    <p className="text-muted-foreground">
                        Analysez vos mouvements de stock et tendances
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-40"
                    />
                    <span className="text-muted-foreground">à</span>
                    <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-40"
                    />
                </div>
            </div>

            {/* Main Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Mouvements</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalMovements || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            sur la période sélectionnée
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Entrées</CardTitle>
                        <Truck className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            +{stats?.totalEntries?.toFixed(1) || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            unités reçues
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Sorties</CardTitle>
                        <TrendingDown className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            -{stats?.totalOutputs?.toFixed(1) || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            unités consommées
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Valeur Stock</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(totalStockValue)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            valeur actuelle
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Category Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Répartition par Catégorie
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats?.categoryStats && Object.keys(stats.categoryStats).length > 0 ? (
                            <div className="space-y-4">
                                {Object.entries(stats.categoryStats)
                                    .sort(([, a], [, b]) => b.value - a.value)
                                    .map(([category, data]) => {
                                        const percentage = totalStockValue > 0
                                            ? (data.value / totalStockValue) * 100
                                            : 0
                                        const color = categoryColors[category] || 'bg-gray-500'

                                        return (
                                            <div key={category} className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-3 h-3 rounded-full ${color}`} />
                                                        <span className="font-medium">{category}</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {data.count} produits
                                                        </Badge>
                                                    </div>
                                                    <span className="text-muted-foreground">
                                                        {formatCurrency(data.value)}
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${color} transition-all`}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">
                                Aucune donnée disponible
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Top Consumption */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingDown className="h-5 w-5" />
                            Top Consommations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats?.topConsumption && stats.topConsumption.length > 0 ? (
                            <div className="space-y-3">
                                {stats.topConsumption.map((item, index) => {
                                    const maxQty = stats.topConsumption[0].quantity
                                    const percentage = maxQty > 0 ? (item.quantity / maxQty) * 100 : 0

                                    return (
                                        <div key={item.name} className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-muted-foreground w-5">
                                                        #{index + 1}
                                                    </span>
                                                    <span className="font-medium">{item.name}</span>
                                                </div>
                                                <Badge variant="secondary">
                                                    {item.quantity.toFixed(1)} unités
                                                </Badge>
                                            </div>
                                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-orange-500 transition-all"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">
                                Aucune sortie sur cette période
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Stock Alerts */}
            <Card>
                <CardHeader>
                    <CardTitle>Produits à Surveiller</CardTitle>
                </CardHeader>
                <CardContent>
                    {products && products.filter(p =>
                        p.quantity <= 0 || (p.minStock > 0 && p.quantity <= p.minStock * 1.5)
                    ).length > 0 ? (
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {products
                                .filter(p => p.quantity <= 0 || (p.minStock > 0 && p.quantity <= p.minStock * 1.5))
                                .sort((a, b) => {
                                    const aRatio = a.minStock > 0 ? a.quantity / a.minStock : 999
                                    const bRatio = b.minStock > 0 ? b.quantity / b.minStock : 999
                                    return aRatio - bRatio
                                })
                                .map(product => {
                                    const isCritical = product.quantity <= 0 ||
                                        (product.minStock > 0 && product.quantity <= product.minStock)

                                    return (
                                        <div
                                            key={product.id}
                                            className={`p-3 rounded-lg border ${isCritical
                                                    ? 'bg-red-50 border-red-200'
                                                    : 'bg-orange-50 border-orange-200'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium">{product.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {product.category}
                                                    </p>
                                                </div>
                                                <Badge variant={isCritical ? "destructive" : "secondary"}>
                                                    {product.quantity} {product.unit}
                                                </Badge>
                                            </div>
                                            {product.minStock > 0 && (
                                                <p className="text-xs text-muted-foreground mt-2">
                                                    Stock min: {product.minStock} {product.unit}
                                                </p>
                                            )}
                                        </div>
                                    )
                                })}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">
                            Tous les stocks sont au-dessus des seuils d'alerte
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
