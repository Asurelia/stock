import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { asyncHandler, AppError, nowISO } from '../lib/errors'

const router = Router()

interface DeliveryRow {
  id: string
  product_id: string
  supplier_id: string | null
  quantity: number
  unit_price: number
  total_price: number
  delivery_date: string
  photo_url: string
  created_at: string
  status: string
  product: { name: string }
  supplier: { name: string } | null
}

function formatDelivery(d: DeliveryRow) {
  return {
    id: d.id,
    productId: d.product_id,
    supplierId: d.supplier_id,
    quantity: d.quantity,
    unitPrice: d.unit_price,
    totalPrice: d.total_price,
    deliveryDate: d.delivery_date,
    photoUrl: d.photo_url,
    createdAt: d.created_at,
    status: d.status,
    productName: d.product.name,
    supplierName: d.supplier?.name ?? null,
  }
}

// GET / — list all deliveries with product and supplier names
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const deliveries = await prisma.delivery.findMany({
      orderBy: { delivery_date: 'desc' },
      include: {
        product: { select: { name: true } },
        supplier: { select: { name: true } },
      },
    })

    res.json(deliveries.map(formatDelivery))
  })
)

// POST / — create delivery records from items and increment stock
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { date, supplierName, supplierId, photoUrl, items } = req.body

    if (!date) {
      throw new AppError(400, 'La date de livraison est requise')
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError(400, 'Au moins un article est requis')
    }

    // Resolve supplier ID from name if not provided directly
    let resolvedSupplierId: string | null = supplierId ?? null
    if (!resolvedSupplierId && supplierName) {
      const supplier = await prisma.supplier.findFirst({
        where: { name: supplierName },
      })
      resolvedSupplierId = supplier?.id ?? null
    }

    const created = await prisma.$transaction(async (tx) => {
      const deliveries: DeliveryRow[] = []

      for (const item of items) {
        const { productId, quantity, unitPrice } = item

        if (!productId || quantity == null || unitPrice == null) {
          throw new AppError(400, 'Chaque article doit avoir productId, quantity et unitPrice')
        }

        const totalPrice = quantity * unitPrice

        const delivery = await tx.delivery.create({
          data: {
            product_id: productId,
            supplier_id: resolvedSupplierId,
            quantity,
            unit_price: unitPrice,
            total_price: totalPrice,
            delivery_date: date,
            photo_url: photoUrl ?? '',
            created_at: nowISO(),
          },
          include: {
            product: { select: { name: true } },
            supplier: { select: { name: true } },
          },
        })

        // Increment product stock
        await tx.product.update({
          where: { id: productId },
          data: { quantity: { increment: quantity } },
        })

        deliveries.push(delivery)
      }

      return deliveries
    })

    res.status(201).json(created.map(formatDelivery))
  })
)

// PATCH /:id/status — Update delivery status
router.patch('/:id/status', asyncHandler(async (req, res) => {
  const id = req.params.id as string
  const { status } = req.body
  const validStatuses = ['brouillon', 'en_cours', 'livre', 'archive']
  if (!validStatuses.includes(status)) {
    throw new AppError(400, `Statut invalide. Valeurs acceptées: ${validStatuses.join(', ')}`)
  }
  const delivery = await prisma.delivery.findUnique({ where: { id } })
  if (!delivery) throw new AppError(404, 'Livraison non trouvée')
  await prisma.delivery.update({ where: { id }, data: { status } })
  res.json({ ok: true, status })
}))

// DELETE /:id — delete delivery and restore stock (transactional)
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string

    await prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.findUnique({ where: { id } })
      if (!delivery) {
        throw new AppError(404, 'Livraison introuvable')
      }

      // Decrement product stock to restore previous quantity
      await tx.product.update({
        where: { id: delivery.product_id },
        data: { quantity: { decrement: delivery.quantity } },
      })

      await tx.delivery.delete({ where: { id } })
    })

    res.json({ ok: true })
  })
)

export default router
