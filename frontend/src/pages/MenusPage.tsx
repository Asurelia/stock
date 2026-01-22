import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, type Recipe, type Menu } from "@/lib/api"
import { format, addDays, subDays } from "date-fns"
import { fr } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    ChevronLeft,
    ChevronRight,
    Loader2,
    ChefHat,
    PlusCircle,
    Trash2,
    Package,
    Save,
    UtensilsCrossed
} from "lucide-react"
import { toast } from "sonner"

const MEAL_TYPES = [
    { value: 'breakfast', label: 'Petit-déjeuner', icon: '🌅' },
    { value: 'lunch', label: 'Déjeuner', icon: '☀️' },
    { value: 'dinner', label: 'Dîner', icon: '🌙' },
    { value: 'snack', label: 'Collation', icon: '🍎' },
] as const



export function MenusPage() {
    const queryClient = useQueryClient()
    const [currentDate, setCurrentDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [showAddMenu, setShowAddMenu] = useState(false)
    const [showAddRecipe, setShowAddRecipe] = useState<string | null>(null)

    // Form state
    const [menuName, setMenuName] = useState("")
    const [menuMealType, setMenuMealType] = useState<string>("lunch")
    const [menuNotes, setMenuNotes] = useState("")
    const [selectedRecipeId, setSelectedRecipeId] = useState("")
    const [recipeServings, setRecipeServings] = useState(1)

    const { data: menusData, isLoading: loadingMenus } = useQuery({
        queryKey: ['menus', currentDate],
        queryFn: () => api.menus.getByDate(currentDate)
    })

    const menus = menusData as unknown as Menu[] | undefined

    const { data: recipes } = useQuery({
        queryKey: ['recipes'],
        queryFn: api.recipes.getAll
    })

    const { data: products } = useQuery({
        queryKey: ['products'],
        queryFn: api.products.getAll
    })

    const createMenuMutation = useMutation({
        mutationFn: api.menus.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['menus'], refetchType: 'all' })
            toast.success("Menu créé")
            resetForm()
            setShowAddMenu(false)
        },
        onError: () => toast.error("Erreur lors de la création")
    })

    const deleteMenuMutation = useMutation({
        mutationFn: api.menus.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['menus'], refetchType: 'all' })
            toast.success("Menu supprimé")
        },
        onError: () => toast.error("Erreur lors de la suppression")
    })

    const addRecipeMutation = useMutation({
        mutationFn: ({ menuId, recipeId, servings }: { menuId: string; recipeId: string; servings: number }) =>
            api.menus.addRecipe(menuId, recipeId, servings),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['menus'], refetchType: 'all' })
            toast.success("Recette ajoutée")
            setShowAddRecipe(null)
            setSelectedRecipeId("")
            setRecipeServings(1)
        },
        onError: () => toast.error("Erreur lors de l'ajout")
    })

    const removeRecipeMutation = useMutation({
        mutationFn: api.menus.removeRecipe,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['menus'], refetchType: 'all' })
            toast.success("Recette retirée")
        },
        onError: () => toast.error("Erreur lors de la suppression")
    })

    const resetForm = () => {
        setMenuName("")
        setMenuMealType("lunch")
        setMenuNotes("")
    }

    const handlePrevDay = () => {
        setCurrentDate(format(subDays(new Date(currentDate), 1), 'yyyy-MM-dd'))
    }

    const handleNextDay = () => {
        setCurrentDate(format(addDays(new Date(currentDate), 1), 'yyyy-MM-dd'))
    }

    const handleCreateMenu = () => {
        if (!menuName) return
        createMenuMutation.mutate({
            name: menuName,
            menu_date: currentDate,
            meal_type: menuMealType,
            notes: menuNotes || undefined
        })
    }

    const handleAddRecipe = () => {
        if (!showAddRecipe || !selectedRecipeId) return
        addRecipeMutation.mutate({
            menuId: showAddRecipe,
            recipeId: selectedRecipeId,
            servings: recipeServings
        })
    }

    // Calculate ingredient needs for all menus of the day
    const calculateNeeds = () => {
        const needs: Record<string, { productId: string; name: string; quantity: number; unit: string }> = {}

        menus?.forEach(menu => {
            menu.recipes?.forEach(mr => {
                const recipe = recipes?.find(r => r.id === mr.recipeId)
                if (!recipe) return

                const multiplier = (mr.servings || 1) / recipe.portions

                recipe.ingredients.forEach(ing => {
                    const key = ing.productId || ing.productName
                    if (!needs[key]) {
                        needs[key] = {
                            productId: ing.productId,
                            name: ing.productName,
                            quantity: 0,
                            unit: ing.unit
                        }
                    }
                    needs[key].quantity += ing.quantity * multiplier
                })
            })
        })

        return Object.values(needs)
    }

    const ingredientNeeds = calculateNeeds()

    const consumeMenuMutation = useMutation({
        mutationFn: api.menus.consume,
        onSuccess: (count) => {
            queryClient.invalidateQueries({ queryKey: ['products'] }) // Stock changed
            toast.success(`Stock mis à jour : ${count} sorties créées`)
        },
        onError: () => toast.error("Erreur lors de la mise à jour du stock")
    })

    const handleConsumeMenu = (menu: Menu) => {
        if (confirm(`Voulez-vous sortir du stock tous les ingrédients pour le menu "${menu.name}" ?\n\nCela créera des mouvements de sortie pour chaque ingrédient selon les portions définies.`)) {
            consumeMenuMutation.mutate(menu.id)
        }
    }

    if (loadingMenus) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8">
            {/* Header with Date Navigation */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Menus du Jour</h2>
                    <p className="text-muted-foreground">
                        Planifiez les repas et gérez les recettes
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={handlePrevDay}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Input
                        type="date"
                        value={currentDate}
                        onChange={(e) => setCurrentDate(e.target.value)}
                        className="w-40"
                    />
                    <Button variant="outline" size="icon" onClick={handleNextDay}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Current Date Display */}
            <div className="text-center">
                <h3 className="text-xl font-semibold capitalize">
                    {format(new Date(currentDate), 'EEEE d MMMM yyyy', { locale: fr })}
                </h3>
            </div>

            {/* Add Menu Button */}
            <div className="flex justify-center">
                <Button onClick={() => setShowAddMenu(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Ajouter un menu
                </Button>
            </div>

            {/* Menus Grid */}
            {menus && menus.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {menus.map(menu => {
                        const mealType = MEAL_TYPES.find(t => t.value === menu.mealType)
                        return (
                            <Card key={menu.id} className="flex flex-col">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <span>{mealType?.icon || '🍽️'}</span>
                                            {menu.name}
                                        </CardTitle>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500"
                                            onClick={() => deleteMenuMutation.mutate(menu.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {mealType && (
                                        <Badge variant="outline">{mealType.label}</Badge>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-4 flex-1 flex flex-col">
                                    {/* Recipes in this menu */}
                                    <div className="space-y-2 flex-1">
                                        {menu.recipes && menu.recipes.length > 0 ? (
                                            menu.recipes.map(mr => (
                                                <div key={mr.id} className="flex items-center justify-between p-2 bg-secondary rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        <ChefHat className="h-4 w-4 text-orange-500" />
                                                        <span className="font-medium">
                                                            {mr.recipeName}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline">{mr.servings} portions</Badge>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-red-500"
                                                            onClick={() => removeRecipeMutation.mutate(mr.id)}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-2">
                                                Aucune recette
                                            </p>
                                        )}
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => setShowAddRecipe(menu.id)}
                                    >
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Ajouter une recette
                                    </Button>

                                    {menu.notes && (
                                        <p className="text-sm text-muted-foreground italic">
                                            {menu.notes}
                                        </p>
                                    )}

                                    <div className="pt-4 border-t mt-auto">
                                        <Button
                                            variant="secondary"
                                            className="w-full hover:bg-green-100 hover:text-green-800 dark:hover:bg-green-900/30 dark:hover:text-green-400 transition-colors"
                                            onClick={() => handleConsumeMenu(menu)}
                                            disabled={consumeMenuMutation.isPending || !menu.recipes || menu.recipes.length === 0}
                                        >
                                            {consumeMenuMutation.isPending ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <UtensilsCrossed className="mr-2 h-4 w-4" />
                                            )}
                                            Valider la consommation
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            ) : (
                <Card className="p-12 text-center">
                    <UtensilsCrossed className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aucun menu pour ce jour</h3>
                    <p className="text-muted-foreground mb-4">
                        Commencez par créer un menu pour planifier les repas
                    </p>
                    <Button onClick={() => setShowAddMenu(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Créer un menu
                    </Button>
                </Card>
            )}

            {/* Ingredient Needs */}
            {ingredientNeeds.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Besoins en Ingrédients
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                            {ingredientNeeds.map((need, index) => {
                                const product = products?.find(p => p.id === need.productId)
                                const hasStock = product ? product.quantity >= need.quantity : false

                                return (
                                    <div
                                        key={index}
                                        className={`p-3 rounded-lg border ${hasStock
                                            ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                                            : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                                            }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium">{need.name}</span>
                                            <Badge variant={hasStock ? "outline" : "destructive"}>
                                                {need.quantity.toFixed(1)} {need.unit}
                                            </Badge>
                                        </div>
                                        {product && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Stock: {product.quantity} {product.unit}
                                            </p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Add Menu Dialog */}
            <Dialog open={showAddMenu} onOpenChange={setShowAddMenu}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nouveau Menu</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nom du menu</Label>
                            <Input
                                placeholder="Ex: Menu du jour, Menu végétarien..."
                                value={menuName}
                                onChange={(e) => setMenuName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Type de repas</Label>
                            <Select value={menuMealType} onValueChange={setMenuMealType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {MEAL_TYPES.map(type => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.icon} {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Notes (optionnel)</Label>
                            <Textarea
                                placeholder="Remarques, régimes spéciaux..."
                                value={menuNotes}
                                onChange={(e) => setMenuNotes(e.target.value)}
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddMenu(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleCreateMenu} disabled={!menuName || createMenuMutation.isPending}>
                            {createMenuMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Créer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Recipe to Menu Dialog */}
            <Dialog open={showAddRecipe !== null} onOpenChange={() => setShowAddRecipe(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ajouter une recette</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Recette</Label>
                            <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner une recette" />
                                </SelectTrigger>
                                <SelectContent>
                                    {recipes?.map(recipe => (
                                        <SelectItem key={recipe.id} value={recipe.id}>
                                            {recipe.name} ({recipe.portions} portions)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Nombre de portions</Label>
                            <Input
                                type="number"
                                min="1"
                                value={recipeServings}
                                onChange={(e) => setRecipeServings(parseInt(e.target.value) || 1)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddRecipe(null)}>
                            Annuler
                        </Button>
                        <Button onClick={handleAddRecipe} disabled={!selectedRecipeId || addRecipeMutation.isPending}>
                            {addRecipeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Ajouter
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
