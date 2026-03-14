import { db, generateId, nowISO } from './core'
import { activityLogApi } from './activityLog'

export const temperatureApi = {
    // =========================================
    // Temperature Equipment
    // =========================================
    temperatureEquipment: {
        getAll: async () => {
            return await db.temperatureEquipment.orderBy('name').toArray()
        },

        getById: async (id: string) => {
            const row = await db.temperatureEquipment.get(id)
            if (!row) throw new Error(`Equipment not found: ${id}`)
            return row
        },

        create: async (equipmentData: {
            name: string
            type: 'fridge' | 'freezer' | 'cold_room'
            location?: string
            min_temp?: number
            max_temp?: number
        }) => {
            const id = generateId()
            const record = {
                id,
                name: equipmentData.name,
                type: equipmentData.type,
                location: equipmentData.location ?? null,
                min_temp: equipmentData.min_temp ?? null,
                max_temp: equipmentData.max_temp ?? null,
                is_active: true,
                created_at: nowISO(),
                updated_at: nowISO()
            }
            await db.temperatureEquipment.add(record)
            return record
        },

        update: async (id: string, equipmentData: {
            name?: string
            type?: 'fridge' | 'freezer' | 'cold_room'
            location?: string
            min_temp?: number
            max_temp?: number
            is_active?: boolean
        }) => {
            const updateData: Record<string, unknown> = { updated_at: nowISO() }
            if (equipmentData.name !== undefined) updateData.name = equipmentData.name
            if (equipmentData.type !== undefined) updateData.type = equipmentData.type
            if (equipmentData.location !== undefined) updateData.location = equipmentData.location
            if (equipmentData.min_temp !== undefined) updateData.min_temp = equipmentData.min_temp
            if (equipmentData.max_temp !== undefined) updateData.max_temp = equipmentData.max_temp
            if (equipmentData.is_active !== undefined) updateData.is_active = equipmentData.is_active
            await db.temperatureEquipment.update(id, updateData)
        },

        delete: async (id: string) => {
            await db.temperatureEquipment.delete(id)
        }
    },

    // =========================================
    // Temperature Readings
    // =========================================
    temperatureReadings: {
        getByEquipment: async (equipmentId: string, limit = 50) => {
            return await db.temperatureReadings
                .where('equipment_id')
                .equals(equipmentId)
                .reverse()
                .limit(limit)
                .toArray()
        },

        getLatest: async (equipmentId: string) => {
            const rows = await db.temperatureReadings
                .where('equipment_id')
                .equals(equipmentId)
                .reverse()
                .limit(1)
                .toArray()
            return rows[0] ?? null
        },

        create: async (readingData: {
            equipment_id: string
            temperature: number
            is_compliant?: boolean
            recorded_by?: string
            notes?: string | null
        }) => {
            const id = generateId()
            const record = {
                id,
                equipment_id: readingData.equipment_id,
                temperature: readingData.temperature,
                is_compliant: readingData.is_compliant ?? null,
                recorded_by: readingData.recorded_by ?? null,
                notes: readingData.notes ?? null,
                recorded_at: nowISO(),
                created_at: nowISO()
            }
            await db.temperatureReadings.add(record)

            const equipment = await db.temperatureEquipment.get(readingData.equipment_id)

            activityLogApi.log({
                action: 'temperature_recorded',
                entityType: 'temperature',
                entityId: id,
                details: {
                    temperature: readingData.temperature,
                    equipmentName: equipment?.name,
                    isCompliant: readingData.is_compliant
                }
            })

            return { ...record, temperature_equipment: equipment ? { name: equipment.name, type: equipment.type } : null }
        },

        getByDateRange: async (from: string, to: string) => {
            const rows = await db.temperatureReadings
                .where('recorded_at')
                .between(from, to, true, true)
                .reverse()
                .toArray()

            const equipmentIds = [...new Set(rows.map(r => r.equipment_id).filter(Boolean))]
            const equipmentRows = await db.temperatureEquipment.bulkGet(equipmentIds)
            const equipmentMap = new Map<string, any>()
            equipmentRows.forEach(e => { if (e) equipmentMap.set(e.id, e) })

            return rows.map(r => ({
                ...r,
                temperature_equipment: r.equipment_id ? (equipmentMap.get(r.equipment_id) ?? null) : null
            }))
        }
    }
}
