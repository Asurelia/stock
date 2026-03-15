import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { asyncHandler, AppError, nowISO } from '../lib/errors'

const router = Router()

function formatOutput(o: {
  id: string
  product_id: string
  quantity: number
  reason: string
  output_date: string
  created_at: string
  product?: { name: string } | null
}) {
  return {
    id: o.id,
    productId: o.product_id,
    quantity: o.quantity,
    reason: o.reason,
    outputDate: o.output_date,
    createdAt: o.created_at,
    productName: o.product?.name ?? null,
  }
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

// GET /today — must be before /:id
router.get(
  '/today',
  asyncHandler(async (_req, res) => {
    const today = todayDateString()

    const outputs = await prisma.output.findMany({
      where: { output_date: today },
      orderBy: { output_date: 'desc' },
      include: { product: { select: { name: true } } },
    })

    res.json(outputs.map(formatOutput))
  })
)

// GET /
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as { from?: string; to?: string }

    const where: Record<string, unknown> = {}

    if (from || to) {
      const dateFilter: Record<string, string> = {}
      if (from) {
        // Support both ISO datetime and date-only strings
        dateFilter.gte = from.length === 10 ? from : from.slice(0, 10)
      }
      if (to) {
        dateFilter.lte = to.length === 10 ? to : to.slice(0, 10)
      }
      where.output_date = dateFilter
    }

    const outputs = await prisma.output.findMany({
      where,
      orderBy: { output_date: 'desc' },
      include: { product: { select: { name: true } } },
    })

    res.json(outputs.map(formatOutput))
  })
)

// POST /
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { productId, quantity, reason, outputDate } = req.body

    if (!productId || quantity == null) {
      throw new AppError(400, 'productId et quantity sont requis')
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
      })

      if (!product) {
        throw new AppError(404, 'Produit non trouve')
      }

      if (product.quantity < quantity) {
        throw new AppError(400, 'Stock insuffisant')
      }

      await tx.product.update({
        where: { id: productId },
        data: {
          quantity: { decrement: quantity },
          updated_at: nowISO(),
        },
      })

      const output = await tx.output.create({
        data: {
          product_id: productId,
          quantity,
          reason: reason ?? '',
          output_date: outputDate ?? todayDateString(),
          created_at: nowISO(),
        },
        include: { product: { select: { name: true } } },
      })

      return output
    })

    res.status(201).json(formatOutput(result))
  })
)

// DELETE /:id — restore stock and delete
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string

    await prisma.$transaction(async (tx) => {
      const output = await tx.output.findUnique({
        where: { id },
      })

      if (!output) {
        throw new AppError(404, 'Sortie non trouvee')
      }

      await tx.product.update({
        where: { id: output.product_id },
        data: {
          quantity: { increment: output.quantity },
          updated_at: nowISO(),
        },
      })

      await tx.output.delete({ where: { id } })
    })

    res.json({ ok: true })
  })
)

export default router
