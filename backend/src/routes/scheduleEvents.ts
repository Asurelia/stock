import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { asyncHandler, AppError, nowISO } from '../lib/errors'

const router = Router()

function formatEvent(e: {
  id: string
  staff_id: string
  event_type: string
  title: string
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  hours: number
  notes: string
  is_validated: boolean
  validated_by: string
  validated_at: string
  created_at: string
  staff?: { first_name: string; last_name: string; color: string } | null
}) {
  return {
    id: e.id,
    staffId: e.staff_id,
    eventType: e.event_type,
    title: e.title,
    startDate: e.start_date,
    endDate: e.end_date,
    startTime: e.start_time,
    endTime: e.end_time,
    hours: e.hours,
    notes: e.notes,
    isValidated: e.is_validated,
    validatedBy: e.validated_by,
    validatedAt: e.validated_at,
    createdAt: e.created_at,
    staffName: e.staff
      ? `${e.staff.first_name} ${e.staff.last_name}`.trim()
      : null,
    staffColor: e.staff?.color ?? null,
  }
}

// GET /
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { from, to, staffId } = req.query as {
      from?: string
      to?: string
      staffId?: string
    }

    const where: Record<string, unknown> = {}

    if (from && to) {
      where.start_date = { lte: to }
      where.end_date = { gte: from }
    } else if (from) {
      where.end_date = { gte: from }
    } else if (to) {
      where.start_date = { lte: to }
    }

    if (staffId) {
      where.staff_id = staffId
    }

    const events = await prisma.scheduleEvent.findMany({
      where,
      orderBy: { start_date: 'asc' },
      include: {
        staff: {
          select: { first_name: true, last_name: true, color: true },
        },
      },
    })

    res.json(events.map(formatEvent))
  })
)

// POST /
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const {
      staffId,
      eventType,
      title,
      startDate,
      endDate,
      startTime,
      endTime,
      hours,
      notes,
    } = req.body

    if (!staffId) {
      throw new AppError(400, 'staffId est requis')
    }

    const event = await prisma.scheduleEvent.create({
      data: {
        staff_id: staffId,
        event_type: eventType ?? '',
        title: title ?? '',
        start_date: startDate ?? '',
        end_date: endDate ?? '',
        start_time: startTime ?? '',
        end_time: endTime ?? '',
        hours: hours ?? 0,
        notes: notes ?? '',
        created_at: nowISO(),
      },
      include: {
        staff: {
          select: { first_name: true, last_name: true, color: true },
        },
      },
    })

    res.status(201).json(formatEvent(event))
  })
)

// PATCH /:id
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string
    const {
      staffId,
      eventType,
      title,
      startDate,
      endDate,
      startTime,
      endTime,
      hours,
      notes,
    } = req.body

    const existing = await prisma.scheduleEvent.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError(404, 'Evenement non trouve')
    }

    const data: Record<string, unknown> = {}
    if (staffId !== undefined) data.staff_id = staffId
    if (eventType !== undefined) data.event_type = eventType
    if (title !== undefined) data.title = title
    if (startDate !== undefined) data.start_date = startDate
    if (endDate !== undefined) data.end_date = endDate
    if (startTime !== undefined) data.start_time = startTime
    if (endTime !== undefined) data.end_time = endTime
    if (hours !== undefined) data.hours = hours
    if (notes !== undefined) data.notes = notes

    const event = await prisma.scheduleEvent.update({
      where: { id },
      data,
      include: {
        staff: {
          select: { first_name: true, last_name: true, color: true },
        },
      },
    })

    res.json(formatEvent(event))
  })
)

// DELETE /:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string

    const existing = await prisma.scheduleEvent.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError(404, 'Evenement non trouve')
    }

    await prisma.scheduleEvent.delete({ where: { id } })

    res.json({ ok: true })
  })
)

// POST /:id/validate
router.post(
  '/:id/validate',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string
    const { validatedBy } = req.body

    const existing = await prisma.scheduleEvent.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError(404, 'Evenement non trouve')
    }

    const event = await prisma.scheduleEvent.update({
      where: { id },
      data: {
        is_validated: true,
        validated_by: validatedBy ?? '',
        validated_at: nowISO(),
      },
      include: {
        staff: {
          select: { first_name: true, last_name: true, color: true },
        },
      },
    })

    res.json(formatEvent(event))
  })
)

export default router
