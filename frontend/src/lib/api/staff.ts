import { apiClient } from './core'

// =============================================
// Staff & Planning Types
// =============================================

export type StaffGroup = 'week1' | 'week2' | 'manager'
export type WorkDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export const STAFF_COLORS = [
    '#3B82F6', // Blue
    '#22C55E', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#6366F1', // Indigo
    '#84CC16', // Lime
]

export interface Staff {
    id: string
    firstName: string
    lastName: string
    role: string
    email: string
    phone: string
    color: string
    avatarUrl?: string | null
    contractHours: number
    isActive: boolean
    signatureData?: string | null
    pinCode?: string | null
    staffGroup: StaffGroup
    workDaysWeek1: WorkDay[]
    workDaysWeek2: WorkDay[]
    createdAt: string
}

export const STAFF_GROUPS: Record<StaffGroup, { label: string; color: string; icon: string }> = {
    week1: { label: 'Semaine 1', color: '#3B82F6', icon: '1️⃣' },
    week2: { label: 'Semaine 2', color: '#22C55E', icon: '2️⃣' },
    manager: { label: 'Chef Gérant', color: '#F59E0B', icon: '👨‍🍳' }
}

export const WEEK_DAYS: { key: WorkDay; label: string; short: string }[] = [
    { key: 'mon', label: 'Lundi', short: 'L' },
    { key: 'tue', label: 'Mardi', short: 'M' },
    { key: 'wed', label: 'Mercredi', short: 'M' },
    { key: 'thu', label: 'Jeudi', short: 'J' },
    { key: 'fri', label: 'Vendredi', short: 'V' },
    { key: 'sat', label: 'Samedi', short: 'S' },
    { key: 'sun', label: 'Dimanche', short: 'D' }
]

export type ScheduleEventType =
    | 'work'
    | 'vacation'
    | 'sick'
    | 'overtime'
    | 'training'
    | 'holiday'
    | 'unpaid_leave'
    | 'recovery'

export interface ScheduleEvent {
    id: string
    staffId: string
    staffName: string
    staffColor: string
    eventType: ScheduleEventType
    title?: string | null
    startDate: string
    endDate: string
    startTime?: string | null
    endTime?: string | null
    hours: number
    notes?: string | null
    isValidated: boolean
    validatedBy?: string | null
    validatedAt?: string | null
    createdAt: string
}

export interface UserProfile {
    id: string
    staffId?: string | null
    staffName?: string | null
    displayName: string
    role: 'admin' | 'manager' | 'user'
    avatarEmoji: string
    lastLogin?: string | null
    preferences: Record<string, unknown>
    isActive: boolean
    createdAt: string
}

// Event type display info
export const EVENT_TYPES: Record<ScheduleEventType, { label: string; color: string; icon: string }> = {
    work: { label: 'Travail', color: '#22C55E', icon: '💼' },
    vacation: { label: 'Congés', color: '#3B82F6', icon: '🏖️' },
    sick: { label: 'Maladie', color: '#EF4444', icon: '🤒' },
    overtime: { label: 'Heures sup.', color: '#F59E0B', icon: '⏰' },
    training: { label: 'Formation', color: '#8B5CF6', icon: '📚' },
    holiday: { label: 'Férié', color: '#EC4899', icon: '🎉' },
    unpaid_leave: { label: 'Sans solde', color: '#6B7280', icon: '📋' },
    recovery: { label: 'Récupération', color: '#14B8A6', icon: '🔄' }
}

export const STAFF_ROLES = [
    'Chef cuisinier',
    'Cuisinier',
    'Commis',
    'Plongeur',
    'Serveur',
    'Responsable de salle',
    'Apprenti',
    'Stagiaire'
]

export const staffApi = {
    getAll: (): Promise<Staff[]> => apiClient.get('/staff'),
    getById: (id: string): Promise<Staff> => apiClient.get(`/staff/${id}`),
    create: (data: Omit<Staff, 'id' | 'createdAt'>): Promise<Staff> => apiClient.post('/staff', data),
    update: (id: string, data: Partial<Staff>): Promise<void> => apiClient.patch(`/staff/${id}`, data).then(() => {}),
    delete: (id: string): Promise<void> => apiClient.del(`/staff/${id}`).then(() => {}),
}

export const scheduleEventsApi = {
    getAll: (): Promise<ScheduleEvent[]> => apiClient.get('/schedule-events'),
    getByDateRange: (from: string, to: string): Promise<ScheduleEvent[]> => apiClient.get(`/schedule-events?from=${from}&to=${to}`),
    getByStaff: (staffId: string): Promise<ScheduleEvent[]> => apiClient.get(`/schedule-events?staffId=${staffId}`),
    create: (data: Omit<ScheduleEvent, 'id' | 'createdAt'>): Promise<ScheduleEvent> => apiClient.post('/schedule-events', data),
    update: (id: string, data: Partial<ScheduleEvent>): Promise<void> => apiClient.patch(`/schedule-events/${id}`, data).then(() => {}),
    delete: (id: string): Promise<void> => apiClient.del(`/schedule-events/${id}`).then(() => {}),
    validate: (id: string, validatedBy: string): Promise<void> => apiClient.post(`/schedule-events/${id}/validate`, { validatedBy }).then(() => {}),
}

export const userProfilesApi = {
    getAll: (): Promise<UserProfile[]> => apiClient.get('/user-profiles'),
    getById: (id: string): Promise<UserProfile> => apiClient.get(`/user-profiles/${id}`),
    create: (data: any): Promise<UserProfile> => apiClient.post('/user-profiles', data),
    update: (id: string, data: Partial<UserProfile>): Promise<void> => apiClient.patch(`/user-profiles/${id}`, data).then(() => {}),
    delete: (id: string): Promise<void> => apiClient.del(`/user-profiles/${id}`).then(() => {}),
    updateLastLogin: (id: string): Promise<void> => apiClient.patch(`/user-profiles/${id}/last-login`).then(() => {}),
}
