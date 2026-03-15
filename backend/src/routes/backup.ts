import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { asyncHandler, AppError, nowISO } from '../lib/errors'
import fs from 'fs'
import path from 'path'

const router = Router()

// ---------- Table order (dependency-safe) ----------

// Insert order: parents first, then children
const TABLE_INSERT_ORDER = [
  'products',
  'suppliers',
  'staff',
  'recipes',
  'temperatureEquipment',
  'userProfiles',
  'outputs',
  'deliveries',
  'recipeIngredients',
  'menus',
  'menuRecipes',
  'temperatureReadings',
  'traceabilityPhotos',
  'scheduleEvents',
  'userPermissions',
  'activityLog',
  'pushTokens',
  'recurringOutputConfigs',
  'dailyRecurringOutputs',
] as const

// Delete order: reverse of insert (children first)
const TABLE_DELETE_ORDER = [...TABLE_INSERT_ORDER].reverse()

// Mapping from backup key to Prisma model delegate name
type PrismaModels = {
  [K: string]: {
    findMany: () => Promise<any[]>
    deleteMany: () => Promise<any>
    createMany: (args: { data: any[] }) => Promise<any>
  }
}

function getModelDelegate(key: string): any {
  const map: Record<string, keyof typeof prisma> = {
    products: 'product',
    suppliers: 'supplier',
    staff: 'staff',
    recipes: 'recipe',
    temperatureEquipment: 'temperatureEquipment',
    userProfiles: 'userProfile',
    outputs: 'output',
    deliveries: 'delivery',
    recipeIngredients: 'recipeIngredient',
    menus: 'menu',
    menuRecipes: 'menuRecipe',
    temperatureReadings: 'temperatureReading',
    traceabilityPhotos: 'traceabilityPhoto',
    scheduleEvents: 'scheduleEvent',
    userPermissions: 'userPermission',
    activityLog: 'activityLog',
    pushTokens: 'pushToken',
    recurringOutputConfigs: 'recurringOutputConfig',
    dailyRecurringOutputs: 'dailyRecurringOutput',
  }

  const modelName = map[key]
  if (!modelName) return null
  return (prisma as any)[modelName]
}

// ---------- Routes ----------

// GET /export — full database export as JSON download
router.get(
  '/export',
  asyncHandler(async (_req, res) => {
    const backup: Record<string, any[]> = {}

    for (const table of TABLE_INSERT_ORDER) {
      const delegate = getModelDelegate(table)
      if (delegate) {
        backup[table] = await delegate.findMany()
      }
    }

    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `stockpro-backup-${dateStr}.json`

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.json(backup)
  })
)

// POST /import — restore database from JSON backup
router.post(
  '/import',
  asyncHandler(async (req, res) => {
    const data = req.body

    if (!data || typeof data !== 'object') {
      throw new AppError(400, 'Corps JSON invalide')
    }

    await prisma.$transaction(async (tx) => {
      // Delete in reverse dependency order (children first)
      for (const table of TABLE_DELETE_ORDER) {
        const modelName = getModelDelegateName(table)
        if (modelName && data[table]) {
          await (tx as any)[modelName].deleteMany()
        }
      }

      // Insert in dependency order (parents first)
      for (const table of TABLE_INSERT_ORDER) {
        const modelName = getModelDelegateName(table)
        if (modelName && data[table] && Array.isArray(data[table]) && data[table].length > 0) {
          await (tx as any)[modelName].createMany({ data: data[table] })
        }
      }
    })

    res.json({ ok: true, message: 'Import termine avec succes' })
  })
)

// Helper to get the Prisma delegate name for use inside transactions
function getModelDelegateName(key: string): string | null {
  const map: Record<string, string> = {
    products: 'product',
    suppliers: 'supplier',
    staff: 'staff',
    recipes: 'recipe',
    temperatureEquipment: 'temperatureEquipment',
    userProfiles: 'userProfile',
    outputs: 'output',
    deliveries: 'delivery',
    recipeIngredients: 'recipeIngredient',
    menus: 'menu',
    menuRecipes: 'menuRecipe',
    temperatureReadings: 'temperatureReading',
    traceabilityPhotos: 'traceabilityPhoto',
    scheduleEvents: 'scheduleEvent',
    userPermissions: 'userPermission',
    activityLog: 'activityLog',
    pushTokens: 'pushToken',
    recurringOutputConfigs: 'recurringOutputConfig',
    dailyRecurringOutputs: 'dailyRecurringOutput',
  }
  return map[key] ?? null
}

// GET /size — database and uploads directory sizes
router.get(
  '/size',
  asyncHandler(async (_req, res) => {
    // SQLite database file path (relative to where the process runs)
    const dbPath = path.resolve(process.cwd(), 'prisma', 'data', 'stockpro.db')
    let dbSize = 0
    try {
      const stat = fs.statSync(dbPath)
      dbSize = stat.size
    } catch {
      // File may not exist yet
      dbSize = 0
    }

    // Uploads directory
    const uploadsDir = path.resolve(process.cwd(), 'uploads')
    let uploadsSize = 0
    try {
      uploadsSize = getDirSize(uploadsDir)
    } catch {
      uploadsSize = 0
    }

    res.json({
      dbSize,
      uploadsSize,
      total: dbSize + uploadsSize,
    })
  })
)

// Recursively compute directory size in bytes
function getDirSize(dirPath: string): number {
  let size = 0

  if (!fs.existsSync(dirPath)) return 0

  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      size += getDirSize(fullPath)
    } else {
      size += fs.statSync(fullPath).size
    }
  }

  return size
}

export default router
