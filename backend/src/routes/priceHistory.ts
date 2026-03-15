import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { asyncHandler, AppError, nowISO } from '../lib/errors'

const router = Router()

interface PriceRow {
  id: string
  product_id: string
  supplier_id: string | null
  price: number
  unit_price: number
  recorded_at: string
  delivery_id: string | null
  notes: string
  product: { name: string }
  supplier: { name: string } | null
}

function formatPrice(p: PriceRow) {
  return {
    id: p.id,
    productId: p.product_id,
    supplierId: p.supplier_id,
    price: p.price,
    unitPrice: p.unit_price,
    recordedAt: p.recorded_at,
    deliveryId: p.delivery_id,
    notes: p.notes,
    productName: p.product.name,
    supplierName: p.supplier?.name ?? null,
  }
}

// GET / — list price history with optional filters
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { productId, supplierId, from, to } = req.query
    const where: Record<string, unknown> = {}
    if (productId) where.product_id = String(productId)
    if (supplierId) where.supplier_id = String(supplierId)
    if (from || to) {
      const range: Record<string, string> = {}
      if (from) range.gte = String(from)
      if (to) range.lte = String(to)
      where.recorded_at = range
    }

    const records = await prisma.priceHistory.findMany({
      where,
      orderBy: { recorded_at: 'desc' },
      include: {
        product: { select: { name: true } },
        supplier: { select: { name: true } },
      },
    })

    res.json(records.map(formatPrice))
  })
)

// GET /product/:productId/trend — price trend for a product
router.get(
  '/product/:productId/trend',
  asyncHandler(async (req, res) => {
    const productId = req.params.productId as string

    const records = await prisma.priceHistory.findMany({
      where: { product_id: productId },
      orderBy: { recorded_at: 'asc' },
      include: {
        product: { select: { name: true } },
        supplier: { select: { name: true } },
      },
    })

    res.json(records.map(formatPrice))
  })
)

// POST / — create a price history record
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { productId, supplierId, price, unitPrice, recordedAt, deliveryId, notes } = req.body

    if (!productId) {
      throw new AppError(400, 'productId est requis')
    }

    const record = await prisma.priceHistory.create({
      data: {
        product_id: productId,
        supplier_id: supplierId ?? null,
        price: price ?? 0,
        unit_price: unitPrice ?? 0,
        recorded_at: recordedAt ?? nowISO(),
        delivery_id: deliveryId ?? null,
        notes: notes ?? '',
      },
      include: {
        product: { select: { name: true } },
        supplier: { select: { name: true } },
      },
    })

    res.status(201).json(formatPrice(record))
  })
)

export default router
