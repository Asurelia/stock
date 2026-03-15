import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { asyncHandler, AppError, nowISO } from '../lib/errors'

const router = Router()

function parseJSON(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return []
  }
}

interface RecipeRow {
  id: string
  name: string
  category: string
  servings: number
  instructions: string
  photo_url: string
  dietary_tags: string
  ingredients: Array<{
    id: string
    product_id: string
    quantity: number
    unit: string
    product: { name: string; price: number }
  }>
}

function formatRecipe(r: RecipeRow) {
  const cost = r.ingredients.reduce(
    (sum, ing) => sum + ing.quantity * ing.product.price,
    0
  )
  const costPerPortion = r.servings > 0 ? cost / r.servings : 0

  return {
    id: r.id,
    name: r.name,
    category: r.category,
    portions: r.servings,
    instructions: r.instructions,
    photoUrl: r.photo_url,
    dietaryTags: parseJSON(r.dietary_tags),
    ingredients: r.ingredients.map((ing) => ({
      id: ing.id,
      productId: ing.product_id,
      productName: ing.product.name,
      quantity: ing.quantity,
      unit: ing.unit,
    })),
    cost: Math.round(cost * 100) / 100,
    costPerPortion: Math.round(costPerPortion * 100) / 100,
  }
}

// GET / — list all recipes with ingredients and computed costs
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const recipes = await prisma.recipe.findMany({
      include: {
        ingredients: {
          include: {
            product: { select: { name: true, price: true } },
          },
        },
      },
    })

    res.json(recipes.map(formatRecipe))
  })
)

// GET /product-usage — count how many recipes use each product
router.get(
  '/product-usage',
  asyncHandler(async (_req, res) => {
    const ingredients = await prisma.recipeIngredient.findMany({
      select: { product_id: true },
    })

    const usage: Record<string, number> = {}
    for (const ing of ingredients) {
      usage[ing.product_id] = (usage[ing.product_id] ?? 0) + 1
    }

    res.json(usage)
  })
)

// POST / — create a recipe with ingredients
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, category, portions, instructions, photoUrl, dietaryTags, ingredients } = req.body

    if (!name) {
      throw new AppError(400, 'Le nom de la recette est requis')
    }

    const recipe = await prisma.$transaction(async (tx) => {
      const created = await tx.recipe.create({
        data: {
          name,
          category: category ?? '',
          servings: portions ?? 1,
          instructions: instructions ?? '',
          photo_url: photoUrl ?? '',
          dietary_tags: JSON.stringify(dietaryTags ?? []),
          created_at: nowISO(),
          updated_at: nowISO(),
        },
      })

      if (Array.isArray(ingredients) && ingredients.length > 0) {
        await tx.recipeIngredient.createMany({
          data: ingredients.map(
            (ing: { productId: string; quantity: number; unit: string }) => ({
              recipe_id: created.id,
              product_id: ing.productId,
              quantity: ing.quantity ?? 0,
              unit: ing.unit ?? '',
            })
          ),
        })
      }

      return tx.recipe.findUnique({
        where: { id: created.id },
        include: {
          ingredients: {
            include: {
              product: { select: { name: true, price: true } },
            },
          },
        },
      })
    })

    if (!recipe) {
      throw new AppError(500, 'Erreur lors de la creation de la recette')
    }

    res.status(201).json(formatRecipe(recipe))
  })
)

// PATCH /:id — update recipe and optionally replace ingredients
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string
    const { name, category, portions, instructions, photoUrl, dietaryTags, ingredients } = req.body

    const existing = await prisma.recipe.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError(404, 'Recette introuvable')
    }

    const recipe = await prisma.$transaction(async (tx) => {
      const data: Record<string, unknown> = { updated_at: nowISO() }
      if (name !== undefined) data.name = name
      if (category !== undefined) data.category = category
      if (portions !== undefined) data.servings = portions
      if (instructions !== undefined) data.instructions = instructions
      if (photoUrl !== undefined) data.photo_url = photoUrl
      if (dietaryTags !== undefined) data.dietary_tags = JSON.stringify(dietaryTags)

      await tx.recipe.update({ where: { id }, data })

      // Replace ingredients if provided
      if (Array.isArray(ingredients)) {
        await tx.recipeIngredient.deleteMany({ where: { recipe_id: id } })

        if (ingredients.length > 0) {
          await tx.recipeIngredient.createMany({
            data: ingredients.map(
              (ing: { productId: string; quantity: number; unit: string }) => ({
                recipe_id: id,
                product_id: ing.productId,
                quantity: ing.quantity ?? 0,
                unit: ing.unit ?? '',
              })
            ),
          })
        }
      }

      return tx.recipe.findUnique({
        where: { id },
        include: {
          ingredients: {
            include: {
              product: { select: { name: true, price: true } },
            },
          },
        },
      })
    })

    if (!recipe) {
      throw new AppError(500, 'Erreur lors de la mise a jour de la recette')
    }

    res.json(formatRecipe(recipe))
  })
)

// DELETE /:id — delete recipe (cascade handles ingredients)
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string

    const existing = await prisma.recipe.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError(404, 'Recette introuvable')
    }

    await prisma.recipe.delete({ where: { id } })

    res.json({ ok: true })
  })
)

export default router
