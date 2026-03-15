import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { asyncHandler, AppError, nowISO } from '../lib/errors'

const router = Router()

interface LotRow {
  id: string
  product_id: string
  lot_number: string
  quantity: number
  expiry_date: string
  expiry_type: string
  received_at: string
  notes: string
  created_at: string
  product: { name: string }
}

function formatLot(l: LotRow) {
  return {
    id: l.id,
    productId: l.product_id,
    lotNumber: l.lot_number,
    quantity: l.quantity,
    expiryDate: l.expiry_date,
    expiryType: l.expiry_type,
    receivedAt: l.received_at,
    notes: l.notes,
    createdAt: l.created_at,
    productName: l.product.name,
  }
}

// GET / — list lots, optionally filtered by productId
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { productId } = req.query
    const where = productId ? { product_id: String(productId) } : {}
    const lots = await prisma.productLot.findMany({
      where,
      orderBy: { expiry_date: 'asc' },
      include: { product: { select: { name: true } } },
    })
    res.json(lots.map(formatLot))
  })
)

// GET /expiring — lots expiring within N days with quantity > 0
router.get(
  '/expiring',
  asyncHandler(async (req, res) => {
    const days = parseInt(String(req.query.days ?? '7'), 10)
    const now = new Date()
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() + days)
    const nowISO8601 = now.toISOString().slice(0, 10)
    const cutoffISO = cutoff.toISOString().slice(0, 10)

    const lots = await prisma.productLot.findMany({
      where: {
        quantity: { gt: 0 },
        expiry_date: { gte: nowISO8601, lte: cutoffISO },
      },
      orderBy: { expiry_date: 'asc' },
      include: { product: { select: { name: true } } },
    })
    res.json(lots.map(formatLot))
  })
)

// POST / — create a lot
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { productId, lotNumber, quantity, expiryDate, expiryType, receivedAt, notes } = req.body

    if (!productId) {
      throw new AppError(400, 'productId est requis')
    }

    const now = nowISO()
    const lot = await prisma.productLot.create({
      data: {
        product_id: productId,
        lot_number: lotNumber ?? '',
        quantity: quantity ?? 0,
        expiry_date: expiryDate ?? '',
        expiry_type: expiryType ?? 'DLC',
        received_at: receivedAt ?? now,
        notes: notes ?? '',
        created_at: now,
      },
      include: { product: { select: { name: true } } },
    })

    res.status(201).json(formatLot(lot))
  })
)

// PATCH /:id — update a lot
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string
    const { lotNumber, quantity, expiryDate, expiryType, receivedAt, notes } = req.body

    const data: Record<string, unknown> = {}
    if (lotNumber !== undefined) data.lot_number = lotNumber
    if (quantity !== undefined) data.quantity = quantity
    if (expiryDate !== undefined) data.expiry_date = expiryDate
    if (expiryType !== undefined) data.expiry_type = expiryType
    if (receivedAt !== undefined) data.received_at = receivedAt
    if (notes !== undefined) data.notes = notes

    const lot = await prisma.productLot.update({
      where: { id },
      data,
      include: { product: { select: { name: true } } },
    })

    res.json(formatLot(lot))
  })
)

// DELETE /:id — delete a lot
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string
    const existing = await prisma.productLot.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError(404, 'Lot introuvable')
    }
    await prisma.productLot.delete({ where: { id } })
    res.json({ ok: true })
  })
)

export default router
