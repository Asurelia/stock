import { apiClient } from './core'

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
    suppliers: {
        getAll: (): Promise<Supplier[]> => apiClient.get('/suppliers'),
        create: (data: Omit<Supplier, 'id'>): Promise<Supplier> => apiClient.post('/suppliers', data),
        update: (id: string, data: Partial<Supplier>): Promise<void> => apiClient.patch(`/suppliers/${id}`, data).then(() => {}),
        delete: (id: string): Promise<void> => apiClient.del(`/suppliers/${id}`).then(() => {}),
        getTodayOrderReminders: (): Promise<Supplier[]> => apiClient.get('/suppliers/today-reminders'),
    },
    deliveries: {
        getAll: (): Promise<Delivery[]> => apiClient.get('/deliveries'),
        create: (data: { date: string; supplierName: string; supplierId?: string; photoUrl?: string; items: DeliveryItem[] }): Promise<Delivery> => apiClient.post('/deliveries', data),
        delete: (id: string): Promise<void> => apiClient.del(`/deliveries/${id}`).then(() => {}),
    },
}
