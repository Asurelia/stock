import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { asyncHandler, AppError, nowISO } from '../lib/errors'

const router = Router()

// ---------- Permission keys ----------

const ALL_PERMISSION_KEYS = [
  'page_products',
  'page_outputs',
  'page_deliveries',
  'page_suppliers',
  'page_temperatures',
  'page_recipes',
  'page_menus',
  'page_production',
  'page_traceability',
  'page_planning',
  'page_analytics',
  'action_create_output',
  'action_delete_output',
  'action_record_temperature',
  'action_create_delivery',
  'action_manage_products',
  'action_manage_recipes',
  'action_manage_menus',
  'action_manage_planning',
] as const

type PermissionKey = (typeof ALL_PERMISSION_KEYS)[number]

// ---------- Role defaults ----------

function getRoleDefaults(role: string): Record<PermissionKey, boolean> {
  const base: Record<PermissionKey, boolean> = Object.fromEntries(
    ALL_PERMISSION_KEYS.map((k) => [k, false])
  ) as Record<PermissionKey, boolean>

  if (role === 'gerant') {
    for (const k of ALL_PERMISSION_KEYS) base[k] = true
    return base
  }

  if (role === 'cuisinier') {
    base.page_outputs = true
    base.page_temperatures = true
    base.page_recipes = true
    base.page_menus = true
    base.page_traceability = true
    base.page_planning = true
    base.action_create_output = true
    base.action_record_temperature = true
    return base
  }

  if (role === 'plongeur') {
    base.page_outputs = true
    base.page_temperatures = true
    base.action_create_output = true
    base.action_record_temperature = true
    return base
  }

  return base
}

// ---------- Helpers ----------

function mergePermissions(
  role: string,
  overrides: { permission_key: string; is_enabled: boolean }[]
): Record<string, boolean> {
  const defaults = getRoleDefaults(role)
  const merged: Record<string, boolean> = { ...defaults }

  for (const o of overrides) {
    if (ALL_PERMISSION_KEYS.includes(o.permission_key as PermissionKey)) {
      merged[o.permission_key] = o.is_enabled
    }
  }

  return merged
}

function formatUser(
  user: {
    id: string
    display_name: string
    role: string
    avatar_emoji: string
    is_active: boolean
    permissions: { permission_key: string; is_enabled: boolean }[]
  }
) {
  return {
    id: user.id,
    displayName: user.display_name,
    role: user.role,
    avatarEmoji: user.avatar_emoji,
    isActive: user.is_active,
    permissions: mergePermissions(user.role, user.permissions),
  }
}

// ---------- Routes ----------

// GET /users — all users with merged permissions
router.get(
  '/users',
  asyncHandler(async (_req, res) => {
    const users = await prisma.userProfile.findMany({
      include: { permissions: true },
      orderBy: { display_name: 'asc' },
    })

    res.json(users.map(formatUser))
  })
)

// GET /users/:userId — single user with merged permissions
router.get(
  '/users/:userId',
  asyncHandler(async (req, res) => {
    const user = await prisma.userProfile.findUnique({
      where: { id: req.params.userId as string },
      include: { permissions: true },
    })

    if (!user) {
      throw new AppError(404, 'Utilisateur non trouve')
    }

    res.json(formatUser(user))
  })
)

// PATCH /users/:userId/permission — upsert a single permission
router.patch(
  '/users/:userId/permission',
  asyncHandler(async (req, res) => {
    const userId = req.params.userId as string
    const { permissionKey, isEnabled } = req.body

    if (!permissionKey || typeof isEnabled !== 'boolean') {
      throw new AppError(400, 'permissionKey (string) et isEnabled (boolean) requis')
    }

    const user = await prisma.userProfile.findUnique({ where: { id: userId } })
    if (!user) {
      throw new AppError(404, 'Utilisateur non trouve')
    }

    const existing = await prisma.userPermission.findFirst({
      where: { user_profile_id: userId, permission_key: permissionKey },
    })

    let permission
    if (existing) {
      permission = await prisma.userPermission.update({
        where: { id: existing.id },
        data: { is_enabled: isEnabled },
      })
    } else {
      permission = await prisma.userPermission.create({
        data: {
          user_profile_id: userId,
          permission_key: permissionKey,
          is_enabled: isEnabled,
        },
      })
    }

    res.json({
      id: permission.id,
      userProfileId: permission.user_profile_id,
      permissionKey: permission.permission_key,
      isEnabled: permission.is_enabled,
    })
  })
)

// PUT /users/:userId/permissions — bulk upsert all permissions
router.put(
  '/users/:userId/permissions',
  asyncHandler(async (req, res) => {
    const userId = req.params.userId as string
    const { permissions } = req.body as { permissions: Record<string, boolean> }

    if (!permissions || typeof permissions !== 'object') {
      throw new AppError(400, 'permissions (Record<string, boolean>) requis')
    }

    const user = await prisma.userProfile.findUnique({ where: { id: userId } })
    if (!user) {
      throw new AppError(404, 'Utilisateur non trouve')
    }

    await prisma.$transaction(async (tx) => {
      for (const [key, enabled] of Object.entries(permissions)) {
        const existing = await tx.userPermission.findFirst({
          where: { user_profile_id: userId, permission_key: key },
        })

        if (existing) {
          await tx.userPermission.update({
            where: { id: existing.id },
            data: { is_enabled: enabled },
          })
        } else {
          await tx.userPermission.create({
            data: {
              user_profile_id: userId,
              permission_key: key,
              is_enabled: enabled,
            },
          })
        }
      }
    })

    // Return the updated user with merged permissions
    const updated = await prisma.userProfile.findUnique({
      where: { id: userId },
      include: { permissions: true },
    })

    res.json(formatUser(updated!))
  })
)

// PATCH /users/:userId/status — toggle active status
router.patch(
  '/users/:userId/status',
  asyncHandler(async (req, res) => {
    const userId = req.params.userId as string
    const { isActive } = req.body

    if (typeof isActive !== 'boolean') {
      throw new AppError(400, 'isActive (boolean) requis')
    }

    const user = await prisma.userProfile.findUnique({ where: { id: userId } })
    if (!user) {
      throw new AppError(404, 'Utilisateur non trouve')
    }

    const updated = await prisma.userProfile.update({
      where: { id: userId },
      data: { is_active: isActive },
    })

    res.json({
      id: updated.id,
      displayName: updated.display_name,
      role: updated.role,
      avatarEmoji: updated.avatar_emoji,
      isActive: updated.is_active,
    })
  })
)

export default router
