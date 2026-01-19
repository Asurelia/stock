import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Recipe, type Product } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from '@/components/ui/tabs'
import { Check, X, AlertTriangle, Users, ChefHat, ShoppingCart, Loader2, Clipboard, Printer, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface IngredientRequirement {
    productId: string
    productName: string
    unit: string
    requiredQuantity: number
    availableStock: number
    isSufficient: boolean
    shortage: number
    product?: Product
}

interface RecipeFeasibility {
    recipe: Recipe
    desiredCovers: number
    scaleFactor: number
    ingredients: IngredientRequirement[]
    canProduce: boolean
    maxProducibleCovers: number
}

interface PlannedRecipe {
    recipeId: string
    recipeName: string
    covers: number
}

interface ShoppingItem {
    productId: string
    productName: string
    unit: string
    quantityNeeded: number
    currentStock: number
    quantityToOrder: number
    category?: string
}

export function ProductionPlanner() {
    const queryClient = useQueryClient()
    const [plannedRecipes, setPlannedRecipes] = useState<PlannedRecipe[]>([])
    const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
    const [desiredCovers, setDesiredCovers] = useState<number>(10)
    const [isOutputDialogOpen, setIsOutputDialogOpen] = useState(false)
    const [isShoppingListOpen, setIsShoppingListOpen] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [activeTab, setActiveTab] = useState('planner')

    const { data: recipes = [] } = useQuery({
        queryKey: ['recipes'],
        queryFn: api.recipes.getAll,
    })

    const { data: products = [] } = useQuery({
        queryKey: ['products'],
        queryFn: api.products.getAll,
    })

    // Add recipe to plan
    const addToPlanned = () => {
        if (!selectedRecipeId) return
        const recipe = recipes.find(r => r.id === selectedRecipeId)
        if (!recipe) return

        // Check if already planned
        const existing = plannedRecipes.find(p => p.recipeId === selectedRecipeId)
        if (existing) {
            // Update covers
            setPlannedRecipes(prev =>
                prev.map(p =>
                    p.recipeId === selectedRecipeId
                        ? { ...p, covers: p.covers + desiredCovers }
                        : p
                )
            )
        } else {
            setPlannedRecipes(prev => [
                ...prev,
                { recipeId: selectedRecipeId, recipeName: recipe.name, covers: desiredCovers }
            ])
        }

        toast.success(`${recipe.name} ajouté au plan`)
    }

    // Remove recipe from plan
    const removeFromPlanned = (recipeId: string) => {
        setPlannedRecipes(prev => prev.filter(p => p.recipeId !== recipeId))
    }

    // Update planned covers
    const updatePlannedCovers = (recipeId: string, newCovers: number) => {
        if (newCovers < 1) return
        setPlannedRecipes(prev =>
            prev.map(p =>
                p.recipeId === recipeId ? { ...p, covers: newCovers } : p
            )
        )
    }

    // Calculate total requirements for all planned recipes
    const totalRequirements = useMemo(() => {
        const requirements = new Map<string, {
            productId: string
            productName: string
            unit: string
            requiredQuantity: number
            availableStock: number
            category?: string
        }>()

        plannedRecipes.forEach(planned => {
            const recipe = recipes.find(r => r.id === planned.recipeId)
            if (!recipe) return

            const scaleFactor = planned.covers / (recipe.portions || 1)

            recipe.ingredients.forEach(ing => {
                const product = products.find(p => p.id === ing.productId)
                const requiredQty = ing.quantity * scaleFactor

                const existing = requirements.get(ing.productId)
                if (existing) {
                    existing.requiredQuantity += requiredQty
                } else {
                    requirements.set(ing.productId, {
                        productId: ing.productId,
                        productName: ing.productName || product?.name || 'Produit inconnu',
                        unit: ing.unit || product?.unit || '',
                        requiredQuantity: requiredQty,
                        availableStock: product?.quantity || 0,
                        category: product?.category
                    })
                }
            })
        })

        return Array.from(requirements.values())
    }, [plannedRecipes, recipes, products])

    // Generate shopping list (items with shortage)
    const shoppingList = useMemo((): ShoppingItem[] => {
        return totalRequirements
            .filter(req => req.requiredQuantity > req.availableStock)
            .map(req => ({
                productId: req.productId,
                productName: req.productName,
                unit: req.unit,
                quantityNeeded: req.requiredQuantity,
                currentStock: req.availableStock,
                quantityToOrder: Math.ceil((req.requiredQuantity - req.availableStock) * 10) / 10, // Round up to 0.1
                category: req.category
            }))
            .sort((a, b) => (a.category || '').localeCompare(b.category || ''))
    }, [totalRequirements])

    // Group shopping list by category
    const shoppingByCategory = useMemo(() => {
        const grouped = new Map<string, ShoppingItem[]>()
        shoppingList.forEach(item => {
            const cat = item.category || 'Autre'
            if (!grouped.has(cat)) {
                grouped.set(cat, [])
            }
            grouped.get(cat)!.push(item)
        })
        return grouped
    }, [shoppingList])

    // Calculate feasibility for a single recipe preview
    const feasibility = useMemo((): RecipeFeasibility | null => {
        if (!selectedRecipeId) return null

        const recipe = recipes.find(r => r.id === selectedRecipeId)
        if (!recipe) return null

        const basePortions = recipe.portions || 1
        const scaleFactor = desiredCovers / basePortions

        const ingredients: IngredientRequirement[] = recipe.ingredients.map(ing => {
            const product = products.find(p => p.id === ing.productId)
            const requiredQuantity = ing.quantity * scaleFactor
            const availableStock = product?.quantity || 0
            const isSufficient = availableStock >= requiredQuantity
            const shortage = isSufficient ? 0 : requiredQuantity - availableStock

            return {
                productId: ing.productId,
                productName: ing.productName || product?.name || 'Produit inconnu',
                unit: ing.unit || product?.unit || '',
                requiredQuantity,
                availableStock,
                isSufficient,
                shortage,
                product
            }
        })

        let maxCovers = Infinity
        recipe.ingredients.forEach(ing => {
            const product = products.find(p => p.id === ing.productId)
            if (product && ing.quantity > 0) {
                const possibleCovers = Math.floor((product.quantity / ing.quantity) * basePortions)
                if (possibleCovers < maxCovers) {
                    maxCovers = possibleCovers
                }
            }
        })

        const canProduce = ingredients.every(ing => ing.isSufficient)

        return {
            recipe,
            desiredCovers,
            scaleFactor,
            ingredients,
            canProduce,
            maxProducibleCovers: maxCovers === Infinity ? 0 : maxCovers
        }
    }, [selectedRecipeId, desiredCovers, recipes, products])

    // Check if all planned recipes can be produced
    const canProduceAll = useMemo(() => {
        return totalRequirements.every(req => req.availableStock >= req.requiredQuantity)
    }, [totalRequirements])

    // Generate outputs for all planned recipes
    const handleGenerateOutputs = async () => {
        if (!canProduceAll || plannedRecipes.length === 0) return

        setIsGenerating(true)
        try {
            for (const req of totalRequirements) {
                if (req.requiredQuantity > 0) {
                    const recipeNames = plannedRecipes.map(p => p.recipeName).join(', ')
                    await api.outputs.create({
                        productId: req.productId,
                        quantity: req.requiredQuantity,
                        reason: `Production: ${recipeNames}`
                    })
                }
            }

            toast.success('Sorties générées avec succès')
            queryClient.invalidateQueries({ queryKey: ['products'] })
            queryClient.invalidateQueries({ queryKey: ['outputs'] })
            setIsOutputDialogOpen(false)
            setPlannedRecipes([])
        } catch (error) {
            toast.error('Erreur lors de la génération des sorties')
            console.error(error)
        } finally {
            setIsGenerating(false)
        }
    }

    // Copy shopping list to clipboard
    const copyShoppingList = () => {
        let text = '📋 LISTE DE COURSES\n'
        text += `Date: ${new Date().toLocaleDateString('fr-FR')}\n`
        text += `Pour: ${plannedRecipes.map(p => `${p.recipeName} (${p.covers} couverts)`).join(', ')}\n\n`

        shoppingByCategory.forEach((items, category) => {
            text += `\n== ${category.toUpperCase()} ==\n`
            items.forEach(item => {
                text += `☐ ${item.productName}: ${item.quantityToOrder} ${item.unit}\n`
            })
        })

        navigator.clipboard.writeText(text)
        toast.success('Liste copiée dans le presse-papier')
    }

    // Print shopping list
    const printShoppingList = () => {
        const printContent = document.getElementById('shopping-list-print')
        if (!printContent) return

        const printWindow = window.open('', '_blank')
        if (!printWindow) return

        printWindow.document.write(`
            <html>
            <head>
                <title>Liste de courses</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { font-size: 24px; margin-bottom: 10px; }
                    h2 { font-size: 18px; margin-top: 20px; color: #666; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background: #f5f5f5; }
                    .checkbox { width: 20px; }
                    .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <h1>📋 Liste de Courses</h1>
                <p class="meta">
                    Date: ${new Date().toLocaleDateString('fr-FR')}<br>
                    Pour: ${plannedRecipes.map(p => `${p.recipeName} (${p.covers} cvts)`).join(', ')}
                </p>
                ${printContent.innerHTML}
            </body>
            </html>
        `)
        printWindow.document.close()
        printWindow.print()
    }

    return (
        <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="planner">
                        <ChefHat className="h-4 w-4 mr-2" />
                        Planification
                    </TabsTrigger>
                    <TabsTrigger value="shopping" className="relative">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Liste de courses
                        {shoppingList.length > 0 && (
                            <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                                {shoppingList.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* PLANNER TAB */}
                <TabsContent value="planner" className="space-y-6">
                    {/* Recipe selector */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Plus className="h-5 w-5" />
                                Ajouter une recette au plan
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2 md:col-span-1">
                                    <Label>Recette</Label>
                                    <Select
                                        value={selectedRecipeId || 'none'}
                                        onValueChange={(v) => setSelectedRecipeId(v === 'none' ? null : v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">-- Choisir --</SelectItem>
                                            {recipes.map(recipe => (
                                                <SelectItem key={recipe.id} value={recipe.id}>
                                                    {recipe.name} ({recipe.portions} portions)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Couverts</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            min="1"
                                            value={desiredCovers}
                                            onChange={(e) => setDesiredCovers(parseInt(e.target.value) || 1)}
                                            className="w-24"
                                        />
                                        {[10, 20, 30, 50].map(n => (
                                            <Button
                                                key={n}
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setDesiredCovers(n)}
                                                className={cn(
                                                    "hidden sm:flex",
                                                    desiredCovers === n && "bg-primary text-primary-foreground"
                                                )}
                                            >
                                                {n}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-end">
                                    <Button
                                        onClick={addToPlanned}
                                        disabled={!selectedRecipeId}
                                        className="w-full"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Ajouter au plan
                                    </Button>
                                </div>
                            </div>

                            {/* Preview feasibility */}
                            {feasibility && (
                                <div className={cn(
                                    "p-3 rounded-lg border",
                                    feasibility.canProduce
                                        ? "bg-green-50 dark:bg-green-950/20 border-green-200"
                                        : "bg-orange-50 dark:bg-orange-950/20 border-orange-200"
                                )}>
                                    <div className="flex items-center justify-between">
                                        <span>
                                            {feasibility.canProduce ? (
                                                <span className="text-green-700 dark:text-green-400">
                                                    ✓ Stock suffisant pour {desiredCovers} couverts
                                                </span>
                                            ) : (
                                                <span className="text-orange-700 dark:text-orange-400">
                                                    ⚠ Stock insuffisant - Max: {feasibility.maxProducibleCovers} couverts
                                                </span>
                                            )}
                                        </span>
                                        {!feasibility.canProduce && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setDesiredCovers(feasibility.maxProducibleCovers)}
                                            >
                                                Ajuster
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Planned recipes list */}
                    {plannedRecipes.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-5 w-5" />
                                        Plan de production
                                    </div>
                                    <Badge variant={canProduceAll ? "default" : "destructive"}>
                                        {canProduceAll ? "Réalisable" : "Stock insuffisant"}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Planned recipes */}
                                <div className="space-y-2">
                                    {plannedRecipes.map(planned => (
                                        <div
                                            key={planned.recipeId}
                                            className="flex items-center justify-between p-3 border rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <ChefHat className="h-5 w-5 text-muted-foreground" />
                                                <span className="font-medium">{planned.recipeName}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={planned.covers}
                                                    onChange={(e) => updatePlannedCovers(planned.recipeId, parseInt(e.target.value) || 1)}
                                                    className="w-20 text-center"
                                                />
                                                <span className="text-muted-foreground">couverts</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500"
                                                    onClick={() => removeFromPlanned(planned.recipeId)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Total requirements */}
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="text-left p-3 font-medium">Ingrédient</th>
                                                <th className="text-right p-3 font-medium">Besoin total</th>
                                                <th className="text-right p-3 font-medium">Stock</th>
                                                <th className="text-center p-3 font-medium">Statut</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {totalRequirements.map((req, idx) => {
                                                const isSufficient = req.availableStock >= req.requiredQuantity
                                                const shortage = req.requiredQuantity - req.availableStock
                                                return (
                                                    <tr
                                                        key={idx}
                                                        className={cn(!isSufficient && "bg-red-50 dark:bg-red-950/20")}
                                                    >
                                                        <td className="p-3">{req.productName}</td>
                                                        <td className="p-3 text-right font-mono">
                                                            {req.requiredQuantity.toFixed(2)} {req.unit}
                                                        </td>
                                                        <td className="p-3 text-right font-mono">
                                                            {req.availableStock.toFixed(2)} {req.unit}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            {isSufficient ? (
                                                                <Badge variant="outline" className="text-green-600 border-green-600">
                                                                    <Check className="h-3 w-3 mr-1" />
                                                                    OK
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="destructive">
                                                                    <X className="h-3 w-3 mr-1" />
                                                                    -{shortage.toFixed(2)}
                                                                </Badge>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-between gap-2">
                                    {!canProduceAll && shoppingList.length > 0 && (
                                        <Button
                                            variant="outline"
                                            onClick={() => setActiveTab('shopping')}
                                        >
                                            <ShoppingCart className="h-4 w-4 mr-2" />
                                            Voir la liste de courses ({shoppingList.length})
                                        </Button>
                                    )}
                                    <div className="flex-1" />
                                    {canProduceAll && (
                                        <Button onClick={() => setIsOutputDialogOpen(true)}>
                                            <ShoppingCart className="h-4 w-4 mr-2" />
                                            Générer les sorties
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Empty state */}
                    {plannedRecipes.length === 0 && (
                        <Card>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                <ChefHat className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                <p>Aucune recette planifiée</p>
                                <p className="text-sm mt-2">
                                    Ajoutez des recettes avec le nombre de couverts souhaités
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* SHOPPING LIST TAB */}
                <TabsContent value="shopping" className="space-y-6">
                    {shoppingList.length > 0 ? (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ShoppingCart className="h-5 w-5" />
                                        Liste de courses
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={copyShoppingList}>
                                            <Clipboard className="h-4 w-4 mr-2" />
                                            Copier
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={printShoppingList}>
                                            <Printer className="h-4 w-4 mr-2" />
                                            Imprimer
                                        </Button>
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                                    <p className="text-sm text-muted-foreground">
                                        <strong>Pour :</strong>{' '}
                                        {plannedRecipes.map(p => `${p.recipeName} (${p.covers} cvts)`).join(', ')}
                                    </p>
                                </div>

                                <div id="shopping-list-print" className="space-y-6">
                                    {Array.from(shoppingByCategory.entries()).map(([category, items]) => (
                                        <div key={category}>
                                            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                                                <Badge variant="outline">{category}</Badge>
                                            </h3>
                                            <table className="w-full">
                                                <thead className="bg-muted/30">
                                                    <tr>
                                                        <th className="text-left p-2 w-8">☐</th>
                                                        <th className="text-left p-2">Produit</th>
                                                        <th className="text-right p-2">À commander</th>
                                                        <th className="text-right p-2 text-muted-foreground">Stock actuel</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {items.map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td className="p-2">
                                                                <input type="checkbox" className="w-4 h-4" />
                                                            </td>
                                                            <td className="p-2 font-medium">{item.productName}</td>
                                                            <td className="p-2 text-right font-mono text-red-600 dark:text-red-400">
                                                                {item.quantityToOrder} {item.unit}
                                                            </td>
                                                            <td className="p-2 text-right font-mono text-muted-foreground">
                                                                {item.currentStock} {item.unit}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-orange-700 dark:text-orange-400">
                                                {shoppingList.length} produit(s) à commander
                                            </p>
                                            <p className="text-sm text-orange-600 dark:text-orange-300 mt-1">
                                                Une fois les achats effectués, mettez à jour les stocks et réessayez la production.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
                                <p className="text-green-600 dark:text-green-400 font-medium">
                                    {plannedRecipes.length > 0
                                        ? "Stock suffisant pour toutes les recettes planifiées !"
                                        : "Aucun achat nécessaire"}
                                </p>
                                <p className="text-sm mt-2">
                                    {plannedRecipes.length > 0
                                        ? "Vous pouvez générer les sorties de stock."
                                        : "Planifiez des recettes pour voir les besoins."}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {/* Confirmation dialog */}
            <Dialog open={isOutputDialogOpen} onOpenChange={setIsOutputDialogOpen}>
                <DialogContent className="bg-white dark:bg-slate-900">
                    <DialogHeader>
                        <DialogTitle>Confirmer les sorties de stock</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <p>
                            Vous allez générer des sorties de stock pour :
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                            {plannedRecipes.map(p => (
                                <li key={p.recipeId}>
                                    <strong>{p.recipeName}</strong> - {p.covers} couverts
                                </li>
                            ))}
                        </ul>

                        <div className="max-h-60 overflow-y-auto border rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 sticky top-0">
                                    <tr>
                                        <th className="text-left p-2">Produit</th>
                                        <th className="text-right p-2">Quantité</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {totalRequirements.map((req, idx) => (
                                        <tr key={idx}>
                                            <td className="p-2">{req.productName}</td>
                                            <td className="p-2 text-right font-mono">
                                                {req.requiredQuantity.toFixed(2)} {req.unit}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            Ces quantités seront déduites du stock et enregistrées comme sorties.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsOutputDialogOpen(false)}
                            disabled={isGenerating}
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={handleGenerateOutputs}
                            disabled={isGenerating}
                        >
                            {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Confirmer les sorties
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
