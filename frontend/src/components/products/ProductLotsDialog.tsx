import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/core'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Package, Calendar } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  productId: string
  productName: string
  open: boolean
  onClose: () => void
}

export function ProductLotsDialog({ productId, productName, open, onClose }: Props) {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ lotNumber: '', quantity: '', expiryDate: '', expiryType: 'DLC', notes: '' })

  const { data: lots = [], isLoading } = useQuery({
    queryKey: ['product-lots', productId],
    queryFn: () => apiClient.get<any[]>(`/product-lots?productId=${productId}`),
    enabled: open,
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/product-lots', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-lots'] })
      setShowAdd(false)
      setForm({ lotNumber: '', quantity: '', expiryDate: '', expiryType: 'DLC', notes: '' })
      toast.success('Lot ajouté')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.del(`/product-lots/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-lots'] })
      toast.success('Lot supprimé')
    },
  })

  const handleAdd = () => {
    if (!form.quantity || !form.expiryDate) { toast.error('Quantité et date requis'); return }
    createMutation.mutate({
      productId,
      lotNumber: form.lotNumber,
      quantity: parseFloat(form.quantity),
      expiryDate: form.expiryDate,
      expiryType: form.expiryType,
      notes: form.notes,
    })
  }

  const getDaysUntil = (dateStr: string) => {
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
    return diff
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Lots — {productName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-4">Chargement...</p>
          ) : lots.length === 0 && !showAdd ? (
            <p className="text-center text-muted-foreground py-4">Aucun lot enregistré</p>
          ) : (
            lots.map((lot: any) => {
              const days = getDaysUntil(lot.expiryDate)
              return (
                <div key={lot.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {lot.lotNumber || 'Sans numéro'} — {lot.quantity} unités
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{lot.expiryType}: {lot.expiryDate}</span>
                      <Badge variant={days <= 2 ? 'destructive' : days <= 7 ? 'secondary' : 'outline'} className="text-xs">
                        {days <= 0 ? 'Expiré' : `${days}j`}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(lot.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )
            })
          )}

          {showAdd && (
            <div className="space-y-3 p-3 rounded-lg border bg-muted/50">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">N° Lot</Label>
                  <Input value={form.lotNumber} onChange={e => setForm(f => ({...f, lotNumber: e.target.value}))} placeholder="Optionnel" />
                </div>
                <div>
                  <Label className="text-xs">Quantité *</Label>
                  <Input type="number" value={form.quantity} onChange={e => setForm(f => ({...f, quantity: e.target.value}))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Date d'expiration *</Label>
                  <Input type="date" value={form.expiryDate} onChange={e => setForm(f => ({...f, expiryDate: e.target.value}))} />
                </div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={form.expiryType} onValueChange={v => setForm(f => ({...f, expiryType: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DLC">DLC</SelectItem>
                      <SelectItem value="DDM">DDM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd} disabled={createMutation.isPending}>Ajouter</Button>
                <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
              </div>
            </div>
          )}

          {!showAdd && (
            <Button variant="outline" className="w-full" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-2" />Ajouter un lot
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
