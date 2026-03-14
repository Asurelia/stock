import { describe, it, expect, beforeEach } from 'vitest'
import { db, generateId, nowISO, clearAllCache } from './db'

describe('db utilities', () => {
    it('generateId returns a valid UUID', () => {
        const id = generateId()
        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    })

    it('generateId returns unique values', () => {
        const ids = new Set(Array.from({ length: 100 }, () => generateId()))
        expect(ids.size).toBe(100)
    })

    it('nowISO returns a valid ISO string', () => {
        const iso = nowISO()
        expect(new Date(iso).toISOString()).toBe(iso)
    })
})

describe('db tables', () => {
    beforeEach(async () => {
        await clearAllCache()
    })

    it('can add and retrieve a product', async () => {
        const product = {
            id: generateId(),
            name: 'Test Product',
            category: 'Viandes',
            quantity: 10,
            unit: 'kg',
            min_stock: 2,
            price: 15.5,
            emoji: null,
            requires_traceability_photo: true,
        }

        await db.products.add(product)
        const result = await db.products.get(product.id)
        expect(result).toEqual(product)
    })

    it('can query products by index', async () => {
        await db.products.bulkAdd([
            { id: generateId(), name: 'Banane', category: 'Fruits', quantity: 5, unit: 'kg', min_stock: 1, price: 2 },
            { id: generateId(), name: 'Poulet', category: 'Viandes', quantity: 3, unit: 'kg', min_stock: 1, price: 8 },
            { id: generateId(), name: 'Pomme', category: 'Fruits', quantity: 10, unit: 'kg', min_stock: 2, price: 1.5 },
        ])

        const fruits = await db.products.where('category').equals('Fruits').toArray()
        expect(fruits).toHaveLength(2)
    })

    it('clearAllCache empties all tables', async () => {
        await db.products.add({ id: generateId(), name: 'Test', category: 'A', quantity: 1 })
        await db.suppliers.add({ id: generateId(), name: 'Supplier' })

        expect(await db.products.count()).toBe(1)
        expect(await db.suppliers.count()).toBe(1)

        await clearAllCache()

        expect(await db.products.count()).toBe(0)
        expect(await db.suppliers.count()).toBe(0)
    })

    it('has all 19 expected tables', () => {
        const expectedTables = [
            'products', 'outputs', 'suppliers', 'deliveries',
            'recipes', 'recipeIngredients', 'menus', 'menuRecipes',
            'temperatureEquipment', 'temperatureReadings', 'traceabilityPhotos',
            'staff', 'scheduleEvents', 'userProfiles', 'activityLog',
            'userPermissions', 'pushTokens', 'recurringOutputConfigs', 'dailyRecurringOutputs',
        ]

        for (const table of expectedTables) {
            expect(db[table as keyof typeof db]).toBeDefined()
        }
    })
})
