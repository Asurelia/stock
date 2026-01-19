import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Output } from '@/lib/api'
import { toast } from 'sonner'
import { useCallback, useMemo } from 'react'
import { productKeys } from './useProducts'

// Query keys centralisées
export const outputKeys = {
    all: ['outputs'] as const,
    lists: () => [...outputKeys.all, 'list'] as const,
    today: () => [...outputKeys.lists(), 'today'] as const,
    byDateRange: (from: string, to: string) => [...outputKeys.lists(), { from, to }] as const,
    details: () => [...outputKeys.all, 'detail'] as const,
    detail: (id: string) => [...outputKeys.details(), id] as const,
}

// Hook pour récupérer les sorties du jour
export function useTodayOutputs() {
    return useQuery({
        queryKey: outputKeys.today(),
        queryFn: api.outputs.getToday,
        staleTime: 1000 * 30, // 30 secondes - données fréquemment modifiées
    })
}

// Hook pour récupérer les sorties par plage de dates
export function useOutputsByDateRange(from: string, to: string) {
    return useQuery({
        queryKey: outputKeys.byDateRange(from, to),
        queryFn: () => api.outputs.getByDateRange(from, to),
        enabled: !!from && !!to,
        staleTime: 1000 * 60,
    })
}

// Hook pour récupérer toutes les sorties
export function useAllOutputs() {
    return useQuery({
        queryKey: outputKeys.lists(),
        queryFn: api.outputs.getAll,
        staleTime: 1000 * 60,
    })
}

// Hook pour créer une sortie (avec mise à jour du stock)
export function useCreateOutput() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: { productId: string; quantity: number; reason: string; date?: string }) =>
            api.outputs.create(data),
        onSuccess: () => {
            toast.success('Sortie enregistrée')
            // Invalider les sorties ET les produits (stock modifié)
            queryClient.invalidateQueries({ queryKey: outputKeys.all })
            queryClient.invalidateQueries({ queryKey: productKeys.all })
        },
        onError: (error: Error) => {
            if (error.message.includes('Stock insuffisant')) {
                toast.error('Stock insuffisant pour cette sortie')
            } else {
                toast.error(`Erreur: ${error.message}`)
            }
        },
    })
}

// Hook pour supprimer une sortie (avec restauration du stock)
export function useDeleteOutput() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => api.outputs.delete(id),
        onSuccess: () => {
            toast.success('Sortie supprimée - Stock restauré')
            queryClient.invalidateQueries({ queryKey: outputKeys.all })
            queryClient.invalidateQueries({ queryKey: productKeys.all })
        },
        onError: (error: Error) => {
            toast.error(`Erreur: ${error.message}`)
        },
    })
}

// Hook pour les statistiques des sorties
export function useOutputStats(outputs: Output[] | undefined) {
    return useMemo(() => {
        if (!outputs || outputs.length === 0) {
            return {
                totalQuantity: 0,
                byReason: {} as Record<string, number>,
                byProduct: {} as Record<string, { name: string; quantity: number }>,
                count: 0,
            }
        }

        const byReason: Record<string, number> = {}
        const byProduct: Record<string, { name: string; quantity: number }> = {}
        let totalQuantity = 0

        for (const output of outputs) {
            totalQuantity += output.quantity

            // Par raison
            byReason[output.reason] = (byReason[output.reason] || 0) + output.quantity

            // Par produit
            if (!byProduct[output.productId]) {
                byProduct[output.productId] = {
                    name: output.productName || 'Inconnu',
                    quantity: 0,
                }
            }
            byProduct[output.productId].quantity += output.quantity
        }

        return {
            totalQuantity,
            byReason,
            byProduct,
            count: outputs.length,
        }
    }, [outputs])
}

// Hook combiné pour les opérations
export function useOutputActions() {
    const createMutation = useCreateOutput()
    const deleteMutation = useDeleteOutput()

    const handleCreate = useCallback(async (data: {
        productId: string
        quantity: number
        reason: string
        date?: string
    }) => {
        return createMutation.mutateAsync(data)
    }, [createMutation])

    const handleDelete = useCallback(async (id: string) => {
        return deleteMutation.mutateAsync(id)
    }, [deleteMutation])

    return {
        create: handleCreate,
        delete: handleDelete,
        isCreating: createMutation.isPending,
        isDeleting: deleteMutation.isPending,
    }
}
