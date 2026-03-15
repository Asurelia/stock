import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/core'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import { TrendingUp } from 'lucide-react'

interface Props {
  productId: string
  productName: string
  open: boolean
  onClose: () => void
}

export function PriceHistoryChart({ productId, productName, open, onClose }: Props) {
  const { data: trend = [], isLoading } = useQuery({
    queryKey: ['price-history', 'trend', productId],
    queryFn: () => apiClient.get<any[]>(`/price-history/product/${productId}/trend`),
    enabled: open,
  })

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Historique des prix — {productName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">Chargement...</p>
        ) : trend.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Aucun historique de prix disponible</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="recordedAt" tickFormatter={(v: string) => new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} fontSize={11} />
              <YAxis unit=" €" />
              <Tooltip formatter={(v: number) => [`${v.toFixed(2)} €`, 'Prix']} labelFormatter={(l: string) => new Date(l).toLocaleDateString('fr-FR')} />
              <Line type="monotone" dataKey="unitPrice" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Prix unitaire" />
              <Line type="monotone" dataKey="price" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Prix total" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </DialogContent>
    </Dialog>
  )
}
