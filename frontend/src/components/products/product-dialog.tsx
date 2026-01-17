import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import type { Product } from "@/lib/api"
import { api } from "@/lib/api"
import { productSchema, type ProductFormValues } from "./product-schema"

interface ProductDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    product?: Product | null
}

const CATEGORIES = [
    "Légumes",
    "Fruits",
    "Produits laitiers",
    "Viandes",
    "Poissons",
    "Epicerie",
    "Boissons",
    "Entretien",
    "Autre"
]

const UNITS = ["kg", "g", "L", "cL", "unité", "boite", "bouteille", "paquet"]

const defaultValues: ProductFormValues = {
    name: "",
    category: "",
    quantity: 0,
    unit: "kg",
    minStock: 0,
    price: 0,
    avgConsumption: 0,
}

export function ProductDialog({ open, onOpenChange, product }: ProductDialogProps) {
    const queryClient = useQueryClient()
    const isEditing = !!product

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema) as any,
    })

    // Reset form when product changes
    useEffect(() => {
        if (product) {
            form.reset({
                name: product.name,
                category: product.category,
                quantity: product.quantity,
                unit: product.unit,
                minStock: product.minStock,
                price: product.price,
                avgConsumption: product.avgConsumption || 0,
            })
        } else {
            form.reset({
                name: "",
                category: "",
                quantity: 0,
                unit: "kg",
                minStock: 0,
                price: 0,
                avgConsumption: 0,
            })
        }
    }, [product, form, open])

    const mutation = useMutation({
        mutationFn: async (values: ProductFormValues) => {
            if (isEditing && product) {
                return api.products.update(product.id, values)
            } else {
                return api.products.create(values)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products"] })
            toast.success(isEditing ? "Produit modifié avec succès" : "Produit ajouté avec succès")
            onOpenChange(false)
        },
        onError: (error) => {
            toast.error(`Erreur: ${error instanceof Error ? error.message : "Une erreur est survenue"}`)
        },
    })

    function onSubmit(values: ProductFormValues) {
        mutation.mutate(values)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Modifier le produit" : "Ajouter un produit"}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Modifiez les détails du produit ci-dessous."
                            : "Remplissez les informations pour le nouveau produit."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control as any}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nom du produit</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Tomates" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control as any}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Catégorie</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Sélectionner" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {CATEGORIES.map(cat => (
                                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control as any}
                                name="unit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Unité</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Sélectionner" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {UNITS.map(u => (
                                                    <SelectItem key={u} value={u}>{u}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control as any}
                                name="quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quantité</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="any" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control as any}
                                name="minStock"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Stock Min</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="any" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control as any}
                            name="price"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Prix unitaire (€)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? "Enregistrer" : "Ajouter"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
