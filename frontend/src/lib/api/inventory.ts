import { db, generateId, nowISO } from './core'
import { activityLogApi } from './activityLog'

function safeJsonParse<T>(value: unknown, fallback: T): T {
    if (!value || typeof value !== 'string') return fallback
    try { return JSON.parse(value) } catch { return fallback }
}

// =============================================
// Supplier Categories
// =============================================

export const SUPPLIER_CATEGORIES = [
    { value: 'fruits-legumes', label: 'Fruits & Légumes', color: 'bg-green-500' },
    { value: 'viandes', label: 'Viandes', color: 'bg-red-500' },
    { value: 'poissons', label: 'Poissons', color: 'bg-blue-500' },
    { value: 'produits-laitiers', label: 'Produits Laitiers', color: 'bg-yellow-500' },
    { value: 'epicerie', label: 'Épicerie', color: 'bg-orange-500' },
    { value: 'boulangerie', label: 'Boulangerie', color: 'bg-amber-600' },
    { value: 'boissons', label: 'Boissons', color: 'bg-cyan-500' },
    { value: 'surgeles', label: 'Surgelés', color: 'bg-indigo-500' },
    { value: 'hygiene', label: 'Hygiène', color: 'bg-pink-500' },
    { value: 'materiel', label: 'Matériel', color: 'bg-gray-500' },
    { value: 'autre', label: 'Autre', color: 'bg-slate-500' },
] as const

export interface Supplier {
    id: string
    name: string
    category: string
    phone: string
    email: string
    contact: string
    notes: string
    logoUrl: string
    orderDays: string[]
    deliveryDays: string[]
}

export interface DeliveryItem {
    id?: string
    productId: string
    productName: string
    quantity: number
    price: number
}

export interface Delivery {
    id: string
    date: string
    supplierId: string | null
    supplierName: string
    photoUrl: string | null
    total: number
    items: DeliveryItem[]
    createdAt: string
}

function mapSupplier(s: any): Supplier {
    return {
        id: s.id,
        name: s.name,
        category: s.category || 'autre',
        phone: s.phone || '',
        email: s.email || '',
        contact: s.contact || '',
        notes: s.notes || '',
        logoUrl: s.logo_url || '',
        orderDays: safeJsonParse(s.order_days, []),
        deliveryDays: safeJsonParse(s.delivery_days, [])
    }
}

export const inventoryApi = {
    // =========================================
    // Suppliers
    // =========================================
    suppliers: {
        getAll: async (): Promise<Supplier[]> => {
            const rows = await db.suppliers.orderBy('name').toArray()
            return rows.map(mapSupplier)
        },

        create: async (supplierData: Omit<Supplier, 'id'>): Promise<Supplier> => {
            const id = generateId()
            const record = {
                id,
                name: supplierData.name,
                category: supplierData.category || 'autre',
                phone: supplierData.phone,
                email: supplierData.email,
                contact: supplierData.contact,
                notes: supplierData.notes,
                logo_url: supplierData.logoUrl || null,
                order_days: JSON.stringify(supplierData.orderDays || []),
                delivery_days: JSON.stringify(supplierData.deliveryDays || [])
            }
            await db.suppliers.add(record)
            return mapSupplier(record)
        },

        update: async (id: string, supplierData: Partial<Supplier>): Promise<void> => {
            const updateData: Record<string, unknown> = {}
            if (supplierData.name !== undefined) updateData.name = supplierData.name
            if (supplierData.category !== undefined) updateData.category = supplierData.category
            if (supplierData.phone !== undefined) updateData.phone = supplierData.phone
            if (supplierData.email !== undefined) updateData.email = supplierData.email
            if (supplierData.contact !== undefined) updateData.contact = supplierData.contact
            if (supplierData.notes !== undefined) updateData.notes = supplierData.notes
            if (supplierData.logoUrl !== undefined) updateData.logo_url = supplierData.logoUrl
            if (supplierData.orderDays !== undefined) updateData.order_days = JSON.stringify(supplierData.orderDays)
            if (supplierData.deliveryDays !== undefined) updateData.delivery_days = JSON.stringify(supplierData.deliveryDays)
            await db.suppliers.update(id, updateData)
        },

        delete: async (id: string): Promise<void> => {
            await db.suppliers.delete(id)
        },

        getTodayOrderReminders: async (): Promise<Supplier[]> => {
            const suppliers = await inventoryApi.suppliers.getAll()
            const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long' }).toLowerCase()
            return suppliers.filter(s => s.orderDays.map(d => d.toLowerCase()).includes(today))
        }
    },

    // =========================================
    // Deliveries
    // =========================================
    deliveries: {
        getAll: async (): Promise<Delivery[]> => {
            const rows = await db.deliveries.orderBy('delivery_date').reverse().toArray()

            const productIds = [...new Set(rows.map(d => d.product_id).filter(Boolean))]
            const supplierIds = [...new Set(rows.map(d => d.supplier_id).filter(Boolean))]

            const [productRows, supplierRows] = await Promise.all([
                db.products.bulkGet(productIds),
                db.suppliers.bulkGet(supplierIds)
            ])

            const productMap = new Map<string, string>()
            productRows.forEach(p => { if (p) productMap.set(p.id, p.name) })

            const supplierMap = new Map<string, string>()
            supplierRows.forEach(s => { if (s) supplierMap.set(s.id, s.name) })

            return rows.map(d => ({
                id: d.id,
                date: d.delivery_date,
                supplierId: d.supplier_id ?? null,
                supplierName: d.supplier_id ? (supplierMap.get(d.supplier_id) || '') : '',
                photoUrl: d.photo_url ?? null,
                total: Number(d.total_price) || 0,
                items: [{
                    id: d.id,
                    productId: d.product_id,
                    productName: productMap.get(d.product_id) || '',
                    quantity: Number(d.quantity) || 0,
                    price: Number(d.unit_price) || 0
                }],
                createdAt: d.created_at || nowISO()
            }))
        },

        create: async (deliveryData: { date: string; supplierName: string; supplierId?: string; photoUrl?: string; items: DeliveryItem[] }): Promise<Delivery> => {
            const results: Delivery[] = []

            await db.transaction('rw', [db.deliveries], async () => {
                for (const item of deliveryData.items) {
                    const id = generateId()
                    const record = {
                        id,
                        product_id: item.productId,
                        supplier_id: deliveryData.supplierId || null,
                        quantity: item.quantity,
                        unit_price: item.price,
                        total_price: item.quantity * item.price,
                        delivery_date: deliveryData.date,
                        photo_url: deliveryData.photoUrl || null,
                        created_at: nowISO()
                    }
                    await db.deliveries.add(record)
                    results.push({
                        id,
                        date: deliveryData.date,
                        supplierId: deliveryData.supplierId || null,
                        supplierName: deliveryData.supplierName,
                        photoUrl: deliveryData.photoUrl || null,
                        total: item.quantity * item.price,
                        items: [{
                            id,
                            productId: item.productId,
                            productName: item.productName,
                            quantity: item.quantity,
                            price: item.price
                        }],
                        createdAt: record.created_at
                    })
                }
            })

            const result = results[0] || {
                id: '',
                date: deliveryData.date,
                supplierId: deliveryData.supplierId || null,
                supplierName: deliveryData.supplierName,
                photoUrl: null,
                total: 0,
                items: [],
                createdAt: nowISO()
            }

            activityLogApi.log({
                action: 'delivery_created',
                entityType: 'delivery',
                entityId: result.id,
                details: {
                    supplierName: deliveryData.supplierName,
                    itemCount: deliveryData.items.length,
                    total: result.total
                }
            })

            return result
        },

        delete: async (id: string): Promise<void> => {
            await db.deliveries.delete(id)

            activityLogApi.log({
                action: 'delivery_deleted',
                entityType: 'delivery',
                entityId: id
            })
        }
    }
}
