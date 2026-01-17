import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, type Output, type Product, OUTPUT_REASONS } from "@/lib/api"
import { format, subDays } from "date-fns"
import { fr } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { PlusCircle, Loader2, Trash2, Calendar, Package, Zap } from "lucide-react"
import { toast } from "sonner"

export function OutputsPage() {
    const queryClient = useQueryClient()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
    const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))

    // Form state
    const [selectedProductId, setSelectedProductId] = useState("")
    const [quantity, setQuantity] = useState("")
    const [reason, setReason] = useState<string>(OUTPUT_REASONS[0])
    const [outputDate, setOutputDate] = useState(format(new Date(), 'yyyy-MM-dd'))

    const { data: products, isLoading: loadingProducts } = useQuery({
        queryKey: ['products'],
        queryFn: api.products.getAll
    })

    const { data: todayOutputs, isLoading: loadingToday } = useQuery({
        queryKey: ['outputs', 'today'],
        queryFn: api.outputs.getToday
    })

    const { data: historyOutputs, isLoading: loadingHistory } = useQuery({
        queryKey: ['outputs', 'history', dateFrom, dateTo],
        queryFn: () => api.outputs.getByDateRange(dateFrom, dateTo)
    })

    const createMutation = useMutation({
        mutationFn: api.outputs.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['outputs'] })
            queryClient.invalidateQueries({ queryKey: ['products'] })
            toast.success("Sortie enregistrée")
            resetForm()
            setIsDialogOpen(false)
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

    const resetForm = () => {
        setSelectedProductId("")
        setQuantity("")
        setReason(OUTPUT_REASONS[0])
        setOutputDate(format(new Date(), 'yyyy-MM-dd'))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedProductId || !quantity) return

        createMutation.mutate({
            productId: selectedProductId,
            quantity: parseFloat(quantity),
            reason,
            date: outputDate
        })
    }

    const handleDelete = (id: string) => {
        if (confirm("Annuler cette sortie ? Le stock sera restauré.")) {
            deleteMutation.mutate(id)
        }
    }

    const selectedProduct = products?.find(p => p.id === selectedProductId)

    const getReasonBadgeColor = (reason: string) => {
        switch (reason) {
            case 'Service midi':
            case 'Service soir':
                return 'bg-blue-100 text-blue-800'
            case 'Perte':
            case 'Casse':
            case 'Péremption':
                return 'bg-red-100 text-red-800'
            default:
                return 'bg-gray-100 text-gray-800'
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
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Sorties Stock</h2>
                    <p className="text-muted-foreground">
                        Gérez les sorties journalières de votre inventaire
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Nouvelle Sortie
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Nouvelle Sortie de Stock</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="product">Produit *</Label>
                                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner un produit" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {products?.map(product => (
                                                <SelectItem key={product.id} value={product.id}>
                                                    {product.name} ({product.quantity} {product.unit})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {selectedProduct && (
                                        <p className="text-sm text-muted-foreground">
                                            Stock actuel: {selectedProduct.quantity} {selectedProduct.unit}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="quantity">Quantité *</Label>
                                    <Input
                                        id="quantity"
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        placeholder="0"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="reason">Motif</Label>
                                    <Select value={reason} onValueChange={setReason}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {OUTPUT_REASONS.map(r => (
                                                <SelectItem key={r} value={r}>{r}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="date">Date</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={outputDate}
                                        onChange={(e) => setOutputDate(e.target.value)}
                                    />
                                </div>

                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                        Annuler
                                    </Button>
                                    <Button type="submit" disabled={!selectedProductId || !quantity || createMutation.isPending}>
                                        {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Enregistrer
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

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
                    ) : todayOutputs && todayOutputs.length > 0 ? (
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {todayOutputs.map(output => (
                                <div key={output.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-orange-100 rounded-lg">
                                            <Package className="h-4 w-4 text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{output.productName}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {output.quantity} unités
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
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">
                            Aucune sortie aujourd'hui
                        </p>
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
                                className="w-40"
                            />
                            <span className="text-muted-foreground">à</span>
                            <Input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-40"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loadingHistory ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                    ) : historyOutputs && historyOutputs.length > 0 ? (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Produit</TableHead>
                                        <TableHead>Quantité</TableHead>
                                        <TableHead>Motif</TableHead>
                                        <TableHead className="w-[100px]">Actions</TableHead>
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
        </div>
    )
}
