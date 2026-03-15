import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { asyncHandler, AppError, nowISO } from '../lib/errors'

const router = Router()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMenu(m: any) {
  return {
    id: m.id,
    name: m.name,
    menuDate: m.menu_date,
    mealType: m.meal_type,
    notes: m.notes,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
    menuRecipes: m.menu_recipes?.map(formatMenuRecipe) ?? [],
  }
}

function formatMenuRecipe(mr: any) {
  return {
    id: mr.id,
    menuId: mr.menu_id,
    recipeId: mr.recipe_id,
    servings: mr.servings,
    recipe: mr.recipe
      ? { id: mr.recipe.id, name: mr.recipe.name }
      : undefined,
  }
}

// ---------------------------------------------------------------------------
// GET / — list menus (optionally filtered by ?date=YYYY-MM-DD)
// ---------------------------------------------------------------------------
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { date } = req.query

    const where: Record<string, unknown> = {}
    if (date) {
      where.menu_date = date as string
    }

    const menus = await prisma.menu.findMany({
      where,
      orderBy: { menu_date: 'desc' },
      include: {
        menu_recipes: {
          include: {
            recipe: { select: { id: true, name: true } },
          },
        },
      },
    })

    res.json(menus.map(formatMenu))
  })
)

// ---------------------------------------------------------------------------
// POST / — create menu
// ---------------------------------------------------------------------------
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, menuDate, mealType, notes } = req.body

    const menu = await prisma.menu.create({
      data: {
        name: name ?? '',
        menu_date: menuDate ?? '',
        meal_type: mealType ?? '',
        notes: notes ?? '',
        created_at: nowISO(),
        updated_at: nowISO(),
      },
      include: {
        menu_recipes: {
          include: {
            recipe: { select: { id: true, name: true } },
          },
        },
      },
    })

    res.status(201).json(formatMenu(menu))
  })
)

// ---------------------------------------------------------------------------
// PATCH /:id — update menu
// ---------------------------------------------------------------------------
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string
    const { name, menuDate, mealType, notes } = req.body

    const data: Record<string, unknown> = { updated_at: nowISO() }
    if (name !== undefined) data.name = name
    if (menuDate !== undefined) data.menu_date = menuDate
    if (mealType !== undefined) data.meal_type = mealType
    if (notes !== undefined) data.notes = notes

    const menu = await prisma.menu.update({
      where: { id },
      data,
      include: {
        menu_recipes: {
          include: {
            recipe: { select: { id: true, name: true } },
          },
        },
      },
    })

    res.json(formatMenu(menu))
  })
)

// ---------------------------------------------------------------------------
// DELETE /:id — delete menu (cascade handles menu_recipes)
// ---------------------------------------------------------------------------
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string
    await prisma.menu.delete({ where: { id } })
    res.json({ ok: true })
  })
)

// ---------------------------------------------------------------------------
// POST /:id/recipes — add recipe to menu
// ---------------------------------------------------------------------------
router.post(
  '/:id/recipes',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string
    const { recipeId, servings } = req.body

    if (!recipeId) {
      throw new AppError(400, 'recipeId requis')
    }

    // Verify the menu exists
    const menu = await prisma.menu.findUnique({ where: { id } })
    if (!menu) {
      throw new AppError(404, 'Menu non trouve')
    }

    const menuRecipe = await prisma.menuRecipe.create({
      data: {
        menu_id: id,
        recipe_id: recipeId,
        servings: servings ?? 1,
      },
      include: {
        recipe: { select: { id: true, name: true } },
      },
    })

    res.status(201).json(formatMenuRecipe(menuRecipe))
  })
)

// ---------------------------------------------------------------------------
// DELETE /:menuId/recipes/:menuRecipeId — remove recipe from menu
// ---------------------------------------------------------------------------
router.delete(
  '/:menuId/recipes/:menuRecipeId',
  asyncHandler(async (req, res) => {
    const menuRecipeId = req.params.menuRecipeId as string
    await prisma.menuRecipe.delete({ where: { id: menuRecipeId } })
    res.json({ ok: true })
  })
)

// ---------------------------------------------------------------------------
// POST /:id/consume — consume menu: deduct ingredients, create outputs
// ---------------------------------------------------------------------------
router.post(
  '/:id/consume',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string

    const menu = await prisma.menu.findUnique({
      where: { id },
      include: {
        menu_recipes: {
          include: {
            recipe: {
              include: {
                ingredients: {
                  include: { product: true },
                },
              },
            },
          },
        },
      },
    })

    if (!menu) {
      throw new AppError(404, 'Menu non trouve')
    }

    if (menu.menu_recipes.length === 0) {
      throw new AppError(400, 'Ce menu ne contient aucune recette')
    }

    const result = await prisma.$transaction(async (tx) => {
      let outputsCreated = 0

      for (const menuRecipe of menu.menu_recipes) {
        const recipe = menuRecipe.recipe
        if (!recipe || recipe.ingredients.length === 0) continue

        const factor = menuRecipe.servings / recipe.servings

        for (const ingredient of recipe.ingredients) {
          const scaledQty = ingredient.quantity * factor

          await tx.output.create({
            data: {
              product_id: ingredient.product_id,
              quantity: scaledQty,
              reason: `Menu du ${menu.menu_date}: ${recipe.name}`,
              output_date: menu.menu_date,
              created_at: nowISO(),
            },
          })

          await tx.product.update({
            where: { id: ingredient.product_id },
            data: {
              quantity: { decrement: scaledQty },
            },
          })

          outputsCreated++
        }
      }

      return { outputsCreated }
    })

    res.json(result)
  })
)

export default router
