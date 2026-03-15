import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'

function expiresAt(): string {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString()
}

export async function setSession(token: string, userId: string): Promise<void> {
  await prisma.session.create({
    data: {
      token,
      user_profile_id: userId,
      created_at: new Date().toISOString(),
      expires_at: expiresAt(),
    },
  })
}

export async function getSessionUserId(token: string): Promise<string | undefined> {
  const session = await prisma.session.findUnique({ where: { token } })
  if (!session) return undefined
  if (session.expires_at && session.expires_at < new Date().toISOString()) {
    await prisma.session.delete({ where: { token } })
    return undefined
  }
  return session.user_profile_id
}

export async function removeSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } })
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Non authentifié' })
    return
  }

  const token = authHeader.slice(7)
  const session = await prisma.session.findUnique({ where: { token } })
  if (!session) {
    res.status(401).json({ error: 'Session invalide' })
    return
  }
  if (session.expires_at && session.expires_at < new Date().toISOString()) {
    await prisma.session.delete({ where: { token } })
    res.status(401).json({ error: 'Session expirée' })
    return
  }

  const userId = session.user_profile_id
  const user = await prisma.userProfile.findUnique({ where: { id: userId } })
  if (!user || !user.is_active) {
    await prisma.session.deleteMany({ where: { token } })
    res.status(401).json({ error: 'Utilisateur inactif' })
    return
  }

  ;(req as any).userId = userId
  ;(req as any).userRole = user.role
  next()
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  next()
}
