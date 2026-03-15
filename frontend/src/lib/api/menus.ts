import { apiClient } from './core'

export interface Menu {
    id: string
    name: string
    menuDate: string
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
    notes: string | null
    recipes: MenuRecipe[]
}

export interface MenuRecipe {
    id: string
    recipeId: string
    recipeName: string
    servings: number
}

export const menusApi = {
    getAll: (): Promise<Menu[]> => apiClient.get('/menus'),
    getByDate: (date: string): Promise<Menu[]> => apiClient.get(`/menus?date=${date}`),
    create: (data: Partial<Menu>): Promise<Menu> => apiClient.post('/menus', data),
    update: (id: string, data: Partial<Menu>): Promise<void> => apiClient.patch(`/menus/${id}`, data).then(() => {}),
    delete: (id: string): Promise<void> => apiClient.del(`/menus/${id}`).then(() => {}),
    addRecipe: (menuId: string, recipeId: string, servings?: number): Promise<MenuRecipe> => apiClient.post(`/menus/${menuId}/recipes`, { recipeId, servings: servings || 1 }),
    removeRecipe: (menuRecipeId: string): Promise<void> => apiClient.del(`/menus/_/recipes/${menuRecipeId}`).then(() => {}),
    consume: (menuId: string): Promise<number> => apiClient.post<{ outputsCreated: number }>(`/menus/${menuId}/consume`).then(r => r.outputsCreated),
}
