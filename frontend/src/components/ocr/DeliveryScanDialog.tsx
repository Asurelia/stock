import { useState, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { api, type Product, type DeliveryItem } from "@/lib/api"
import {
    processImage,
    saveCorrection,
    type MatchedItem,
    type OCRProgress,
    type OCRResult
} from "@/lib/ocr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Camera,
    Upload,
    Loader2,
    Check,
    X,
    AlertTriangle,
    Zap,
    RefreshCw,
    CheckCircle2,
    HelpCircle
} from "lucide-react"

interface DeliveryScanDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (items: DeliveryItem[]) => void
}

export function DeliveryScanDialog({ open, onOpenChange, onConfirm }: DeliveryScanDialogProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [progress, setProgress] = useState<OCRProgress>({ status: '', progress: 0 })
    const [result, setResult] = useState<OCRResult | null>(null)
    const [editedMatches, setEditedMatches] = useState<MatchedItem[]>([])
    const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())

    const { data: products } = useQuery({
        queryKey: ['products'],
        queryFn: api.products.getAll
    })

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !products) return

        // Preview
        const reader = new FileReader()
        reader.onload = (e) => setImagePreview(e.target?.result as string)
        reader.readAsDataURL(file)

        // Process OCR
        setIsProcessing(true)
        setResult(null)
        setEditedMatches([])
        setSelectedItems(new Set())

        try {
            const ocrResult = await processImage(file, products, setProgress)
            setResult(ocrResult)
            setEditedMatches(ocrResult.matches)

            // Auto-select high confidence matches
            const autoSelected = new Set<number>()
            ocrResult.matches.forEach((match, idx) => {
                if (match.matchScore >= 0.6 && match.product) {
                    autoSelected.add(idx)
                }
            })
            setSelectedItems(autoSelected)
        } catch (error) {
            console.error('OCR Error:', error)
        } finally {
            setIsProcessing(false)
        }
    }

    const toggleItem = (index: number) => {
        const newSelected = new Set(selectedItems)
        if (newSelected.has(index)) {
            newSelected.delete(index)
        } else {
            newSelected.add(index)
        }
        setSelectedItems(newSelected)
    }

    const updateMatch = (index: number, productId: string) => {
        const product = products?.find(p => p.id === productId)
        if (!product) return

        const newMatches = [...editedMatches]
        const oldMatch = newMatches[index]

        // Save correction for learning
        saveCorrection(oldMatch.parsed.name, productId, product.name)

        newMatches[index] = {
            ...oldMatch,
            product,
            matchScore: 1,
            matchType: 'exact',
            userCorrected: true,
            correctedProductId: productId
        }
        setEditedMatches(newMatches)

        // Auto-select corrected item
        setSelectedItems(prev => new Set([...prev, index]))
    }

    const updateQuantity = (index: number, quantity: number) => {
        const newMatches = [...editedMatches]
        newMatches[index] = {
            ...newMatches[index],
            parsed: {
                ...newMatches[index].parsed,
                quantity
            }
        }
        setEditedMatches(newMatches)
    }

    const updatePrice = (index: number, price: number) => {
        const newMatches = [...editedMatches]
        newMatches[index] = {
            ...newMatches[index],
            parsed: {
                ...newMatches[index].parsed,
                price
            }
        }
        setEditedMatches(newMatches)
    }

    const handleConfirm = () => {
        const items: DeliveryItem[] = []

        editedMatches.forEach((match, index) => {
            if (selectedItems.has(index) && match.product) {
                items.push({
                    productId: match.product.id,
                    productName: match.product.name,
                    quantity: match.parsed.quantity || 1,
                    price: match.parsed.price || 0
                })
            }
        })

        onConfirm(items)
        handleReset()
    }

    const handleReset = () => {
        setImagePreview(null)
        setResult(null)
        setEditedMatches([])
        setSelectedItems(new Set())
        setProgress({ status: '', progress: 0 })
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const getMatchBadge = (match: MatchedItem) => {
        if (match.userCorrected) {
            return <Badge className="bg-purple-500">Corrigé</Badge>
        }
        switch (match.matchType) {
            case 'exact':
                return <Badge className="bg-green-500">Exact</Badge>
            case 'partial':
                return <Badge className="bg-yellow-500">Partiel</Badge>
            case 'fuzzy':
                return <Badge className="bg-orange-500">Incertain</Badge>
            default:
                return <Badge variant="destructive">Non trouvé</Badge>
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Camera className="h-5 w-5" />
                        Scanner un Bon de Livraison
                    </DialogTitle>
                </DialogHeader>

                {!result ? (
                    <div className="space-y-4">
                        {/* Upload Area */}
                        <div
                            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                            {isProcessing ? (
                                <div className="space-y-4">
                                    <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                                    <div>
                                        <p className="font-medium">{progress.status}</p>
                                        <div className="w-full bg-secondary rounded-full h-2 mt-2">
                                            <div
                                                className="bg-primary h-2 rounded-full transition-all"
                                                style={{ width: `${progress.progress}%` }}
                                            />
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {progress.progress}%
                                        </p>
                                    </div>
                                </div>
                            ) : imagePreview ? (
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="max-h-64 mx-auto rounded"
                                />
                            ) : (
                                <div className="space-y-2">
                                    <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                                    <p className="text-lg font-medium">
                                        Cliquez ou déposez une image
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Photo du bon de livraison
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Tips */}
                        <Card>
                            <CardContent className="pt-4">
                                <h4 className="font-medium flex items-center gap-2 mb-2">
                                    <Zap className="h-4 w-4 text-yellow-500" />
                                    Conseils pour un meilleur scan
                                </h4>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                    <li>• Assurez-vous que le texte est bien éclairé et lisible</li>
                                    <li>• Évitez les reflets et les ombres</li>
                                    <li>• Le document doit être à plat et non froissé</li>
                                    <li>• Plus la résolution est haute, meilleur sera le résultat</li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Summary */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Badge variant="outline">
                                    {editedMatches.length} lignes détectées
                                </Badge>
                                <Badge variant="outline" className="bg-green-50">
                                    {selectedItems.size} sélectionnées
                                </Badge>
                                <Badge variant="outline">
                                    Confiance OCR: {Math.round(result.confidence * 100)}%
                                </Badge>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleReset}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Nouveau scan
                            </Button>
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-2 text-xs">
                            <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                Match exact
                            </span>
                            <span className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                                Match partiel - vérifiez
                            </span>
                            <span className="flex items-center gap-1">
                                <HelpCircle className="h-3 w-3 text-orange-500" />
                                Match incertain - sélectionnez manuellement
                            </span>
                            <span className="flex items-center gap-1">
                                <X className="h-3 w-3 text-red-500" />
                                Non trouvé
                            </span>
                        </div>

                        {/* Matches List */}
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {editedMatches.map((match, index) => (
                                <Card
                                    key={index}
                                    className={`${selectedItems.has(index)
                                        ? 'ring-2 ring-primary bg-primary/5'
                                        : 'opacity-60'
                                        }`}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            {/* Checkbox */}
                                            <button
                                                onClick={() => toggleItem(index)}
                                                className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selectedItems.has(index)
                                                    ? 'bg-primary border-primary text-white'
                                                    : 'border-muted-foreground'
                                                    }`}
                                            >
                                                {selectedItems.has(index) && <Check className="h-3 w-3" />}
                                            </button>

                                            {/* Content */}
                                            <div className="flex-1 space-y-2">
                                                {/* Raw text */}
                                                <p className="text-sm text-muted-foreground font-mono bg-secondary px-2 py-1 rounded">
                                                    {match.parsed.raw}
                                                </p>

                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                                    {/* Product Select */}
                                                    <div className="md:col-span-2">
                                                        <Label className="text-xs">Produit</Label>
                                                        <Select
                                                            value={match.product?.id || ''}
                                                            onValueChange={(v) => updateMatch(index, v)}
                                                        >
                                                            <SelectTrigger className="h-9">
                                                                <SelectValue placeholder="Sélectionner un produit" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {products?.map(p => (
                                                                    <SelectItem key={p.id} value={p.id}>
                                                                        {p.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {/* Quantity */}
                                                    <div>
                                                        <Label className="text-xs">Quantité</Label>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={match.parsed.quantity || ''}
                                                            onChange={(e) => updateQuantity(index, parseFloat(e.target.value) || 0)}
                                                            className="h-9"
                                                        />
                                                    </div>

                                                    {/* Price */}
                                                    <div>
                                                        <Label className="text-xs">Prix €</Label>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={match.parsed.price || ''}
                                                            onChange={(e) => updatePrice(index, parseFloat(e.target.value) || 0)}
                                                            className="h-9"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Alternatives */}
                                                {match.alternatives.length > 0 && !match.userCorrected && (
                                                    <div className="flex flex-wrap gap-1">
                                                        <span className="text-xs text-muted-foreground">Suggestions:</span>
                                                        {match.alternatives.map(alt => (
                                                            <Badge
                                                                key={alt.id}
                                                                variant="outline"
                                                                className="cursor-pointer hover:bg-secondary text-xs"
                                                                onClick={() => updateMatch(index, alt.id)}
                                                            >
                                                                {alt.name}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Match Badge */}
                                            <div className="flex flex-col items-end gap-1">
                                                {getMatchBadge(match)}
                                                <span className="text-xs text-muted-foreground">
                                                    {Math.round(match.matchScore * 100)}%
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Empty state */}
                        {editedMatches.length === 0 && (
                            <Card>
                                <CardContent className="py-8 text-center text-muted-foreground">
                                    Aucune ligne détectée dans l'image
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Annuler
                    </Button>
                    {result && (
                        <Button
                            onClick={handleConfirm}
                            disabled={selectedItems.size === 0}
                        >
                            <Check className="mr-2 h-4 w-4" />
                            Importer {selectedItems.size} article(s)
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
