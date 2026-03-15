/* eslint-disable @typescript-eslint/no-explicit-any */
import { db, generateId, nowISO } from './core'
import { activityLogApi } from './activityLog'

export interface TraceabilityPhoto {
    id: string
    output_id: string
    storage_path: string
    url: string
    blob?: File | Blob
    captured_at: string
    notes: string | null
    created_at: string
}

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
            const outputs = await db.outputs.orderBy('output_date').reverse().toArray()
            const productIds = [...new Set(outputs.map((o: any) => o.product_id).filter(Boolean))]
            const products = await db.products.where('id').anyOf(productIds).toArray()
            const productMap = new Map(products.map((p: any) => [p.id, p]))

            return outputs.map((o: any) => ({
                id: o.id,
                productId: o.product_id || '',
                productName: productMap.get(o.product_id)?.name || 'Produit supprimé',
                quantity: Number(o.quantity) || 0,
                reason: o.reason || 'Service midi',
                date: o.output_date,
                createdAt: o.created_at
            }))
        },

        getByDateRange: async (from: string, to: string): Promise<Output[]> => {
            const fromDate = from.includes('T') ? from : `${from}T00:00:00.000Z`
            const toDate = to.includes('T') ? to : `${to}T23:59:59.999Z`

            const outputs = await db.outputs
                .where('output_date')
                .between(fromDate, toDate, true, true)
                .reverse()
                .toArray()

            const productIds = [...new Set(outputs.map((o: any) => o.product_id).filter(Boolean))]
            const products = productIds.length > 0
                ? await db.products.where('id').anyOf(productIds).toArray()
                : []
            const productMap = new Map(products.map((p: any) => [p.id, p]))

            return outputs.map((o: any) => ({
                id: o.id,
                productId: o.product_id || '',
                productName: productMap.get(o.product_id)?.name || 'Produit supprimé',
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
            let result: Output

            await db.transaction('rw', [db.outputs, db.products], async () => {
                const product = await db.products.get(outputData.productId)
                if (!product) throw new Error('Produit introuvable')

                const currentStock = Number(product.quantity) || 0
                const newStock = currentStock - outputData.quantity

                if (newStock < 0) {
                    throw new Error('Stock insuffisant')
                }

                const id = generateId()
                const now = nowISO()
                const output_date = outputData.date || now

                await db.outputs.add({
                    id,
                    product_id: outputData.productId,
                    quantity: outputData.quantity,
                    reason: outputData.reason,
                    output_date,
                    created_at: now
                })

                await db.products.update(outputData.productId, { quantity: newStock })

                result = {
                    id,
                    productId: outputData.productId,
                    productName: product.name || '',
                    quantity: outputData.quantity,
                    reason: outputData.reason,
                    date: output_date,
                    createdAt: now
                }
            })

            activityLogApi.log({
                action: 'output_created',
                entityType: 'output',
                entityId: result!.id,
                details: {
                    productName: result!.productName,
                    quantity: result!.quantity,
                    reason: result!.reason
                }
            })

            return result!
        },

        delete: async (id: string): Promise<void> => {
            let quantity: number

            await db.transaction('rw', [db.outputs, db.products], async () => {
                const output = await db.outputs.get(id)
                if (!output) throw new Error('Sortie introuvable')

                const product = await db.products.get(output.product_id)
                if (!product) throw new Error('Produit introuvable')

                quantity = Number(output.quantity)
                const restoredStock = Number(product.quantity) + quantity

                await db.products.update(output.product_id, { quantity: restoredStock })
                await db.outputs.delete(id)
            })

            activityLogApi.log({
                action: 'output_deleted',
                entityType: 'output',
                entityId: id,
                details: {
                    quantity: quantity!
                }
            })
        }
    },

    // =========================================
    // Traceability Photos
    // =========================================
    traceabilityPhotos: {
        upload: async (file: File, outputId: string, notes?: string) => {
            const id = generateId()
            const url = URL.createObjectURL(file)
            const captured_at = nowISO()
            const created_at = nowISO()
            const storage_path = `local/${id}/${file.name}`

            await db.traceabilityPhotos.add({
                id,
                output_id: outputId,
                storage_path,
                url,
                blob: file,
                captured_at,
                notes: notes || null,
                created_at
            })

            return { id, output_id: outputId, storage_path, url, captured_at, notes: notes || null, created_at }
        },

        getByOutput: async (outputId: string) => {
            const photos = await db.traceabilityPhotos
                .where('output_id')
                .equals(outputId)
                .reverse()
                .toArray()

            return photos.map((photo: any) => {
                if (photo.blob) {
                    return { ...photo, url: URL.createObjectURL(photo.blob) }
                }
                return photo
            })
        },

        getByDateRange: async (from: string, to: string): Promise<any[]> => {
            const photos = await db.traceabilityPhotos
                .where('captured_at')
                .between(from, to, true, true)
                .reverse()
                .toArray()

            const outputIds = [...new Set(photos.map((p: any) => p.output_id).filter(Boolean))]
            const outputs = outputIds.length > 0
                ? await db.outputs.where('id').anyOf(outputIds).toArray()
                : []
            const outputMap = new Map(outputs.map((o: any) => [o.id, o]))

            const productIds = [...new Set(outputs.map((o: any) => o.product_id).filter(Boolean))]
            const products = productIds.length > 0
                ? await db.products.where('id').anyOf(productIds).toArray()
                : []
            const productMap = new Map(products.map((p: any) => [p.id, p]))

            return photos.map((photo: any) => {
                const output = outputMap.get(photo.output_id) || null
                const product = output ? productMap.get(output.product_id) || null : null
                const url = photo.blob ? URL.createObjectURL(photo.blob) : photo.url

                return {
                    ...photo,
                    url,
                    outputs: output
                        ? {
                            id: output.id,
                            product_id: output.product_id,
                            quantity: Number(output.quantity),
                            products: product
                                ? { name: product.name, category: product.category }
                                : null
                        }
                        : null
                }
            })
        },

        delete: async (id: string) => {
            await db.traceabilityPhotos.delete(id)
        }
    }
}

export const recurringOutputsApi = {
    // =========================================
    // Recurring Output Configs (global settings)
    // =========================================
    configs: {
        getAll: async (): Promise<RecurringOutputConfig[]> => {
            const configs = await db.recurringOutputConfigs.toArray()
            configs.sort((a: any, b: any) => {
                if (a.category < b.category) return -1
                if (a.category > b.category) return 1
                return a.created_at < b.created_at ? -1 : 1
            })

            const productIds = [...new Set(configs.map((c: any) => c.product_id).filter(Boolean))]
            const products = productIds.length > 0
                ? await db.products.where('id').anyOf(productIds).toArray()
                : []
            const productMap = new Map(products.map((p: any) => [p.id, p]))

            return configs.map((c: any) => ({
                id: c.id,
                category: c.category as DailyOutputCategory,
                productId: c.product_id,
                productName: productMap.get(c.product_id)?.name,
                quantity: Number(c.quantity),
                isActive: c.is_active ?? true,
                createdAt: c.created_at
            }))
        },

        getByCategory: async (category: DailyOutputCategory): Promise<RecurringOutputConfig[]> => {
            const configs = await db.recurringOutputConfigs
                .where('category')
                .equals(category)
                .and((c: any) => c.is_active)
                .toArray()

            const productIds = [...new Set(configs.map((c: any) => c.product_id).filter(Boolean))]
            const products = productIds.length > 0
                ? await db.products.where('id').anyOf(productIds).toArray()
                : []
            const productMap = new Map(products.map((p: any) => [p.id, p]))

            return configs.map((c: any) => ({
                id: c.id,
                category: c.category as DailyOutputCategory,
                productId: c.product_id,
                productName: productMap.get(c.product_id)?.name,
                quantity: Number(c.quantity),
                isActive: c.is_active ?? true,
                createdAt: c.created_at
            }))
        },

        upsert: async (config: { category: DailyOutputCategory; productId: string; quantity: number }): Promise<RecurringOutputConfig> => {
            return await db.transaction('rw', [db.recurringOutputConfigs], async () => {
                const existing = await db.recurringOutputConfigs
                    .where('category')
                    .equals(config.category)
                    .and((c: any) => c.product_id === config.productId)
                    .first()

                if (existing) {
                    await db.recurringOutputConfigs.update(existing.id, {
                        quantity: config.quantity,
                        is_active: true
                    })
                    const updated = await db.recurringOutputConfigs.get(existing.id)
                    return {
                        id: updated.id,
                        category: updated.category as DailyOutputCategory,
                        productId: updated.product_id,
                        quantity: Number(updated.quantity),
                        isActive: updated.is_active ?? true,
                        createdAt: updated.created_at
                    }
                }

                const id = generateId()
                const now = nowISO()
                const row = {
                    id,
                    category: config.category,
                    product_id: config.productId,
                    quantity: config.quantity,
                    is_active: true,
                    created_at: now
                }
                await db.recurringOutputConfigs.add(row)

                return {
                    id,
                    category: config.category as DailyOutputCategory,
                    productId: config.productId,
                    quantity: config.quantity,
                    isActive: true,
                    createdAt: now
                }
            })
        },

        delete: async (id: string): Promise<void> => {
            await db.recurringOutputConfigs.delete(id)
        },

        updateQuantity: async (id: string, quantity: number): Promise<void> => {
            await db.recurringOutputConfigs.update(id, { quantity })
        }
    },

    // =========================================
    // Daily Recurring Outputs (day-by-day)
    // =========================================
    daily: {
        getForDate: async (date: string): Promise<DailyRecurringOutput[]> => {
            const rows = await db.dailyRecurringOutputs
                .where('date')
                .equals(date)
                .toArray()

            rows.sort((a: any, b: any) => {
                if (a.category < b.category) return -1
                if (a.category > b.category) return 1
                return 0
            })

            const productIds = [...new Set(rows.map((r: any) => r.product_id).filter(Boolean))]
            const products = productIds.length > 0
                ? await db.products.where('id').anyOf(productIds).toArray()
                : []
            const productMap = new Map(products.map((p: any) => [p.id, p]))

            return rows.map((d: any) => ({
                id: d.id,
                date: d.date,
                category: d.category as DailyOutputCategory,
                productId: d.product_id,
                productName: productMap.get(d.product_id)?.name,
                quantity: Number(d.quantity),
                isExecuted: d.is_executed ?? false,
                executedAt: d.executed_at ?? null,
                outputId: d.output_id ?? null
            }))
        },

        initializeForDate: async (date: string): Promise<DailyRecurringOutput[]> => {
            const existing = await db.dailyRecurringOutputs
                .where('date')
                .equals(date)
                .limit(1)
                .toArray()

            if (existing.length > 0) {
                return recurringOutputsApi.daily.getForDate(date)
            }

            const allConfigs = await db.recurringOutputConfigs.toArray()
            const activeConfigs = allConfigs.filter((c: any) => c.is_active === true || c.is_active === 1)

            if (activeConfigs.length === 0) {
                return []
            }

            const dailyEntries = activeConfigs.map((c: any) => ({
                id: generateId(),
                date,
                category: c.category,
                product_id: c.product_id,
                quantity: c.quantity,
                is_executed: false,
                executed_at: null,
                output_id: null
            }))

            await db.dailyRecurringOutputs.bulkAdd(dailyEntries)

            return recurringOutputsApi.daily.getForDate(date)
        },

        syncForDate: async (date: string): Promise<DailyRecurringOutput[]> => {
            const existingOutputs = await recurringOutputsApi.daily.getForDate(date)

            const configs = await db.recurringOutputConfigs.toArray()
            const activeConfigs = configs.filter((c: any) => c.is_active)

            const newEntries = activeConfigs
                .filter((config: any) =>
                    !existingOutputs.some(o =>
                        o.category === config.category && o.productId === config.product_id
                    )
                )
                .map((c: any) => ({
                    id: generateId(),
                    date,
                    category: c.category,
                    product_id: c.product_id,
                    quantity: c.quantity,
                    is_executed: false,
                    executed_at: null,
                    output_id: null
                }))

            if (newEntries.length > 0) {
                await db.dailyRecurringOutputs.bulkAdd(newEntries)
            }

            return recurringOutputsApi.daily.getForDate(date)
        },

        updateQuantity: async (id: string, quantity: number): Promise<void> => {
            await db.dailyRecurringOutputs.update(id, { quantity })
        },

        execute: async (dailyOutput: DailyRecurringOutput): Promise<void> => {
            const category = DAILY_OUTPUT_CATEGORIES.find(c => c.id === dailyOutput.category)
            if (!category) throw new Error('Invalid category')

            const output = await traceabilityApi.outputs.create({
                productId: dailyOutput.productId,
                quantity: dailyOutput.quantity,
                reason: category.reason,
                date: new Date().toISOString()
            })

            await db.dailyRecurringOutputs.update(dailyOutput.id, {
                is_executed: true,
                executed_at: nowISO(),
                output_id: output.id
            })
        },

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
