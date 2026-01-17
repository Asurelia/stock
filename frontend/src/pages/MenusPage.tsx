import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, type ClinicMenu, type MealData, type PunctualOrder, type Recipe } from "@/lib/api"
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
    Users,
    User,
    ClipboardList,
    ChefHat,
    PlusCircle,
    Trash2,
    Package,
    Save
} from "lucide-react"
import { toast } from "sonner"

export function MenusPage() {
    const queryClient = useQueryClient()
    const [currentDate, setCurrentDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [editingMeal, setEditingMeal] = useState<{ type: 'patientLunch' | 'patientDinner' | 'staffLunch' } | null>(null)
    const [notes, setNotes] = useState("")

    // Meal form state
    const [selectedRecipeId, setSelectedRecipeId] = useState("")
    const [mealPortions, setMealPortions] = useState(1)

    // Punctual order form
    const [punctualName, setPunctualName] = useState("")
    const [punctualQty, setPunctualQty] = useState(1)

    const { data: menu, isLoading: loadingMenu } = useQuery({
        queryKey: ['clinic-menu', currentDate],
        queryFn: () => api.clinicMenus.getByDate(currentDate)
    })

    const { data: recipes } = useQuery({
        queryKey: ['recipes'],
        queryFn: api.recipes.getAll
    })

    const { data: products } = useQuery({
        queryKey: ['products'],
        queryFn: api.products.getAll
    })

    const saveMutation = useMutation({
        mutationFn: api.clinicMenus.save,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clinic-menu'] })
            toast.success("Menu sauvegardé")
        },
        onError: () => toast.error("Erreur lors de la sauvegarde")
    })

    const handlePrevDay = () => {
        setCurrentDate(format(subDays(new Date(currentDate), 1), 'yyyy-MM-dd'))
    }

    const handleNextDay = () => {
        setCurrentDate(format(addDays(new Date(currentDate), 1), 'yyyy-MM-dd'))
    }

    const openMealDialog = (type: 'patientLunch' | 'patientDinner' | 'staffLunch') => {
        const currentMeal = menu?.[type] || {}
        setSelectedRecipeId(currentMeal.recipeId || "")
        setMealPortions(currentMeal.portions || 1)
        setEditingMeal({ type })
    }

    const handleSaveMeal = () => {
        if (!editingMeal) return

        const recipe = recipes?.find(r => r.id === selectedRecipeId)
        const mealData: MealData = selectedRecipeId ? {
            recipeId: selectedRecipeId,
            recipeName: recipe?.name || "",
            portions: mealPortions
        } : {}

        const updatedMenu: Omit<ClinicMenu, 'id'> & { id?: string } = {
            id: menu?.id,
            date: currentDate,
            patientLunch: editingMeal.type === 'patientLunch' ? mealData : (menu?.patientLunch || {}),
            patientDinner: editingMeal.type === 'patientDinner' ? mealData : (menu?.patientDinner || {}),
            staffLunch: editingMeal.type === 'staffLunch' ? mealData : (menu?.staffLunch || {}),
            punctualOrders: menu?.punctualOrders || [],
            notes: menu?.notes || ""
        }

        saveMutation.mutate(updatedMenu)
        setEditingMeal(null)
    }

    const handleAddPunctualOrder = () => {
        if (!punctualName) return

        const newOrder: PunctualOrder = { name: punctualName, quantity: punctualQty }
        const updatedOrders = [...(menu?.punctualOrders || []), newOrder]

        saveMutation.mutate({
            id: menu?.id,
            date: currentDate,
            patientLunch: menu?.patientLunch || {},
            patientDinner: menu?.patientDinner || {},
            staffLunch: menu?.staffLunch || {},
            punctualOrders: updatedOrders,
            notes: menu?.notes || ""
        })

        setPunctualName("")
        setPunctualQty(1)
    }

    const handleRemovePunctualOrder = (index: number) => {
        const updatedOrders = (menu?.punctualOrders || []).filter((_, i) => i !== index)

        saveMutation.mutate({
            id: menu?.id,
            date: currentDate,
            patientLunch: menu?.patientLunch || {},
            patientDinner: menu?.patientDinner || {},
            staffLunch: menu?.staffLunch || {},
            punctualOrders: updatedOrders,
            notes: menu?.notes || ""
        })
    }

    const handleSaveNotes = () => {
        saveMutation.mutate({
            id: menu?.id,
            date: currentDate,
            patientLunch: menu?.patientLunch || {},
            patientDinner: menu?.patientDinner || {},
            staffLunch: menu?.staffLunch || {},
            punctualOrders: menu?.punctualOrders || [],
            notes
        })
    }

    // Calculate ingredient needs
    const calculateNeeds = () => {
        const needs: Record<string, { productId: string; name: string; quantity: number; unit: string }> = {}

        const addMealNeeds = (meal: MealData | undefined) => {
            if (!meal?.recipeId) return
            const recipe = recipes?.find(r => r.id === meal.recipeId)
            if (!recipe) return

            const multiplier = (meal.portions || 1) / recipe.portions

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
        }

        addMealNeeds(menu?.patientLunch)
        addMealNeeds(menu?.patientDinner)
        addMealNeeds(menu?.staffLunch)

        return Object.values(needs)
    }

    const ingredientNeeds = calculateNeeds()

    const MealCard = ({ title, icon: Icon, mealKey, meal }: {
        title: string
        icon: typeof Users
        mealKey: 'patientLunch' | 'patientDinner' | 'staffLunch'
        meal?: MealData
    }) => (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {meal?.recipeId ? (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <ChefHat className="h-4 w-4 text-orange-500" />
                            <span className="font-medium">{meal.recipeName}</span>
                        </div>
                        <Badge variant="outline">{meal.portions} portions</Badge>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">Non défini</p>
                )}
                <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => openMealDialog(mealKey)}
                >
                    {meal?.recipeId ? "Modifier" : "Définir"}
                </Button>
            </CardContent>
        </Card>
    )

    if (loadingMenu) {
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
                    <h2 className="text-3xl font-bold tracking-tight">Menus Clinique</h2>
                    <p className="text-muted-foreground">
                        Planifiez les repas patients et personnel
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

            {/* Meals Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <MealCard
                    title="Déjeuner Patients"
                    icon={Users}
                    mealKey="patientLunch"
                    meal={menu?.patientLunch}
                />
                <MealCard
                    title="Dîner Patients"
                    icon={Users}
                    mealKey="patientDinner"
                    meal={menu?.patientDinner}
                />
                <MealCard
                    title="Déjeuner Personnel"
                    icon={User}
                    mealKey="staffLunch"
                    meal={menu?.staffLunch}
                />
            </div>

            {/* Punctual Orders */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5" />
                        Commandes Ponctuelles
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Description"
                            value={punctualName}
                            onChange={(e) => setPunctualName(e.target.value)}
                            className="flex-1"
                        />
                        <Input
                            type="number"
                            min="1"
                            value={punctualQty}
                            onChange={(e) => setPunctualQty(parseInt(e.target.value) || 1)}
                            className="w-20"
                        />
                        <Button onClick={handleAddPunctualOrder} disabled={!punctualName}>
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                    </div>

                    {menu?.punctualOrders && menu.punctualOrders.length > 0 ? (
                        <div className="space-y-2">
                            {menu.punctualOrders.map((order, index) => (
                                <div key={index} className="flex justify-between items-center p-2 bg-secondary rounded-lg">
                                    <span>{order.name}</span>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{order.quantity}</Badge>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500"
                                            onClick={() => handleRemovePunctualOrder(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            Aucune commande ponctuelle
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Notes */}
            <Card>
                <CardHeader>
                    <CardTitle>Notes du Jour</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        placeholder="Spécificités, régimes adaptés, remarques..."
                        value={notes || menu?.notes || ""}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                    />
                    <Button onClick={handleSaveNotes} disabled={saveMutation.isPending}>
                        <Save className="mr-2 h-4 w-4" />
                        Sauvegarder
                    </Button>
                </CardContent>
            </Card>

            {/* Ingredient Needs */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Besoins en Ingrédients
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {ingredientNeeds.length > 0 ? (
                        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                            {ingredientNeeds.map((need, index) => {
                                const product = products?.find(p => p.id === need.productId)
                                const hasStock = product ? product.quantity >= need.quantity : false

                                return (
                                    <div
                                        key={index}
                                        className={`p-3 rounded-lg border ${hasStock
                                                ? 'bg-green-50 border-green-200'
                                                : 'bg-red-50 border-red-200'
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
                    ) : (
                        <p className="text-center text-muted-foreground py-4">
                            Définissez les menus pour voir les besoins
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Meal Dialog */}
            <Dialog open={editingMeal !== null} onOpenChange={() => setEditingMeal(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Définir le repas</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Recette</Label>
                            <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner une recette" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Aucune</SelectItem>
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
                                value={mealPortions}
                                onChange={(e) => setMealPortions(parseInt(e.target.value) || 1)}
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setEditingMeal(null)}>
                                Annuler
                            </Button>
                            <Button onClick={handleSaveMeal} disabled={saveMutation.isPending}>
                                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Enregistrer
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
