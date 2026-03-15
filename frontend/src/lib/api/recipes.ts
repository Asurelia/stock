import { apiClient } from './core'

// =============================================
// Dietary Tags
// =============================================

export const DIETARY_TAGS = [
    { value: 'normal', label: 'Normal', color: 'bg-gray-500' },
    { value: 'sans-sel', label: 'Sans sel', color: 'bg-blue-500' },
    { value: 'mixe', label: 'Mixé', color: 'bg-purple-500' },
    { value: 'hache', label: 'Haché', color: 'bg-orange-500' },
    { value: 'diabetique', label: 'Diabétique', color: 'bg-red-500' },
    { value: 'sans-gluten', label: 'Sans gluten', color: 'bg-yellow-500' },
    { value: 'vegetarien', label: 'Végétarien', color: 'bg-green-500' },
    { value: 'sans-lactose', label: 'Sans lactose', color: 'bg-cyan-500' },
] as const

export interface RecipeIngredient {
    id?: string
    productId: string
    productName: string
    quantity: number
    unit: string
}

export interface Recipe {
    id: string
    name: string
    portions: number
    photoUrl: string | null
    dietaryTags: string[]
    instructions: string
    ingredients: RecipeIngredient[]
    cost?: number
    costPerPortion?: number
}

export const recipesApi = {
    getAll: (): Promise<Recipe[]> => apiClient.get('/recipes'),
    create: (data: Omit<Recipe, 'id' | 'cost' | 'costPerPortion'>): Promise<Recipe> => apiClient.post('/recipes', data),
    update: (id: string, data: Partial<Recipe>): Promise<void> => apiClient.patch(`/recipes/${id}`, data).then(() => {}),
    delete: (id: string): Promise<void> => apiClient.del(`/recipes/${id}`).then(() => {}),
    getProductUsageStats: (): Promise<Record<string, number>> => apiClient.get('/recipes/product-usage'),
}
