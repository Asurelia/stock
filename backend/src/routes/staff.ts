import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { asyncHandler, AppError, nowISO } from '../lib/errors'

const router = Router()

function formatStaff(s: {
  id: string
  first_name: string
  last_name: string
  role: string
  email: string
  phone: string
  color: string
  avatar_url: string
  contract_hours: number
  is_active: boolean
  signature_data: string
  pin_code: string
  staff_group: string
  work_days_week1: string
  work_days_week2: string
  created_at: string
}) {
  return {
    id: s.id,
    firstName: s.first_name,
    lastName: s.last_name,
    role: s.role,
    email: s.email,
    phone: s.phone,
    color: s.color,
    avatarUrl: s.avatar_url,
    contractHours: s.contract_hours,
    isActive: s.is_active,
    signatureData: s.signature_data,
    pinCode: s.pin_code,
    staffGroup: s.staff_group,
    workDaysWeek1: JSON.parse(s.work_days_week1 || '[]'),
    workDaysWeek2: JSON.parse(s.work_days_week2 || '[]'),
    createdAt: s.created_at,
  }
}

// GET /
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const staff = await prisma.staff.findMany({
      orderBy: { last_name: 'asc' },
    })

    res.json(staff.map(formatStaff))
  })
)

// GET /:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const staff = await prisma.staff.findUnique({
      where: { id: req.params.id as string },
    })

    if (!staff) {
      throw new AppError(404, 'Membre du personnel non trouve')
    }

    res.json(formatStaff(staff))
  })
)

// POST /
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const {
      firstName,
      lastName,
      role,
      email,
      phone,
      color,
      avatarUrl,
      contractHours,
      isActive,
      signatureData,
      pinCode,
      staffGroup,
      workDaysWeek1,
      workDaysWeek2,
    } = req.body

    const staff = await prisma.staff.create({
      data: {
        first_name: firstName ?? '',
        last_name: lastName ?? '',
        role: role ?? '',
        email: email ?? '',
        phone: phone ?? '',
        color: color ?? '',
        avatar_url: avatarUrl ?? '',
        contract_hours: contractHours ?? 35,
        is_active: isActive ?? true,
        signature_data: signatureData ?? '',
        pin_code: pinCode ?? '',
        staff_group: staffGroup ?? 'week1',
        work_days_week1: JSON.stringify(workDaysWeek1 ?? []),
        work_days_week2: JSON.stringify(workDaysWeek2 ?? []),
        created_at: nowISO(),
      },
    })

    res.status(201).json(formatStaff(staff))
  })
)

// PATCH /:id
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string
    const {
      firstName,
      lastName,
      role,
      email,
      phone,
      color,
      avatarUrl,
      contractHours,
      isActive,
      signatureData,
      pinCode,
      staffGroup,
      workDaysWeek1,
      workDaysWeek2,
    } = req.body

    const existing = await prisma.staff.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError(404, 'Membre du personnel non trouve')
    }

    const data: Record<string, unknown> = {}
    if (firstName !== undefined) data.first_name = firstName
    if (lastName !== undefined) data.last_name = lastName
    if (role !== undefined) data.role = role
    if (email !== undefined) data.email = email
    if (phone !== undefined) data.phone = phone
    if (color !== undefined) data.color = color
    if (avatarUrl !== undefined) data.avatar_url = avatarUrl
    if (contractHours !== undefined) data.contract_hours = contractHours
    if (isActive !== undefined) data.is_active = isActive
    if (signatureData !== undefined) data.signature_data = signatureData
    if (pinCode !== undefined) data.pin_code = pinCode
    if (staffGroup !== undefined) data.staff_group = staffGroup
    if (workDaysWeek1 !== undefined) data.work_days_week1 = JSON.stringify(workDaysWeek1)
    if (workDaysWeek2 !== undefined) data.work_days_week2 = JSON.stringify(workDaysWeek2)

    const staff = await prisma.staff.update({
      where: { id },
      data,
    })

    res.json(formatStaff(staff))
  })
)

// DELETE /:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string

    const existing = await prisma.staff.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError(404, 'Membre du personnel non trouve')
    }

    await prisma.staff.delete({ where: { id } })

    res.json({ ok: true })
  })
)

export default router
