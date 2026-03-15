import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, Package, Thermometer, Clock, AlertTriangle } from 'lucide-react'

interface Alert {
  id: string
  type: 'low_stock' | 'out_of_stock' | 'temperature' | 'expiry'
  severity: 'warning' | 'critical'
  title: string
  message: string
  timestamp: string
}

export function useAlerts() {
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiClient.get<any[]>('/products'),
    staleTime: 30000,
  })

  const { data: expiringLots = [] } = useQuery({
    queryKey: ['product-lots', 'expiring'],
    queryFn: () => apiClient.get<any[]>('/product-lots/expiring?days=7').catch(() => []),
    staleTime: 60000,
  })

  const alerts: Alert[] = []
  const now = new Date().toISOString()

  // Stock alerts
  products.forEach((p: any) => {
    if (p.quantity <= 0) {
      alerts.push({
        id: `stock-${p.id}`,
        type: 'out_of_stock',
        severity: 'critical',
        title: `Rupture: ${p.name}`,
        message: `Le produit ${p.name} est en rupture de stock`,
        timestamp: now,
      })
    } else if (p.minStock > 0 && p.quantity <= p.minStock) {
      alerts.push({
        id: `low-${p.id}`,
        type: 'low_stock',
        severity: 'warning',
        title: `Stock bas: ${p.name}`,
        message: `${p.quantity} ${p.unit} restant(s) (seuil: ${p.minStock})`,
        timestamp: now,
      })
    }
  })

  // Expiry alerts
  expiringLots.forEach((lot: any) => {
    alerts.push({
      id: `expiry-${lot.id}`,
      type: 'expiry',
      severity: lot.daysUntilExpiry <= 2 ? 'critical' : 'warning',
      title: `Expiration: ${lot.productName}`,
      message: `Lot ${lot.lotNumber || 'N/A'} expire le ${lot.expiryDate}`,
      timestamp: now,
    })
  })

  return { alerts, criticalCount: alerts.filter(a => a.severity === 'critical').length, totalCount: alerts.length }
}

const ICONS = {
  low_stock: Package,
  out_of_stock: Package,
  temperature: Thermometer,
  expiry: Clock,
}

const COLORS = {
  critical: 'text-red-600 bg-red-50 dark:bg-red-950',
  warning: 'text-orange-600 bg-orange-50 dark:bg-orange-950',
}

export function AlertsPanel() {
  const { alerts } = useAlerts()

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Bell className="h-8 w-8 mb-2 opacity-50" />
          <p>Aucune alerte active</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Alertes ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
        {alerts.map(alert => {
          const Icon = ICONS[alert.type]
          return (
            <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg ${COLORS[alert.severity]}`}>
              <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{alert.title}</div>
                <div className="text-xs opacity-80">{alert.message}</div>
              </div>
              <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'} className="flex-shrink-0">
                {alert.severity === 'critical' ? 'Critique' : 'Attention'}
              </Badge>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
