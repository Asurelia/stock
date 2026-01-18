import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, type Delivery, type DeliveryItem, type Product } from "@/lib/api"
import { format } from "date-fns"
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
import { PlusCircle, Loader2, Trash2, Truck, Package, X, Camera } from "lucide-react"
import { toast } from "sonner"
import { DeliveryScanDialog } from "@/components/ocr/DeliveryScanDialog"

export function DeliveriesPage() {
    const queryClient = useQueryClient()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isScanDialogOpen, setIsScanDialogOpen] = useState(false)

    // Form state
    const [deliveryDate, setDeliveryDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [supplierName, setSupplierName] = useState("")
    const [items, setItems] = useState<DeliveryItem[]>([])

    const { data: products } = useQuery({
        queryKey: ['products'],
        queryFn: api.products.getAll
    })

    const { data: suppliers } = useQuery({
        queryKey: ['suppliers'],
        queryFn: api.suppliers.getAll
    })

    const { data: deliveries, isLoading } = useQuery({
        queryKey: ['deliveries'],
        queryFn: api.deliveries.getAll
    })

    const createMutation = useMutation({
        mutationFn: api.deliveries.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deliveries'] })
            queryClient.invalidateQueries({ queryKey: ['products'] })
            toast.success("Livraison enregistrée - Stock mis à jour")
            resetForm()
            setIsDialogOpen(false)
        },
        onError: () => toast.error("Erreur lors de l'enregistrement")
    })

    const deleteMutation = useMutation({
        mutationFn: api.deliveries.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deliveries'] })
            queryClient.invalidateQueries({ queryKey: ['products'] })
            toast.success("Livraison supprimée - Stock ajusté")
        },
        onError: () => toast.error("Erreur lors de la suppression")
    })

    const resetForm = () => {
        setDeliveryDate(format(new Date(), 'yyyy-MM-dd'))
        setSupplierName("")
        setItems([])
    }

    const addItem = () => {
        setItems([...items, { productId: "", productName: "", quantity: 0, price: 0 }])
    }

    const updateItem = (index: number, field: keyof DeliveryItem, value: string | number) => {
        const newItems = [...items]
        if (field === 'productId') {
            const product = products?.find(p => p.id === value)
            newItems[index] = {
                ...newItems[index],
                productId: value as string,
                productName: product?.name || ""
            }
        } else {
            newItems[index] = { ...newItems[index], [field]: value }
        }
        setItems(newItems)
    }

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!supplierName || items.length === 0) return

        const validItems = items.filter(item => item.productId && item.quantity > 0)
        if (validItems.length === 0) {
            toast.error("Ajoutez au moins un article valide")
            return
        }

        createMutation.mutate({
            date: deliveryDate,
            supplierName,
            items: validItems
        })
    }

    const handleDelete = (id: string) => {
        if (confirm("Supprimer cette livraison ? Le stock sera ajusté.")) {
            deleteMutation.mutate(id)
        }
    }

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
    }

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
                    <h2 className="text-3xl font-bold tracking-tight">Livraisons</h2>
                    <p className="text-muted-foreground">
                        Enregistrez les livraisons et mettez à jour le stock
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setIsScanDialogOpen(true)}>
                        <Camera className="mr-2 h-4 w-4" />
                        Scanner
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open)
                        if (!open) resetForm()
                    }}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Nouvelle Livraison
                            </Button>
                        </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Nouvelle Livraison</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="date">Date *</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={deliveryDate}
                                        onChange={(e) => setDeliveryDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="supplier">Fournisseur *</Label>
                                    <Select value={supplierName} onValueChange={setSupplierName}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner ou saisir" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {suppliers?.map(s => (
                                                <SelectItem key={s.id} value={s.name}>
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        placeholder="Ou saisir un nouveau nom"
                                        value={supplierName}
                                        onChange={(e) => setSupplierName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label>Articles</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Ajouter article
                                    </Button>
                                </div>

                                {items.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                                        Aucun article. Cliquez sur "Ajouter article"
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {items.map((item, index) => (
                                            <div key={index} className="flex gap-2 items-end p-3 border rounded-lg">
                                                <div className="flex-1">
                                                    <Label className="text-xs">Produit</Label>
                                                    <Select
                                                        value={item.productId}
                                                        onValueChange={(v) => updateItem(index, 'productId', v)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Sélectionner" />
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
                                                <div className="w-24">
                                                    <Label className="text-xs">Quantité</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={item.quantity || ""}
                                                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <div className="w-24">
                                                    <Label className="text-xs">Prix €</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={item.price || ""}
                                                        onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500"
                                                    onClick={() => removeItem(index)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t">
                                <div className="text-lg font-semibold">
                                    Total: {formatCurrency(calculateTotal())}
                                </div>
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                        Annuler
                                    </Button>
                                    <Button type="submit" disabled={!supplierName || items.length === 0 || createMutation.isPending}>
                                        {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Enregistrer
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
                </div>
            </div>

            {/* Scan Dialog */}
            <DeliveryScanDialog
                open={isScanDialogOpen}
                onOpenChange={setIsScanDialogOpen}
                onConfirm={(scannedItems) => {
                    setItems(scannedItems)
                    setIsScanDialogOpen(false)
                    setIsDialogOpen(true)
                }}
            />

            {/* Deliveries List */}
            {deliveries && deliveries.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {deliveries.map(delivery => (
                        <Card key={delivery.id}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Truck className="h-4 w-4 text-blue-500" />
                                            {delivery.supplierName}
                                        </CardTitle>
                                        <p className="text-sm text-muted-foreground">
                                            {format(new Date(delivery.date), 'dd/MM/yyyy')}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-500"
                                        onClick={() => handleDelete(delivery.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {delivery.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2">
                                                <Package className="h-3 w-3 text-muted-foreground" />
                                                <span>{item.productName}</span>
                                            </div>
                                            <Badge variant="outline">
                                                {item.quantity} × {formatCurrency(item.price)}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 pt-3 border-t flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">
                                        {delivery.items.length} article(s)
                                    </span>
                                    <span className="font-semibold">
                                        {formatCurrency(delivery.total)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                        Aucune livraison enregistrée
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
