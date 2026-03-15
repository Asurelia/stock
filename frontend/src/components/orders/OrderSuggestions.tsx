import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShoppingCart, TrendingDown, Copy } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { toast } from 'sonner'

interface OrderSuggestion {
  productId: string
  productName: string
  category: string
  currentStock: number
  minStock: number
  unit: string
  avgDailyConsumption: number
  daysUntilStockout: number
  suggestedQuantity: number
  preferredSupplier?: string
}

export function OrderSuggestions() {
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiClient.get<any[]>('/products'),
    staleTime: 30000,
  })

  const from = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const to = format(new Date(), 'yyyy-MM-dd')

  const { data: stats } = useQuery({
    queryKey: ['analytics', 'stats', from, to],
    queryFn: () => apiClient.get<any>(`/analytics/stats?from=${from}&to=${to}`),
    staleTime: 60000,
  })

  // Calculate suggestions
  const suggestions: OrderSuggestion[] = products
    .filter((p: any) => p.minStock > 0)
    .map((p: any) => {
      const consumed = stats?.topConsumption?.find((c: any) => c.productId === p.id)
      const avgDaily = consumed ? consumed.totalQuantity / 30 : 0
      const daysLeft = avgDaily > 0 ? Math.floor(p.quantity / avgDaily) : 999
      const suggestedQty = Math.max(0, Math.ceil((p.minStock * 2) - p.quantity))

      return {
        productId: p.id,
        productName: p.name,
        category: p.category,
        currentStock: p.quantity,
        minStock: p.minStock,
        unit: p.unit,
        avgDailyConsumption: Math.round(avgDaily * 10) / 10,
        daysUntilStockout: daysLeft,
        suggestedQuantity: suggestedQty,
      }
    })
    .filter(s => s.suggestedQuantity > 0 || s.daysUntilStockout <= 7)
    .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout)

  const copyOrderList = () => {
    const text = suggestions
      .map(s => `${s.productName}: ${s.suggestedQuantity} ${s.unit}`)
      .join('\n')
    navigator.clipboard.writeText(text)
    toast.success('Liste copiee dans le presse-papiers')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Suggestions de commande
          </CardTitle>
          {suggestions.length > 0 && (
            <Button variant="outline" size="sm" onClick={copyOrderList}>
              <Copy className="h-4 w-4 mr-2" />
              Copier la liste
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">Tous les stocks sont suffisants</p>
        ) : (
          <div className="space-y-3">
            {suggestions.map(s => (
              <div key={s.productId} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <TrendingDown className={`h-5 w-5 flex-shrink-0 ${s.daysUntilStockout <= 3 ? 'text-red-500' : 'text-orange-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{s.productName}</div>
                  <div className="text-xs text-muted-foreground">
                    Stock: {s.currentStock} {s.unit} | Conso. moy: {s.avgDailyConsumption}/j | {s.daysUntilStockout <= 999 ? `${s.daysUntilStockout}j avant rupture` : 'Stable'}
                  </div>
                </div>
                <Badge variant={s.daysUntilStockout <= 3 ? 'destructive' : 'secondary'}>
                  +{s.suggestedQuantity} {s.unit}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
