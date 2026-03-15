import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { asyncHandler, AppError, nowISO } from '../lib/errors'

const router = Router()

function formatProfile(p: {
  id: string
  staff_id: string | null
  display_name: string
  role: string
  avatar_emoji: string
  last_login: string
  preferences: string
  pin_code: string // stored as bcrypt hash, never exposed
  is_active: boolean
  created_at: string
  staff?: { first_name: string; last_name: string } | null
}) {
  return {
    id: p.id,
    staffId: p.staff_id,
    displayName: p.display_name,
    role: p.role,
    avatarEmoji: p.avatar_emoji,
    lastLogin: p.last_login,
    preferences: JSON.parse(p.preferences || '{}'),
    isActive: p.is_active,
    createdAt: p.created_at,
    staffName: p.staff
      ? `${p.staff.first_name} ${p.staff.last_name}`.trim()
      : null,
  }
}

// GET /
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const profiles = await prisma.userProfile.findMany({
      orderBy: { display_name: 'asc' },
      include: {
        staff: {
          select: { first_name: true, last_name: true },
        },
      },
    })

    res.json(profiles.map(formatProfile))
  })
)

// GET /:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const profile = await prisma.userProfile.findUnique({
      where: { id: req.params.id as string },
      include: {
        staff: {
          select: { first_name: true, last_name: true },
        },
      },
    })

    if (!profile) {
      throw new AppError(404, 'Profil utilisateur non trouve')
    }

    res.json(formatProfile(profile))
  })
)

// POST /
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const {
      staffId,
      displayName,
      role,
      avatarEmoji,
      preferences,
      pinCode,
      isActive,
    } = req.body

    const profile = await prisma.userProfile.create({
      data: {
        staff_id: staffId ?? null,
        display_name: displayName ?? '',
        role: role ?? 'user',
        avatar_emoji: avatarEmoji ?? '',
        preferences:
          typeof preferences === 'object'
            ? JSON.stringify(preferences)
            : preferences ?? '{}',
        pin_code: pinCode ? await bcrypt.hash(pinCode, 10) : '',
        is_active: isActive ?? true,
        created_at: nowISO(),
      },
      include: {
        staff: {
          select: { first_name: true, last_name: true },
        },
      },
    })

    res.status(201).json(formatProfile(profile))
  })
)

// PATCH /:id
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string
    const {
      staffId,
      displayName,
      role,
      avatarEmoji,
      preferences,
      pinCode,
      isActive,
    } = req.body

    const existing = await prisma.userProfile.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError(404, 'Profil utilisateur non trouve')
    }

    const data: Record<string, unknown> = {}
    if (staffId !== undefined) data.staff_id = staffId
    if (displayName !== undefined) data.display_name = displayName
    if (role !== undefined) data.role = role
    if (avatarEmoji !== undefined) data.avatar_emoji = avatarEmoji
    if (preferences !== undefined) {
      data.preferences =
        typeof preferences === 'object'
          ? JSON.stringify(preferences)
          : preferences
    }
    if (pinCode !== undefined) data.pin_code = await bcrypt.hash(pinCode, 10)
    if (isActive !== undefined) data.is_active = isActive

    const profile = await prisma.userProfile.update({
      where: { id },
      data,
      include: {
        staff: {
          select: { first_name: true, last_name: true },
        },
      },
    })

    res.json(formatProfile(profile))
  })
)

// DELETE /:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string

    const existing = await prisma.userProfile.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError(404, 'Profil utilisateur non trouve')
    }

    await prisma.userProfile.delete({ where: { id } })

    res.json({ ok: true })
  })
)

// PATCH /:id/last-login
router.patch(
  '/:id/last-login',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string

    const existing = await prisma.userProfile.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError(404, 'Profil utilisateur non trouve')
    }

    const profile = await prisma.userProfile.update({
      where: { id },
      data: { last_login: nowISO() },
      include: {
        staff: {
          select: { first_name: true, last_name: true },
        },
      },
    })

    res.json(formatProfile(profile))
  })
)

export default router
