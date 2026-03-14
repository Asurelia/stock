import { db, generateId, nowISO } from './core'

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
        const recipes = await db.recipes.orderBy('name').toArray()
        const allIngredients = await db.recipeIngredients.toArray()

        const productIds = [...new Set(allIngredients.map((i: any) => i.product_id).filter(Boolean))]
        const productRows = await db.products.bulkGet(productIds)
        const productMap = new Map<string, any>()
        productRows.forEach((p: any) => { if (p) productMap.set(p.id, p) })

        const ingredientsByRecipe = new Map<string, any[]>()
        for (const ing of allIngredients) {
            const list = ingredientsByRecipe.get(ing.recipe_id) || []
            list.push(ing)
            ingredientsByRecipe.set(ing.recipe_id, list)
        }

        return recipes.map(r => {
            const ings = ingredientsByRecipe.get(r.id) || []
            const ingredients: RecipeIngredient[] = ings.map((ing: any) => {
                const product = productMap.get(ing.product_id)
                return {
                    id: ing.id,
                    productId: ing.product_id,
                    productName: product?.name || '',
                    quantity: Number(ing.quantity) || 0,
                    unit: ing.unit || ''
                }
            })

            const totalCost = ings.reduce((acc: number, ing: any) => {
                const product = productMap.get(ing.product_id)
                return acc + (Number(ing.quantity || 0) * (Number(product?.price) || 0))
            }, 0)

            const portions = r.servings || 1

            return {
                id: r.id,
                name: r.name,
                portions,
                photoUrl: r.photo_url ?? null,
                dietaryTags: r.dietary_tags ? JSON.parse(r.dietary_tags) : [],
                instructions: r.instructions || '',
                ingredients,
                cost: totalCost,
                costPerPortion: portions > 0 ? totalCost / portions : 0
            }
        })
    },

    create: async (recipeData: Omit<Recipe, 'id'>): Promise<Recipe> => {
        const recipeId = generateId()
        const now = nowISO()

        await db.transaction('rw', [db.recipes, db.recipeIngredients], async () => {
            await db.recipes.add({
                id: recipeId,
                name: recipeData.name,
                category: null,
                servings: recipeData.portions,
                instructions: recipeData.instructions,
                photo_url: recipeData.photoUrl ?? null,
                dietary_tags: JSON.stringify(recipeData.dietaryTags || []),
                created_at: now,
                updated_at: now
            })

            for (const ing of recipeData.ingredients) {
                await db.recipeIngredients.add({
                    id: generateId(),
                    recipe_id: recipeId,
                    product_id: ing.productId,
                    quantity: ing.quantity,
                    unit: ing.unit
                })
            }
        })

        return {
            id: recipeId,
            name: recipeData.name,
            portions: recipeData.portions,
            photoUrl: recipeData.photoUrl ?? null,
            dietaryTags: recipeData.dietaryTags || [],
            instructions: recipeData.instructions,
            ingredients: recipeData.ingredients
        }
    },

    update: async (id: string, recipeData: Partial<Recipe>): Promise<void> => {
        await db.transaction('rw', [db.recipes, db.recipeIngredients], async () => {
            const updateData: Record<string, unknown> = { updated_at: nowISO() }
            if (recipeData.name !== undefined) updateData.name = recipeData.name
            if (recipeData.portions !== undefined) updateData.servings = recipeData.portions
            if (recipeData.instructions !== undefined) updateData.instructions = recipeData.instructions
            if (recipeData.photoUrl !== undefined) updateData.photo_url = recipeData.photoUrl
            if (recipeData.dietaryTags !== undefined) updateData.dietary_tags = JSON.stringify(recipeData.dietaryTags)
            await db.recipes.update(id, updateData)

            if (recipeData.ingredients !== undefined) {
                await db.recipeIngredients.where('recipe_id').equals(id).delete()
                for (const ing of recipeData.ingredients) {
                    await db.recipeIngredients.add({
                        id: generateId(),
                        recipe_id: id,
                        product_id: ing.productId,
                        quantity: ing.quantity,
                        unit: ing.unit
                    })
                }
            }
        })
    },

    delete: async (id: string): Promise<void> => {
        await db.transaction('rw', [db.recipes, db.recipeIngredients], async () => {
            await db.recipeIngredients.where('recipe_id').equals(id).delete()
            await db.recipes.delete(id)
        })
    },

    getProductUsageStats: async (): Promise<Record<string, number>> => {
        const rows = await db.recipeIngredients.toArray()
        const stats: Record<string, number> = {}
        rows.forEach((row: any) => {
            const pid = row.product_id
            stats[pid] = (stats[pid] || 0) + 1
        })
        return stats
    }
}
