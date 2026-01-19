import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, type Product } from "@/lib/api"
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
import { Loader2, Trash2, Calendar, Package, Zap, Camera, Grid3X3 } from "lucide-react"
import { toast } from "sonner"
import { StreamDeckGrid, OutputDialog, TraceabilityTab, getProductEmoji } from "@/components/outputs"

export function OutputsPage() {
    const queryClient = useQueryClient()
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
    const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [activeTab, setActiveTab] = useState("sorties")

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
        </div>
    )
}
