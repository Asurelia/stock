import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { asyncHandler, AppError, nowISO } from '../lib/errors'

const router = Router()

// GET /stats — aggregated analytics for a date range
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as { from?: string; to?: string }

    if (!from || !to) {
      throw new AppError(400, 'Parametres from et to requis')
    }

    // 1. Outputs in range
    const outputs = await prisma.output.findMany({
      where: {
        output_date: { gte: from, lte: to },
      },
      include: { product: { select: { name: true } } },
    })

    const totalOutputs = outputs.reduce((sum: number, o) => sum + o.quantity, 0)

    // 2. Deliveries in range
    const deliveries = await prisma.delivery.findMany({
      where: {
        delivery_date: { gte: from, lte: to },
      },
    })

    const totalEntries = deliveries.reduce((sum: number, d) => sum + d.quantity, 0)

    // 3. Total movements
    const totalMovements = outputs.length + deliveries.length

    // 4. Category stats from all products
    const products = await prisma.product.findMany()

    const categoryMap = new Map<
      string,
      { count: number; totalValue: number }
    >()

    for (const p of products) {
      const cat = p.category || 'Sans categorie'
      const existing = categoryMap.get(cat) ?? { count: 0, totalValue: 0 }
      existing.count += 1
      existing.totalValue += p.quantity * p.price
      categoryMap.set(cat, existing)
    }

    const categoryStats = Array.from(categoryMap.entries()).map(
      ([category, data]) => ({
        category,
        count: data.count,
        totalValue: Math.round(data.totalValue * 100) / 100,
      })
    )

    // 5. Top consumption (from outputs, grouped by product)
    const consumptionMap = new Map<
      string,
      { productName: string; totalQuantity: number }
    >()

    for (const o of outputs) {
      const key = o.product_id
      const existing = consumptionMap.get(key) ?? {
        productName: o.product?.name ?? '',
        totalQuantity: 0,
      }
      existing.totalQuantity += o.quantity
      consumptionMap.set(key, existing)
    }

    const topConsumption = Array.from(consumptionMap.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.productName,
        totalQuantity: data.totalQuantity,
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10)

    res.json({
      totalMovements,
      totalOutputs,
      totalEntries,
      categoryStats,
      topConsumption,
    })
  })
)

export default router
