import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { apiClient } from '@/lib/api/core'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, Loader2, Sparkles, Check, AlertTriangle, Link2, Plus, Package } from 'lucide-react'
import { toast } from 'sonner'

interface MatchedItem {
  productName: string
  quantity: number | null
  unit: string | null
  unitPrice: number | null
  totalPrice: number | null
  match: {
    matched: boolean
    source: 'memory' | 'fuzzy' | 'none'
    productId: string | null
    productName: string | null
    productUnit: string | null
    confidence: number
    mappingId: string | null
  }
  // User overrides
  selectedProductId?: string
}

interface ExtractedData {
  supplierName: string | null
  date: string | null
  items: MatchedItem[]
  totalAmount: number | null
  deliveryNumber: string | null
  parseError?: boolean
  raw?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onDeliveryCreated?: () => void
}

export function AIDeliveryScanner({ open, onClose, onDeliveryCreated }: Props) {
  const [ocrText, setOcrText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [result, setResult] = useState<ExtractedData | null>(null)
  const [llmAvailable, setLlmAvailable] = useState<boolean | null>(null)
  const queryClient = useQueryClient()

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiClient.get<any[]>('/products'),
    staleTime: 30000,
  })

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => apiClient.get<any[]>('/suppliers'),
    staleTime: 60000,
  })

  useEffect(() => {
    if (open) {
      apiClient.get<{available: boolean}>('/llm/status')
        .then(s => setLlmAvailable(s.available))
        .catch(() => setLlmAvailable(false))
    }
  }, [open])

  const handleAnalyze = async () => {
    if (!ocrText.trim()) return
    setIsProcessing(true)
    setResult(null)

    try {
      const data = await apiClient.post<{ extracted: any; parseError: boolean; raw?: string }>('/llm/extract-and-match', {
        ocrText,
        supplierId: null,
      })

      if (data.parseError) {
        setResult({ supplierName: null, date: null, items: [], totalAmount: null, deliveryNumber: null, parseError: true, raw: data.raw })
        toast.warning('Extraction partielle')
      } else {
        setResult(data.extracted)
        const matched = (data.extracted?.items || []).filter((i: any) => i.match?.matched).length
        const total = data.extracted?.items?.length || 0
        toast.success(`${matched}/${total} produits reconnus`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur LLM')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleProductSelect = (itemIndex: number, productId: string) => {
    if (!result) return
    const items = [...result.items]
    items[itemIndex] = { ...items[itemIndex], selectedProductId: productId }
    setResult({ ...result, items })
  }

  const handleCreateDelivery = async () => {
    if (!result) return

    setIsCreating(true)
    try {
      // Find or match supplier
      const supplierMatch = suppliers.find((s: any) =>
        s.name?.toLowerCase().includes((result.supplierName || '').toLowerCase()) ||
        (result.supplierName || '').toLowerCase().includes(s.name?.toLowerCase())
      )

      // Build delivery items — only items with a matched or selected product
      const deliveryItems = result.items
        .map(item => {
          const productId = item.selectedProductId || item.match?.productId
          if (!productId || !item.quantity) return null
          const product = products.find((p: any) => p.id === productId)
          return {
            productId,
            productName: product?.name || item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice || 0,
          }
        })
        .filter(Boolean)

      if (deliveryItems.length === 0) {
        toast.error('Aucun produit associé à entrer en stock')
        setIsCreating(false)
        return
      }

      // Create delivery via API
      await apiClient.post('/deliveries', {
        date: result.date || new Date().toISOString().split('T')[0],
        supplierName: result.supplierName || 'Inconnu',
        supplierId: supplierMatch?.id || null,
        items: deliveryItems,
      })

      // Learn all mappings for future use
      for (const item of result.items) {
        const productId = item.selectedProductId || item.match?.productId
        if (productId && item.productName) {
          try {
            await apiClient.post('/product-mappings/learn', {
              externalName: item.productName,
              productId,
              supplierId: supplierMatch?.id || null,
            })
          } catch { /* silent */ }
        }
      }

      toast.success(`Livraison créée — ${deliveryItems.length} produits entrés en stock`)
      queryClient.invalidateQueries({ queryKey: ['deliveries'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      onDeliveryCreated?.()
      onClose()
      setOcrText('')
      setResult(null)
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création')
    } finally {
      setIsCreating(false)
    }
  }

  const handleReset = () => { setOcrText(''); setResult(null) }

  const matchedCount = result?.items?.filter(i => i.match?.matched || i.selectedProductId).length || 0
  const totalItems = result?.items?.length || 0

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); handleReset() } }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Analyse IA — Bon de livraison
            {llmAvailable === true && <Badge variant="outline" className="text-green-600">IA connectée</Badge>}
            {llmAvailable === false && <Badge variant="destructive">IA hors ligne</Badge>}
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Collez le texte du bon de livraison. L'IA extraira les produits et les associera automatiquement à votre inventaire.
            </p>
            <Textarea
              value={ocrText}
              onChange={e => setOcrText(e.target.value)}
              placeholder={"Collez le texte du bon ici...\n\nExemple:\nMETRO — 15/03/2026\nTomates cerises 5kg 2.50€/kg\nPoulet fermier 10kg 8.90€/kg\nHuile olive 5L 6.20€/L"}
              className="min-h-[200px] font-mono text-sm"
            />
            <div className="flex gap-2">
              <Button onClick={handleAnalyze} disabled={isProcessing || !ocrText.trim() || llmAvailable === false} className="flex-1">
                {isProcessing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyse en cours...</> : <><Sparkles className="h-4 w-4 mr-2" />Analyser</>}
              </Button>
              <Button variant="outline" onClick={onClose}>Annuler</Button>
            </div>
          </div>
        ) : result.parseError ? (
          <div className="space-y-4">
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <span className="font-medium">Extraction échouée</span>
                </div>
                <pre className="text-xs whitespace-pre-wrap">{result.raw}</pre>
              </CardContent>
            </Card>
            <Button variant="outline" onClick={handleReset} className="w-full">Recommencer</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Supplier + date header */}
            <div className="grid grid-cols-2 gap-3">
              <Card><CardContent className="pt-3 pb-3"><div className="text-xs text-muted-foreground">Fournisseur</div><div className="font-medium">{result.supplierName || '—'}</div></CardContent></Card>
              <Card><CardContent className="pt-3 pb-3"><div className="text-xs text-muted-foreground">Date</div><div className="font-medium">{result.date || '—'}</div></CardContent></Card>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2">
              <Badge variant={matchedCount === totalItems ? 'default' : 'secondary'}>
                {matchedCount}/{totalItems} produits associés
              </Badge>
              {matchedCount < totalItems && (
                <span className="text-xs text-muted-foreground">Associez les produits manquants ci-dessous</span>
              )}
            </div>

            {/* Items with matching */}
            <div className="space-y-2">
              {result.items?.map((item, i) => {
                const isMatched = item.match?.matched || !!item.selectedProductId
                const selectedId = item.selectedProductId || item.match?.productId

                return (
                  <Card key={i} className={isMatched ? 'border-green-200 dark:border-green-900' : 'border-orange-200 dark:border-orange-900'}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{item.productName}</span>
                            <span className="text-xs text-muted-foreground">
                              {item.quantity} {item.unit || ''}
                              {item.unitPrice != null && ` × ${item.unitPrice.toFixed(2)}€`}
                            </span>
                          </div>

                          {/* Match status */}
                          {item.match?.matched && !item.selectedProductId ? (
                            <div className="flex items-center gap-1 mt-1">
                              {item.match.source === 'memory' ? (
                                <Badge variant="outline" className="text-green-600 text-xs"><Link2 className="h-3 w-3 mr-1" />Mémorisé → {item.match.productName}</Badge>
                              ) : (
                                <Badge variant="outline" className="text-blue-600 text-xs"><Package className="h-3 w-3 mr-1" />Similaire → {item.match.productName}</Badge>
                              )}
                            </div>
                          ) : null}

                          {/* Product selector for unmatched or override */}
                          {(!isMatched || item.selectedProductId) && (
                            <div className="mt-2">
                              <Select value={selectedId || ''} onValueChange={v => handleProductSelect(i, v)}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Associer à un produit..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map((p: any) => (
                                    <SelectItem key={p.id} value={p.id} className="text-xs">
                                      {p.name} ({p.category})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* Override button for auto-matched items */}
                          {item.match?.matched && !item.selectedProductId && (
                            <button className="text-xs text-muted-foreground hover:text-foreground mt-1" onClick={() => handleProductSelect(i, item.match!.productId!)}>
                              Modifier l'association
                            </button>
                          )}
                        </div>

                        {/* Status icon */}
                        <div className="flex-shrink-0 mt-1">
                          {isMatched ? (
                            <Check className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Total */}
            {result.totalAmount != null && (
              <div className="flex justify-between text-sm font-medium px-1">
                <span>Total bon</span>
                <span>{result.totalAmount.toFixed(2)} €</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={handleCreateDelivery} disabled={isCreating || matchedCount === 0} className="flex-1">
                {isCreating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Création...</> : <><Plus className="h-4 w-4 mr-2" />Entrer en stock ({matchedCount} produits)</>}
              </Button>
              <Button variant="outline" onClick={handleReset}>Recommencer</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
