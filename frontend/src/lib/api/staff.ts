import { db, generateId, nowISO } from './core'

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

function mapRowToStaff(s: Record<string, unknown>): Staff {
    return {
        id: s.id as string,
        firstName: s.first_name as string,
        lastName: s.last_name as string,
        role: s.role as string,
        email: (s.email as string) || '',
        phone: (s.phone as string) || '',
        color: (s.color as string) || '#3B82F6',
        avatarUrl: s.avatar_url as string | null | undefined,
        contractHours: Number(s.contract_hours) || 35,
        isActive: s.is_active as boolean,
        signatureData: s.signature_data as string | null | undefined,
        pinCode: s.pin_code as string | null | undefined,
        staffGroup: (s.staff_group as StaffGroup) || 'week1',
        workDaysWeek1: (s.work_days_week1 as WorkDay[]) || ['mon', 'tue', 'wed', 'thu', 'fri'],
        workDaysWeek2: (s.work_days_week2 as WorkDay[]) || ['mon', 'tue', 'wed', 'thu', 'fri'],
        createdAt: s.created_at as string
    }
}

function mapRowToScheduleEvent(e: Record<string, unknown>, staffMap: Map<string, { first_name: string; last_name: string; color: string }>): ScheduleEvent {
    const staffId = e.staff_id as string
    const staffData = staffMap.get(staffId)
    return {
        id: e.id as string,
        staffId,
        staffName: staffData ? `${staffData.first_name} ${staffData.last_name}` : '',
        staffColor: staffData?.color || '#3B82F6',
        eventType: e.event_type as ScheduleEventType,
        title: e.title as string | null | undefined,
        startDate: e.start_date as string,
        endDate: e.end_date as string,
        startTime: e.start_time as string | null | undefined,
        endTime: e.end_time as string | null | undefined,
        hours: Number(e.hours) || 0,
        notes: e.notes as string | null | undefined,
        isValidated: (e.is_validated as boolean) ?? false,
        validatedBy: e.validated_by as string | null | undefined,
        validatedAt: e.validated_at as string | null | undefined,
        createdAt: (e.created_at as string) ?? ''
    }
}

export const staffApi = {
    getAll: async (): Promise<Staff[]> => {
        const rows = await db.staff.orderBy('last_name').toArray()
        return rows.map(s => mapRowToStaff(s as Record<string, unknown>))
    },

    getById: async (id: string): Promise<Staff> => {
        const s = await db.staff.get(id)
        if (!s) throw new Error(`Staff not found: ${id}`)
        return mapRowToStaff(s as Record<string, unknown>)
    },

    create: async (staffData: Omit<Staff, 'id' | 'createdAt'>): Promise<Staff> => {
        const id = generateId()
        const now = nowISO()
        const row = {
            id,
            first_name: staffData.firstName,
            last_name: staffData.lastName,
            role: staffData.role,
            email: staffData.email || null,
            phone: staffData.phone || null,
            color: staffData.color,
            avatar_url: staffData.avatarUrl || null,
            contract_hours: staffData.contractHours,
            is_active: staffData.isActive,
            signature_data: staffData.signatureData || null,
            pin_code: staffData.pinCode || null,
            staff_group: staffData.staffGroup || 'week1',
            work_days_week1: staffData.workDaysWeek1 || ['mon', 'tue', 'wed', 'thu', 'fri'],
            work_days_week2: staffData.workDaysWeek2 || ['mon', 'tue', 'wed', 'thu', 'fri'],
            created_at: now
        }
        await db.staff.add(row)
        return mapRowToStaff(row as Record<string, unknown>)
    },

    update: async (id: string, staffData: Partial<Staff>): Promise<void> => {
        const updateData: Record<string, unknown> = {}
        if (staffData.firstName !== undefined) updateData.first_name = staffData.firstName
        if (staffData.lastName !== undefined) updateData.last_name = staffData.lastName
        if (staffData.role !== undefined) updateData.role = staffData.role
        if (staffData.email !== undefined) updateData.email = staffData.email || null
        if (staffData.phone !== undefined) updateData.phone = staffData.phone || null
        if (staffData.color !== undefined) updateData.color = staffData.color
        if (staffData.contractHours !== undefined) updateData.contract_hours = staffData.contractHours
        if (staffData.isActive !== undefined) updateData.is_active = staffData.isActive
        if (staffData.signatureData !== undefined) updateData.signature_data = staffData.signatureData
        if (staffData.pinCode !== undefined) updateData.pin_code = staffData.pinCode
        if (staffData.staffGroup !== undefined) updateData.staff_group = staffData.staffGroup
        if (staffData.workDaysWeek1 !== undefined) updateData.work_days_week1 = staffData.workDaysWeek1
        if (staffData.workDaysWeek2 !== undefined) updateData.work_days_week2 = staffData.workDaysWeek2

        await db.staff.update(id, updateData)
    },

    delete: async (id: string): Promise<void> => {
        await db.staff.delete(id)
    }
}

export const scheduleEventsApi = {
    getAll: async (): Promise<ScheduleEvent[]> => {
        const [rows, staffRows] = await Promise.all([
            db.scheduleEvents.orderBy('start_date').reverse().toArray(),
            db.staff.toArray()
        ])
        const staffMap = new Map<string, { first_name: string; last_name: string; color: string }>(
            staffRows.map(s => [s.id as string, { first_name: s.first_name as string, last_name: s.last_name as string, color: s.color as string }])
        )
        return rows.map(e => mapRowToScheduleEvent(e as Record<string, unknown>, staffMap))
    },

    getByDateRange: async (from: string, to: string): Promise<ScheduleEvent[]> => {
        const [rows, staffRows] = await Promise.all([
            db.scheduleEvents.filter(e => {
                const start = e.start_date as string
                const end = e.end_date as string
                return start <= to && end >= from
            }).toArray(),
            db.staff.toArray()
        ])
        const staffMap = new Map<string, { first_name: string; last_name: string; color: string }>(
            staffRows.map(s => [s.id as string, { first_name: s.first_name as string, last_name: s.last_name as string, color: s.color as string }])
        )
        rows.sort((a, b) => (a.start_date as string).localeCompare(b.start_date as string))
        return rows.map(e => mapRowToScheduleEvent(e as Record<string, unknown>, staffMap))
    },

    getByStaff: async (staffId: string): Promise<ScheduleEvent[]> => {
        const rows = await db.scheduleEvents
            .where('staff_id')
            .equals(staffId)
            .reverse()
            .sortBy('start_date')
        const staffRecord = await db.staff.get(staffId)
        const staffMap = new Map<string, { first_name: string; last_name: string; color: string }>()
        if (staffRecord) {
            staffMap.set(staffId, { first_name: staffRecord.first_name, last_name: staffRecord.last_name, color: staffRecord.color })
        }
        return rows.map(e => mapRowToScheduleEvent(e as Record<string, unknown>, staffMap))
    },

    create: async (eventData: Omit<ScheduleEvent, 'id' | 'staffName' | 'staffColor' | 'createdAt'>): Promise<ScheduleEvent> => {
        const id = generateId()
        const now = nowISO()
        const row = {
            id,
            staff_id: eventData.staffId,
            event_type: eventData.eventType,
            title: eventData.title || null,
            start_date: eventData.startDate,
            end_date: eventData.endDate,
            start_time: eventData.startTime || null,
            end_time: eventData.endTime || null,
            hours: eventData.hours || null,
            notes: eventData.notes || null,
            is_validated: eventData.isValidated || false,
            validated_by: null,
            validated_at: null,
            created_at: now
        }
        await db.scheduleEvents.add(row)
        const staffRow = await db.staff.get(eventData.staffId)
        const staffMap = staffRow
            ? new Map([[eventData.staffId, { first_name: staffRow.first_name as string, last_name: staffRow.last_name as string, color: staffRow.color as string }]])
            : new Map<string, { first_name: string; last_name: string; color: string }>()
        return mapRowToScheduleEvent(row as Record<string, unknown>, staffMap)
    },

    update: async (id: string, eventData: Partial<ScheduleEvent>): Promise<void> => {
        const updateData: Record<string, unknown> = {}
        if (eventData.staffId !== undefined) updateData.staff_id = eventData.staffId
        if (eventData.eventType !== undefined) updateData.event_type = eventData.eventType
        if (eventData.title !== undefined) updateData.title = eventData.title
        if (eventData.startDate !== undefined) updateData.start_date = eventData.startDate
        if (eventData.endDate !== undefined) updateData.end_date = eventData.endDate
        if (eventData.startTime !== undefined) updateData.start_time = eventData.startTime
        if (eventData.endTime !== undefined) updateData.end_time = eventData.endTime
        if (eventData.hours !== undefined) updateData.hours = eventData.hours
        if (eventData.notes !== undefined) updateData.notes = eventData.notes
        if (eventData.isValidated !== undefined) updateData.is_validated = eventData.isValidated

        await db.scheduleEvents.update(id, updateData)
    },

    delete: async (id: string): Promise<void> => {
        await db.scheduleEvents.delete(id)
    },

    validate: async (id: string, validatedBy: string): Promise<void> => {
        await db.scheduleEvents.update(id, {
            is_validated: true,
            validated_by: validatedBy,
            validated_at: nowISO()
        })
    }
}

export const userProfilesApi = {
    getAll: async (): Promise<UserProfile[]> => {
        const [rows, staffRows] = await Promise.all([
            db.userProfiles.orderBy('display_name').toArray(),
            db.staff.toArray()
        ])
        const staffMap = new Map<string, { first_name: string; last_name: string }>(
            staffRows.map(s => [s.id as string, { first_name: s.first_name as string, last_name: s.last_name as string }])
        )
        return rows.map(p => {
            const staffData = p.staff_id ? staffMap.get(p.staff_id as string) : null
            return {
                id: p.id as string,
                staffId: p.staff_id as string | null | undefined,
                staffName: staffData ? `${staffData.first_name} ${staffData.last_name}` : null,
                displayName: p.display_name as string,
                role: p.role as 'admin' | 'manager' | 'user',
                avatarEmoji: (p.avatar_emoji as string) || '👤',
                lastLogin: p.last_login as string | null | undefined,
                preferences: (p.preferences as Record<string, unknown>) || {},
                isActive: (p.is_active as boolean) ?? true,
                createdAt: (p.created_at as string) ?? ''
            }
        })
    },

    getById: async (id: string): Promise<UserProfile> => {
        const p = await db.userProfiles.get(id)
        if (!p) throw new Error(`UserProfile not found: ${id}`)
        let staffName: string | null = null
        if (p.staff_id) {
            const staffRow = await db.staff.get(p.staff_id as string)
            if (staffRow) staffName = `${staffRow.first_name} ${staffRow.last_name}`
        }
        return {
            id: p.id as string,
            staffId: p.staff_id as string | null | undefined,
            staffName,
            displayName: p.display_name as string,
            role: p.role as 'admin' | 'manager' | 'user',
            avatarEmoji: (p.avatar_emoji as string) || '👤',
            lastLogin: p.last_login as string | null | undefined,
            preferences: (p.preferences as Record<string, unknown>) || {},
            isActive: (p.is_active as boolean) ?? true,
            createdAt: (p.created_at as string) ?? ''
        }
    },

    create: async (profileData: Omit<UserProfile, 'id' | 'staffName' | 'createdAt'>): Promise<UserProfile> => {
        const id = generateId()
        const now = nowISO()
        const row = {
            id,
            staff_id: profileData.staffId || null,
            display_name: profileData.displayName,
            role: profileData.role,
            avatar_emoji: profileData.avatarEmoji,
            last_login: profileData.lastLogin || null,
            preferences: profileData.preferences || {},
            is_active: profileData.isActive ?? true,
            created_at: now
        }
        await db.userProfiles.add(row)
        return {
            id,
            staffId: row.staff_id,
            staffName: null,
            displayName: row.display_name,
            role: row.role as 'admin' | 'manager' | 'user',
            avatarEmoji: row.avatar_emoji || '👤',
            lastLogin: row.last_login,
            preferences: row.preferences,
            isActive: row.is_active,
            createdAt: now
        }
    },

    update: async (id: string, profileData: Partial<UserProfile>): Promise<void> => {
        const updateData: Record<string, unknown> = {}
        if (profileData.staffId !== undefined) updateData.staff_id = profileData.staffId
        if (profileData.displayName !== undefined) updateData.display_name = profileData.displayName
        if (profileData.role !== undefined) updateData.role = profileData.role
        if (profileData.avatarEmoji !== undefined) updateData.avatar_emoji = profileData.avatarEmoji
        if (profileData.preferences !== undefined) updateData.preferences = profileData.preferences
        if (profileData.isActive !== undefined) updateData.is_active = profileData.isActive

        await db.userProfiles.update(id, updateData)
    },

    delete: async (id: string): Promise<void> => {
        await db.userProfiles.delete(id)
    },

    updateLastLogin: async (id: string): Promise<void> => {
        await db.userProfiles.update(id, { last_login: nowISO() })
    }
}
