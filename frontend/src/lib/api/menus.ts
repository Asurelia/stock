import { getSupabase } from './core'

// Menu types (new structure)
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
    getAll: async (): Promise<Menu[]> => {
        const { data, error } = await getSupabase()
            .from('menus')
            .select(`
                *,
                menu_recipes (
                    id,
                    recipe_id,
                    servings,
                    recipes (name)
                )
            `)
            .order('menu_date', { ascending: false })

        if (error) throw error
        return (data || []).map(m => ({
            id: m.id,
            name: m.name,
            menuDate: m.menu_date,
            mealType: m.meal_type as Menu['mealType'],
            notes: m.notes,
            recipes: (m.menu_recipes || []).map((mr: { id: string; recipe_id: string; servings: number; recipes: { name: string } | null }) => ({
                id: mr.id,
                recipeId: mr.recipe_id,
                recipeName: mr.recipes?.name || 'Recette inconnue',
                servings: mr.servings
            }))
        }))
    },

    getByDate: async (date: string): Promise<Menu[]> => {
        const { data, error } = await getSupabase()
            .from('menus')
            .select(`
                *,
                menu_recipes (
                    id,
                    recipe_id,
                    servings,
                    recipes (name)
                )
            `)
            .eq('menu_date', date)

        if (error) throw error
        return (data || []).map(m => ({
            id: m.id,
            name: m.name,
            menuDate: m.menu_date,
            mealType: m.meal_type as Menu['mealType'],
            notes: m.notes,
            recipes: (m.menu_recipes || []).map((mr: { id: string; recipe_id: string; servings: number; recipes: { name: string } | null }) => ({
                id: mr.id,
                recipeId: mr.recipe_id,
                recipeName: mr.recipes?.name || 'Recette inconnue',
                servings: mr.servings
            }))
        }))
    },

    create: async (menuData: { name: string; menu_date: string; meal_type?: string; notes?: string }) => {
        const { data, error } = await getSupabase()
            .from('menus')
            .insert([menuData])
            .select()
            .single()

        if (error) throw error
        return data
    },

    update: async (id: string, menuData: { name?: string; menu_date?: string; meal_type?: string; notes?: string }) => {
        const { error } = await getSupabase()
            .from('menus')
            .update(menuData)
            .eq('id', id)

        if (error) throw error
    },

    delete: async (id: string) => {
        const { error } = await getSupabase()
            .from('menus')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    addRecipe: async (menuId: string, recipeId: string, servings?: number) => {
        const { data, error } = await getSupabase()
            .from('menu_recipes')
            .insert([{
                menu_id: menuId,
                recipe_id: recipeId,
                servings: servings || 1
            }])
            .select()
            .single()

        if (error) throw error
        return data
    },

    removeRecipe: async (menuRecipeId: string) => {
        const { error } = await getSupabase()
            .from('menu_recipes')
            .delete()
            .eq('id', menuRecipeId)

        if (error) throw error
    },

    consume: async (menuId: string) => {
        // 1. Get Menu with Recipes and nested Ingredients
        const { data: menu, error: menuError } = await getSupabase()
            .from('menus')
            .select(`
                *,
                menu_recipes (
                    id,
                    recipe_id,
                    servings,
                    recipes (
                        id,
                        name,
                        servings,
                        recipe_ingredients (
                            product_id,
                            quantity
                        )
                    )
                )
            `)
            .eq('id', menuId)
            .single()

        if (menuError) throw menuError

        // 2. Prepare outputs
        const outputsToInsert: any[] = []

        // Define types for the nested structure since we're using raw Supabase response
        type MenuWithRecipes = typeof menu & {
            menu_recipes: Array<{
                servings: number | null
                recipes: {
                    name: string
                    servings: number | null
                    recipe_ingredients: Array<{
                        product_id: string
                        quantity: number
                    }>
                } | null
            }>
        }

        const typedMenu = menu as unknown as MenuWithRecipes

        for (const mr of (typedMenu.menu_recipes || [])) {
            const recipe = mr.recipes
            if (!recipe) continue

            const servingsServed = mr.servings || 0
            const recipeServings = recipe.servings || 1
            const factor = recipeServings > 0 ? servingsServed / recipeServings : 0

            if (factor <= 0) continue

            for (const ing of (recipe.recipe_ingredients || [])) {
                outputsToInsert.push({
                    product_id: ing.product_id,
                    quantity: Number(ing.quantity) * factor,
                    reason: `Menu du ${typedMenu.menu_date}: ${recipe.name}`,
                    output_date: new Date().toISOString().split('T')[0] // Use current date for the output action
                })
            }
        }

        if (outputsToInsert.length > 0) {
            const { error: insertError } = await getSupabase()
                .from('outputs')
                .insert(outputsToInsert)

            if (insertError) throw insertError
        }

        return outputsToInsert.length
    }
}
