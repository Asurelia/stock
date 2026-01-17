import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, type Recipe, type RecipeIngredient, DIETARY_TAGS } from "@/lib/api"
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
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { PlusCircle, Loader2, Trash2, ChefHat, Users, Euro, X, Pencil } from "lucide-react"
import { toast } from "sonner"

export function RecipesPage() {
    const queryClient = useQueryClient()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [filterTag, setFilterTag] = useState<string>("")

    // Form state
    const [name, setName] = useState("")
    const [portions, setPortions] = useState(1)
    const [instructions, setInstructions] = useState("")
    const [dietaryTags, setDietaryTags] = useState<string[]>([])
    const [ingredients, setIngredients] = useState<RecipeIngredient[]>([])

    const { data: products } = useQuery({
        queryKey: ['products'],
        queryFn: api.products.getAll
    })

    const { data: recipes, isLoading } = useQuery({
        queryKey: ['recipes'],
        queryFn: api.recipes.getAll
    })

    const createMutation = useMutation({
        mutationFn: api.recipes.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recipes'] })
            toast.success("Recette créée")
            resetForm()
            setIsDialogOpen(false)
        },
        onError: () => toast.error("Erreur lors de la création")
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Recipe> }) =>
            api.recipes.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recipes'] })
            toast.success("Recette modifiée")
            resetForm()
            setIsDialogOpen(false)
        },
        onError: () => toast.error("Erreur lors de la modification")
    })

    const deleteMutation = useMutation({
        mutationFn: api.recipes.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recipes'] })
            toast.success("Recette supprimée")
        },
        onError: () => toast.error("Erreur lors de la suppression")
    })

    const resetForm = () => {
        setName("")
        setPortions(1)
        setInstructions("")
        setDietaryTags([])
        setIngredients([])
        setEditingRecipe(null)
    }

    const handleEdit = (recipe: Recipe) => {
        setEditingRecipe(recipe)
        setName(recipe.name)
        setPortions(recipe.portions)
        setInstructions(recipe.instructions)
        setDietaryTags(recipe.dietaryTags)
        setIngredients(recipe.ingredients)
        setIsDialogOpen(true)
    }

    const addIngredient = () => {
        setIngredients([...ingredients, { productId: "", productName: "", quantity: 0, unit: "" }])
    }

    const updateIngredient = (index: number, field: keyof RecipeIngredient, value: string | number) => {
        const newIngredients = [...ingredients]
        if (field === 'productId') {
            const product = products?.find(p => p.id === value)
            newIngredients[index] = {
                ...newIngredients[index],
                productId: value as string,
                productName: product?.name || "",
                unit: product?.unit || ""
            }
        } else {
            newIngredients[index] = { ...newIngredients[index], [field]: value }
        }
        setIngredients(newIngredients)
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!name) return

        const recipeData = {
            name,
            portions,
            instructions,
            dietaryTags,
            photoUrl: null,
            ingredients: ingredients.filter(ing => ing.productId && ing.quantity > 0)
        }

        if (editingRecipe) {
            updateMutation.mutate({ id: editingRecipe.id, data: recipeData })
        } else {
            createMutation.mutate(recipeData)
        }
    }

    const handleDelete = (id: string) => {
        if (confirm("Supprimer cette recette ?")) {
            deleteMutation.mutate(id)
        }
    }

    const calculateRecipeCost = (recipe: Recipe): number => {
        return recipe.ingredients.reduce((sum, ing) => {
            const product = products?.find(p => p.id === ing.productId)
            return sum + (ing.quantity * (product?.price || 0))
        }, 0)
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
    }

    const getTagInfo = (tag: string) => {
        return DIETARY_TAGS.find(t => t.value === tag) || { value: tag, label: tag, color: 'bg-gray-500' }
    }

    // Filter recipes
    const filteredRecipes = recipes?.filter(recipe => {
        const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesTag = !filterTag || recipe.dietaryTags.includes(filterTag)
        return matchesSearch && matchesTag
    })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Recettes</h2>
                    <p className="text-muted-foreground">
                        Gérez vos fiches recettes avec ingrédients et coûts
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open)
                    if (!open) resetForm()
                }}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Nouvelle Recette
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingRecipe ? "Modifier la recette" : "Nouvelle Recette"}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nom *</Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Nom de la recette"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="portions">Nombre de portions</Label>
                                    <Input
                                        id="portions"
                                        type="number"
                                        min="1"
                                        value={portions}
                                        onChange={(e) => setPortions(parseInt(e.target.value) || 1)}
                                    />
                                </div>
                            </div>

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

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label>Ingrédients</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Ajouter
                                    </Button>
                                </div>

                                {ingredients.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                                        Aucun ingrédient. Cliquez sur "Ajouter"
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {ingredients.map((ing, index) => (
                                            <div key={index} className="flex gap-2 items-end p-3 border rounded-lg">
                                                <div className="flex-1">
                                                    <Label className="text-xs">Produit</Label>
                                                    <Select
                                                        value={ing.productId}
                                                        onValueChange={(v) => updateIngredient(index, 'productId', v)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Sélectionner" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {products?.map(p => (
                                                                <SelectItem key={p.id} value={p.id}>
                                                                    {p.name} ({p.unit})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="w-24">
                                                    <Label className="text-xs">Quantité</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={ing.quantity || ""}
                                                        onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <div className="w-20">
                                                    <Label className="text-xs">Unité</Label>
                                                    <Input
                                                        value={ing.unit}
                                                        onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                                                        placeholder="kg"
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500"
                                                    onClick={() => removeIngredient(index)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

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

                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Annuler
                                </Button>
                                <Button type="submit" disabled={!name || createMutation.isPending || updateMutation.isPending}>
                                    {(createMutation.isPending || updateMutation.isPending) && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    {editingRecipe ? "Modifier" : "Créer"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <Input
                    placeholder="Rechercher une recette..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-xs"
                />
                <Select value={filterTag} onValueChange={setFilterTag}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Tous les régimes" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="">Tous les régimes</SelectItem>
                        {DIETARY_TAGS.map(tag => (
                            <SelectItem key={tag.value} value={tag.value}>{tag.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Recipes Grid */}
            {filteredRecipes && filteredRecipes.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredRecipes.map(recipe => {
                        const cost = calculateRecipeCost(recipe)
                        const costPerPortion = recipe.portions > 0 ? cost / recipe.portions : 0

                        return (
                            <Card key={recipe.id} className="overflow-hidden">
                                <div className="h-32 bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                                    <ChefHat className="h-12 w-12 text-orange-300" />
                                </div>
                                <CardContent className="pt-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-semibold text-lg">{recipe.name}</h3>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleEdit(recipe)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500"
                                                onClick={() => handleDelete(recipe.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {recipe.dietaryTags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-3">
                                            {recipe.dietaryTags.map(tag => {
                                                const tagInfo = getTagInfo(tag)
                                                return (
                                                    <Badge key={tag} className={`${tagInfo.color} text-white text-xs`}>
                                                        {tagInfo.label}
                                                    </Badge>
                                                )
                                            })}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Users className="h-4 w-4" />
                                            {recipe.portions} portions
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Euro className="h-4 w-4" />
                                            {formatCurrency(costPerPortion)}/portion
                                        </div>
                                    </div>

                                    <div className="mt-3 pt-3 border-t">
                                        <p className="text-xs text-muted-foreground">
                                            {recipe.ingredients.length} ingrédient(s) • Coût total: {formatCurrency(cost)}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            ) : (
                <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                        {searchTerm || filterTag
                            ? "Aucune recette ne correspond à votre recherche"
                            : "Aucune recette. Créez votre première fiche recette."}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
