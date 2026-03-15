import { apiClient } from './core'

export interface Product {
    id: string
    name: string
    category: string
    quantity: number
    unit: string
    minStock: number
    avgConsumption: number
    price: number
    emoji?: string
    barcode?: string
    requiresTraceabilityPhoto: boolean
}

export const productsApi = {
    getAll: (): Promise<Product[]> => apiClient.get('/products'),
    getById: (id: string): Promise<Product> => apiClient.get(`/products/${id}`),
    create: (data: Omit<Product, 'id'>): Promise<Product> => apiClient.post('/products', data),
    update: (id: string, data: Partial<Product>): Promise<void> => apiClient.patch(`/products/${id}`, data).then(() => {}),
    delete: (id: string): Promise<void> => apiClient.del(`/products/${id}`).then(() => {}),
    getCritical: (): Promise<Product[]> => apiClient.get('/products/critical'),
    getLowStock: (): Promise<Product[]> => apiClient.get('/products/low-stock'),
    getTotalValue: (): Promise<number> => apiClient.get<{ totalValue: number }>('/products/total-value').then(r => r.totalValue),
}
