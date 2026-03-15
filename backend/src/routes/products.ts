import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { asyncHandler, AppError, nowISO } from '../lib/errors'

const router = Router()

function formatProduct(p: {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  min_stock: number
  price: number
  emoji: string
  requires_traceability_photo: boolean
  created_at?: string
  updated_at?: string
}) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    quantity: p.quantity,
    unit: p.unit,
    minStock: p.min_stock,
    price: p.price,
    emoji: p.emoji,
    requiresTraceabilityPhoto: p.requires_traceability_photo,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }
}

// GET /critical — must be before /:id
// Prisma/SQLite does not support column-to-column comparison in where,
// so we fetch all products and filter in JS.
router.get(
  '/critical',
  asyncHandler(async (_req, res) => {
    const all = await prisma.product.findMany({ orderBy: { name: 'asc' } })
    const critical = all.filter(
      (p) => p.quantity <= 0 || (p.min_stock > 0 && p.quantity <= p.min_stock)
    )

    res.json(critical.map(formatProduct))
  })
)

// GET /low-stock — must be before /:id
router.get(
  '/low-stock',
  asyncHandler(async (_req, res) => {
    const all = await prisma.product.findMany({ orderBy: { name: 'asc' } })
    const lowStock = all.filter(
      (p) => p.quantity <= 0 || (p.min_stock > 0 && p.quantity <= p.min_stock * 1.5)
    )

    res.json(lowStock.map(formatProduct))
  })
)

// GET /total-value — must be before /:id
router.get(
  '/total-value',
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany()
    const totalValue = products.reduce((sum, p) => sum + p.quantity * p.price, 0)

    res.json({ totalValue })
  })
)

// GET /
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' },
    })

    res.json(products.map(formatProduct))
  })
)

// GET /:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id as string },
    })

    if (!product) {
      throw new AppError(404, 'Produit non trouve')
    }

    res.json(formatProduct(product))
  })
)

// POST /
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const {
      name,
      category,
      quantity,
      unit,
      minStock,
      price,
      emoji,
      requiresTraceabilityPhoto,
    } = req.body

    const now = nowISO()
    const product = await prisma.product.create({
      data: {
        name,
        category: category ?? '',
        quantity: quantity ?? 0,
        unit: unit ?? '',
        min_stock: minStock ?? 0,
        price: price ?? 0,
        emoji: emoji ?? '',
        requires_traceability_photo: requiresTraceabilityPhoto ?? false,
        created_at: now,
        updated_at: now,
      },
    })

    res.status(201).json(formatProduct(product))
  })
)

// PATCH /:id
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string
    const {
      name,
      category,
      quantity,
      unit,
      minStock,
      price,
      emoji,
      requiresTraceabilityPhoto,
    } = req.body

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError(404, 'Produit non trouve')
    }

    const data: Record<string, unknown> = { updated_at: nowISO() }
    if (name !== undefined) data.name = name
    if (category !== undefined) data.category = category
    if (quantity !== undefined) data.quantity = quantity
    if (unit !== undefined) data.unit = unit
    if (minStock !== undefined) data.min_stock = minStock
    if (price !== undefined) data.price = price
    if (emoji !== undefined) data.emoji = emoji
    if (requiresTraceabilityPhoto !== undefined)
      data.requires_traceability_photo = requiresTraceabilityPhoto

    const product = await prisma.product.update({
      where: { id },
      data,
    })

    res.json(formatProduct(product))
  })
)

// DELETE /:id — cascade delete all related records
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError(404, 'Produit non trouve')
    }

    await prisma.$transaction(async (tx) => {
      await tx.output.deleteMany({ where: { product_id: id } })
      await tx.delivery.deleteMany({ where: { product_id: id } })
      await tx.recipeIngredient.deleteMany({ where: { product_id: id } })
      await tx.recurringOutputConfig.deleteMany({ where: { product_id: id } })
      await tx.dailyRecurringOutput.deleteMany({ where: { product_id: id } })
      await tx.product.delete({ where: { id } })
    })

    res.json({ ok: true })
  })
)

export default router
