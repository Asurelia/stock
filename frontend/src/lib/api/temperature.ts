import { apiClient } from './core'

export interface TemperatureEquipment {
    id: string
    name: string
    type: 'fridge' | 'freezer' | 'cold_room'
    location: string | null
    min_temp: number | null
    max_temp: number | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface TemperatureReading {
    id: string
    equipment_id: string
    temperature: number
    is_compliant: boolean | null
    recorded_by: string | null
    notes: string | null
    recorded_at: string
    created_at: string
    temperature_equipment?: { name: string; type: string } | null
}

export const temperatureApi = {
    // =========================================
    // Temperature Equipment
    // =========================================
    temperatureEquipment: {
        getAll: (): Promise<TemperatureEquipment[]> => apiClient.get('/temperature/equipment'),
        getById: (id: string): Promise<TemperatureEquipment> => apiClient.get(`/temperature/equipment/${id}`),
        create: (data: Omit<TemperatureEquipment, 'id'>): Promise<TemperatureEquipment> => apiClient.post('/temperature/equipment', data),
        update: (id: string, data: Partial<TemperatureEquipment>): Promise<void> => apiClient.patch(`/temperature/equipment/${id}`, data).then(() => {}),
        delete: (id: string): Promise<void> => apiClient.del(`/temperature/equipment/${id}`).then(() => {}),
    },

    // =========================================
    // Temperature Readings
    // =========================================
    temperatureReadings: {
        getByEquipment: (equipmentId: string, limit = 50): Promise<TemperatureReading[]> => apiClient.get(`/temperature/readings?equipmentId=${equipmentId}&limit=${limit}`),
        getLatest: (equipmentId: string): Promise<TemperatureReading | null> => apiClient.get(`/temperature/readings/latest/${equipmentId}`),
        create: (data: any): Promise<TemperatureReading> => apiClient.post('/temperature/readings', data),
        getByDateRange: (from: string, to: string): Promise<TemperatureReading[]> => apiClient.get(`/temperature/readings?from=${from}&to=${to}`),
    },
}
