import { getSupabase } from './core'
import { activityLogApi } from './activityLog'

export const temperatureApi = {
    // =========================================
    // Temperature Equipment
    // =========================================
    temperatureEquipment: {
        getAll: async () => {
            const { data, error } = await getSupabase()
                .from('temperature_equipment')
                .select('*')
                .order('name')

            if (error) throw error
            return data || []
        },

        getById: async (id: string) => {
            const { data, error } = await getSupabase()
                .from('temperature_equipment')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            return data
        },

        create: async (equipmentData: {
            name: string
            type: 'fridge' | 'freezer' | 'cold_room'
            location?: string
            min_temp?: number
            max_temp?: number
        }) => {
            const { data, error } = await getSupabase()
                .from('temperature_equipment')
                .insert([equipmentData])
                .select()
                .single()

            if (error) throw error
            return data
        },

        update: async (id: string, equipmentData: {
            name?: string
            type?: 'fridge' | 'freezer' | 'cold_room'
            location?: string
            min_temp?: number
            max_temp?: number
            is_active?: boolean
        }) => {
            const { error } = await getSupabase()
                .from('temperature_equipment')
                .update(equipmentData)
                .eq('id', id)

            if (error) throw error
        },

        delete: async (id: string) => {
            const { error } = await getSupabase()
                .from('temperature_equipment')
                .delete()
                .eq('id', id)

            if (error) throw error
        }
    },

    // =========================================
    // Temperature Readings
    // =========================================
    temperatureReadings: {
        getByEquipment: async (equipmentId: string, limit = 50) => {
            const { data, error } = await getSupabase()
                .from('temperature_readings')
                .select('*')
                .eq('equipment_id', equipmentId)
                .order('recorded_at', { ascending: false })
                .limit(limit)

            if (error) throw error
            return data || []
        },

        getLatest: async (equipmentId: string) => {
            const { data, error } = await getSupabase()
                .from('temperature_readings')
                .select('*')
                .eq('equipment_id', equipmentId)
                .order('recorded_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (error) throw error
            return data
        },

        create: async (readingData: {
            equipment_id: string
            temperature: number
            is_compliant?: boolean
            recorded_by?: string
            notes?: string | null
        }) => {
            const { data, error } = await getSupabase()
                .from('temperature_readings')
                .insert([readingData])
                .select(`*, temperature_equipment (name)`)
                .single()

            if (error) throw error

            // Log activity
            activityLogApi.log({
                action: 'temperature_recorded',
                entityType: 'temperature',
                entityId: data.id,
                details: {
                    temperature: readingData.temperature,
                    equipmentName: (data.temperature_equipment as { name?: string } | null)?.name,
                    isCompliant: readingData.is_compliant
                }
            })

            return data
        },

        getByDateRange: async (from: string, to: string) => {
            const { data, error } = await getSupabase()
                .from('temperature_readings')
                .select(`
                    *,
                    temperature_equipment (name, type)
                `)
                .gte('recorded_at', from)
                .lte('recorded_at', to)
                .order('recorded_at', { ascending: false })

            if (error) throw error
            return data || []
        }
    }
}
