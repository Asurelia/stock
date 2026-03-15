import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { asyncHandler, AppError, nowISO } from '../lib/errors'

const router = Router()

// ---------- Helpers ----------

function formatLog(log: {
  id: string
  user_profile_id: string | null
  action: string
  entity_type: string
  entity_id: string
  details: string
  created_at: string
  user_profile?: { display_name: string } | null
}) {
  return {
    id: log.id,
    userProfileId: log.user_profile_id,
    action: log.action,
    entityType: log.entity_type,
    entityId: log.entity_id,
    details: log.details,
    createdAt: log.created_at,
    displayName: log.user_profile?.display_name ?? null,
  }
}

// ---------- Routes ----------

// POST / — create an activity log entry
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const userId = (req as any).userId as string | undefined
    const { action, entityType, entityId, details } = req.body

    if (!action || !entityType) {
      throw new AppError(400, 'action et entityType requis')
    }

    const log = await prisma.activityLog.create({
      data: {
        user_profile_id: userId ?? null,
        action,
        entity_type: entityType,
        entity_id: entityId ?? '',
        details: typeof details === 'object' ? JSON.stringify(details) : (details ?? '{}'),
        created_at: nowISO(),
      },
    })

    res.status(201).json(formatLog(log))
  })
)

// GET / — query by single date or date range (from+to)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { date, from, to } = req.query as {
      date?: string
      from?: string
      to?: string
    }

    const where: Record<string, unknown> = {}

    if (date) {
      // Single day filter
      where.created_at = {
        gte: `${date}T00:00:00`,
        lte: `${date}T23:59:59`,
      }
    } else if (from && to) {
      // Range filter
      where.created_at = {
        gte: from,
        lte: to,
      }
    }

    const logs = await prisma.activityLog.findMany({
      where,
      include: { user_profile: { select: { display_name: true } } },
      orderBy: { created_at: 'desc' },
    })

    res.json(logs.map(formatLog))
  })
)

export default router
