import { getSupabase } from './core'
import type { TraceabilityPhoto } from '../database.types'

export const OUTPUT_REASONS = [
    'Service midi',
    'Service soir',
    'Perte',
    'Casse',
    'Péremption',
    'Autre'
] as const

export interface Output {
    id: string
    productId: string
    productName?: string
    product?: { name: string; category: string; quantity: number; unit: string; price: number }
    quantity: number
    reason: string
    recipeId?: string | null
    recipeName?: string
    date: string
    createdAt: string
}

export const traceabilityApi = {
    // =========================================
    // Outputs
    // =========================================
    outputs: {
        getAll: async (): Promise<Output[]> => {
            const { data, error } = await getSupabase()
                .from('outputs')
                .select(`
                    *,
                    products (name)
                `)
                .order('output_date', { ascending: false })
                .order('created_at', { ascending: false })

            if (error) throw error

            return (data || []).map(o => ({
                id: o.id,
                productId: o.product_id || '',
                productName: (o.products as { name: string } | null)?.name || 'Produit supprimé',
                quantity: Number(o.quantity) || 0,
                reason: o.reason || 'Service midi',
                date: o.output_date,
                createdAt: o.created_at
            }))
        },

        getByDateRange: async (from: string, to: string): Promise<Output[]> => {
            // Add time to make the range inclusive of the full days
            const fromDate = `${from}T00:00:00.000Z`
            const toDate = `${to}T23:59:59.999Z`

            const { data, error } = await getSupabase()
                .from('outputs')
                .select(`
                    *,
                    products (name)
                `)
                .gte('output_date', fromDate)
                .lte('output_date', toDate)
                .order('output_date', { ascending: false })
                .order('created_at', { ascending: false })

            if (error) throw error

            return (data || []).map(o => ({
                id: o.id,
                productId: o.product_id || '',
                productName: (o.products as { name: string } | null)?.name || 'Produit supprimé',
                quantity: Number(o.quantity) || 0,
                reason: o.reason || 'Service midi',
                date: o.output_date,
                createdAt: o.created_at
            }))
        },

        getToday: async (): Promise<Output[]> => {
            const today = new Date().toISOString().split('T')[0]
            return traceabilityApi.outputs.getByDateRange(today, today)
        },

        create: async (outputData: { productId: string; quantity: number; reason: string; date?: string }): Promise<Output> => {
            const supabaseClient = getSupabase()

            // 1. Get current product stock
            const { data: product, error: productError } = await supabaseClient
                .from('products')
                .select('quantity')
                .eq('id', outputData.productId)
                .single()

            if (productError) throw productError

            const currentStock = Number(product.quantity) || 0
            const newStock = currentStock - outputData.quantity

            if (newStock < 0) {
                throw new Error('Stock insuffisant')
            }

            // 2. Create the output record
            const { data, error } = await supabaseClient
                .from('outputs')
                .insert([{
                    product_id: outputData.productId,
                    quantity: outputData.quantity,
                    reason: outputData.reason,
                    output_date: outputData.date || new Date().toISOString()
                }])
                .select(`
                    *,
                    products (name)
                `)
                .single()

            if (error) throw error

            // 3. Update product stock
            const { error: updateError } = await supabaseClient
                .from('products')
                .update({ quantity: newStock })
                .eq('id', outputData.productId)

            if (updateError) throw updateError

            return {
                id: data.id,
                productId: data.product_id || '',
                productName: (data.products as { name: string } | null)?.name || '',
                quantity: Number(data.quantity) || 0,
                reason: data.reason || 'Service midi',
                date: data.output_date,
                createdAt: data.created_at
            }
        },

        delete: async (id: string): Promise<void> => {
            const supabaseClient = getSupabase()

            // 1. Get the output to restore stock
            const { data: output, error: fetchError } = await supabaseClient
                .from('outputs')
                .select('product_id, quantity')
                .eq('id', id)
                .single()

            if (fetchError) throw fetchError

            // 2. Get current product stock
            const { data: product, error: productError } = await supabaseClient
                .from('products')
                .select('quantity')
                .eq('id', output.product_id)
                .single()

            if (productError) throw productError

            // 3. Restore the stock
            const restoredStock = Number(product.quantity) + Number(output.quantity)

            const { error: updateError } = await supabaseClient
                .from('products')
                .update({ quantity: restoredStock })
                .eq('id', output.product_id)

            if (updateError) throw updateError

            // 4. Delete the output record
            const { error } = await supabaseClient
                .from('outputs')
                .delete()
                .eq('id', id)

            if (error) throw error
        }
    },

    // =========================================
    // Traceability Photos
    // =========================================
    traceabilityPhotos: {
        upload: async (file: File, outputId: string, notes?: string) => {
            const supabaseClient = getSupabase()
            const timestamp = Date.now()
            const extension = file.name.split('.').pop() || 'jpg'
            const storagePath = `${outputId}/${timestamp}.${extension}`

            // Upload to storage
            const { error: uploadError } = await supabaseClient.storage
                .from('traceability-photos')
                .upload(storagePath, file)

            if (uploadError) throw uploadError

            // Get public URL
            const { data: urlData } = supabaseClient.storage
                .from('traceability-photos')
                .getPublicUrl(storagePath)

            // Create record
            const { data, error } = await supabaseClient
                .from('traceability_photos')
                .insert([{
                    output_id: outputId,
                    storage_path: storagePath,
                    url: urlData.publicUrl,
                    notes: notes || null
                }])
                .select()
                .single()

            if (error) throw error
            return data
        },

        getByOutput: async (outputId: string) => {
            const { data, error } = await getSupabase()
                .from('traceability_photos')
                .select('*')
                .eq('output_id', outputId)
                .order('captured_at', { ascending: false })

            if (error) throw error
            return data || []
        },

        getByDateRange: async (from: string, to: string): Promise<(TraceabilityPhoto & { outputs: { id: string, product_id: string, quantity: number, products: { name: string, category: string } | null } | null })[]> => {
            const { data, error } = await getSupabase()
                .from('traceability_photos')
                .select(`
                    *,
                    outputs (
                        id,
                        product_id,
                        quantity,
                        products (name, category)
                    )
                `)
                .gte('captured_at', from)
                .lte('captured_at', to)
                .order('captured_at', { ascending: false })

            if (error) throw error
            return data as any
        },

        delete: async (id: string) => {
            // Get the photo record first
            const { data: photo, error: fetchError } = await getSupabase()
                .from('traceability_photos')
                .select('storage_path')
                .eq('id', id)
                .single()

            if (fetchError) throw fetchError

            // Delete from storage
            if (photo?.storage_path) {
                await getSupabase().storage
                    .from('traceability-photos')
                    .remove([photo.storage_path])
            }

            // Delete record
            const { error } = await getSupabase()
                .from('traceability_photos')
                .delete()
                .eq('id', id)

            if (error) throw error
        }
    }
}
