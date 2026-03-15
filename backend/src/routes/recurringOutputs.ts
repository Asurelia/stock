import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { asyncHandler, AppError, nowISO } from '../lib/errors'

const router = Router()

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatConfig(c: {
  id: string
  category: string
  product_id: string
  quantity: number
  is_active: boolean
  created_at: string
  product?: { name: string } | null
}) {
  return {
    id: c.id,
    category: c.category,
    productId: c.product_id,
    quantity: c.quantity,
    isActive: c.is_active,
    createdAt: c.created_at,
    productName: c.product?.name ?? null,
  }
}

function formatDaily(d: {
  id: string
  date: string
  category: string
  product_id: string
  quantity: number
  is_executed: boolean
  executed_at: string
  output_id: string | null
  product?: { name: string } | null
}) {
  return {
    id: d.id,
    date: d.date,
    category: d.category,
    productId: d.product_id,
    quantity: d.quantity,
    isExecuted: d.is_executed,
    executedAt: d.executed_at,
    outputId: d.output_id,
    productName: d.product?.name ?? null,
  }
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Config routes
// ---------------------------------------------------------------------------

// GET /configs
router.get(
  '/configs',
  asyncHandler(async (req, res) => {
    const { category } = req.query as { category?: string }

    const where: Record<string, unknown> = {}
    if (category) {
      where.category = category
      where.is_active = true
    }

    const configs = await prisma.recurringOutputConfig.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: { product: { select: { name: true } } },
    })

    res.json(configs.map(formatConfig))
  })
)

// PUT /configs — upsert
router.put(
  '/configs',
  asyncHandler(async (req, res) => {
    const { category, productId, quantity } = req.body

    if (!category || !productId) {
      throw new AppError(400, 'category et productId sont requis')
    }

    const existing = await prisma.recurringOutputConfig.findFirst({
      where: { category, product_id: productId },
    })

    let config
    if (existing) {
      config = await prisma.recurringOutputConfig.update({
        where: { id: existing.id },
        data: {
          is_active: true,
          quantity: quantity ?? existing.quantity,
        },
        include: { product: { select: { name: true } } },
      })
    } else {
      config = await prisma.recurringOutputConfig.create({
        data: {
          category,
          product_id: productId,
          quantity: quantity ?? 0,
          is_active: true,
          created_at: nowISO(),
        },
        include: { product: { select: { name: true } } },
      })
    }

    res.json(formatConfig(config))
  })
)

// PATCH /configs/:id
router.patch(
  '/configs/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string
    const { quantity } = req.body

    const existing = await prisma.recurringOutputConfig.findUnique({
      where: { id },
    })
    if (!existing) {
      throw new AppError(404, 'Configuration non trouvee')
    }

    const config = await prisma.recurringOutputConfig.update({
      where: { id },
      data: { quantity: quantity ?? existing.quantity },
      include: { product: { select: { name: true } } },
    })

    res.json(formatConfig(config))
  })
)

// DELETE /configs/:id
router.delete(
  '/configs/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string

    const existing = await prisma.recurringOutputConfig.findUnique({
      where: { id },
    })
    if (!existing) {
      throw new AppError(404, 'Configuration non trouvee')
    }

    await prisma.recurringOutputConfig.delete({ where: { id } })

    res.json({ ok: true })
  })
)

// ---------------------------------------------------------------------------
// Daily routes
// ---------------------------------------------------------------------------

// GET /daily
router.get(
  '/daily',
  asyncHandler(async (req, res) => {
    const { date } = req.query as { date?: string }

    if (!date) {
      throw new AppError(400, 'Le parametre date est requis')
    }

    const entries = await prisma.dailyRecurringOutput.findMany({
      where: { date },
      orderBy: { category: 'asc' },
      include: { product: { select: { name: true } } },
    })

    res.json(entries.map(formatDaily))
  })
)

// POST /daily/initialize
router.post(
  '/daily/initialize',
  asyncHandler(async (req, res) => {
    const { date } = req.body

    if (!date) {
      throw new AppError(400, 'date est requis')
    }

    const existing = await prisma.dailyRecurringOutput.findMany({
      where: { date },
      include: { product: { select: { name: true } } },
    })

    if (existing.length > 0) {
      res.json(existing.map(formatDaily))
      return
    }

    const configs = await prisma.recurringOutputConfig.findMany({
      where: { is_active: true },
    })

    if (configs.length === 0) {
      res.json([])
      return
    }

    await prisma.dailyRecurringOutput.createMany({
      data: configs.map((c) => ({
        date,
        category: c.category,
        product_id: c.product_id,
        quantity: c.quantity,
        is_executed: false,
        executed_at: '',
        output_id: null,
      })),
    })

    const created = await prisma.dailyRecurringOutput.findMany({
      where: { date },
      orderBy: { category: 'asc' },
      include: { product: { select: { name: true } } },
    })

    res.status(201).json(created.map(formatDaily))
  })
)

// POST /daily/sync
router.post(
  '/daily/sync',
  asyncHandler(async (req, res) => {
    const { date } = req.body

    if (!date) {
      throw new AppError(400, 'date est requis')
    }

    const activeConfigs = await prisma.recurringOutputConfig.findMany({
      where: { is_active: true },
    })

    const existingEntries = await prisma.dailyRecurringOutput.findMany({
      where: { date },
    })

    const existingProductIds = new Set(
      existingEntries.map((e) => `${e.category}:${e.product_id}`)
    )

    const missing = activeConfigs.filter(
      (c) => !existingProductIds.has(`${c.category}:${c.product_id}`)
    )

    if (missing.length > 0) {
      await prisma.dailyRecurringOutput.createMany({
        data: missing.map((c) => ({
          date,
          category: c.category,
          product_id: c.product_id,
          quantity: c.quantity,
          is_executed: false,
          executed_at: '',
          output_id: null,
        })),
      })
    }

    const all = await prisma.dailyRecurringOutput.findMany({
      where: { date },
      orderBy: { category: 'asc' },
      include: { product: { select: { name: true } } },
    })

    res.json(all.map(formatDaily))
  })
)

// PATCH /daily/:id
router.patch(
  '/daily/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string
    const { quantity } = req.body

    const existing = await prisma.dailyRecurringOutput.findUnique({
      where: { id },
    })
    if (!existing) {
      throw new AppError(404, 'Entree journaliere non trouvee')
    }

    const entry = await prisma.dailyRecurringOutput.update({
      where: { id },
      data: { quantity: quantity ?? existing.quantity },
      include: { product: { select: { name: true } } },
    })

    res.json(formatDaily(entry))
  })
)

// POST /daily/:id/execute
router.post(
  '/daily/:id/execute',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string

    const entry = await prisma.dailyRecurringOutput.findUnique({
      where: { id },
      include: { product: { select: { name: true } } },
    })

    if (!entry) {
      throw new AppError(404, 'Entree journaliere non trouvee')
    }

    if (entry.is_executed) {
      throw new AppError(400, 'Entree deja executee')
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: entry.product_id },
      })

      if (!product) {
        throw new AppError(404, 'Produit non trouve')
      }

      await tx.product.update({
        where: { id: entry.product_id },
        data: {
          quantity: { decrement: entry.quantity },
          updated_at: nowISO(),
        },
      })

      const output = await tx.output.create({
        data: {
          product_id: entry.product_id,
          quantity: entry.quantity,
          reason: 'recurring',
          output_date: entry.date || todayDateString(),
          created_at: nowISO(),
        },
      })

      const updated = await tx.dailyRecurringOutput.update({
        where: { id },
        data: {
          is_executed: true,
          executed_at: nowISO(),
          output_id: output.id,
        },
        include: { product: { select: { name: true } } },
      })

      return updated
    })

    res.json(formatDaily(result))
  })
)

// POST /daily/execute-category
router.post(
  '/daily/execute-category',
  asyncHandler(async (req, res) => {
    const { date, category } = req.body

    if (!date || !category) {
      throw new AppError(400, 'date et category sont requis')
    }

    const pending = await prisma.dailyRecurringOutput.findMany({
      where: { date, category, is_executed: false },
    })

    let executed = 0

    for (const entry of pending) {
      await prisma.$transaction(async (tx) => {
        const product = await tx.product.findUnique({
          where: { id: entry.product_id },
        })

        if (!product) return

        await tx.product.update({
          where: { id: entry.product_id },
          data: {
            quantity: { decrement: entry.quantity },
            updated_at: nowISO(),
          },
        })

        const output = await tx.output.create({
          data: {
            product_id: entry.product_id,
            quantity: entry.quantity,
            reason: 'recurring',
            output_date: date,
            created_at: nowISO(),
          },
        })

        await tx.dailyRecurringOutput.update({
          where: { id: entry.id },
          data: {
            is_executed: true,
            executed_at: nowISO(),
            output_id: output.id,
          },
        })
      })

      executed++
    }

    res.json({ executed })
  })
)

// POST /daily/execute-all
router.post(
  '/daily/execute-all',
  asyncHandler(async (req, res) => {
    const { date } = req.body

    if (!date) {
      throw new AppError(400, 'date est requis')
    }

    const pending = await prisma.dailyRecurringOutput.findMany({
      where: { date, is_executed: false },
    })

    let executed = 0

    for (const entry of pending) {
      await prisma.$transaction(async (tx) => {
        const product = await tx.product.findUnique({
          where: { id: entry.product_id },
        })

        if (!product) return

        await tx.product.update({
          where: { id: entry.product_id },
          data: {
            quantity: { decrement: entry.quantity },
            updated_at: nowISO(),
          },
        })

        const output = await tx.output.create({
          data: {
            product_id: entry.product_id,
            quantity: entry.quantity,
            reason: 'recurring',
            output_date: date,
            created_at: nowISO(),
          },
        })

        await tx.dailyRecurringOutput.update({
          where: { id: entry.id },
          data: {
            is_executed: true,
            executed_at: nowISO(),
            output_id: output.id,
          },
        })
      })

      executed++
    }

    res.json({ executed })
  })
)

export default router
