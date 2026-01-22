import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Recipe, type Product } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import {
    Check, X, AlertTriangle, Users, ChefHat, ShoppingCart, Loader2,
    Clipboard, Printer, Plus, Trash2, TrendingDown, Lightbulb, Euro,
    ArrowRight, Sparkles
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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
    unitPrice?: number
}

interface CostOptimization {
    type: 'substitute' | 'reduce' | 'increase_veggies' | 'use_stock'
    originalProduct: string
    suggestion: string
    savings: number
    description: string
}

export function ProductionPage() {
    const queryClient = useQueryClient()
    const [plannedRecipes, setPlannedRecipes] = useState<PlannedRecipe[]>([])
    const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
    const [desiredCovers, setDesiredCovers] = useState<number>(10)
    const [isOutputDialogOpen, setIsOutputDialogOpen] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [activeTab, setActiveTab] = useState('planner')
    const [budget, setBudget] = useState<number>(0)

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

        const existing = plannedRecipes.find(p => p.recipeId === selectedRecipeId)
        if (existing) {
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

    const removeFromPlanned = (recipeId: string) => {
        setPlannedRecipes(prev => prev.filter(p => p.recipeId !== recipeId))
    }

    const updatePlannedCovers = (recipeId: string, newCovers: number) => {
        if (newCovers < 1) return
        setPlannedRecipes(prev =>
            prev.map(p => p.recipeId === recipeId ? { ...p, covers: newCovers } : p)
        )
    }

    // Calculate total requirements
    const totalRequirements = useMemo(() => {
        const requirements = new Map<string, {
            productId: string
            productName: string
            unit: string
            requiredQuantity: number
            availableStock: number
            category?: string
            unitPrice: number
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
                        category: product?.category,
                        unitPrice: product?.price || 0
                    })
                }
            })
        })

        return Array.from(requirements.values())
    }, [plannedRecipes, recipes, products])

    // Calculate total cost
    const totalCost = useMemo(() => {
        return totalRequirements.reduce((sum, req) => {
            return sum + (req.requiredQuantity * req.unitPrice)
        }, 0)
    }, [totalRequirements])

    // Generate shopping list
    const shoppingList = useMemo((): ShoppingItem[] => {
        return totalRequirements
            .filter(req => req.requiredQuantity > req.availableStock)
            .map(req => ({
                productId: req.productId,
                productName: req.productName,
                unit: req.unit,
                quantityNeeded: req.requiredQuantity,
                currentStock: req.availableStock,
                quantityToOrder: Math.ceil((req.requiredQuantity - req.availableStock) * 10) / 10,
                category: req.category,
                unitPrice: req.unitPrice
            }))
            .sort((a, b) => (a.category || '').localeCompare(b.category || ''))
    }, [totalRequirements])

    // Shopping list cost
    const shoppingCost = useMemo(() => {
        return shoppingList.reduce((sum, item) => {
            return sum + (item.quantityToOrder * (item.unitPrice || 0))
        }, 0)
    }, [shoppingList])

    // Group shopping list by category
    const shoppingByCategory = useMemo(() => {
        const grouped = new Map<string, ShoppingItem[]>()
        shoppingList.forEach(item => {
            const cat = item.category || 'Autre'
            if (!grouped.has(cat)) grouped.set(cat, [])
            grouped.get(cat)!.push(item)
        })
        return grouped
    }, [shoppingList])

    // Generate cost optimization suggestions
    const costOptimizations = useMemo((): CostOptimization[] => {
        const suggestions: CostOptimization[] = []

        // Find expensive proteins and suggest alternatives
        const proteins = totalRequirements.filter(req =>
            req.category === 'Viandes' || req.category === 'Poissons'
        )

        proteins.forEach(protein => {
            const cost = protein.requiredQuantity * protein.unitPrice

            // Find cheaper alternatives in the same category
            const alternatives = products.filter(p =>
                p.category === protein.category &&
                p.id !== protein.productId &&
                p.price < protein.unitPrice &&
                p.quantity > 0
            ).sort((a, b) => a.price - b.price)

            if (alternatives.length > 0) {
                const alt = alternatives[0]
                const savings = cost - (protein.requiredQuantity * alt.price)
                if (savings > 0.5) {
                    suggestions.push({
                        type: 'substitute',
                        originalProduct: protein.productName,
                        suggestion: `Remplacer par ${alt.name}`,
                        savings,
                        description: `${protein.productName} (${protein.unitPrice.toFixed(2)}€/${protein.unit}) → ${alt.name} (${alt.price.toFixed(2)}€/${alt.unit})`
                    })
                }
            }
        })

        // Suggest using products in stock
        totalRequirements.forEach(req => {
            if (req.availableStock > 0 && req.availableStock < req.requiredQuantity) {
                const usableValue = req.availableStock * req.unitPrice
                if (usableValue > 1) {
                    suggestions.push({
                        type: 'use_stock',
                        originalProduct: req.productName,
                        suggestion: `Utiliser le stock existant`,
                        savings: usableValue,
                        description: `Vous avez ${req.availableStock} ${req.unit} en stock (économie: ${usableValue.toFixed(2)}€)`
                    })
                }
            }
        })

        // Suggest increasing vegetables (cheaper)
        const veggiesUsed = totalRequirements.filter(r => r.category === 'Légumes')
        const avgVeggiePrice = veggiesUsed.length > 0
            ? veggiesUsed.reduce((s, v) => s + v.unitPrice, 0) / veggiesUsed.length
            : 0

        const expensiveItems = totalRequirements.filter(r =>
            r.unitPrice > avgVeggiePrice * 3 && r.category !== 'Légumes'
        )

        if (expensiveItems.length > 0 && avgVeggiePrice > 0) {
            const potentialSavings = expensiveItems.reduce((s, item) => {
                return s + (item.requiredQuantity * 0.1 * (item.unitPrice - avgVeggiePrice))
            }, 0)

            if (potentialSavings > 2) {
                suggestions.push({
                    type: 'increase_veggies',
                    originalProduct: 'Protéines',
                    suggestion: 'Augmenter les légumes, réduire les protéines de 10%',
                    savings: potentialSavings,
                    description: `Réduire légèrement les portions de viande/poisson et compenser avec plus de légumes`
                })
            }
        }

        return suggestions.sort((a, b) => b.savings - a.savings)
    }, [totalRequirements, products])

    const canProduceAll = useMemo(() => {
        return totalRequirements.every(req => req.availableStock >= req.requiredQuantity)
    }, [totalRequirements])

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
            queryClient.invalidateQueries({ queryKey: ['products'], refetchType: 'all' })
            queryClient.invalidateQueries({ queryKey: ['outputs'], refetchType: 'all' })
            setIsOutputDialogOpen(false)
            setPlannedRecipes([])
        } catch (error) {
            toast.error('Erreur lors de la génération des sorties')
            console.error(error)
        } finally {
            setIsGenerating(false)
        }
    }

    const copyShoppingList = () => {
        let text = '📋 LISTE DE COURSES\n'
        text += `Date: ${new Date().toLocaleDateString('fr-FR')}\n`
        text += `Pour: ${plannedRecipes.map(p => `${p.recipeName} (${p.covers} couverts)`).join(', ')}\n`
        text += `Coût estimé: ${shoppingCost.toFixed(2)}€\n\n`

        shoppingByCategory.forEach((items, category) => {
            text += `\n== ${category.toUpperCase()} ==\n`
            items.forEach(item => {
                const cost = (item.quantityToOrder * (item.unitPrice || 0)).toFixed(2)
                text += `☐ ${item.productName}: ${item.quantityToOrder} ${item.unit} (~${cost}€)\n`
            })
        })

        navigator.clipboard.writeText(text)
        toast.success('Liste copiée dans le presse-papier')
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
    }

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Planification de Production</h2>
                <p className="text-muted-foreground">
                    Planifiez vos menus, calculez les besoins et optimisez vos coûts
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="planner">
                        <ChefHat className="h-4 w-4 mr-2" />
                        Planification
                    </TabsTrigger>
                    <TabsTrigger value="shopping" className="relative">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Commandes
                        {shoppingList.length > 0 && (
                            <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                                {shoppingList.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="optimize">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Optimisation
                        {costOptimizations.length > 0 && (
                            <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                                {costOptimizations.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* PLANNER TAB */}
                <TabsContent value="planner" className="space-y-6">
                    {/* Budget input */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2">
                                <Euro className="h-5 w-5" />
                                Budget alloué
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <Input
                                    type="number"
                                    min="0"
                                    step="10"
                                    value={budget || ''}
                                    onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                                    placeholder="Ex: 500"
                                    className="w-32"
                                />
                                <span className="text-muted-foreground">€</span>
                                {budget > 0 && totalCost > 0 && (
                                    <div className="flex-1 flex items-center gap-4">
                                        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full transition-all",
                                                    totalCost <= budget ? "bg-green-500" :
                                                        totalCost <= budget * 1.1 ? "bg-orange-500" : "bg-red-500"
                                                )}
                                                style={{ width: `${Math.min((totalCost / budget) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <span className={cn(
                                            "font-medium",
                                            totalCost <= budget ? "text-green-600" :
                                                totalCost <= budget * 1.1 ? "text-orange-600" : "text-red-600"
                                        )}>
                                            {formatCurrency(totalCost)} / {formatCurrency(budget)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

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
                                <div className="space-y-2">
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
                                        Ajouter
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Planned recipes */}
                    {plannedRecipes.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-5 w-5" />
                                        Plan de production
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={canProduceAll ? "default" : "destructive"}>
                                            {canProduceAll ? "Réalisable" : "Stock insuffisant"}
                                        </Badge>
                                        <Badge variant="outline">
                                            Coût: {formatCurrency(totalCost)}
                                        </Badge>
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Recipes list */}
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
                                                <span className="text-muted-foreground text-sm">couverts</span>
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

                                {/* Requirements table */}
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="text-left p-3 font-medium">Ingrédient</th>
                                                <th className="text-right p-3 font-medium">Besoin</th>
                                                <th className="text-right p-3 font-medium">Stock</th>
                                                <th className="text-right p-3 font-medium">Coût</th>
                                                <th className="text-center p-3 font-medium">Statut</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {totalRequirements.map((req, idx) => {
                                                const isSufficient = req.availableStock >= req.requiredQuantity
                                                const shortage = req.requiredQuantity - req.availableStock
                                                const itemCost = req.requiredQuantity * req.unitPrice
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
                                                        <td className="p-3 text-right font-mono">
                                                            {formatCurrency(itemCost)}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            {isSufficient ? (
                                                                <Badge variant="outline" className="text-green-600 border-green-600">
                                                                    <Check className="h-3 w-3 mr-1" /> OK
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="destructive">
                                                                    <X className="h-3 w-3 mr-1" /> -{shortage.toFixed(2)}
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
                                        <Button variant="outline" onClick={() => setActiveTab('shopping')}>
                                            <ShoppingCart className="h-4 w-4 mr-2" />
                                            Liste de courses ({shoppingList.length})
                                        </Button>
                                    )}
                                    {costOptimizations.length > 0 && (
                                        <Button variant="outline" onClick={() => setActiveTab('optimize')}>
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            {costOptimizations.length} suggestion(s)
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

                {/* SHOPPING TAB */}
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
                                        <Badge variant="outline" className="text-lg px-3">
                                            Total: {formatCurrency(shoppingCost)}
                                        </Badge>
                                        <Button variant="outline" size="sm" onClick={copyShoppingList}>
                                            <Clipboard className="h-4 w-4 mr-2" />
                                            Copier
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

                                <div className="space-y-6">
                                    {Array.from(shoppingByCategory.entries()).map(([category, items]) => {
                                        const catTotal = items.reduce((s, i) => s + (i.quantityToOrder * (i.unitPrice || 0)), 0)
                                        return (
                                            <div key={category}>
                                                <h3 className="font-semibold text-lg mb-2 flex items-center justify-between">
                                                    <Badge variant="outline">{category}</Badge>
                                                    <span className="text-sm text-muted-foreground">
                                                        {formatCurrency(catTotal)}
                                                    </span>
                                                </h3>
                                                <table className="w-full">
                                                    <thead className="bg-muted/30">
                                                        <tr>
                                                            <th className="text-left p-2 w-8">☐</th>
                                                            <th className="text-left p-2">Produit</th>
                                                            <th className="text-right p-2">Quantité</th>
                                                            <th className="text-right p-2">Prix unit.</th>
                                                            <th className="text-right p-2">Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y">
                                                        {items.map((item, idx) => {
                                                            const itemTotal = item.quantityToOrder * (item.unitPrice || 0)
                                                            return (
                                                                <tr key={idx}>
                                                                    <td className="p-2">
                                                                        <input type="checkbox" className="w-4 h-4" />
                                                                    </td>
                                                                    <td className="p-2 font-medium">{item.productName}</td>
                                                                    <td className="p-2 text-right font-mono">
                                                                        {item.quantityToOrder} {item.unit}
                                                                    </td>
                                                                    <td className="p-2 text-right font-mono text-muted-foreground">
                                                                        {formatCurrency(item.unitPrice || 0)}/{item.unit}
                                                                    </td>
                                                                    <td className="p-2 text-right font-mono font-medium">
                                                                        {formatCurrency(itemTotal)}
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )
                                    })}
                                </div>

                                {budget > 0 && shoppingCost > budget && (
                                    <div className="mt-6 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                                            <div>
                                                <p className="font-medium text-red-700 dark:text-red-400">
                                                    Budget dépassé de {formatCurrency(shoppingCost - budget)}
                                                </p>
                                                <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                                                    Consultez l'onglet "Optimisation" pour des suggestions d'économies.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
                                <p className="text-green-600 dark:text-green-400 font-medium">
                                    {plannedRecipes.length > 0
                                        ? "Stock suffisant pour toutes les recettes !"
                                        : "Aucune commande nécessaire"}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* OPTIMIZATION TAB */}
                <TabsContent value="optimize" className="space-y-6">
                    {costOptimizations.length > 0 ? (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Sparkles className="h-5 w-5" />
                                        Suggestions d'optimisation
                                    </CardTitle>
                                    <CardDescription>
                                        Économies potentielles basées sur vos stocks et les prix des produits
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {costOptimizations.map((opt, idx) => (
                                        <div
                                            key={idx}
                                            className={cn(
                                                "p-4 rounded-lg border",
                                                opt.type === 'substitute' && "bg-blue-50 dark:bg-blue-950/20 border-blue-200",
                                                opt.type === 'use_stock' && "bg-green-50 dark:bg-green-950/20 border-green-200",
                                                opt.type === 'increase_veggies' && "bg-amber-50 dark:bg-amber-950/20 border-amber-200",
                                                opt.type === 'reduce' && "bg-purple-50 dark:bg-purple-950/20 border-purple-200"
                                            )}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3">
                                                    <div className={cn(
                                                        "p-2 rounded-full",
                                                        opt.type === 'substitute' && "bg-blue-100 text-blue-600",
                                                        opt.type === 'use_stock' && "bg-green-100 text-green-600",
                                                        opt.type === 'increase_veggies' && "bg-amber-100 text-amber-600",
                                                        opt.type === 'reduce' && "bg-purple-100 text-purple-600"
                                                    )}>
                                                        {opt.type === 'substitute' && <ArrowRight className="h-4 w-4" />}
                                                        {opt.type === 'use_stock' && <Check className="h-4 w-4" />}
                                                        {opt.type === 'increase_veggies' && <TrendingDown className="h-4 w-4" />}
                                                        {opt.type === 'reduce' && <TrendingDown className="h-4 w-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{opt.suggestion}</p>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            {opt.description}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="text-green-600 border-green-600">
                                                    <TrendingDown className="h-3 w-3 mr-1" />
                                                    -{formatCurrency(opt.savings)}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="p-4 bg-muted/50 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium">Économies potentielles totales</span>
                                            <span className="text-xl font-bold text-green-600">
                                                {formatCurrency(costOptimizations.reduce((s, o) => s + o.savings, 0))}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Lightbulb className="h-5 w-5" />
                                        Conseils généraux
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-3 text-muted-foreground">
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-500 mt-1">•</span>
                                            <span>Privilégiez les produits de saison, généralement moins chers et plus savoureux</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-500 mt-1">•</span>
                                            <span>Les légumes et féculents sont souvent moins chers que les protéines animales</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-500 mt-1">•</span>
                                            <span>Utilisez les restes et les produits proches de la péremption en priorité</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-500 mt-1">•</span>
                                            <span>Comparez les prix au kilo lors de vos achats</span>
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        <Card>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                <p>
                                    {plannedRecipes.length > 0
                                        ? "Aucune suggestion d'optimisation pour le moment"
                                        : "Planifiez des recettes pour voir les suggestions"}
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
                        <p>Vous allez générer des sorties de stock pour :</p>
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
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsOutputDialogOpen(false)}
                            disabled={isGenerating}
                        >
                            Annuler
                        </Button>
                        <Button onClick={handleGenerateOutputs} disabled={isGenerating}>
                            {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Confirmer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
