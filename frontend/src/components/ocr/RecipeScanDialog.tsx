import { useState, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { api, type Product, type RecipeIngredient, DIETARY_TAGS } from "@/lib/api"
import {
    processRecipeImage,
    saveCorrection,
    type ParsedRecipe,
    type OCRProgress
} from "@/lib/ocr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
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
    Zap,
    RefreshCw,
    ChefHat,
    Users,
    PlusCircle,
    Trash2
} from "lucide-react"

interface RecipeScanDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (recipe: {
        name: string
        portions: number
        dietaryTags: string[]
        instructions: string
        ingredients: RecipeIngredient[]
    }) => void
}

interface EditableIngredient {
    raw: string
    quantity: number
    unit: string
    name: string
    productId: string
    productName: string
    isValid: boolean
}

export function RecipeScanDialog({ open, onOpenChange, onConfirm }: RecipeScanDialogProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [progress, setProgress] = useState<OCRProgress>({ status: '', progress: 0 })
    const [parsedRecipe, setParsedRecipe] = useState<ParsedRecipe | null>(null)

    // Editable state
    const [recipeName, setRecipeName] = useState("")
    const [portions, setPortions] = useState(4)
    const [dietaryTags, setDietaryTags] = useState<string[]>([])
    const [instructions, setInstructions] = useState("")
    const [ingredients, setIngredients] = useState<EditableIngredient[]>([])

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
        setParsedRecipe(null)

        try {
            const result = await processRecipeImage(file, products, setProgress)
            setParsedRecipe(result)

            // Set editable state
            setRecipeName(result.name)
            setPortions(result.portions)
            setInstructions(result.instructions.join('\n\n'))

            // Convert ingredients to editable format
            const editableIngredients: EditableIngredient[] = result.ingredients.map(ing => ({
                raw: ing.raw,
                quantity: ing.quantity || 0,
                unit: ing.unit || '',
                name: ing.name,
                productId: ing.matchedProduct?.id || '',
                productName: ing.matchedProduct?.name || ing.name,
                isValid: !!ing.matchedProduct
            }))
            setIngredients(editableIngredients)
        } catch (error) {
            console.error('OCR Error:', error)
        } finally {
            setIsProcessing(false)
        }
    }

    const updateIngredient = (index: number, field: keyof EditableIngredient, value: string | number | boolean) => {
        const newIngredients = [...ingredients]

        if (field === 'productId') {
            const product = products?.find(p => p.id === value)
            if (product) {
                // Save correction for learning
                saveCorrection(newIngredients[index].name, product.id, product.name)

                newIngredients[index] = {
                    ...newIngredients[index],
                    productId: product.id,
                    productName: product.name,
                    unit: newIngredients[index].unit || product.unit,
                    isValid: true
                }
            }
        } else {
            newIngredients[index] = { ...newIngredients[index], [field]: value }
        }

        setIngredients(newIngredients)
    }

    const addIngredient = () => {
        setIngredients([...ingredients, {
            raw: '',
            quantity: 0,
            unit: '',
            name: '',
            productId: '',
            productName: '',
            isValid: false
        }])
    }

    const removeIngredient = (index: number) => {
        setIngredients(ingredients.filter((_, i) => i !== index))
    }

    const toggleTag = (tag: string) => {
        if (dietaryTags.includes(tag)) {
            setDietaryTags(dietaryTags.filter(t => t !== tag))
        } else {
            setDietaryTags([...dietaryTags, tag])
        }
    }

    const handleConfirm = () => {
        const validIngredients: RecipeIngredient[] = ingredients
            .filter(ing => ing.productId && ing.quantity > 0)
            .map(ing => ({
                productId: ing.productId,
                productName: ing.productName,
                quantity: ing.quantity,
                unit: ing.unit
            }))

        onConfirm({
            name: recipeName,
            portions,
            dietaryTags,
            instructions,
            ingredients: validIngredients
        })

        handleReset()
    }

    const handleReset = () => {
        setImagePreview(null)
        setParsedRecipe(null)
        setRecipeName("")
        setPortions(4)
        setDietaryTags([])
        setInstructions("")
        setIngredients([])
        setProgress({ status: '', progress: 0 })
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const validIngredientsCount = ingredients.filter(i => i.productId && i.quantity > 0).length

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ChefHat className="h-5 w-5" />
                        Scanner une Recette
                    </DialogTitle>
                </DialogHeader>

                {!parsedRecipe ? (
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
                                        Photo de la fiche recette
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
                                    <li>• La première ligne sera utilisée comme nom de la recette</li>
                                    <li>• Les ingrédients avec quantités seront mieux détectés</li>
                                    <li>• Vous pourrez corriger et compléter après le scan</li>
                                    <li>• Les corrections améliorent les futurs scans</li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Header with reset */}
                        <div className="flex justify-between items-center">
                            <Badge variant="outline">
                                {ingredients.length} ingrédients détectés
                            </Badge>
                            <Button variant="outline" size="sm" onClick={handleReset}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Nouveau scan
                            </Button>
                        </div>

                        {/* Recipe Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">Nom de la recette *</Label>
                            <Input
                                id="name"
                                value={recipeName}
                                onChange={(e) => setRecipeName(e.target.value)}
                                placeholder="Nom de la recette"
                            />
                        </div>

                        {/* Portions */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="portions" className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Portions
                                </Label>
                                <Input
                                    id="portions"
                                    type="number"
                                    min="1"
                                    value={portions}
                                    onChange={(e) => setPortions(parseInt(e.target.value) || 1)}
                                />
                            </div>
                        </div>

                        {/* Dietary Tags */}
                        <div className="space-y-2">
                            <Label>Tags diététiques</Label>
                            <div className="flex flex-wrap gap-2">
                                {DIETARY_TAGS.map(tag => (
                                    <Badge
                                        key={tag.value}
                                        variant={dietaryTags.includes(tag.value) ? "default" : "outline"}
                                        className={`cursor-pointer ${dietaryTags.includes(tag.value) ? tag.color + ' text-white' : ''}`}
                                        onClick={() => toggleTag(tag.value)}
                                    >
                                        {tag.label}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* Ingredients */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label>Ingrédients ({validIngredientsCount} valides)</Label>
                                <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Ajouter
                                </Button>
                            </div>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {ingredients.map((ing, index) => (
                                    <Card key={index} className={!ing.isValid && ing.productId === '' ? 'border-orange-200 bg-orange-50' : ''}>
                                        <CardContent className="p-3">
                                            {ing.raw && (
                                                <p className="text-xs text-muted-foreground font-mono mb-2 bg-secondary px-2 py-1 rounded">
                                                    {ing.raw}
                                                </p>
                                            )}
                                            <div className="grid grid-cols-12 gap-2">
                                                {/* Product */}
                                                <div className="col-span-5">
                                                    <Select
                                                        value={ing.productId}
                                                        onValueChange={(v) => updateIngredient(index, 'productId', v)}
                                                    >
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue placeholder="Produit" />
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
                                                <div className="col-span-3">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="Qté"
                                                        value={ing.quantity || ''}
                                                        onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                        className="h-9"
                                                    />
                                                </div>

                                                {/* Unit */}
                                                <div className="col-span-3">
                                                    <Input
                                                        placeholder="Unité"
                                                        value={ing.unit}
                                                        onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                                                        className="h-9"
                                                    />
                                                </div>

                                                {/* Delete */}
                                                <div className="col-span-1 flex items-center justify-center">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 text-red-500"
                                                        onClick={() => removeIngredient(index)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}

                                {ingredients.length === 0 && (
                                    <p className="text-center text-muted-foreground py-4">
                                        Aucun ingrédient. Cliquez sur "Ajouter".
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="space-y-2">
                            <Label htmlFor="instructions">Instructions</Label>
                            <Textarea
                                id="instructions"
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
                                placeholder="Étapes de préparation..."
                                rows={4}
                            />
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Annuler
                    </Button>
                    {parsedRecipe && (
                        <Button
                            onClick={handleConfirm}
                            disabled={!recipeName || validIngredientsCount === 0}
                        >
                            <Check className="mr-2 h-4 w-4" />
                            Créer la recette
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
