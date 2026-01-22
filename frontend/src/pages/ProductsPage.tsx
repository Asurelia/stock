import { useState, useMemo, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, type Product } from "@/lib/api"
import { DataTable } from "@/components/products/data-table"
import { ProductDialog } from "@/components/products/product-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { PlusCircle, Loader2, ArrowUpDown, MoreHorizontal, Pencil, Trash2, Plus, Minus, Camera, CameraOff } from "lucide-react"
import { toast } from "sonner"
import type { ColumnDef } from "@tanstack/react-table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ProductsPage() {
    const queryClient = useQueryClient()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; product: Product | null }>({
        open: false,
        product: null,
    })

    const { data: products, isLoading, isError, error } = useQuery({
        queryKey: ['products'],
        queryFn: api.products.getAll,
        staleTime: 1000 * 60 * 5, // 5 minutes
    })

    const { data: usageStats } = useQuery({
        queryKey: ['productUsage'],
        queryFn: api.recipes.getProductUsageStats
    })

    const deleteMutation = useMutation({
        mutationFn: api.products.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'], refetchType: 'all' })
            toast.success("Produit supprimé")
        },
        onError: () => toast.error("Erreur lors de la suppression")
    })

    const updateStockMutation = useMutation({
        mutationFn: ({ id, quantity }: { id: string, quantity: number }) =>
            api.products.update(id, { quantity }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'], refetchType: 'all' })
        },
        onError: () => toast.error("Erreur mise à jour stock")
    })

    // Handlers mémorisés pour éviter les re-renders
    const handleEdit = useCallback((product: Product) => {
        setSelectedProduct(product)
        setIsDialogOpen(true)
    }, [])

    const handleDeleteClick = useCallback((product: Product) => {
        setDeleteConfirm({ open: true, product })
    }, [])

    const handleDeleteConfirm = useCallback(async () => {
        if (deleteConfirm.product) {
            await deleteMutation.mutateAsync(deleteConfirm.product.id)
        }
    }, [deleteConfirm.product, deleteMutation])

    const handleAdd = useCallback(() => {
        setSelectedProduct(null)
        setIsDialogOpen(true)
    }, [])

    const handleAdjustStock = useCallback((product: Product, amount: number) => {
        const newQty = Math.max(0, product.quantity + amount)
        updateStockMutation.mutate({ id: product.id, quantity: newQty })
    }, [updateStockMutation])

    // Colonnes mémorisées
    const columns: ColumnDef<Product>[] = useMemo(() => [
        {
            accessorKey: "name",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        aria-label="Trier par nom de produit"
                    >
                        Produit
                        <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
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
            id: "usage",
            header: "Utilisation",
            cell: ({ row }) => {
                const count = usageStats?.[row.original.id] || 0
                if (count === 0) return <span className="text-muted-foreground text-xs">-</span>
                return (
                    <Badge variant="secondary" className="font-normal">
                        {count} recette{count > 1 ? 's' : ''}
                    </Badge>
                )
            }
        },
        {
            accessorKey: "requiresTraceabilityPhoto",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        aria-label="Trier par traçabilité"
                    >
                        Traçabilité
                        <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const required = row.original.requiresTraceabilityPhoto
                return (
                    <div className="flex justify-center w-full">
                        {required ? (
                            <div className="flex items-center text-green-600" title="Photo requise">
                                <Camera className="h-4 w-4 mr-1" />
                                <span className="text-xs">Requise</span>
                            </div>
                        ) : (
                            <div className="flex items-center text-muted-foreground/50" title="Photo optionnelle">
                                <CameraOff className="h-4 w-4 mr-1" />
                                <span className="text-xs">Optionnelle</span>
                            </div>
                        )}
                    </div>
                )
            },
        },
        {
            accessorKey: "quantity",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        aria-label="Trier par quantité"
                    >
                        Quantité
                        <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const qty = parseFloat(row.getValue("quantity"))
                const min = row.original.minStock
                let variant: "default" | "destructive" | "outline" | "secondary" = "default"
                let statusLabel = "Stock normal"

                if (min > 0) {
                    if (qty <= min) {
                        variant = "destructive"
                        statusLabel = "Stock critique"
                    } else if (qty <= min * 1.5) {
                        variant = "secondary"
                        statusLabel = "Stock bas"
                    }
                }

                return (
                    <Badge variant={variant} aria-label={`${qty} ${row.original.unit} - ${statusLabel}`}>
                        {qty} {row.original.unit}
                    </Badge>
                )
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
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => {
                const product = row.original

                return (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600"
                            onClick={() => handleAdjustStock(product, -1)}
                            aria-label={`Diminuer le stock de ${product.name}`}
                        >
                            <Minus className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600"
                            onClick={() => handleAdjustStock(product, 1)}
                            aria-label={`Augmenter le stock de ${product.name}`}
                        >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    aria-label={`Menu actions pour ${product.name}`}
                                >
                                    <span className="sr-only">Ouvrir le menu</span>
                                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(product.id)}>
                                    Copier ID
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-blue-600" onClick={() => handleEdit(product)}>
                                    <Pencil className="mr-2 h-4 w-4" aria-hidden="true" /> Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteClick(product)}>
                                    <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" /> Supprimer
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        },
    ], [handleEdit, handleDeleteClick, handleAdjustStock, usageStats])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[50vh]" role="status" aria-label="Chargement des produits">
                <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
                <span className="sr-only">Chargement des produits en cours...</span>
            </div>
        )
    }

    if (isError) {
        return (
            <div className="p-8 text-center" role="alert">
                <p className="text-red-500">
                    Une erreur est survenue lors du chargement des produits.
                </p>
                <p className="text-muted-foreground text-sm mt-2">
                    Veuillez réessayer ou contacter le support si le problème persiste.
                </p>
                <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['products'], refetchType: 'all' })}
                >
                    Réessayer
                </Button>
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
                    <Button onClick={handleAdd} aria-label="Ajouter un nouveau produit">
                        <PlusCircle className="mr-2 h-4 w-4" aria-hidden="true" />
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

            {/* Dialog de confirmation de suppression accessible */}
            <ConfirmDialog
                open={deleteConfirm.open}
                onOpenChange={(open) => setDeleteConfirm({ open, product: open ? deleteConfirm.product : null })}
                title="Supprimer le produit"
                description={`Êtes-vous sûr de vouloir supprimer "${deleteConfirm.product?.name}" ? Cette action est irréversible.`}
                confirmText="Supprimer"
                variant="destructive"
                onConfirm={handleDeleteConfirm}
                isLoading={deleteMutation.isPending}
            />
        </div>
    )
}
