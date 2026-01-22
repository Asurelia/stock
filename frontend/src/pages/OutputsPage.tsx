import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, type Product, DAILY_OUTPUT_CATEGORIES, type DailyOutputCategory, type RecurringOutputConfig } from "@/lib/api"
import { format, subDays } from "date-fns"
import { fr } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Loader2, Trash2, Calendar, Package, Zap, Camera, Grid3X3, Coffee, Plus, Minus, Settings, Play, Check } from "lucide-react"
import { toast } from "sonner"
import { StreamDeckGrid, OutputDialog, TraceabilityTab, getProductEmoji } from "@/components/outputs"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"

type DailyCategory = typeof DAILY_OUTPUT_CATEGORIES[number]

export function OutputsPage() {
    const queryClient = useQueryClient()
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
    const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [activeTab, setActiveTab] = useState("sorties")
    
    // Daily outputs dialog
    const [isDailyDialogOpen, setIsDailyDialogOpen] = useState(false)
    const [selectedDailyCategory, setSelectedDailyCategory] = useState<DailyCategory | null>(null)
    
    // Recurring outputs config dialog
    const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
    
    const todayDate = format(new Date(), 'yyyy-MM-dd')
    
    // Fetch recurring configs
    const { data: recurringConfigs = [] } = useQuery({
        queryKey: ['recurring-configs'],
        queryFn: api.recurringOutputs.configs.getAll
    })
    
    // Fetch today's daily outputs (initialize if needed)
    const { data: todayDailyOutputs = [], refetch: refetchDailyOutputs } = useQuery({
        queryKey: ['daily-recurring', todayDate],
        queryFn: () => api.recurringOutputs.daily.initializeForDate(todayDate)
    })

    const { data: products = [], isLoading: loadingProducts } = useQuery({
        queryKey: ['products'],
        queryFn: api.products.getAll
    })

    const { data: todayOutputs = [], isLoading: loadingToday } = useQuery({
        queryKey: ['outputs', 'today'],
        queryFn: api.outputs.getToday
    })

    const { data: historyOutputs = [], isLoading: loadingHistory } = useQuery({
        queryKey: ['outputs', 'history', dateFrom, dateTo],
        queryFn: () => api.outputs.getByDateRange(dateFrom, dateTo)
    })

    const createMutation = useMutation({
        mutationFn: api.outputs.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['outputs'] })
            queryClient.invalidateQueries({ queryKey: ['products'] })
            toast.success("Sortie enregistrée")
            setIsDialogOpen(false)
            setSelectedProduct(null)
        },
        onError: () => toast.error("Erreur lors de l'enregistrement")
    })

    const deleteMutation = useMutation({
        mutationFn: api.outputs.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['outputs'] })
            queryClient.invalidateQueries({ queryKey: ['products'] })
            toast.success("Sortie annulée - stock restauré")
        },
        onError: () => toast.error("Erreur lors de la suppression")
    })

    const handleProductClick = (product: Product) => {
        setSelectedProduct(product)
        setIsDialogOpen(true)
    }

    const handleSubmitOutput = (data: {
        productId: string
        quantity: number
        reason: string
        recipeId: string | null
    }) => {
        createMutation.mutate({
            productId: data.productId,
            quantity: data.quantity,
            reason: data.reason,
            date: new Date().toISOString()
        })
    }

    const handleDelete = (id: string) => {
        if (confirm("Annuler cette sortie ? Le stock sera restauré.")) {
            deleteMutation.mutate(id)
        }
    }

    const getReasonBadgeColor = (reason: string) => {
        switch (reason) {
            case 'Service midi':
            case 'Service soir':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
            case 'Perte':
            case 'Casse':
            case 'Péremption':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
        }
    }

    if (loadingProducts) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Sorties Stock</h2>
                <p className="text-muted-foreground">
                    Sélectionnez un produit pour enregistrer une sortie
                </p>
            </div>

            {/* Tabs: Sorties / Traçabilité */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="sorties" className="flex items-center gap-2">
                        <Grid3X3 className="h-4 w-4" />
                        <span className="hidden sm:inline">Sorties</span>
                    </TabsTrigger>
                    <TabsTrigger value="tracabilite" className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        <span className="hidden sm:inline">Traçabilité</span>
                    </TabsTrigger>
                </TabsList>

                {/* Sorties Tab */}
                <TabsContent value="sorties" className="space-y-6">
                    {/* Daily Recurring Outputs */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Coffee className="h-5 w-5 text-amber-500" />
                                Sorties journalières récurrentes
                            </CardTitle>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsConfigDialogOpen(true)}
                            >
                                <Settings className="h-4 w-4 mr-2" />
                                Configurer
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {DAILY_OUTPUT_CATEGORIES.map((category) => {
                                    const categoryOutputs = todayDailyOutputs.filter(o => o.category === category.id)
                                    const pendingCount = categoryOutputs.filter(o => !o.isExecuted).length
                                    const executedCount = categoryOutputs.filter(o => o.isExecuted).length
                                    const totalCount = categoryOutputs.length
                                    const allExecuted = totalCount > 0 && pendingCount === 0
                                    
                                    return (
                                        <div
                                            key={category.id}
                                            className={`p-4 rounded-lg border ${category.color} ${allExecuted ? 'opacity-60' : ''}`}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-2xl">{category.icon}</span>
                                                    <span className="font-medium">{category.label}</span>
                                                </div>
                                                {allExecuted && <Check className="h-5 w-5 text-green-600" />}
                                            </div>
                                            
                                            {totalCount === 0 ? (
                                                <p className="text-sm text-muted-foreground mb-3">
                                                    Aucun produit configuré
                                                </p>
                                            ) : (
                                                <p className="text-sm mb-3">
                                                    {executedCount}/{totalCount} exécuté(s)
                                                </p>
                                            )}
                                            
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => {
                                                        setSelectedDailyCategory(category)
                                                        setIsDailyDialogOpen(true)
                                                    }}
                                                >
                                                    {totalCount === 0 ? 'Ajouter' : 'Modifier'}
                                                </Button>
                                                {pendingCount > 0 && (
                                                    <Button
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={async () => {
                                                            try {
                                                                const count = await api.recurringOutputs.daily.executeCategory(todayDate, category.id as DailyOutputCategory)
                                                                toast.success(`${count} sortie(s) exécutée(s)`)
                                                                refetchDailyOutputs()
                                                                queryClient.invalidateQueries({ queryKey: ['outputs'] })
                                                                queryClient.invalidateQueries({ queryKey: ['products'] })
                                                            } catch {
                                                                toast.error('Erreur lors de l\'exécution')
                                                            }
                                                        }}
                                                    >
                                                        <Play className="h-4 w-4 mr-1" />
                                                        Exécuter
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* StreamDeck Grid */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Grid3X3 className="h-5 w-5" />
                                Sélectionner un produit
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <StreamDeckGrid
                                products={products}
                                onProductClick={handleProductClick}
                                showOutOfStock={false}
                            />
                        </CardContent>
                    </Card>

                    {/* Today's Outputs */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="h-5 w-5 text-orange-500" />
                                Sorties du {format(new Date(), 'EEEE d MMMM', { locale: fr })}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingToday ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                </div>
                            ) : todayOutputs.length > 0 ? (
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {todayOutputs.map(output => {
                                        const product = products.find(p => p.id === output.productId)
                                        return (
                                            <div key={output.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">
                                                        {product ? getProductEmoji(product) : '📦'}
                                                    </span>
                                                    <div>
                                                        <p className="font-medium">{output.productName}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {output.quantity} {product?.unit || 'unités'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge className={getReasonBadgeColor(output.reason)}>
                                                        {output.reason}
                                                    </Badge>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500"
                                                        onClick={() => handleDelete(output.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p>Aucune sortie aujourd'hui</p>
                                    <p className="text-sm">Cliquez sur un produit ci-dessus pour commencer</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* History */}
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Historique
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className="w-36"
                                    />
                                    <span className="text-muted-foreground">à</span>
                                    <Input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="w-36"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loadingHistory ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                </div>
                            ) : historyOutputs.length > 0 ? (
                                <div className="rounded-md border overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Produit</TableHead>
                                                <TableHead>Quantité</TableHead>
                                                <TableHead>Motif</TableHead>
                                                <TableHead className="w-[80px]">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {historyOutputs.map(output => (
                                                <TableRow key={output.id}>
                                                    <TableCell>
                                                        {format(new Date(output.date), 'dd/MM/yyyy')}
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {output.productName}
                                                    </TableCell>
                                                    <TableCell>{output.quantity}</TableCell>
                                                    <TableCell>
                                                        <Badge className={getReasonBadgeColor(output.reason)}>
                                                            {output.reason}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-red-500"
                                                            onClick={() => handleDelete(output.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground py-8">
                                    Aucune sortie sur cette période
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Traçabilité Tab */}
                <TabsContent value="tracabilite">
                    <TraceabilityTab
                        products={products}
                        todayOutputs={todayOutputs}
                        onPhotoUploaded={() => {
                            queryClient.invalidateQueries({ queryKey: ['traceability-photos'] })
                        }}
                    />
                </TabsContent>
            </Tabs>

            {/* Output Dialog */}
            <OutputDialog
                product={selectedProduct}
                open={isDialogOpen}
                onClose={() => {
                    setIsDialogOpen(false)
                    setSelectedProduct(null)
                }}
                onSubmit={handleSubmitOutput}
                isLoading={createMutation.isPending}
            />

            {/* Daily Output Dialog - Configure recurring outputs for a category */}
            <DailyOutputDialog
                category={selectedDailyCategory}
                open={isDailyDialogOpen}
                onClose={() => {
                    setIsDailyDialogOpen(false)
                    setSelectedDailyCategory(null)
                }}
                products={products}
                existingConfigs={recurringConfigs}
                onSave={async (configs) => {
                    try {
                        // Save each config
                        for (const config of configs) {
                            await api.recurringOutputs.configs.upsert(config)
                        }
                        toast.success('Configuration sauvegardée')
                        queryClient.invalidateQueries({ queryKey: ['recurring-configs'] })
                        queryClient.invalidateQueries({ queryKey: ['daily-recurring'] })
                        setIsDailyDialogOpen(false)
                        setSelectedDailyCategory(null)
                    } catch {
                        toast.error('Erreur lors de la sauvegarde')
                    }
                }}
            />

            {/* Global Config Dialog */}
            <RecurringConfigDialog
                open={isConfigDialogOpen}
                onClose={() => setIsConfigDialogOpen(false)}
                products={products}
                configs={recurringConfigs}
                onConfigChange={() => {
                    queryClient.invalidateQueries({ queryKey: ['recurring-configs'] })
                    queryClient.invalidateQueries({ queryKey: ['daily-recurring'] })
                }}
            />
        </div>
    )
}

// Daily Output Dialog Component - Configure recurring outputs for a category
function DailyOutputDialog({
    category,
    open,
    onClose,
    products,
    existingConfigs,
    onSave
}: {
    category: DailyCategory | null
    open: boolean
    onClose: () => void
    products: Product[]
    existingConfigs: RecurringOutputConfig[]
    onSave: (configs: { category: DailyOutputCategory; productId: string; quantity: number }[]) => Promise<void>
}) {
    const [selectedProducts, setSelectedProducts] = useState<Map<string, number>>(new Map())
    const [searchQuery, setSearchQuery] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    // Initialize from existing configs when dialog opens
    const handleOpenChange = (isOpen: boolean) => {
        if (isOpen && category) {
            const categoryConfigs = existingConfigs.filter(c => c.category === category.id)
            const initialMap = new Map<string, number>()
            categoryConfigs.forEach(c => initialMap.set(c.productId, c.quantity))
            setSelectedProducts(initialMap)
        }
        if (!isOpen) {
            setSelectedProducts(new Map())
            setSearchQuery('')
            onClose()
        }
    }

    // Re-initialize when category changes
    useState(() => {
        if (open && category) {
            const categoryConfigs = existingConfigs.filter(c => c.category === category.id)
            const initialMap = new Map<string, number>()
            categoryConfigs.forEach(c => initialMap.set(c.productId, c.quantity))
            setSelectedProducts(initialMap)
        }
    })

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const updateQuantity = (productId: string, delta: number) => {
        const newMap = new Map(selectedProducts)
        const current = newMap.get(productId) || 0
        const newValue = Math.max(0, current + delta)
        if (newValue === 0) {
            newMap.delete(productId)
        } else {
            newMap.set(productId, newValue)
        }
        setSelectedProducts(newMap)
    }

    const handleSubmit = async () => {
        if (!category) return
        setIsSaving(true)
        try {
            const configs = Array.from(selectedProducts.entries()).map(([productId, quantity]) => ({
                category: category.id as DailyOutputCategory,
                productId,
                quantity
            }))
            await onSave(configs)
        } finally {
            setIsSaving(false)
        }
    }

    const totalItems = Array.from(selectedProducts.values()).reduce((sum, qty) => sum + qty, 0)

    if (!category) return null

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="text-2xl">{category.icon}</span>
                        {category.label} - Configuration
                    </DialogTitle>
                </DialogHeader>

                <p className="text-sm text-muted-foreground">
                    Configurez les produits qui sortiront automatiquement chaque jour pour "{category.label}".
                </p>

                <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                    {/* Search */}
                    <Input
                        placeholder="Rechercher un produit..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    {/* Products list */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 max-h-[300px]">
                        {filteredProducts.map(product => {
                            const quantity = selectedProducts.get(product.id) || 0
                            return (
                                <div
                                    key={product.id}
                                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                        quantity > 0 ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{getProductEmoji(product)}</span>
                                        <div>
                                            <p className="font-medium">{product.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Stock: {product.quantity} {product.unit}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => updateQuantity(product.id, -1)}
                                            disabled={quantity === 0}
                                        >
                                            <Minus className="h-4 w-4" />
                                        </Button>
                                        <span className="w-8 text-center font-medium">{quantity}</span>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => updateQuantity(product.id, 1)}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Summary */}
                    {selectedProducts.size > 0 && (
                        <div className={`p-3 rounded-lg ${category.color}`}>
                            <p className="font-medium">
                                {selectedProducts.size} produit(s) configuré(s) - {totalItems} unité(s)/jour
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Annuler
                    </Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Sauvegarder
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// Global Recurring Config Dialog
function RecurringConfigDialog({
    open,
    onClose,
    products,
    configs,
    onConfigChange
}: {
    open: boolean
    onClose: () => void
    products: Product[]
    configs: RecurringOutputConfig[]
    onConfigChange: () => void
}) {
    const handleDelete = async (configId: string) => {
        try {
            await api.recurringOutputs.configs.delete(configId)
            toast.success('Configuration supprimée')
            onConfigChange()
        } catch {
            toast.error('Erreur lors de la suppression')
        }
    }

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Configuration des sorties récurrentes
                    </DialogTitle>
                </DialogHeader>

                <p className="text-sm text-muted-foreground">
                    Gérez les produits qui sortent automatiquement chaque jour. Ces configurations s'appliquent à tous les jours futurs.
                </p>

                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                    {DAILY_OUTPUT_CATEGORIES.map(category => {
                        const categoryConfigs = configs.filter(c => c.category === category.id)
                        
                        return (
                            <div key={category.id} className={`p-4 rounded-lg border ${category.color}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xl">{category.icon}</span>
                                    <h3 className="font-semibold">{category.label}</h3>
                                    <Badge variant="secondary" className="ml-auto">
                                        {categoryConfigs.length} produit(s)
                                    </Badge>
                                </div>
                                
                                {categoryConfigs.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        Aucun produit configuré
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {categoryConfigs.map(config => {
                                            const product = products.find(p => p.id === config.productId)
                                            return (
                                                <div key={config.id} className="flex items-center justify-between bg-background/50 p-2 rounded">
                                                    <div className="flex items-center gap-2">
                                                        <span>{product ? getProductEmoji(product) : '📦'}</span>
                                                        <span className="font-medium">{config.productName || product?.name}</span>
                                                        <Badge variant="outline">{config.quantity} {product?.unit || 'unité(s)'}</Badge>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive"
                                                        onClick={() => handleDelete(config.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                <DialogFooter>
                    <Button onClick={onClose}>
                        Fermer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
