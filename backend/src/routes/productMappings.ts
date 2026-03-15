import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { asyncHandler, AppError, nowISO } from '../lib/errors'

const router = Router()

// GET / — get all mappings, optionally filter by supplierId
router.get('/', asyncHandler(async (req, res) => {
  const { supplierId } = req.query
  const where: any = {}
  if (supplierId) where.supplier_id = supplierId as string

  const mappings = await prisma.productMapping.findMany({
    where,
    include: { product: { select: { id: true, name: true, category: true, unit: true } }, supplier: { select: { id: true, name: true } } },
    orderBy: { usage_count: 'desc' },
  })

  res.json(mappings.map(m => ({
    id: m.id,
    externalName: m.external_name,
    productId: m.product_id,
    productName: m.product.name,
    productCategory: m.product.category,
    productUnit: m.product.unit,
    supplierId: m.supplier_id,
    supplierName: m.supplier?.name || null,
    confidence: m.confidence,
    usageCount: m.usage_count,
  })))
}))

// POST /match — Given an array of external names + optional supplierId, return matches
router.post('/match', asyncHandler(async (req, res) => {
  const { names, supplierId }: { names: string[]; supplierId?: string } = req.body
  if (!names?.length) throw new AppError(400, 'names array required')

  // Get all mappings for this supplier (or all if no supplier)
  const allMappings = await prisma.productMapping.findMany({
    where: supplierId ? { supplier_id: supplierId } : {},
    include: { product: { select: { id: true, name: true, unit: true, category: true } } },
  })

  // Get all products for fuzzy matching
  const allProducts = await prisma.product.findMany({ select: { id: true, name: true, unit: true, category: true } })

  const results = names.map(name => {
    const normalized = name.toLowerCase().trim()

    // 1. Exact mapping match
    const exactMapping = allMappings.find(m => m.external_name.toLowerCase() === normalized)
    if (exactMapping) {
      return {
        externalName: name,
        matched: true,
        source: 'memory',
        productId: exactMapping.product_id,
        productName: exactMapping.product.name,
        productUnit: exactMapping.product.unit,
        confidence: exactMapping.confidence,
        mappingId: exactMapping.id,
      }
    }

    // 2. Fuzzy match against existing products (simple includes check)
    const fuzzyMatch = allProducts.find(p => {
      const pName = p.name.toLowerCase()
      return pName === normalized || pName.includes(normalized) || normalized.includes(pName)
    })
    if (fuzzyMatch) {
      return {
        externalName: name,
        matched: true,
        source: 'fuzzy',
        productId: fuzzyMatch.id,
        productName: fuzzyMatch.name,
        productUnit: fuzzyMatch.unit,
        confidence: 0.7,
        mappingId: null,
      }
    }

    // 3. No match
    return {
      externalName: name,
      matched: false,
      source: 'none',
      productId: null,
      productName: null,
      productUnit: null,
      confidence: 0,
      mappingId: null,
    }
  })

  res.json(results)
}))

// POST /learn — Save a mapping (external name → product)
router.post('/learn', asyncHandler(async (req, res) => {
  const { externalName, productId, supplierId } = req.body
  if (!externalName || !productId) throw new AppError(400, 'externalName et productId requis')

  // Upsert: if mapping exists, increment usage_count
  const existing = await prisma.productMapping.findFirst({
    where: { external_name: externalName.toLowerCase().trim(), supplier_id: supplierId || null },
  })

  if (existing) {
    const updated = await prisma.productMapping.update({
      where: { id: existing.id },
      data: {
        product_id: productId,
        usage_count: existing.usage_count + 1,
        confidence: Math.min(1.0, existing.confidence + 0.05),
        updated_at: nowISO(),
      },
    })
    res.json({ id: updated.id, learned: true, usageCount: updated.usage_count })
  } else {
    const created = await prisma.productMapping.create({
      data: {
        external_name: externalName.toLowerCase().trim(),
        product_id: productId,
        supplier_id: supplierId || null,
        confidence: 0.8,
        usage_count: 1,
        created_at: nowISO(),
        updated_at: nowISO(),
      },
    })
    res.json({ id: created.id, learned: true, usageCount: 1 })
  }
}))

// DELETE /:id — Remove a mapping
router.delete('/:id', asyncHandler(async (req, res) => {
  await prisma.productMapping.delete({ where: { id: req.params.id as string } })
  res.json({ ok: true })
}))

export default router
