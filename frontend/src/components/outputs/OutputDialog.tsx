import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { NumericKeypad } from './NumericKeypad'
import { RecipeLinker } from './RecipeLinker'
import { getProductEmoji } from './ProductButton'
import { OUTPUT_REASONS, type Product } from '@/lib/api'

interface OutputDialogProps {
    product: Product | null
    open: boolean
    onClose: () => void
    onSubmit: (data: {
        productId: string
        quantity: number
        reason: string
        recipeId: string | null
    }) => void
    isLoading?: boolean
}

export function OutputDialog({ product, open, onClose, onSubmit, isLoading }: OutputDialogProps) {
    const [quantity, setQuantity] = useState('')
    const [reason, setReason] = useState<string>(OUTPUT_REASONS[0])
    const [recipeId, setRecipeId] = useState<string | null>(null)

    const handleSubmit = () => {
        if (!product || !quantity) return

        const numQuantity = parseFloat(quantity)
        if (numQuantity <= 0 || numQuantity > product.quantity) return

        onSubmit({
            productId: product.id,
            quantity: numQuantity,
            reason,
            recipeId,
        })

        // Reset form
        setQuantity('')
        setReason(OUTPUT_REASONS[0])
        setRecipeId(null)
    }

    const handleClose = () => {
        setQuantity('')
        setReason(OUTPUT_REASONS[0])
        setRecipeId(null)
        onClose()
    }

    if (!product) return null

    const numQuantity = parseFloat(quantity) || 0
    const isValid = numQuantity > 0 && numQuantity <= product.quantity

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-background">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <span className="text-4xl">{getProductEmoji(product)}</span>
                        <div>
                            <div className="text-lg">{product.name}</div>
                            <div className="text-sm font-normal text-muted-foreground">
                                Stock: {product.quantity} {product.unit}
                            </div>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Numeric Keypad */}
                    <NumericKeypad
                        value={quantity}
                        onChange={setQuantity}
                        unit={product.unit}
                        max={product.quantity}
                    />

                    {/* Reason selector */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Motif de sortie</label>
                        <Select value={reason} onValueChange={setReason}>
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un motif" />
                            </SelectTrigger>
                            <SelectContent>
                                {OUTPUT_REASONS.map(r => (
                                    <SelectItem key={r} value={r}>{r}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Recipe linker */}
                    <RecipeLinker
                        selectedRecipeId={recipeId}
                        onSelect={setRecipeId}
                    />
                </div>

                <DialogFooter className="flex gap-2 sm:gap-2">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        className="flex-1"
                    >
                        Annuler
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!isValid || isLoading}
                        className="flex-1"
                    >
                        {isLoading ? 'En cours...' : 'Valider la sortie'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
