import { getSupabase } from './core'
import type { Json } from '../database.types'

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
    getAll: async (): Promise<Staff[]> => {
        const { data, error } = await getSupabase()
            .from('staff')
            .select('*')
            .order('last_name')

        if (error) throw error
        return (data || []).map(s => {
            const rec = s as Record<string, unknown>
            return {
                id: s.id,
                firstName: s.first_name,
                lastName: s.last_name,
                role: s.role,
                email: s.email || '',
                phone: s.phone || '',
                color: s.color || '#3B82F6',
                avatarUrl: s.avatar_url,
                contractHours: Number(s.contract_hours) || 35,
                isActive: s.is_active,
                signatureData: s.signature_data,
                pinCode: s.pin_code,
                staffGroup: (rec.staff_group as StaffGroup) || 'week1',
                workDaysWeek1: (rec.work_days_week1 as WorkDay[]) || ['mon', 'tue', 'wed', 'thu', 'fri'],
                workDaysWeek2: (rec.work_days_week2 as WorkDay[]) || ['mon', 'tue', 'wed', 'thu', 'fri'],
                createdAt: s.created_at
            }
        })
    },

    getById: async (id: string): Promise<Staff> => {
        const { data, error } = await getSupabase()
            .from('staff')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error
        const rec = data as Record<string, unknown>
        return {
            id: data.id,
            firstName: data.first_name,
            lastName: data.last_name,
            role: data.role,
            email: data.email || '',
            phone: data.phone || '',
            color: data.color || '#3B82F6',
            avatarUrl: data.avatar_url,
            contractHours: Number(data.contract_hours) || 35,
            isActive: data.is_active,
            signatureData: data.signature_data,
            pinCode: data.pin_code,
            staffGroup: (rec.staff_group as StaffGroup) || 'week1',
            workDaysWeek1: (rec.work_days_week1 as WorkDay[]) || ['mon', 'tue', 'wed', 'thu', 'fri'],
            workDaysWeek2: (rec.work_days_week2 as WorkDay[]) || ['mon', 'tue', 'wed', 'thu', 'fri'],
            createdAt: data.created_at
        }
    },

    create: async (staffData: Omit<Staff, 'id' | 'createdAt'>): Promise<Staff> => {
        const { data, error } = await getSupabase()
            .from('staff')
            .insert([{
                first_name: staffData.firstName,
                last_name: staffData.lastName,
                role: staffData.role,
                email: staffData.email || null,
                phone: staffData.phone || null,
                color: staffData.color,
                contract_hours: staffData.contractHours,
                signature_data: staffData.signatureData || null,
                pin_code: staffData.pinCode || null,
                staff_group: staffData.staffGroup || 'week1',
                work_days_week1: staffData.workDaysWeek1 || ['mon', 'tue', 'wed', 'thu', 'fri'],
                work_days_week2: staffData.workDaysWeek2 || ['mon', 'tue', 'wed', 'thu', 'fri']
            }])
            .select()
            .single()

        if (error) throw error
        const rec = data as Record<string, unknown>
        return {
            id: data.id,
            firstName: data.first_name,
            lastName: data.last_name,
            role: data.role,
            email: data.email || '',
            phone: data.phone || '',
            color: data.color || '#3B82F6',
            avatarUrl: data.avatar_url,
            contractHours: Number(data.contract_hours) || 35,
            isActive: data.is_active,
            signatureData: data.signature_data,
            pinCode: data.pin_code,
            staffGroup: (rec.staff_group as StaffGroup) || 'week1',
            workDaysWeek1: (rec.work_days_week1 as WorkDay[]) || ['mon', 'tue', 'wed', 'thu', 'fri'],
            workDaysWeek2: (rec.work_days_week2 as WorkDay[]) || ['mon', 'tue', 'wed', 'thu', 'fri'],
            createdAt: data.created_at
        }
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

        const { error } = await getSupabase()
            .from('staff')
            .update(updateData)
            .eq('id', id)

        if (error) throw error
    },

    delete: async (id: string): Promise<void> => {
        const { error } = await getSupabase()
            .from('staff')
            .delete()
            .eq('id', id)

        if (error) throw error
    }
}

export const scheduleEventsApi = {
    getAll: async (): Promise<ScheduleEvent[]> => {
        const { data, error } = await getSupabase()
            .from('schedule_events')
            .select(`
                *,
                staff!schedule_events_staff_id_fkey (first_name, last_name, color)
            `)
            .order('start_date', { ascending: false })

        if (error) throw error
        return (data || []).map(e => {
            const staffData = e.staff as { first_name: string; last_name: string; color: string } | null
            return {
                id: e.id,
                staffId: e.staff_id,
                staffName: staffData ? `${staffData.first_name} ${staffData.last_name}` : '',
                staffColor: staffData?.color || '#3B82F6',
                eventType: e.event_type as ScheduleEventType,
                title: e.title,
                startDate: e.start_date,
                endDate: e.end_date,
                startTime: e.start_time,
                endTime: e.end_time,
                hours: Number(e.hours) || 0,
                notes: e.notes,
                isValidated: e.is_validated ?? false,
                validatedBy: e.validated_by,
                validatedAt: e.validated_at,
                createdAt: e.created_at ?? ''
            }
        })
    },

    getByDateRange: async (from: string, to: string): Promise<ScheduleEvent[]> => {
        const { data, error } = await getSupabase()
            .from('schedule_events')
            .select(`
                *,
                staff!schedule_events_staff_id_fkey (first_name, last_name, color)
            `)
            .or(`start_date.gte.${from},end_date.lte.${to}`)
            .or(`start_date.lte.${to},end_date.gte.${from}`)
            .order('start_date')

        if (error) throw error
        return (data || []).map(e => {
            const staffData = e.staff as { first_name: string; last_name: string; color: string } | null
            return {
                id: e.id,
                staffId: e.staff_id,
                staffName: staffData ? `${staffData.first_name} ${staffData.last_name}` : '',
                staffColor: staffData?.color || '#3B82F6',
                eventType: e.event_type as ScheduleEventType,
                title: e.title,
                startDate: e.start_date,
                endDate: e.end_date,
                startTime: e.start_time,
                endTime: e.end_time,
                hours: Number(e.hours) || 0,
                notes: e.notes,
                isValidated: e.is_validated ?? false,
                validatedBy: e.validated_by,
                validatedAt: e.validated_at,
                createdAt: e.created_at ?? ''
            }
        })
    },

    getByStaff: async (staffId: string): Promise<ScheduleEvent[]> => {
        const { data, error } = await getSupabase()
            .from('schedule_events')
            .select('*')
            .eq('staff_id', staffId)
            .order('start_date', { ascending: false })

        if (error) throw error
        return (data || []).map(e => ({
            id: e.id,
            staffId: e.staff_id,
            staffName: '',
            staffColor: '#3B82F6',
            eventType: e.event_type as ScheduleEventType,
            title: e.title,
            startDate: e.start_date,
            endDate: e.end_date,
            startTime: e.start_time,
            endTime: e.end_time,
            hours: Number(e.hours) || 0,
            notes: e.notes,
            isValidated: e.is_validated ?? false,
            validatedBy: e.validated_by,
            validatedAt: e.validated_at,
            createdAt: e.created_at ?? ''
        }))
    },

    create: async (eventData: Omit<ScheduleEvent, 'id' | 'staffName' | 'staffColor' | 'createdAt'>): Promise<ScheduleEvent> => {
        const { data, error } = await getSupabase()
            .from('schedule_events')
            .insert([{
                staff_id: eventData.staffId,
                event_type: eventData.eventType,
                title: eventData.title || null,
                start_date: eventData.startDate,
                end_date: eventData.endDate,
                start_time: eventData.startTime || null,
                end_time: eventData.endTime || null,
                hours: eventData.hours || null,
                notes: eventData.notes || null,
                is_validated: eventData.isValidated || false
            }])
            .select(`
                *,
                staff!schedule_events_staff_id_fkey (first_name, last_name, color)
            `)
            .single()

        if (error) throw error
        const staffData = data.staff as { first_name: string; last_name: string; color: string } | null
        return {
            id: data.id,
            staffId: data.staff_id,
            staffName: staffData ? `${staffData.first_name} ${staffData.last_name}` : '',
            staffColor: staffData?.color || '#3B82F6',
            eventType: data.event_type as ScheduleEventType,
            title: data.title,
            startDate: data.start_date,
            endDate: data.end_date,
            startTime: data.start_time,
            endTime: data.end_time,
            hours: Number(data.hours) || 0,
            notes: data.notes,
            isValidated: data.is_validated ?? false,
            validatedBy: data.validated_by,
            validatedAt: data.validated_at,
            createdAt: data.created_at ?? ''
        }
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

        const { error } = await getSupabase()
            .from('schedule_events')
            .update(updateData)
            .eq('id', id)

        if (error) throw error
    },

    delete: async (id: string): Promise<void> => {
        const { error } = await getSupabase()
            .from('schedule_events')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    validate: async (id: string, validatedBy: string): Promise<void> => {
        const { error } = await getSupabase()
            .from('schedule_events')
            .update({
                is_validated: true,
                validated_by: validatedBy,
                validated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (error) throw error
    }
}

export const userProfilesApi = {
    getAll: async (): Promise<UserProfile[]> => {
        const { data, error } = await getSupabase()
            .from('user_profiles')
            .select(`
                *,
                staff!user_profiles_staff_id_fkey (first_name, last_name)
            `)
            .order('display_name')

        if (error) throw error
        return (data || []).map(p => {
            const staffData = p.staff as { first_name: string; last_name: string } | null
            return {
                id: p.id,
                staffId: p.staff_id,
                staffName: staffData ? `${staffData.first_name} ${staffData.last_name}` : null,
                displayName: p.display_name,
                role: p.role as 'admin' | 'manager' | 'user',
                avatarEmoji: p.avatar_emoji || '👤',
                lastLogin: p.last_login,
                preferences: (p.preferences as Record<string, unknown>) || {},
                isActive: p.is_active ?? true,
                createdAt: p.created_at ?? ''
            }
        })
    },

    getById: async (id: string): Promise<UserProfile> => {
        const { data, error } = await getSupabase()
            .from('user_profiles')
            .select(`
                *,
                staff!user_profiles_staff_id_fkey (first_name, last_name)
            `)
            .eq('id', id)
            .single()

        if (error) throw error
        const staffData = data.staff as { first_name: string; last_name: string } | null
        return {
            id: data.id,
            staffId: data.staff_id,
            staffName: staffData ? `${staffData.first_name} ${staffData.last_name}` : null,
            displayName: data.display_name,
            role: data.role as 'admin' | 'manager' | 'user',
            avatarEmoji: data.avatar_emoji || '👤',
            lastLogin: data.last_login,
            preferences: (data.preferences as Record<string, unknown>) || {},
            isActive: data.is_active ?? true,
            createdAt: data.created_at ?? ''
        }
    },

    create: async (profileData: Omit<UserProfile, 'id' | 'staffName' | 'createdAt'>): Promise<UserProfile> => {
        const { data, error } = await getSupabase()
            .from('user_profiles')
            .insert([{
                staff_id: profileData.staffId || null,
                display_name: profileData.displayName,
                role: profileData.role,
                avatar_emoji: profileData.avatarEmoji,
                preferences: profileData.preferences as Json || {}
            }])
            .select()
            .single()

        if (error) throw error
        return {
            id: data.id,
            staffId: data.staff_id,
            staffName: null,
            displayName: data.display_name,
            role: data.role as 'admin' | 'manager' | 'user',
            avatarEmoji: data.avatar_emoji || '👤',
            lastLogin: data.last_login,
            preferences: (data.preferences as Record<string, unknown>) || {},
            isActive: data.is_active ?? true,
            createdAt: data.created_at ?? ''
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

        const { error } = await getSupabase()
            .from('user_profiles')
            .update(updateData)
            .eq('id', id)

        if (error) throw error
    },

    delete: async (id: string): Promise<void> => {
        const { error } = await getSupabase()
            .from('user_profiles')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    updateLastLogin: async (id: string): Promise<void> => {
        const { error } = await getSupabase()
            .from('user_profiles')
            .update({ last_login: new Date().toISOString() })
            .eq('id', id)

        if (error) throw error
    }
}
