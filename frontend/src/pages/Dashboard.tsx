import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { StatCard } from "@/components/dashboard/StatCard"
import { Package, ShoppingCart, DollarSign, AlertTriangle } from "lucide-react"

export function Dashboard() {
    const { data: products } = useQuery({
        queryKey: ['products'],
        queryFn: api.products.getAll
    })

    // Calculate stats
    const totalProducts = products?.length || 0
    const totalValue = products?.reduce((acc, p) => acc + (p.price * p.quantity), 0) || 0
    const lowStockCount = products?.filter(p => p.minStock > 0 && p.quantity <= p.minStock).length || 0
    const outOfStockCount = products?.filter(p => p.quantity === 0).length || 0

    const formattedValue = new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
    }).format(totalValue)

    return (
        <div className="p-8 space-y-8">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Produits"
                    value={totalProducts}
                    icon={Package}
                    description="Articles en stock"
                />
                <StatCard
                    title="Valeur du Stock"
                    value={formattedValue}
                    icon={DollarSign}
                    description="Valeur totale estimée"
                />
                <StatCard
                    title="Stock Faible"
                    value={lowStockCount}
                    icon={AlertTriangle}
                    description="Articles à recommander"
                    trend={lowStockCount > 0 ? "Alertes actives" : undefined}
                />
                <StatCard
                    title="Ruptures"
                    value={outOfStockCount}
                    icon={ShoppingCart}
                    description="Articles épuisés"
                />
            </div>

            {/* Placeholder for charts or recent activity */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 rounded-xl border bg-card text-card-foreground shadow p-6">
                    <h3 className="font-semibold leading-none tracking-tight mb-4">Aperçu Récent</h3>
                    <p className="text-sm text-muted-foreground">Activité récente du stock.</p>
                </div>
            </div>
        </div>
    )
}
