import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { prisma } from '../lib/prisma'
import { asyncHandler, AppError, nowISO } from '../lib/errors'

const router = Router()

// ---------------------------------------------------------------------------
// Multer configuration — disk storage in /backend/uploads
// ---------------------------------------------------------------------------

const uploadsDir = path.join(__dirname, '../../uploads')

// Ensure the uploads directory exists at startup
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`)
  },
})

const upload = multer({ storage })

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPhoto(p: any) {
  return {
    id: p.id,
    outputId: p.output_id,
    storagePath: p.storage_path,
    url: p.url,
    capturedAt: p.captured_at,
    notes: p.notes,
    createdAt: p.created_at,
    output: p.output
      ? {
          id: p.output.id,
          productId: p.output.product_id,
          quantity: p.output.quantity,
          reason: p.output.reason,
          product: p.output.product
            ? { id: p.output.product.id, name: p.output.product.name }
            : undefined,
        }
      : undefined,
  }
}

// ---------------------------------------------------------------------------
// POST /photos — upload a traceability photo
// ---------------------------------------------------------------------------
router.post(
  '/photos',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError(400, 'Fichier requis')
    }

    const { outputId, notes } = req.body

    if (!outputId) {
      throw new AppError(400, 'outputId requis')
    }

    // Verify the output exists
    const output = await prisma.output.findUnique({ where: { id: outputId } })
    if (!output) {
      throw new AppError(404, 'Output non trouve')
    }

    const filename = req.file.filename

    const photo = await prisma.traceabilityPhoto.create({
      data: {
        output_id: outputId,
        storage_path: filename,
        url: `/uploads/${filename}`,
        captured_at: nowISO(),
        notes: notes ?? '',
        created_at: nowISO(),
      },
    })

    res.status(201).json(formatPhoto(photo))
  })
)

// ---------------------------------------------------------------------------
// GET /photos — list photos with optional filters
// ---------------------------------------------------------------------------
router.get(
  '/photos',
  asyncHandler(async (req, res) => {
    const { outputId, from, to } = req.query

    const where: Record<string, unknown> = {}

    if (outputId) {
      where.output_id = outputId as string
    }

    if (from || to) {
      const captured_at: Record<string, string> = {}
      if (from) captured_at.gte = from as string
      if (to) captured_at.lte = to as string
      where.captured_at = captured_at
    }

    const photos = await prisma.traceabilityPhoto.findMany({
      where,
      orderBy: { captured_at: 'desc' },
      include: {
        output: {
          include: {
            product: { select: { id: true, name: true } },
          },
        },
      },
    })

    res.json(photos.map(formatPhoto))
  })
)

// ---------------------------------------------------------------------------
// DELETE /photos/:id — delete photo (file + DB record)
// ---------------------------------------------------------------------------
router.delete(
  '/photos/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string

    const photo = await prisma.traceabilityPhoto.findUnique({
      where: { id },
    })

    if (!photo) {
      throw new AppError(404, 'Photo non trouvee')
    }

    // Remove file from disk (ignore error if already deleted)
    const filePath = path.join(uploadsDir, photo.storage_path)
    try {
      fs.unlinkSync(filePath)
    } catch {
      // File may already be missing — continue with DB cleanup
    }

    await prisma.traceabilityPhoto.delete({ where: { id } })

    res.json({ ok: true })
  })
)

export default router
