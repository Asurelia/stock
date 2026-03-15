import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Camera, Upload, Loader2, FileText, Package, X } from 'lucide-react'
import { toast } from 'sonner'

interface AnalysisResult {
  analysis: string
  structured: any | null
}

interface Props {
  onAnalyzed?: (result: AnalysisResult) => void
}

export function AIImageAnalyzer({ onAnalyzed }: Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Fichier image requis')
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)

    // Upload and analyze
    setIsAnalyzing(true)
    setResult(null)

    try {
      const token = localStorage.getItem('stockpro_auth_token')
      const formData = new FormData()
      formData.append('image', file)

      const res = await fetch('/api/llm/analyze-image', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })

      if (!res.ok) throw new Error('Analyse échouée')

      const data: AnalysisResult = await res.json()
      setResult(data)
      onAnalyzed?.(data)

      if (data.structured?.type === 'bon_livraison') {
        toast.success(`Bon analysé: ${data.structured.items?.length || 0} produits détectés`)
      } else {
        toast.success('Image analysée')
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur d\'analyse')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleReset = () => {
    setPreview(null)
    setResult(null)
  }

  return (
    <div className="space-y-3">
      {/* Upload area */}
      {!preview && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-all"
        >
          <Camera className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm font-medium">Cliquez ou déposez une image</p>
          <p className="text-xs text-muted-foreground mt-1">Bon de livraison, facture, étiquette produit...</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
              e.target.value = ''
            }}
          />
        </div>
      )}

      {/* Preview + Analysis */}
      {preview && (
        <div className="space-y-3">
          <div className="relative">
            <img src={preview} alt="Preview" className="w-full max-h-48 object-contain rounded-lg border" />
            <button onClick={handleReset} className="absolute top-2 right-2 bg-background/80 rounded-full p-1 hover:bg-background">
              <X className="h-4 w-4" />
            </button>
          </div>

          {isAnalyzing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyse de l'image par Qwen Vision...
            </div>
          )}

          {result && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                {result.structured?.type === 'bon_livraison' ? (
                  <>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium text-sm">Bon de livraison détecté</span>
                      <Badge variant="outline">
                        {result.structured.items?.length || 0} produits
                      </Badge>
                    </div>
                    {result.structured.supplierName && (
                      <div className="text-sm">Fournisseur: <strong>{result.structured.supplierName}</strong></div>
                    )}
                    {result.structured.date && (
                      <div className="text-sm">Date: <strong>{result.structured.date}</strong></div>
                    )}
                    {result.structured.items?.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <Package className="h-3 w-3 text-muted-foreground" />
                          <span>{item.productName}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {item.quantity} {item.unit || ''}
                          {item.unitPrice != null && ` × ${item.unitPrice}€`}
                        </span>
                      </div>
                    ))}
                    {result.structured.totalAmount != null && (
                      <div className="flex justify-between font-medium text-sm pt-2 border-t">
                        <span>Total</span>
                        <span>{result.structured.totalAmount}€</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm whitespace-pre-wrap">{result.analysis}</div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
