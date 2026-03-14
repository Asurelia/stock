import { describe, it, expect, beforeEach } from 'vitest'
import { temperatureApi } from './temperature'
import { clearAllCache } from '../offline/db'

describe('temperatureApi', () => {
    beforeEach(async () => {
        await clearAllCache()
    })

    describe('temperatureEquipment', () => {
        it('creates equipment with defaults', async () => {
            const eq = await temperatureApi.temperatureEquipment.create({
                name: 'Frigo cuisine',
                type: 'fridge',
                min_temp: 0,
                max_temp: 4,
            })

            expect(eq.id).toBeDefined()
            expect(eq.name).toBe('Frigo cuisine')
            expect(eq.type).toBe('fridge')
            expect(eq.is_active).toBe(true)
        })

        it('getAll returns equipment ordered by name', async () => {
            await temperatureApi.temperatureEquipment.create({ name: 'Congélateur', type: 'freezer' })
            await temperatureApi.temperatureEquipment.create({ name: 'Armoire froide', type: 'cold_room' })

            const all = await temperatureApi.temperatureEquipment.getAll()
            expect(all).toHaveLength(2)
            expect(all[0].name).toBe('Armoire froide')
            expect(all[1].name).toBe('Congélateur')
        })

        it('update modifies fields', async () => {
            const eq = await temperatureApi.temperatureEquipment.create({ name: 'Old', type: 'fridge' })
            await temperatureApi.temperatureEquipment.update(eq.id, { name: 'Updated', is_active: false })

            const updated = await temperatureApi.temperatureEquipment.getById(eq.id)
            expect(updated.name).toBe('Updated')
            expect(updated.is_active).toBe(false)
        })

        it('delete removes equipment', async () => {
            const eq = await temperatureApi.temperatureEquipment.create({ name: 'ToDelete', type: 'fridge' })
            await temperatureApi.temperatureEquipment.delete(eq.id)

            await expect(temperatureApi.temperatureEquipment.getById(eq.id)).rejects.toThrow()
        })
    })

    describe('temperatureReadings', () => {
        it('creates a reading linked to equipment', async () => {
            const eq = await temperatureApi.temperatureEquipment.create({ name: 'Frigo', type: 'fridge' })
            const reading = await temperatureApi.temperatureReadings.create({
                equipment_id: eq.id,
                temperature: 3.5,
                is_compliant: true,
            })

            expect(reading.id).toBeDefined()
            expect(reading.temperature).toBe(3.5)
            expect(reading.temperature_equipment?.name).toBe('Frigo')
        })

        it('getLatest returns a reading when readings exist', async () => {
            const eq = await temperatureApi.temperatureEquipment.create({ name: 'Frigo', type: 'fridge' })

            await temperatureApi.temperatureReadings.create({ equipment_id: eq.id, temperature: 2 })
            await temperatureApi.temperatureReadings.create({ equipment_id: eq.id, temperature: 4 })

            const latest = await temperatureApi.temperatureReadings.getLatest(eq.id)
            expect(latest).not.toBeNull()
            expect([2, 4]).toContain(latest!.temperature)
        })

        it('getByEquipment returns all readings for the equipment', async () => {
            const eq = await temperatureApi.temperatureEquipment.create({ name: 'Frigo', type: 'fridge' })
            const eq2 = await temperatureApi.temperatureEquipment.create({ name: 'Other', type: 'freezer' })

            await temperatureApi.temperatureReadings.create({ equipment_id: eq.id, temperature: 1 })
            await temperatureApi.temperatureReadings.create({ equipment_id: eq.id, temperature: 2 })
            await temperatureApi.temperatureReadings.create({ equipment_id: eq.id, temperature: 3 })
            await temperatureApi.temperatureReadings.create({ equipment_id: eq2.id, temperature: 99 })

            const readings = await temperatureApi.temperatureReadings.getByEquipment(eq.id, 10)
            expect(readings).toHaveLength(3)
            const temps = readings.map(r => r.temperature).sort()
            expect(temps).toEqual([1, 2, 3])
        })

        it('getLatest returns null when no readings', async () => {
            const eq = await temperatureApi.temperatureEquipment.create({ name: 'Empty', type: 'fridge' })
            const latest = await temperatureApi.temperatureReadings.getLatest(eq.id)
            expect(latest).toBeNull()
        })
    })
})
