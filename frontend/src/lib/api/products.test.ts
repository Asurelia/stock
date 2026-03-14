import { describe, it, expect, beforeEach } from 'vitest'
import { productsApi, type Product } from './products'
import { db, clearAllCache, generateId } from '../offline/db'

describe('productsApi', () => {
    beforeEach(async () => {
        await clearAllCache()
    })

    describe('create', () => {
        it('creates a product and returns it with camelCase fields', async () => {
            const product = await productsApi.create({
                name: 'Poulet',
                category: 'Viandes',
                quantity: 10,
                unit: 'kg',
                minStock: 2,
                avgConsumption: 0,
                price: 15.5,
                requiresTraceabilityPhoto: true,
            })

            expect(product.id).toBeDefined()
            expect(product.name).toBe('Poulet')
            expect(product.category).toBe('Viandes')
            expect(product.quantity).toBe(10)
            expect(product.minStock).toBe(2)
            expect(product.price).toBe(15.5)
            expect(product.requiresTraceabilityPhoto).toBe(true)
        })

        it('stores in snake_case in the database', async () => {
            const product = await productsApi.create({
                name: 'Banane',
                category: 'Fruits',
                quantity: 5,
                unit: 'kg',
                minStock: 1,
                avgConsumption: 0,
                price: 2,
                requiresTraceabilityPhoto: false,
            })

            const raw = await db.products.get(product.id)
            expect(raw.min_stock).toBe(1)
            expect(raw.requires_traceability_photo).toBe(false)
        })
    })

    describe('getAll', () => {
        it('returns products ordered by name', async () => {
            await productsApi.create({ name: 'Zucchini', category: 'Légumes', quantity: 1, unit: 'kg', minStock: 0, avgConsumption: 0, price: 3, requiresTraceabilityPhoto: true })
            await productsApi.create({ name: 'Avocat', category: 'Fruits', quantity: 2, unit: 'pcs', minStock: 0, avgConsumption: 0, price: 1, requiresTraceabilityPhoto: true })

            const products = await productsApi.getAll()
            expect(products).toHaveLength(2)
            expect(products[0].name).toBe('Avocat')
            expect(products[1].name).toBe('Zucchini')
        })
    })

    describe('getById', () => {
        it('returns a product by id', async () => {
            const created = await productsApi.create({ name: 'Test', category: 'A', quantity: 1, unit: 'kg', minStock: 0, avgConsumption: 0, price: 1, requiresTraceabilityPhoto: true })
            const found = await productsApi.getById(created.id)
            expect(found.name).toBe('Test')
        })

        it('throws for non-existent id', async () => {
            await expect(productsApi.getById('non-existent')).rejects.toThrow('Product not found')
        })
    })

    describe('update', () => {
        it('updates specific fields', async () => {
            const product = await productsApi.create({ name: 'Old', category: 'A', quantity: 1, unit: 'kg', minStock: 0, avgConsumption: 0, price: 1, requiresTraceabilityPhoto: true })
            await productsApi.update(product.id, { name: 'New', quantity: 50 })

            const updated = await productsApi.getById(product.id)
            expect(updated.name).toBe('New')
            expect(updated.quantity).toBe(50)
            expect(updated.category).toBe('A') // unchanged
        })
    })

    describe('delete', () => {
        it('removes a product', async () => {
            const product = await productsApi.create({ name: 'ToDelete', category: 'A', quantity: 1, unit: 'kg', minStock: 0, avgConsumption: 0, price: 1, requiresTraceabilityPhoto: true })
            await productsApi.delete(product.id)

            await expect(productsApi.getById(product.id)).rejects.toThrow()
        })
    })

    describe('getCritical', () => {
        it('returns products at or below min stock', async () => {
            await productsApi.create({ name: 'Critical', category: 'A', quantity: 1, unit: 'kg', minStock: 5, avgConsumption: 0, price: 1, requiresTraceabilityPhoto: true })
            await productsApi.create({ name: 'Ok', category: 'A', quantity: 10, unit: 'kg', minStock: 5, avgConsumption: 0, price: 1, requiresTraceabilityPhoto: true })
            await productsApi.create({ name: 'Empty', category: 'A', quantity: 0, unit: 'kg', minStock: 0, avgConsumption: 0, price: 1, requiresTraceabilityPhoto: true })

            const critical = await productsApi.getCritical()
            expect(critical).toHaveLength(2)
            expect(critical.map(p => p.name).sort()).toEqual(['Critical', 'Empty'])
        })
    })

    describe('getTotalValue', () => {
        it('calculates total stock value', async () => {
            await productsApi.create({ name: 'A', category: 'X', quantity: 10, unit: 'kg', minStock: 0, avgConsumption: 0, price: 5, requiresTraceabilityPhoto: true })
            await productsApi.create({ name: 'B', category: 'X', quantity: 3, unit: 'kg', minStock: 0, avgConsumption: 0, price: 10, requiresTraceabilityPhoto: true })

            const total = await productsApi.getTotalValue()
            expect(total).toBe(80) // 10*5 + 3*10
        })
    })
})
