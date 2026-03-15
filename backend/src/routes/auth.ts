import { Router } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { asyncHandler, AppError } from '../lib/errors'
import { setSession, removeSession, getSessionUserId } from '../middleware/auth'

const router = Router()

function formatUser(user: {
  id: string
  display_name: string
  role: string
  avatar_emoji: string
  staff_id: string | null
  is_active: boolean
}) {
  return {
    id: user.id,
    displayName: user.display_name,
    role: user.role,
    avatarEmoji: user.avatar_emoji,
    staffId: user.staff_id,
    isActive: user.is_active,
  }
}

function extractToken(authHeader: string | undefined): string {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(401, 'Non authentifie')
  }
  return authHeader.slice(7)
}

// POST /login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { pinCode, userId } = req.body

    if (!pinCode) {
      throw new AppError(400, 'Code PIN requis')
    }

    const where: Record<string, unknown> = { is_active: true }
    if (userId) {
      where.id = userId
    }

    const candidates = await prisma.userProfile.findMany({ where })

    let user: (typeof candidates)[0] | null = null
    for (const candidate of candidates) {
      if (await bcrypt.compare(pinCode, candidate.pin_code)) {
        user = candidate
        break
      }
    }

    if (!user) {
      throw new AppError(401, 'Code PIN invalide')
    }

    const token = crypto.randomUUID()
    await setSession(token, user.id)

    // Update last_login
    await prisma.userProfile.update({
      where: { id: user.id },
      data: { last_login: new Date().toISOString() },
    })

    res.json({
      token,
      user: formatUser(user),
    })
  })
)

// POST /logout
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const token = extractToken(req.headers.authorization)
    await removeSession(token)
    res.json({ ok: true })
  })
)

// GET /me
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const token = extractToken(req.headers.authorization)
    const userId = await getSessionUserId(token)

    if (!userId) {
      throw new AppError(401, 'Session invalide')
    }

    const user = await prisma.userProfile.findUnique({
      where: { id: userId },
    })

    if (!user || !user.is_active) {
      await removeSession(token)
      throw new AppError(401, 'Utilisateur inactif')
    }

    res.json({ user: formatUser(user) })
  })
)

export default router
