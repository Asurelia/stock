import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Product } from '@/lib/api'
import { toast } from 'sonner'
import { useCallback } from 'react'

// Query keys centralisées
export const productKeys = {
    all: ['products'] as const,
    lists: () => [...productKeys.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...productKeys.lists(), filters] as const,
    details: () => [...productKeys.all, 'detail'] as const,
    detail: (id: string) => [...productKeys.details(), id] as const,
    critical: () => [...productKeys.all, 'critical'] as const,
    lowStock: () => [...productKeys.all, 'lowStock'] as const,
}

// Hook pour récupérer tous les produits
export function useProducts() {
    return useQuery({
        queryKey: productKeys.lists(),
        queryFn: api.products.getAll,
        staleTime: 1000 * 60 * 5, // 5 minutes
    })
}

// Hook pour un produit spécifique
export function useProduct(id: string) {
    return useQuery({
        queryKey: productKeys.detail(id),
        queryFn: () => api.products.getById(id),
        enabled: !!id,
    })
}

// Hook pour les produits critiques (stock bas)
export function useCriticalProducts() {
    return useQuery({
        queryKey: productKeys.critical(),
        queryFn: api.products.getCritical,
        staleTime: 1000 * 60, // 1 minute - plus fréquent car critique
    })
}

// Hook pour les produits en stock bas
export function useLowStockProducts() {
    return useQuery({
        queryKey: productKeys.lowStock(),
        queryFn: api.products.getLowStock,
        staleTime: 1000 * 60 * 2,
    })
}

// Hook pour créer un produit
export function useCreateProduct() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: Omit<Product, 'id'>) => api.products.create(data),
        onSuccess: (newProduct) => {
            toast.success(`Produit "${newProduct.name}" créé`)
            queryClient.invalidateQueries({ queryKey: productKeys.all })
        },
        onError: (error: Error) => {
            toast.error(`Erreur: ${error.message}`)
        },
    })
}

// Hook pour mettre à jour un produit
export function useUpdateProduct() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
            api.products.update(id, data),
        onMutate: async ({ id, data }) => {
            // Annuler les requêtes en cours
            await queryClient.cancelQueries({ queryKey: productKeys.detail(id) })

            // Snapshot pour rollback
            const previousProduct = queryClient.getQueryData<Product>(productKeys.detail(id))

            // Mise à jour optimiste
            if (previousProduct) {
                queryClient.setQueryData<Product>(productKeys.detail(id), {
                    ...previousProduct,
                    ...data,
                })
            }

            return { previousProduct }
        },
        onError: (error, { id }, context) => {
            // Rollback en cas d'erreur
            if (context?.previousProduct) {
                queryClient.setQueryData(productKeys.detail(id), context.previousProduct)
            }
            toast.error(`Erreur: ${error.message}`)
        },
        onSuccess: () => {
            toast.success('Produit mis à jour')
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: productKeys.all })
        },
    })
}

// Hook pour supprimer un produit
export function useDeleteProduct() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => api.products.delete(id),
        onSuccess: () => {
            toast.success('Produit supprimé')
            queryClient.invalidateQueries({ queryKey: productKeys.all })
        },
        onError: (error: Error) => {
            toast.error(`Erreur: ${error.message}`)
        },
    })
}

// Hook pour ajuster le stock
export function useAdjustStock() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
            api.products.update(id, { quantity }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: productKeys.all })
        },
        onError: (error: Error) => {
            toast.error(`Erreur: ${error.message}`)
        },
    })
}

// Hook combiné pour les opérations CRUD avec dialog
export function useProductActions() {
    const createMutation = useCreateProduct()
    const updateMutation = useUpdateProduct()
    const deleteMutation = useDeleteProduct()
    const adjustStockMutation = useAdjustStock()

    const handleCreate = useCallback(async (data: Omit<Product, 'id'>) => {
        return createMutation.mutateAsync(data)
    }, [createMutation])

    const handleUpdate = useCallback(async (id: string, data: Partial<Product>) => {
        return updateMutation.mutateAsync({ id, data })
    }, [updateMutation])

    const handleDelete = useCallback(async (id: string) => {
        return deleteMutation.mutateAsync(id)
    }, [deleteMutation])

    const handleAdjustStock = useCallback(async (id: string, currentQuantity: number, adjustment: number) => {
        const newQuantity = Math.max(0, currentQuantity + adjustment)
        return adjustStockMutation.mutateAsync({ id, quantity: newQuantity })
    }, [adjustStockMutation])

    return {
        create: handleCreate,
        update: handleUpdate,
        delete: handleDelete,
        adjustStock: handleAdjustStock,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
        isAdjusting: adjustStockMutation.isPending,
    }
}
