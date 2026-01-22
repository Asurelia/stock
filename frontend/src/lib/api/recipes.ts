import { getSupabase } from './core'

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
    getAll: async (): Promise<Recipe[]> => {
        const { data, error } = await getSupabase()
            .from('recipes')
            .select(`
                *,
                recipe_ingredients (
                    id,
                    product_id,
                    quantity,
                    unit,
                    products (name, price)
                )
            `)
            .order('name')

        if (error) throw error

        return (data || []).map(r => {
            const ingredients = (r.recipe_ingredients || []).map((ing: { id: string; product_id: string; quantity: number; unit: string; products: { name: string; price: number } | null }) => ({
                id: ing.id,
                productId: ing.product_id,
                productName: ing.products?.name || '',
                quantity: Number(ing.quantity) || 0,
                unit: ing.unit || ''
            }))

            const totalCost = (r.recipe_ingredients || []).reduce((acc: number, ing: { quantity: number; products: { price: number } | null }) => {
                return acc + (Number(ing.quantity || 0) * (Number(ing.products?.price) || 0))
            }, 0)

            const portions = r.servings || 1

            return {
                id: r.id,
                name: r.name,
                portions: portions,
                photoUrl: null,
                dietaryTags: [],
                instructions: r.instructions || '',
                ingredients: ingredients,
                cost: totalCost,
                costPerPortion: portions > 0 ? totalCost / portions : 0
            }
        })
    },

    create: async (recipeData: Omit<Recipe, 'id'>): Promise<Recipe> => {
        const { data: recipe, error: recipeError } = await getSupabase()
            .from('recipes')
            .insert([{
                name: recipeData.name,
                servings: recipeData.portions,
                instructions: recipeData.instructions
            }])
            .select()
            .single()

        if (recipeError) throw recipeError

        if (recipeData.ingredients.length > 0) {
            const { error: ingredientsError } = await getSupabase()
                .from('recipe_ingredients')
                .insert(recipeData.ingredients.map(ing => ({
                    recipe_id: recipe.id,
                    product_id: ing.productId,
                    quantity: ing.quantity,
                    unit: ing.unit
                })))

            if (ingredientsError) throw ingredientsError
        }

        return {
            id: recipe.id,
            name: recipe.name,
            portions: recipe.servings || 1,
            photoUrl: null,
            dietaryTags: [],
            instructions: recipe.instructions || '',
            ingredients: recipeData.ingredients
        }
    },

    update: async (id: string, recipeData: Partial<Recipe>): Promise<void> => {
        const { error: recipeError } = await getSupabase()
            .from('recipes')
            .update({
                name: recipeData.name,
                servings: recipeData.portions,
                instructions: recipeData.instructions
            })
            .eq('id', id)

        if (recipeError) throw recipeError

        if (recipeData.ingredients) {
            await getSupabase()
                .from('recipe_ingredients')
                .delete()
                .eq('recipe_id', id)

            if (recipeData.ingredients.length > 0) {
                const { error: ingredientsError } = await getSupabase()
                    .from('recipe_ingredients')
                    .insert(recipeData.ingredients.map(ing => ({
                        recipe_id: id,
                        product_id: ing.productId,
                        quantity: ing.quantity,
                        unit: ing.unit
                    })))

                if (ingredientsError) throw ingredientsError
            }
        }
    },

    delete: async (id: string): Promise<void> => {
        const { error } = await getSupabase()
            .from('recipes')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    getProductUsageStats: async (): Promise<Record<string, number>> => {
        const { data, error } = await getSupabase()
            .from('recipe_ingredients')
            .select('product_id')

        if (error) throw error

        const stats: Record<string, number> = {}
        data?.forEach((row: { product_id: string }) => {
            const pid = row.product_id
            stats[pid] = (stats[pid] || 0) + 1
        })
        return stats
    }
}
