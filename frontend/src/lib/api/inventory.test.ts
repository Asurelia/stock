import { describe, it, expect, beforeEach } from 'vitest'
import { inventoryApi } from './inventory'
import { db, clearAllCache, generateId, nowISO } from '../offline/db'

describe('inventoryApi', () => {
    beforeEach(async () => {
        await clearAllCache()
    })

    describe('suppliers', () => {
        it('creates a supplier with snake_case storage', async () => {
            const supplier = await inventoryApi.suppliers.create({
                name: 'Metro',
                category: 'epicerie',
                phone: '0123456789',
                email: 'contact@metro.fr',
                contact: 'Jean',
                notes: 'Livraison mardi',
                logoUrl: '',
                orderDays: ['lundi', 'mercredi'],
                deliveryDays: ['mardi', 'jeudi'],
            })

            expect(supplier.id).toBeDefined()
            expect(supplier.name).toBe('Metro')
            expect(supplier.orderDays).toEqual(['lundi', 'mercredi'])

            // Verify snake_case in DB
            const raw = await db.suppliers.get(supplier.id)
            expect(raw.order_days).toBe(JSON.stringify(['lundi', 'mercredi']))
        })

        it('getAll returns suppliers ordered by name', async () => {
            await inventoryApi.suppliers.create({ name: 'Zeta', category: 'autre', phone: '', email: '', contact: '', notes: '', logoUrl: '', orderDays: [], deliveryDays: [] })
            await inventoryApi.suppliers.create({ name: 'Alpha', category: 'autre', phone: '', email: '', contact: '', notes: '', logoUrl: '', orderDays: [], deliveryDays: [] })

            const all = await inventoryApi.suppliers.getAll()
            expect(all[0].name).toBe('Alpha')
            expect(all[1].name).toBe('Zeta')
        })

        it('update modifies specific fields', async () => {
            const supplier = await inventoryApi.suppliers.create({ name: 'Old', category: 'autre', phone: '', email: '', contact: '', notes: '', logoUrl: '', orderDays: [], deliveryDays: [] })
            await inventoryApi.suppliers.update(supplier.id, { name: 'New', phone: '999' })

            const all = await inventoryApi.suppliers.getAll()
            const updated = all.find(s => s.id === supplier.id)!
            expect(updated.name).toBe('New')
            expect(updated.phone).toBe('999')
            expect(updated.category).toBe('autre')
        })

        it('delete removes a supplier', async () => {
            const supplier = await inventoryApi.suppliers.create({ name: 'ToDelete', category: 'autre', phone: '', email: '', contact: '', notes: '', logoUrl: '', orderDays: [], deliveryDays: [] })
            await inventoryApi.suppliers.delete(supplier.id)

            const all = await inventoryApi.suppliers.getAll()
            expect(all).toHaveLength(0)
        })
    })

    describe('deliveries', () => {
        it('creates a delivery linked to product and supplier', async () => {
            const productId = generateId()
            await db.products.add({ id: productId, name: 'Poulet', category: 'Viandes', quantity: 10 })

            const supplierId = generateId()
            await db.suppliers.add({ id: supplierId, name: 'Metro' })

            const delivery = await inventoryApi.deliveries.create({
                date: '2026-03-14',
                supplierName: 'Metro',
                supplierId,
                items: [{ productId, productName: 'Poulet', quantity: 5, price: 12.5 }],
            })

            expect(delivery.id).toBeDefined()
            expect(delivery.total).toBe(62.5)
            expect(delivery.items).toHaveLength(1)
            expect(delivery.items[0].productName).toBe('Poulet')
        })

        it('getAll resolves product and supplier names', async () => {
            const productId = generateId()
            const supplierId = generateId()
            await db.products.add({ id: productId, name: 'Salade', category: 'Légumes', quantity: 5 })
            await db.suppliers.add({ id: supplierId, name: 'Biocoop' })
            await db.deliveries.add({
                id: generateId(),
                product_id: productId,
                supplier_id: supplierId,
                quantity: 3,
                unit_price: 2,
                total_price: 6,
                delivery_date: '2026-03-14',
                created_at: nowISO(),
            })

            const all = await inventoryApi.deliveries.getAll()
            expect(all).toHaveLength(1)
            expect(all[0].supplierName).toBe('Biocoop')
            expect(all[0].items[0].productName).toBe('Salade')
        })

        it('delete removes a delivery', async () => {
            const id = generateId()
            await db.deliveries.add({
                id,
                product_id: 'p1',
                supplier_id: null,
                quantity: 1,
                unit_price: 1,
                total_price: 1,
                delivery_date: '2026-03-14',
                created_at: nowISO(),
            })

            await inventoryApi.deliveries.delete(id)
            const all = await inventoryApi.deliveries.getAll()
            expect(all).toHaveLength(0)
        })
    })
})
