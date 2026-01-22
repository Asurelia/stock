import { getSupabase } from './core'
import { activityLogApi } from './activityLog'

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

export const inventoryApi = {
    // =========================================
    // Suppliers
    // =========================================
    suppliers: {
        getAll: async (): Promise<Supplier[]> => {
            const { data, error } = await getSupabase()
                .from('suppliers')
                .select('*')
                .order('name')

            if (error) throw error

            return (data || []).map(s => ({
                id: s.id,
                name: s.name,
                category: 'autre',
                phone: s.phone || '',
                email: s.email || '',
                contact: s.contact || '',
                notes: s.notes || '',
                logoUrl: '',
                orderDays: [],
                deliveryDays: []
            }))
        },

        create: async (supplierData: Omit<Supplier, 'id'>): Promise<Supplier> => {
            const { data, error } = await getSupabase()
                .from('suppliers')
                .insert([{
                    name: supplierData.name,
                    phone: supplierData.phone,
                    email: supplierData.email,
                    contact: supplierData.contact,
                    notes: supplierData.notes
                }])
                .select()
                .single()

            if (error) throw error

            return {
                id: data.id,
                name: data.name,
                category: 'autre',
                phone: data.phone || '',
                email: data.email || '',
                contact: data.contact || '',
                notes: data.notes || '',
                logoUrl: '',
                orderDays: [],
                deliveryDays: []
            }
        },

        update: async (id: string, supplierData: Partial<Supplier>): Promise<void> => {
            const { error } = await getSupabase()
                .from('suppliers')
                .update({
                    name: supplierData.name,
                    phone: supplierData.phone,
                    email: supplierData.email,
                    contact: supplierData.contact,
                    notes: supplierData.notes
                })
                .eq('id', id)

            if (error) throw error
        },

        delete: async (id: string): Promise<void> => {
            const { error } = await getSupabase()
                .from('suppliers')
                .delete()
                .eq('id', id)

            if (error) throw error
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
            // Get deliveries with product and supplier info
            const { data, error } = await getSupabase()
                .from('deliveries')
                .select(`
                    *,
                    products (name),
                    suppliers (name)
                `)
                .order('delivery_date', { ascending: false })

            if (error) throw error

            return (data || []).map(d => ({
                id: d.id,
                date: d.delivery_date,
                supplierId: d.supplier_id,
                supplierName: (d.suppliers as { name: string } | null)?.name || '',
                photoUrl: null,
                total: Number(d.total_price) || 0,
                items: [{
                    id: d.id,
                    productId: d.product_id,
                    productName: (d.products as { name: string } | null)?.name || '',
                    quantity: Number(d.quantity) || 0,
                    price: Number(d.unit_price) || 0
                }],
                createdAt: d.created_at
            }))
        },

        create: async (deliveryData: { date: string; supplierName: string; supplierId?: string; photoUrl?: string; items: DeliveryItem[] }): Promise<Delivery> => {
            // The table structure has one delivery per product, so create multiple entries
            const results: Delivery[] = []

            for (const item of deliveryData.items) {
                const { data: delivery, error: deliveryError } = await getSupabase()
                    .from('deliveries')
                    .insert([{
                        product_id: item.productId,
                        supplier_id: deliveryData.supplierId || null,
                        quantity: item.quantity,
                        unit_price: item.price,
                        total_price: item.quantity * item.price,
                        delivery_date: deliveryData.date
                    }])
                    .select()
                    .single()

                if (deliveryError) throw deliveryError

                results.push({
                    id: delivery.id,
                    date: delivery.delivery_date,
                    supplierId: delivery.supplier_id,
                    supplierName: deliveryData.supplierName,
                    photoUrl: null,
                    total: Number(delivery.total_price) || 0,
                    items: [{
                        id: delivery.id,
                        productId: item.productId,
                        productName: item.productName,
                        quantity: Number(delivery.quantity) || 0,
                        price: Number(delivery.unit_price) || 0
                    }],
                    createdAt: delivery.created_at
                })
            }

            const result = results[0] || {
                id: '',
                date: deliveryData.date,
                supplierId: deliveryData.supplierId || null,
                supplierName: deliveryData.supplierName,
                photoUrl: null,
                total: 0,
                items: [],
                createdAt: new Date().toISOString()
            }

            // Log activity
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
            const { error } = await getSupabase()
                .from('deliveries')
                .delete()
                .eq('id', id)

            if (error) throw error

            // Log activity
            activityLogApi.log({
                action: 'delivery_deleted',
                entityType: 'delivery',
                entityId: id
            })
        }
    }
}
