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

function formatSupplier(s: {
  id: string
  name: string
  category: string
  phone: string
  email: string
  contact: string
  notes: string
  logo_url: string
  order_days: string
  delivery_days: string
}) {
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    phone: s.phone,
    email: s.email,
    contact: s.contact,
    notes: s.notes,
    logoUrl: s.logo_url,
    orderDays: parseJSON(s.order_days),
    deliveryDays: parseJSON(s.delivery_days),
  }
}

// GET / — list all suppliers ordered by name
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
    })

    res.json(suppliers.map(formatSupplier))
  })
)

// GET /today-reminders — suppliers whose orderDays include today's French weekday
router.get(
  '/today-reminders',
  asyncHandler(async (_req, res) => {
    const days = [
      'dimanche',
      'lundi',
      'mardi',
      'mercredi',
      'jeudi',
      'vendredi',
      'samedi',
    ]
    const today = days[new Date().getDay()]

    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
    })

    const reminders = suppliers
      .filter((s) => {
        const orderDays = parseJSON(s.order_days) as string[]
        return Array.isArray(orderDays) && orderDays.includes(today)
      })
      .map(formatSupplier)

    res.json(reminders)
  })
)

// POST / — create a supplier
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, category, phone, email, contact, notes, logoUrl, orderDays, deliveryDays } =
      req.body

    if (!name) {
      throw new AppError(400, 'Le nom du fournisseur est requis')
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        category: category ?? '',
        phone: phone ?? '',
        email: email ?? '',
        contact: contact ?? '',
        notes: notes ?? '',
        logo_url: logoUrl ?? '',
        order_days: JSON.stringify(orderDays ?? []),
        delivery_days: JSON.stringify(deliveryDays ?? []),
        created_at: nowISO(),
        updated_at: nowISO(),
      },
    })

    res.status(201).json(formatSupplier(supplier))
  })
)

// PATCH /:id — partial update
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string
    const { name, category, phone, email, contact, notes, logoUrl, orderDays, deliveryDays } =
      req.body

    const existing = await prisma.supplier.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError(404, 'Fournisseur introuvable')
    }

    const data: Record<string, unknown> = { updated_at: nowISO() }
    if (name !== undefined) data.name = name
    if (category !== undefined) data.category = category
    if (phone !== undefined) data.phone = phone
    if (email !== undefined) data.email = email
    if (contact !== undefined) data.contact = contact
    if (notes !== undefined) data.notes = notes
    if (logoUrl !== undefined) data.logo_url = logoUrl
    if (orderDays !== undefined) data.order_days = JSON.stringify(orderDays)
    if (deliveryDays !== undefined) data.delivery_days = JSON.stringify(deliveryDays)

    const supplier = await prisma.supplier.update({
      where: { id },
      data,
    })

    res.json(formatSupplier(supplier))
  })
)

// DELETE /:id — delete a supplier
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string

    const existing = await prisma.supplier.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError(404, 'Fournisseur introuvable')
    }

    await prisma.supplier.delete({ where: { id } })

    res.json({ ok: true })
  })
)

export default router
