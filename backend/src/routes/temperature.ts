import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { asyncHandler, AppError, nowISO } from '../lib/errors'

const router = Router()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatEquipment(e: any) {
  return {
    id: e.id,
    name: e.name,
    type: e.type,
    location: e.location,
    minTemp: e.min_temp,
    maxTemp: e.max_temp,
    isActive: e.is_active,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  }
}

function formatReading(r: any) {
  return {
    id: r.id,
    equipmentId: r.equipment_id,
    temperature: r.temperature,
    isCompliant: r.is_compliant,
    recordedBy: r.recorded_by,
    notes: r.notes,
    recordedAt: r.recorded_at,
    createdAt: r.created_at,
    equipment: r.equipment
      ? { name: r.equipment.name, type: r.equipment.type }
      : undefined,
  }
}

// ===========================================================================
// EQUIPMENT
// ===========================================================================

// ---------------------------------------------------------------------------
// GET /equipment — list all equipment
// ---------------------------------------------------------------------------
router.get(
  '/equipment',
  asyncHandler(async (_req, res) => {
    const equipment = await prisma.temperatureEquipment.findMany({
      orderBy: { name: 'asc' },
    })
    res.json(equipment.map(formatEquipment))
  })
)

// ---------------------------------------------------------------------------
// GET /equipment/:id — single equipment
// ---------------------------------------------------------------------------
router.get(
  '/equipment/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string

    const equipment = await prisma.temperatureEquipment.findUnique({
      where: { id },
    })

    if (!equipment) {
      throw new AppError(404, 'Equipement non trouve')
    }

    res.json(formatEquipment(equipment))
  })
)

// ---------------------------------------------------------------------------
// POST /equipment — create equipment
// ---------------------------------------------------------------------------
router.post(
  '/equipment',
  asyncHandler(async (req, res) => {
    const { name, type, location, minTemp, maxTemp } = req.body

    if (!name) {
      throw new AppError(400, 'name requis')
    }

    const equipment = await prisma.temperatureEquipment.create({
      data: {
        name,
        type: type ?? '',
        location: location ?? '',
        min_temp: minTemp ?? 0,
        max_temp: maxTemp ?? 10,
        is_active: true,
        created_at: nowISO(),
        updated_at: nowISO(),
      },
    })

    res.status(201).json(formatEquipment(equipment))
  })
)

// ---------------------------------------------------------------------------
// PATCH /equipment/:id — update equipment
// ---------------------------------------------------------------------------
router.patch(
  '/equipment/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string
    const { name, type, location, minTemp, maxTemp, isActive } = req.body

    const data: Record<string, unknown> = { updated_at: nowISO() }
    if (name !== undefined) data.name = name
    if (type !== undefined) data.type = type
    if (location !== undefined) data.location = location
    if (minTemp !== undefined) data.min_temp = minTemp
    if (maxTemp !== undefined) data.max_temp = maxTemp
    if (isActive !== undefined) data.is_active = isActive

    const equipment = await prisma.temperatureEquipment.update({
      where: { id },
      data,
    })

    res.json(formatEquipment(equipment))
  })
)

// ---------------------------------------------------------------------------
// DELETE /equipment/:id — delete equipment
// ---------------------------------------------------------------------------
router.delete(
  '/equipment/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string
    await prisma.temperatureEquipment.delete({ where: { id } })
    res.json({ ok: true })
  })
)

// ===========================================================================
// READINGS
// ===========================================================================

// ---------------------------------------------------------------------------
// GET /readings — list readings with optional filters
// ---------------------------------------------------------------------------
router.get(
  '/readings',
  asyncHandler(async (req, res) => {
    const { equipmentId, from, to, limit } = req.query

    const where: Record<string, unknown> = {}

    if (equipmentId) {
      where.equipment_id = equipmentId as string
    }

    if (from || to) {
      const recorded_at: Record<string, string> = {}
      if (from) recorded_at.gte = from as string
      if (to) recorded_at.lte = to as string
      where.recorded_at = recorded_at
    }

    const take = limit ? parseInt(limit as string, 10) : 50

    const readings = await prisma.temperatureReading.findMany({
      where,
      orderBy: { recorded_at: 'desc' },
      take,
      include: {
        equipment: { select: { name: true, type: true } },
      },
    })

    res.json(readings.map(formatReading))
  })
)

// ---------------------------------------------------------------------------
// GET /readings/latest/:equipmentId — latest reading for equipment
// ---------------------------------------------------------------------------
router.get(
  '/readings/latest/:equipmentId',
  asyncHandler(async (req, res) => {
    const equipmentId = req.params.equipmentId as string

    const reading = await prisma.temperatureReading.findFirst({
      where: { equipment_id: equipmentId },
      orderBy: { recorded_at: 'desc' },
      include: {
        equipment: { select: { name: true, type: true } },
      },
    })

    if (!reading) {
      throw new AppError(404, 'Aucun releve trouve')
    }

    res.json(formatReading(reading))
  })
)

// ---------------------------------------------------------------------------
// POST /readings — create reading
// ---------------------------------------------------------------------------
router.post(
  '/readings',
  asyncHandler(async (req, res) => {
    const { equipmentId, temperature, isCompliant, recordedBy, notes, recordedAt } =
      req.body

    if (!equipmentId) {
      throw new AppError(400, 'equipmentId requis')
    }
    if (temperature === undefined || temperature === null) {
      throw new AppError(400, 'temperature requis')
    }

    const reading = await prisma.temperatureReading.create({
      data: {
        equipment_id: equipmentId,
        temperature,
        is_compliant: isCompliant ?? true,
        recorded_by: recordedBy ?? '',
        notes: notes ?? '',
        recorded_at: recordedAt ?? nowISO(),
        created_at: nowISO(),
      },
      include: {
        equipment: { select: { name: true, type: true } },
      },
    })

    res.status(201).json(formatReading(reading))
  })
)

export default router
