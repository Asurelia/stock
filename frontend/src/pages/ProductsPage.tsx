import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, type Product } from "@/lib/api"
import { DataTable } from "@/components/products/data-table"
import { ProductDialog } from "@/components/products/product-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, Loader2, ArrowUpDown, MoreHorizontal, Pencil, Trash2, Plus, Minus } from "lucide-react"
import { toast } from "sonner"
import type { ColumnDef } from "@tanstack/react-table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ProductsPage() {
    const queryClient = useQueryClient()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

    const { data: products, isLoading, isError, error } = useQuery({
        queryKey: ['products'],
        queryFn: api.products.getAll
    })

    const deleteMutation = useMutation({
        mutationFn: api.products.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
            toast.success("Produit supprimé")
        },
        onError: () => toast.error("Erreur lors de la suppression")
    })

    const updateStockMutation = useMutation({
        mutationFn: ({ id, quantity }: { id: string, quantity: number }) =>
            api.products.update(id, { quantity }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
            toast.success("Stock mis à jour")
        },
        onError: () => toast.error("Erreur mise à jour stock")
    })

    const handleEdit = (product: Product) => {
        setSelectedProduct(product)
        setIsDialogOpen(true)
    }

    const handleDelete = (id: string) => {
        if (confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) {
            deleteMutation.mutate(id)
        }
    }

    const handleAdd = () => {
        setSelectedProduct(null)
        setIsDialogOpen(true)
    }

    const handleAdjustStock = (product: Product, amount: number) => {
        const newQty = Math.max(0, product.quantity + amount)
        updateStockMutation.mutate({ id: product.id, quantity: newQty })
    }

    const columns: ColumnDef<Product>[] = [
        {
            accessorKey: "name",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Produit
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
        },
        {
            accessorKey: "category",
            header: "Catégorie",
            cell: ({ row }) => <Badge variant="outline">{row.getValue("category") || "Sans catégorie"}</Badge>,
        },
        {
            accessorKey: "quantity",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Quantité
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const qty = parseFloat(row.getValue("quantity"))
                const min = row.original.minStock
                let variant: "default" | "destructive" | "outline" | "secondary" = "default"

                if (min > 0) {
                    if (qty <= min) variant = "destructive"
                    else if (qty <= min * 1.5) variant = "secondary"
                }

                return <Badge variant={variant}>{qty} {row.original.unit}</Badge>
            },
        },
        {
            accessorKey: "price",
            header: "Valeur",
            cell: ({ row }) => {
                const amount = parseFloat(row.getValue("price")) * row.original.quantity
                const formatted = new Intl.NumberFormat("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                }).format(amount || 0)

                return <div className="font-medium">{formatted}</div>
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const product = row.original

                return (
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => handleAdjustStock(product, -1)}>
                            <Minus className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => handleAdjustStock(product, 1)}>
                            <Plus className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(product.id)}>
                                    Copier ID
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-blue-600" onClick={() => handleEdit(product)}>
                                    <Pencil className="nr-2 h-4 w-4" /> Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(product.id)}>
                                    <Trash2 className="nr-2 h-4 w-4" /> Supprimer
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        },
    ]

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (isError) {
        return (
            <div className="p-8 text-center text-red-500">
                Une erreur est survenue lors du chargement des produits: {error instanceof Error ? error.message : 'Erreur inconnue'}
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Produits</h2>
                    <p className="text-muted-foreground">
                        Gérez votre inventaire, ajoutez, modifiez ou supprimez des articles.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button onClick={handleAdd}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Ajouter un produit
                    </Button>
                </div>
            </div>

            <DataTable columns={columns} data={products || []} />

            <ProductDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                product={selectedProduct}
            />
        </div>
    )
}
