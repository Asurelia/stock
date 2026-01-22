import { getSupabase } from './core'
import type { TraceabilityPhoto } from '../database.types'

export const OUTPUT_REASONS = [
    'Service midi',
    'Service soir',
    'Petit déjeuner',
    'Petit déjeuner perso',
    'Goûter clinique',
    'Repas perso jour',
    'Perte',
    'Casse',
    'Péremption',
    'Autre'
] as const

export const DAILY_OUTPUT_CATEGORIES = [
    { id: 'petit-dej', label: 'Petit déjeuner', reason: 'Petit déjeuner', icon: '🥐', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
    { id: 'petit-dej-perso', label: 'Petit déj perso', reason: 'Petit déjeuner perso', icon: '🍳', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
    { id: 'gouter', label: 'Goûter clinique', reason: 'Goûter clinique', icon: '🍪', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300' },
    { id: 'repas-perso', label: 'Repas perso jour', reason: 'Repas perso jour', icon: '🍽️', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
] as const

export type DailyOutputCategory = typeof DAILY_OUTPUT_CATEGORIES[number]['id']

export interface RecurringOutputConfig {
    id: string
    category: DailyOutputCategory
    productId: string
    productName?: string
    quantity: number
    isActive: boolean
    createdAt: string
}

export interface DailyRecurringOutput {
    id: string
    date: string
    category: DailyOutputCategory
    productId: string
    productName?: string
    quantity: number
    isExecuted: boolean
    executedAt?: string | null
    outputId?: string | null
}

// Note: Ces tables doivent être créées via la migration 20260122_recurring_outputs.sql
// Les types sont définis manuellement car les tables ne sont pas encore dans database.types.ts

type RecurringConfigRow = {
    id: string
    category: string
    product_id: string
    quantity: number
    is_active: boolean
    created_at: string
    products?: { name: string } | null
}

type DailyRecurringRow = {
    id: string
    date: string
    category: string
    product_id: string
    quantity: number
    is_executed: boolean
    executed_at: string | null
    output_id: string | null
    products?: { name: string } | null
}

export const recurringOutputsApi = {
    // =========================================
    // Recurring Output Configs (global settings)
    // =========================================
    configs: {
        getAll: async (): Promise<RecurringOutputConfig[]> => {
            const { data, error } = await (getSupabase() as ReturnType<typeof getSupabase>)
                .from('recurring_output_configs' as 'products')
                .select(`*, products (name)`)
                .order('category')
                .order('created_at')

            if (error) throw error
            return ((data || []) as unknown as RecurringConfigRow[]).map(c => ({
                id: c.id,
                category: c.category as DailyOutputCategory,
                productId: c.product_id,
                productName: c.products?.name,
                quantity: Number(c.quantity),
                isActive: c.is_active ?? true,
                createdAt: c.created_at
            }))
        },

        getByCategory: async (category: DailyOutputCategory): Promise<RecurringOutputConfig[]> => {
            const { data, error } = await (getSupabase() as ReturnType<typeof getSupabase>)
                .from('recurring_output_configs' as 'products')
                .select(`*, products (name)`)
                .eq('category', category)
                .eq('is_active', true)
                .order('created_at')

            if (error) throw error
            return ((data || []) as unknown as RecurringConfigRow[]).map(c => ({
                id: c.id,
                category: c.category as DailyOutputCategory,
                productId: c.product_id,
                productName: c.products?.name,
                quantity: Number(c.quantity),
                isActive: c.is_active ?? true,
                createdAt: c.created_at
            }))
        },

        upsert: async (config: { category: DailyOutputCategory; productId: string; quantity: number }): Promise<RecurringOutputConfig> => {
            const { data, error } = await (getSupabase() as ReturnType<typeof getSupabase>)
                .from('recurring_output_configs' as 'products')
                .upsert({
                    category: config.category,
                    product_id: config.productId,
                    quantity: config.quantity,
                    is_active: true
                } as never, { onConflict: 'category,product_id' })
                .select()
                .single()

            if (error) throw error
            const row = data as unknown as RecurringConfigRow
            return {
                id: row.id,
                category: row.category as DailyOutputCategory,
                productId: row.product_id,
                quantity: Number(row.quantity),
                isActive: row.is_active ?? true,
                createdAt: row.created_at
            }
        },

        delete: async (id: string): Promise<void> => {
            const { error } = await (getSupabase() as ReturnType<typeof getSupabase>)
                .from('recurring_output_configs' as 'products')
                .delete()
                .eq('id', id)

            if (error) throw error
        },

        updateQuantity: async (id: string, quantity: number): Promise<void> => {
            const { error } = await (getSupabase() as ReturnType<typeof getSupabase>)
                .from('recurring_output_configs' as 'products')
                .update({ quantity } as never)
                .eq('id', id)

            if (error) throw error
        }
    },

    // =========================================
    // Daily Recurring Outputs (day-by-day)
    // =========================================
    daily: {
        getForDate: async (date: string): Promise<DailyRecurringOutput[]> => {
            const { data, error } = await (getSupabase() as ReturnType<typeof getSupabase>)
                .from('daily_recurring_outputs' as 'products')
                .select(`*, products (name)`)
                .eq('date', date)
                .order('category')

            if (error) throw error
            return ((data || []) as unknown as DailyRecurringRow[]).map(d => ({
                id: d.id,
                date: d.date,
                category: d.category as DailyOutputCategory,
                productId: d.product_id,
                productName: d.products?.name,
                quantity: Number(d.quantity),
                isExecuted: d.is_executed ?? false,
                executedAt: d.executed_at,
                outputId: d.output_id
            }))
        },

        // Initialize today's outputs from global config (if not already done)
        initializeForDate: async (date: string): Promise<DailyRecurringOutput[]> => {
            const supabase = getSupabase() as ReturnType<typeof getSupabase>
            
            // Check if already initialized
            const { data: existing } = await supabase
                .from('daily_recurring_outputs' as 'products')
                .select('id')
                .eq('date', date)
                .limit(1)

            if (existing && existing.length > 0) {
                // Already initialized, return current data
                return recurringOutputsApi.daily.getForDate(date)
            }

            // Get active configs
            const { data: configs, error: configError } = await supabase
                .from('recurring_output_configs' as 'products')
                .select('*')
                .eq('is_active', true)

            if (configError) throw configError

            if (!configs || configs.length === 0) {
                return []
            }

            // Create daily entries
            const dailyEntries = (configs as unknown as RecurringConfigRow[]).map(c => ({
                date,
                category: c.category,
                product_id: c.product_id,
                quantity: c.quantity,
                is_executed: false
            }))

            const { error: insertError } = await supabase
                .from('daily_recurring_outputs' as 'products')
                .insert(dailyEntries as never)

            if (insertError) throw insertError

            return recurringOutputsApi.daily.getForDate(date)
        },

        // Sync today's outputs with global config (add new configs, keep existing)
        syncForDate: async (date: string): Promise<DailyRecurringOutput[]> => {
            const supabase = getSupabase() as ReturnType<typeof getSupabase>
            
            // Get existing daily outputs
            const existingOutputs = await recurringOutputsApi.daily.getForDate(date)
            
            // Get active configs
            const { data: configs, error: configError } = await supabase
                .from('recurring_output_configs' as 'products')
                .select('*')
                .eq('is_active', true)

            if (configError) throw configError

            const configsList = (configs || []) as unknown as RecurringConfigRow[]
            
            // Find configs that don't have a daily output yet
            const newEntries = configsList.filter(config => 
                !existingOutputs.some(o => 
                    o.category === config.category && o.productId === config.product_id
                )
            ).map(c => ({
                date,
                category: c.category,
                product_id: c.product_id,
                quantity: c.quantity,
                is_executed: false
            }))

            if (newEntries.length > 0) {
                const { error: insertError } = await supabase
                    .from('daily_recurring_outputs' as 'products')
                    .insert(newEntries as never)

                if (insertError) throw insertError
            }

            return recurringOutputsApi.daily.getForDate(date)
        },

        updateQuantity: async (id: string, quantity: number): Promise<void> => {
            const { error } = await (getSupabase() as ReturnType<typeof getSupabase>)
                .from('daily_recurring_outputs' as 'products')
                .update({ quantity } as never)
                .eq('id', id)

            if (error) throw error
        },

        // Execute a single daily output (create actual output and deduct stock)
        execute: async (dailyOutput: DailyRecurringOutput): Promise<void> => {
            const supabase = getSupabase() as ReturnType<typeof getSupabase>
            const category = DAILY_OUTPUT_CATEGORIES.find(c => c.id === dailyOutput.category)
            if (!category) throw new Error('Invalid category')

            // Create the actual output
            const output = await traceabilityApi.outputs.create({
                productId: dailyOutput.productId,
                quantity: dailyOutput.quantity,
                reason: category.reason,
                date: new Date().toISOString()
            })

            // Mark as executed
            const { error } = await supabase
                .from('daily_recurring_outputs' as 'products')
                .update({
                    is_executed: true,
                    executed_at: new Date().toISOString(),
                    output_id: output.id
                } as never)
                .eq('id', dailyOutput.id)

            if (error) throw error
        },

        // Execute all pending outputs for a category
        executeCategory: async (date: string, category: DailyOutputCategory): Promise<number> => {
            const outputs = await recurringOutputsApi.daily.getForDate(date)
            const pending = outputs.filter(o => o.category === category && !o.isExecuted)
            
            let executed = 0
            for (const output of pending) {
                await recurringOutputsApi.daily.execute(output)
                executed++
            }
            return executed
        },

        // Execute all pending outputs for the day
        executeAll: async (date: string): Promise<number> => {
            const outputs = await recurringOutputsApi.daily.getForDate(date)
            const pending = outputs.filter(o => !o.isExecuted)
            
            let executed = 0
            for (const output of pending) {
                await recurringOutputsApi.daily.execute(output)
                executed++
            }
            return executed
        }
    }
}

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
            // Handle both ISO strings and date-only strings
            const fromDate = from.includes('T') ? from : `${from}T00:00:00.000Z`
            const toDate = to.includes('T') ? to : `${to}T23:59:59.999Z`

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
