import { db, generateId, nowISO } from './core'

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

async function assembleMenus(rows: any[]): Promise<Menu[]> {
    if (rows.length === 0) return []

    const menuIds = rows.map(m => m.id)
    const allMenuRecipes = await db.menuRecipes.where('menu_id').anyOf(menuIds).toArray()

    const recipeIds = [...new Set(allMenuRecipes.map((mr: any) => mr.recipe_id).filter(Boolean))]
    const recipeRows = await db.recipes.bulkGet(recipeIds)
    const recipeMap = new Map<string, any>()
    recipeRows.forEach((r: any) => { if (r) recipeMap.set(r.id, r) })

    const mrByMenu = new Map<string, any[]>()
    for (const mr of allMenuRecipes) {
        const list = mrByMenu.get(mr.menu_id) || []
        list.push(mr)
        mrByMenu.set(mr.menu_id, list)
    }

    return rows.map(m => ({
        id: m.id,
        name: m.name || '',
        menuDate: m.menu_date,
        mealType: m.meal_type as Menu['mealType'],
        notes: m.notes ?? null,
        recipes: (mrByMenu.get(m.id) || []).map((mr: any) => ({
            id: mr.id,
            recipeId: mr.recipe_id,
            recipeName: recipeMap.get(mr.recipe_id)?.name || 'Recette inconnue',
            servings: mr.servings || 1
        }))
    }))
}

export const menusApi = {
    getAll: async (): Promise<Menu[]> => {
        const rows = await db.menus.orderBy('menu_date').reverse().toArray()
        return assembleMenus(rows)
    },

    getByDate: async (date: string): Promise<Menu[]> => {
        const rows = await db.menus.where('menu_date').equals(date).toArray()
        return assembleMenus(rows)
    },

    create: async (menuData: { name: string; menu_date: string; meal_type?: string; notes?: string }) => {
        const id = generateId()
        const record = {
            id,
            name: menuData.name,
            menu_date: menuData.menu_date,
            meal_type: menuData.meal_type ?? null,
            notes: menuData.notes ?? null,
            created_at: nowISO(),
            updated_at: nowISO()
        }
        await db.menus.add(record)
        return record
    },

    update: async (id: string, menuData: { name?: string; menu_date?: string; meal_type?: string; notes?: string }) => {
        const updateData: Record<string, unknown> = { updated_at: nowISO() }
        if (menuData.name !== undefined) updateData.name = menuData.name
        if (menuData.menu_date !== undefined) updateData.menu_date = menuData.menu_date
        if (menuData.meal_type !== undefined) updateData.meal_type = menuData.meal_type
        if (menuData.notes !== undefined) updateData.notes = menuData.notes
        await db.menus.update(id, updateData)
    },

    delete: async (id: string) => {
        await db.transaction('rw', [db.menus, db.menuRecipes], async () => {
            await db.menuRecipes.where('menu_id').equals(id).delete()
            await db.menus.delete(id)
        })
    },

    addRecipe: async (menuId: string, recipeId: string, servings?: number) => {
        const id = generateId()
        const record = {
            id,
            menu_id: menuId,
            recipe_id: recipeId,
            servings: servings || 1
        }
        await db.menuRecipes.add(record)
        return record
    },

    removeRecipe: async (menuRecipeId: string) => {
        await db.menuRecipes.delete(menuRecipeId)
    },

    consume: async (menuId: string) => {
        const menu = await db.menus.get(menuId)
        if (!menu) throw new Error(`Menu not found: ${menuId}`)

        const menuRecipes = await db.menuRecipes.where('menu_id').equals(menuId).toArray()

        const recipeIds = [...new Set(menuRecipes.map((mr: any) => mr.recipe_id).filter(Boolean))]
        const recipeRows = await db.recipes.bulkGet(recipeIds)
        const recipeMap = new Map<string, any>()
        recipeRows.forEach((r: any) => { if (r) recipeMap.set(r.id, r) })

        const allIngredients = await db.recipeIngredients.where('recipe_id').anyOf(recipeIds).toArray()
        const ingByRecipe = new Map<string, any[]>()
        for (const ing of allIngredients) {
            const list = ingByRecipe.get(ing.recipe_id) || []
            list.push(ing)
            ingByRecipe.set(ing.recipe_id, list)
        }

        const outputDate = new Date().toISOString().split('T')[0]
        let outputCount = 0

        // Pre-fetch all referenced products to avoid N+1 queries
        const allProductIds = [...new Set(allIngredients.map(i => i.product_id as string).filter(Boolean))]
        const productRows = await db.products.bulkGet(allProductIds)
        const productMap = new Map<string, any>()
        productRows.forEach(p => { if (p) productMap.set(p.id, p) })

        await db.transaction('rw', [db.outputs, db.products], async () => {
            for (const mr of menuRecipes) {
                const recipe = recipeMap.get(mr.recipe_id)
                if (!recipe) continue

                const servingsServed = mr.servings || 0
                const recipeServings = recipe.servings || 1
                const factor = recipeServings > 0 ? servingsServed / recipeServings : 0

                if (factor <= 0) continue

                const ings = ingByRecipe.get(mr.recipe_id) || []
                for (const ing of ings) {
                    const qty = Number(ing.quantity) * factor
                    const product = productMap.get(ing.product_id)
                    if (!product) continue

                    const newQty = Math.max(0, (product.quantity || 0) - qty)

                    await db.outputs.add({
                        id: generateId(),
                        product_id: ing.product_id,
                        quantity: qty,
                        reason: `Menu du ${menu.menu_date}: ${recipe.name}`,
                        output_date: outputDate,
                        created_at: nowISO()
                    })

                    await db.products.update(ing.product_id, { quantity: newQty })
                    product.quantity = newQty // Update local cache for subsequent deductions of same product

                    outputCount++
                }
            }
        })

        return outputCount
    }
}
