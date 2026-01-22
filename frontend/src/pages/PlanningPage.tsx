import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    api,
    type Staff,
    type ScheduleEvent,
    type ScheduleEventType,
    type StaffGroup,
    type WorkDay,
    EVENT_TYPES,
    STAFF_ROLES,
    STAFF_COLORS,
    STAFF_GROUPS,
    WEEK_DAYS
} from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from '@/components/ui/tabs'
import {
    ChevronLeft, ChevronRight, Plus, Users, Calendar, Clock,
    Loader2, Trash2, Pencil, Download, Mail, Check, X, UserPlus, AlertCircle, RefreshCw, Wand2, Settings2
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

// Helpers
const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0]
}

const getWeekDates = (date: Date): Date[] => {
    const start = new Date(date)
    start.setDate(start.getDate() - start.getDay() + 1) // Monday
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start)
        d.setDate(d.getDate() + i)
        return d
    })
}

const formatTime = (time: string | null | undefined): string => {
    if (!time) return ''
    return time.substring(0, 5)
}

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

export function PlanningPage() {
    const queryClient = useQueryClient()
    const { isGerant } = useAuth()
    const canEdit = isGerant // Seul le gérant peut modifier le planning
    const [activeTab, setActiveTab] = useState('calendar')
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)

    // Staff dialog
    const [isStaffDialogOpen, setIsStaffDialogOpen] = useState(false)
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
    const [staffForm, setStaffForm] = useState({
        firstName: '',
        lastName: '',
        role: 'Cuisinier',
        email: '',
        phone: '',
        color: STAFF_COLORS[0],
        contractHours: 35,
        staffGroup: 'week1' as StaffGroup,
        workDaysWeek1: ['mon', 'tue', 'wed', 'thu', 'fri'] as WorkDay[],
        workDaysWeek2: ['mon', 'tue', 'wed', 'thu', 'fri'] as WorkDay[]
    })

    // Event dialog
    const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
    const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null)
    const [eventForm, setEventForm] = useState({
        staffId: '',
        eventType: 'work' as ScheduleEventType,
        title: '',
        startDate: '',
        endDate: '',
        startTime: '08:00',
        endTime: '16:00',
        hours: 8,
        notes: ''
    })

    // Confirm dialogs
    const [confirmDeleteStaff, setConfirmDeleteStaff] = useState<{ open: boolean; staff: Staff | null }>({
        open: false,
        staff: null
    })
    const [confirmDeleteEvent, setConfirmDeleteEvent] = useState<{ open: boolean; event: ScheduleEvent | null }>({
        open: false,
        event: null
    })

    // Week dates
    const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate])
    const weekStart = formatDate(weekDates[0])
    const weekEnd = formatDate(weekDates[6])

    // Queries
    const { data: staffList = [], isLoading: loadingStaff } = useQuery({
        queryKey: ['staff'],
        queryFn: api.staff.getAll,
    })

    const { data: events = [], isLoading: loadingEvents } = useQuery({
        queryKey: ['schedule-events', weekStart, weekEnd],
        queryFn: () => api.scheduleEvents.getByDateRange(weekStart, weekEnd),
    })

    // Mutations
    const createStaffMutation = useMutation({
        mutationFn: api.staff.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'], refetchType: 'all' })
            toast.success('Collaborateur ajouté')
            setIsStaffDialogOpen(false)
            resetStaffForm()
        },
        onError: () => toast.error('Erreur lors de l\'ajout')
    })

    const updateStaffMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Staff> }) =>
            api.staff.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'], refetchType: 'all' })
            toast.success('Collaborateur modifié')
            setIsStaffDialogOpen(false)
            resetStaffForm()
        },
        onError: () => toast.error('Erreur lors de la modification')
    })

    const deleteStaffMutation = useMutation({
        mutationFn: api.staff.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'], refetchType: 'all' })
            toast.success('Collaborateur supprimé')
        },
        onError: () => toast.error('Erreur lors de la suppression')
    })

    const createEventMutation = useMutation({
        mutationFn: api.scheduleEvents.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule-events'], refetchType: 'all' })
            toast.success('Événement ajouté')
            setIsEventDialogOpen(false)
            resetEventForm()
        },
        onError: () => toast.error('Erreur lors de l\'ajout')
    })

    const updateEventMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<ScheduleEvent> }) =>
            api.scheduleEvents.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule-events'], refetchType: 'all' })
            toast.success('Événement modifié')
            setIsEventDialogOpen(false)
            resetEventForm()
        },
        onError: () => toast.error('Erreur lors de la modification')
    })

    const deleteEventMutation = useMutation({
        mutationFn: api.scheduleEvents.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule-events'], refetchType: 'all' })
            toast.success('Événement supprimé')
        },
        onError: () => toast.error('Erreur lors de la suppression')
    })

    // Handlers
    const resetStaffForm = () => {
        setEditingStaff(null)
        setStaffForm({
            firstName: '',
            lastName: '',
            role: 'Cuisinier',
            email: '',
            phone: '',
            color: STAFF_COLORS[0],
            contractHours: 35,
            staffGroup: 'week1' as StaffGroup,
            workDaysWeek1: ['mon', 'tue', 'wed', 'thu', 'fri'] as WorkDay[],
            workDaysWeek2: ['mon', 'tue', 'wed', 'thu', 'fri'] as WorkDay[]
        })
    }

    const resetEventForm = () => {
        setEditingEvent(null)
        setEventForm({
            staffId: '',
            eventType: 'work',
            title: '',
            startDate: '',
            endDate: '',
            startTime: '08:00',
            endTime: '16:00',
            hours: 8,
            notes: ''
        })
    }

    const handleEditStaff = (staff: Staff) => {
        setEditingStaff(staff)
        setStaffForm({
            firstName: staff.firstName,
            lastName: staff.lastName,
            role: staff.role,
            email: staff.email,
            phone: staff.phone,
            color: staff.color,
            contractHours: staff.contractHours,
            staffGroup: staff.staffGroup,
            workDaysWeek1: staff.workDaysWeek1 || ['mon', 'tue', 'wed', 'thu', 'fri'],
            workDaysWeek2: staff.workDaysWeek2 || ['mon', 'tue', 'wed', 'thu', 'fri']
        })
        setIsStaffDialogOpen(true)
    }

    const handleSubmitStaff = (e: React.FormEvent) => {
        e.preventDefault()
        if (!staffForm.firstName || !staffForm.lastName) return

        const data = {
            firstName: staffForm.firstName,
            lastName: staffForm.lastName,
            role: staffForm.role,
            email: staffForm.email,
            phone: staffForm.phone,
            color: staffForm.color,
            contractHours: staffForm.contractHours,
            staffGroup: staffForm.staffGroup,
            workDaysWeek1: staffForm.workDaysWeek1,
            workDaysWeek2: staffForm.workDaysWeek2,
            isActive: true
        }

        if (editingStaff) {
            updateStaffMutation.mutate({ id: editingStaff.id, data })
        } else {
            createStaffMutation.mutate(data)
        }
    }

    const handleAddEvent = (staffId: string, date: Date) => {
        if (!canEdit) return // Lecture seule pour non-gérants
        const dateStr = formatDate(date)
        setEventForm({
            ...eventForm,
            staffId,
            startDate: dateStr,
            endDate: dateStr
        })
        setIsEventDialogOpen(true)
    }

    const handleEditEvent = (event: ScheduleEvent) => {
        if (!canEdit) return // Lecture seule pour non-gérants
        setEditingEvent(event)
        setEventForm({
            staffId: event.staffId,
            eventType: event.eventType,
            title: event.title || '',
            startDate: event.startDate,
            endDate: event.endDate,
            startTime: formatTime(event.startTime) || '08:00',
            endTime: formatTime(event.endTime) || '16:00',
            hours: event.hours,
            notes: event.notes || ''
        })
        setIsEventDialogOpen(true)
    }

    const handleSubmitEvent = (e: React.FormEvent) => {
        e.preventDefault()
        if (!eventForm.staffId || !eventForm.startDate) return

        const data = {
            staffId: eventForm.staffId,
            eventType: eventForm.eventType,
            title: eventForm.title || null,
            startDate: eventForm.startDate,
            endDate: eventForm.endDate || eventForm.startDate,
            startTime: eventForm.startTime || null,
            endTime: eventForm.endTime || null,
            hours: eventForm.hours,
            notes: eventForm.notes || null,
            isValidated: false
        }

        if (editingEvent) {
            updateEventMutation.mutate({ id: editingEvent.id, data })
        } else {
            createEventMutation.mutate(data)
        }
    }

    const navigateWeek = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate)
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
        setCurrentDate(newDate)
    }

    const goToToday = () => {
        setCurrentDate(new Date())
    }

    // Get events for a specific staff and date
    const getEventsForCell = (staffId: string, date: Date): ScheduleEvent[] => {
        const dateStr = formatDate(date)
        return events.filter(e =>
            e.staffId === staffId &&
            e.startDate <= dateStr &&
            e.endDate >= dateStr
        )
    }

    // Calculate weekly hours for a staff
    const calculateWeeklyHours = (staffId: string): number => {
        return events
            .filter(e => e.staffId === staffId && (e.eventType === 'work' || e.eventType === 'overtime'))
            .reduce((sum, e) => sum + (e.hours || 0), 0)
    }

    // Export planning
    const exportPlanning = () => {
        let text = `📅 PLANNING SEMAINE DU ${weekDates[0].toLocaleDateString('fr-FR')} AU ${weekDates[6].toLocaleDateString('fr-FR')}\n\n`

        staffList.forEach(staff => {
            text += `\n👤 ${staff.firstName} ${staff.lastName} (${staff.role})\n`
            text += `${'─'.repeat(40)}\n`

            weekDates.forEach((date, idx) => {
                const dayEvents = getEventsForCell(staff.id, date)
                const dayLabel = `${DAYS_FR[idx]} ${date.getDate()}`

                if (dayEvents.length === 0) {
                    text += `${dayLabel}: -\n`
                } else {
                    dayEvents.forEach(event => {
                        const eventInfo = EVENT_TYPES[event.eventType]
                        const timeStr = event.startTime && event.endTime
                            ? ` ${formatTime(event.startTime)}-${formatTime(event.endTime)}`
                            : ''
                        text += `${dayLabel}: ${eventInfo.icon} ${eventInfo.label}${timeStr}\n`
                    })
                }
            })

            const weekHours = calculateWeeklyHours(staff.id)
            text += `\nTotal: ${weekHours}h / ${staff.contractHours}h contractuelles\n`
        })

        navigator.clipboard.writeText(text)
        toast.success('Planning copié dans le presse-papier')
    }

    // =================================================================================
    // GESTION DU ROULEMENT AUTOMATIQUE (2-2-3)
    // =================================================================================

    // Configuration automatique des profils staff
    const handleAutoConfigureRotation = async () => {
        if (!confirm("⚠️ Attention : Cette action va reconfigurer les jours de travail DE TOUS LES COLLABORATEURS basés sur leur groupe (Semaine 1 / Semaine 2). Voulez-vous continuer ?")) return

        const CYCLE_1_WEEK1: WorkDay[] = ['mon', 'thu', 'fri']
        const CYCLE_1_WEEK2: WorkDay[] = ['tue', 'wed', 'sat', 'sun']

        const CYCLE_2_WEEK1: WorkDay[] = ['tue', 'wed', 'sat', 'sun']
        const CYCLE_2_WEEK2: WorkDay[] = ['mon', 'thu', 'fri']

        let updatedCount = 0
        try {
            const updates = staffList.map(async (staff) => {
                let updates: Partial<Staff> = {}
                let changed = false

                if (staff.staffGroup === 'week1') {
                    // Equipe 1 : Configurer selon le cycle A
                    updates = { workDaysWeek1: CYCLE_1_WEEK1, workDaysWeek2: CYCLE_1_WEEK2 }
                    changed = true
                } else if (staff.staffGroup === 'week2') {
                    // Equipe 2 : Configurer selon le cycle B (Inverse)
                    updates = { workDaysWeek1: CYCLE_2_WEEK1, workDaysWeek2: CYCLE_2_WEEK2 }
                    changed = true
                }

                if (changed) {
                    await api.staff.update(staff.id, updates)
                    updatedCount++
                }
            })

            await Promise.all(updates)
            await queryClient.invalidateQueries({ queryKey: ['staff'], refetchType: 'all' })
            toast.success(`Rotation configurée pour ${updatedCount} collaborateurs`)
        } catch (err) {
            console.error(err)
            toast.error("Erreur lors de la configuration du roulement")
        }
    }

    // Vider le planning de la semaine affichée
    const handleClearWeek = async () => {
        if (!confirm(`⚠️ Êtes-vous sûr de vouloir supprimer TOUS les événements de la semaine du ${weekDates[0].toLocaleDateString()} ?\nCette action est irréversible.`)) return

        try {
            const startStr = formatDate(weekDates[0])
            const endStr = formatDate(weekDates[6])

            const eventsToDelete = events.filter(e =>
                e.startDate >= startStr && e.startDate <= endStr
            )

            if (eventsToDelete.length === 0) {
                toast.info("Aucun événement à supprimer pour cette semaine")
                return
            }

            const deletePromises = eventsToDelete.map(e => api.scheduleEvents.delete(e.id))
            await Promise.all(deletePromises)

            await queryClient.invalidateQueries({ queryKey: ['schedule'], refetchType: 'all' })
            toast.success(`${eventsToDelete.length} événements supprimés`)
        } catch (err) {
            console.error(err)
            toast.error("Erreur lors de la suppression")
        }
    }

    // Génération automatique du planning pour la semaine affichée
    const handleGeneratePlanning = async () => {
        if (!confirm(`Générer automatiquement les horaires de travail pour la semaine du ${weekDates[0].toLocaleDateString()} ?\nCela n'écrasera pas les événements existants.`)) return

        try {
            // Récupérer la liste des staff fraîchement mise à jour (pour être sûr d'avoir les bon jours de travail)
            const [freshStaffList, freshEvents] = await Promise.all([
                api.staff.getAll(),
                api.scheduleEvents.getAll()
            ])

            // 1. Déterminer si la semaine affichée s'aligne sur "Semaine 1" ou "Semaine 2"
            // On utilise le numéro de semaine ISO. Paire = Semaine 2 (B), Impaire = Semaine 1 (A)
            const getWeekNumber = (d: Date) => {
                const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
                date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
                const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
                return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
            }

            const weekNum = getWeekNumber(weekDates[0])
            const isWeek1 = weekNum % 2 !== 0 // Impaire = Semaine 1

            const weekTypeLabel = isWeek1 ? "Semaine 1 (Impaire)" : "Semaine 2 (Paire)"
            toast.info(`Génération pour ${weekTypeLabel}...`)

            let createdCount = 0
            const newEvents: Promise<any>[] = []

            for (const staff of freshStaffList) {
                // Quels jours ce staff doit-il travailler cette semaine ?
                // Si on est en Semaine Impaire (isWeek1=true), on prend ses jours de workDaysWeek1
                // Sinon on prend workDaysWeek2
                const targetDays = isWeek1 ? staff.workDaysWeek1 : staff.workDaysWeek2

                if (!targetDays || targetDays.length === 0) continue

                // Pour chaque jour de la semaine affichée
                weekDates.forEach((date, idx) => {
                    const dayKey = WEEK_DAYS[idx].key // 'mon', 'tue', ...

                    // Si ce jour est dans ses jours de travail
                    if (targetDays.includes(dayKey)) {
                        // Déterminer les horaires selon le rôle
                        let startTime = '08:00'
                        let endTime = '16:00'
                        let hours = 8
                        let notes = 'Auto-généré'

                        const role = (staff.role || '').toLowerCase()

                        if (role.includes('cuisinier') || role.includes('chef') || role.includes('second') || role.includes('commis')) {
                            startTime = '07:00'
                            endTime = '19:00'
                            hours = 10
                            notes = '07h-19h (2h pause)'
                        } else if (role.includes('plongeur')) {
                            startTime = '08:30'
                            endTime = '20:30'
                            hours = 10
                            notes = '08h30-20h30 (2h pause)'
                        } else if (role.includes('gérant') || role.includes('gerant') || role.includes('manager')) {
                            startTime = '07:00'
                            endTime = '15:30'
                            hours = 8.5
                            notes = '07h-15h30'
                        }

                        // Vérifier s'il a déjà un événement ce jour là avec les données FRAÎCHES
                        const existingEvent = freshEvents.find(e =>
                            e.staffId === staff.id &&
                            e.startDate === formatDate(date)
                        )

                        if (!existingEvent) {
                            // Créer
                            newEvents.push(api.scheduleEvents.create({
                                staffId: staff.id,
                                startDate: formatDate(date),
                                endDate: formatDate(date),
                                startTime,
                                endTime,
                                eventType: 'work',
                                hours,
                                notes,
                                isValidated: false
                            }))
                            createdCount++
                        } else if (existingEvent.eventType === 'work') {
                            // Si un event travail existe déjà, ON FORCE la mise à jour des horaires pour correspondre au rôle/config actuelle
                            // Cela permet de corriger les erreurs (ex: 8h->7h) et d'éviter les incohérences
                            if (existingEvent.startTime !== startTime || existingEvent.endTime !== endTime) {
                                newEvents.push(api.scheduleEvents.update(existingEvent.id, {
                                    startTime,
                                    endTime,
                                    hours,
                                    notes
                                }))
                                createdCount++
                            }
                        }
                    }
                })
            }

            if (newEvents.length > 0) {
                await Promise.all(newEvents)
                queryClient.invalidateQueries({ queryKey: ['schedule'], refetchType: 'all' })
                await queryClient.invalidateQueries({ queryKey: ['staff'], refetchType: 'all' }) // Rafraichir aussi staff pour l'ui
                toast.success(`${createdCount} événements crées pour ${weekTypeLabel}`)
            } else {
                toast.info("Aucun événement à créer (tout est déjà rempli ou personne ne travaille)")
            }

        } catch (err) {
            console.error(err)
            toast.error("Erreur lors de la génération")
        }
    }

    if (loadingStaff || loadingEvents) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Planning Équipe</h2>
                    <p className="text-muted-foreground">
                        Gérez les horaires, congés et disponibilités
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={exportPlanning}>
                        <Download className="h-4 w-4 mr-2" />
                        Exporter
                    </Button>
                    {canEdit && (
                        <Button onClick={() => setIsStaffDialogOpen(true)}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Collaborateur
                        </Button>
                    )}
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="calendar">
                        <Calendar className="h-4 w-4 mr-2" />
                        Calendrier
                    </TabsTrigger>
                    <TabsTrigger value="team">
                        <Users className="h-4 w-4 mr-2" />
                        Équipe ({staffList.length})
                    </TabsTrigger>
                </TabsList>

                {/* CALENDAR TAB */}
                <TabsContent value="calendar" className="space-y-4">
                    {/* Week navigation */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => navigateWeek('prev')}
                                    aria-label="Semaine précédente"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>

                                <div className="text-center">
                                    <h3 className="font-semibold text-lg">
                                        {MONTHS_FR[weekDates[0].getMonth()]} {weekDates[0].getFullYear()}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Semaine du {weekDates[0].getDate()} au {weekDates[6].getDate()} {MONTHS_FR[weekDates[6].getMonth()]}
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={goToToday}
                                        aria-label="Aller à aujourd'hui"
                                    >
                                        Aujourd'hui
                                    </Button>
                                    {canEdit && (
                                        <>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={handleClearWeek}
                                                title="Vider la semaine (Supprimer tous les événements)"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={handleGeneratePlanning}
                                                title="Générer planning auto"
                                            >
                                                <Wand2 className="h-4 w-4 text-primary" />
                                            </Button>
                                        </>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => navigateWeek('next')}
                                        aria-label="Semaine suivante"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Calendar grid */}
                    {staffList.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                <p>Aucun collaborateur</p>
                                <p className="text-sm mt-2">Ajoutez des collaborateurs pour créer le planning</p>
                                {canEdit && (
                                    <Button className="mt-4" onClick={() => setIsStaffDialogOpen(true)}>
                                        <UserPlus className="h-4 w-4 mr-2" />
                                        Ajouter un collaborateur
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="overflow-x-auto">
                            <div className="min-w-[800px]">
                                {/* Header row */}
                                <div className="grid grid-cols-8 gap-1 mb-2">
                                    <div className="p-2 font-medium text-muted-foreground">Équipe</div>
                                    {weekDates.map((date, idx) => {
                                        const isToday = formatDate(date) === formatDate(new Date())
                                        return (
                                            <div
                                                key={idx}
                                                className={cn(
                                                    "p-2 text-center rounded-lg",
                                                    isToday && "bg-primary text-primary-foreground"
                                                )}
                                            >
                                                <div className="font-medium">{DAYS_FR[idx]}</div>
                                                <div className="text-2xl font-bold">{date.getDate()}</div>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Staff rows - grouped by staffGroup */}
                                {(['manager', 'week1', 'week2'] as StaffGroup[]).map(groupKey => {
                                    const groupStaff = staffList.filter(s => s.staffGroup === groupKey)
                                    if (groupStaff.length === 0) return null
                                    const groupInfo = STAFF_GROUPS[groupKey]

                                    return (
                                        <div key={groupKey} className="mb-4">
                                            {/* Group header */}
                                            <div className="flex items-center gap-2 mb-2 px-2">
                                                <span className="text-lg">{groupInfo.icon}</span>
                                                <span
                                                    className="font-semibold text-sm"
                                                    style={{ color: groupInfo.color }}
                                                >
                                                    {groupInfo.label}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    ({groupStaff.length})
                                                </span>
                                                <div
                                                    className="flex-1 h-px ml-2"
                                                    style={{ backgroundColor: groupInfo.color + '40' }}
                                                />
                                            </div>

                                            {/* Staff members in this group */}
                                            {groupStaff.map(staff => (
                                                <div key={staff.id} className="grid grid-cols-8 gap-1 mb-1">
                                                    {/* Staff info */}
                                                    <div
                                                        className="p-2 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-muted/50"
                                                        style={{ borderLeft: `4px solid ${staff.color}` }}
                                                        onClick={() => setSelectedStaffId(selectedStaffId === staff.id ? null : staff.id)}
                                                        role="button"
                                                        tabIndex={0}
                                                        aria-label={`Basculer la vue pour ${staff.firstName} ${staff.lastName}`}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault()
                                                                setSelectedStaffId(selectedStaffId === staff.id ? null : staff.id)
                                                            }
                                                        }}
                                                    >
                                                        <div>
                                                            <div className="font-medium text-sm">
                                                                {staff.firstName} {staff.lastName.charAt(0)}.
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {calculateWeeklyHours(staff.id)}h / {staff.contractHours}h
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Day cells */}
                                                    {weekDates.map((date, idx) => {
                                                        const cellEvents = getEventsForCell(staff.id, date)
                                                        const isToday = formatDate(date) === formatDate(new Date())
                                                        const dayLabel = `${DAYS_FR[idx]} ${date.getDate()}`

                                                        return (
                                                            <div
                                                                key={idx}
                                                                className={cn(
                                                                    "min-h-[60px] p-1 rounded-lg border cursor-pointer transition-colors",
                                                                    isToday ? "bg-primary/5 border-primary/30" : "bg-muted/30 border-transparent",
                                                                    "hover:border-primary/50"
                                                                )}
                                                                onClick={() => handleAddEvent(staff.id, date)}
                                                                role="button"
                                                                tabIndex={0}
                                                                aria-label={`Ajouter un événement pour ${staff.firstName} ${staff.lastName} le ${dayLabel}`}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                                        e.preventDefault()
                                                                        handleAddEvent(staff.id, date)
                                                                    }
                                                                }}
                                                            >
                                                                {cellEvents.map(event => {
                                                                    const eventInfo = EVENT_TYPES[event.eventType]
                                                                    return (
                                                                        <div
                                                                            key={event.id}
                                                                            className="text-xs p-1 rounded mb-0.5 truncate cursor-pointer"
                                                                            style={{
                                                                                backgroundColor: `${eventInfo.color}20`,
                                                                                borderLeft: `3px solid ${eventInfo.color}`
                                                                            }}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation()
                                                                                handleEditEvent(event)
                                                                            }}
                                                                            role="button"
                                                                            tabIndex={0}
                                                                            aria-label={`${eventInfo.label} - ${event.startTime ? formatTime(event.startTime) : 'Modifier'}`}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                                    e.preventDefault()
                                                                                    e.stopPropagation()
                                                                                    handleEditEvent(event)
                                                                                }
                                                                            }}
                                                                        >
                                                                            <span className="mr-1">{eventInfo.icon}</span>
                                                                            {event.startTime && (
                                                                                <span className="font-mono">
                                                                                    {formatTime(event.startTime)}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Legend */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex flex-wrap gap-4">
                                {Object.entries(EVENT_TYPES).map(([key, info]) => (
                                    <div key={key} className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded"
                                            style={{ backgroundColor: info.color }}
                                        />
                                        <span className="text-sm">{info.icon} {info.label}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TEAM TAB */}
                <TabsContent value="team" className="space-y-4">
                    <div className="flex justify-end">
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={handleAutoConfigureRotation}
                            title="Configure automatiquement les jours de tous les collaborateurs (Cycle 2-2-3)"
                        >
                            <Settings2 className="h-4 w-4" />
                            Configurer Roulement Auto
                        </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {staffList.map(staff => (
                            <Card key={staff.id} className="overflow-hidden">
                                <div
                                    className="h-2"
                                    style={{ backgroundColor: staff.color }}
                                />
                                <CardContent className="pt-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-semibold text-lg">
                                                {staff.firstName} {staff.lastName}
                                            </h3>
                                            <p className="text-muted-foreground">{staff.role}</p>
                                        </div>
                                        {canEdit && (
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => handleEditStaff(staff)}
                                                    aria-label={`Modifier ${staff.firstName} ${staff.lastName}`}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500"
                                                    onClick={() => setConfirmDeleteStaff({ open: true, staff })}
                                                    aria-label={`Supprimer ${staff.firstName} ${staff.lastName}`}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <span>{staff.contractHours}h / semaine</span>
                                        </div>
                                        {staff.email && (
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                <span className="truncate">{staff.email}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 pt-3 border-t flex items-center justify-between">
                                        <Badge variant={staff.isActive ? "default" : "secondary"}>
                                            {staff.isActive ? 'Actif' : 'Inactif'}
                                        </Badge>
                                        {canEdit && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setEventForm({
                                                        ...eventForm,
                                                        staffId: staff.id,
                                                        startDate: formatDate(new Date()),
                                                        endDate: formatDate(new Date())
                                                    })
                                                    setIsEventDialogOpen(true)
                                                }}
                                            >
                                                <Plus className="h-4 w-4 mr-1" />
                                                Événement
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {/* Add card */}
                        {canEdit && (
                            <Card
                                className="border-dashed cursor-pointer hover:border-primary transition-colors"
                                onClick={() => setIsStaffDialogOpen(true)}
                            >
                                <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground">
                                    <UserPlus className="h-12 w-12 mb-2 opacity-50" />
                                    <span>Ajouter un collaborateur</span>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Staff Dialog */}
            <Dialog open={isStaffDialogOpen} onOpenChange={(open) => {
                setIsStaffDialogOpen(open)
                if (!open) resetStaffForm()
            }}>
                <DialogContent className="bg-white dark:bg-slate-900">
                    <DialogHeader>
                        <DialogTitle>
                            {editingStaff ? 'Modifier le collaborateur' : 'Nouveau collaborateur'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmitStaff} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Prénom *</Label>
                                <Input
                                    value={staffForm.firstName}
                                    onChange={(e) => setStaffForm({ ...staffForm, firstName: e.target.value })}
                                    placeholder="Jean"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Nom *</Label>
                                <Input
                                    value={staffForm.lastName}
                                    onChange={(e) => setStaffForm({ ...staffForm, lastName: e.target.value })}
                                    placeholder="Dupont"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Poste</Label>
                                <Select
                                    value={staffForm.role}
                                    onValueChange={(v) => setStaffForm({ ...staffForm, role: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STAFF_ROLES.map(role => (
                                            <SelectItem key={role} value={role}>{role}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Heures / semaine</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="60"
                                    value={staffForm.contractHours}
                                    onChange={(e) => setStaffForm({ ...staffForm, contractHours: parseInt(e.target.value) || 35 })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={staffForm.email}
                                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                                    placeholder="jean@clinique.fr"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Téléphone</Label>
                                <Input
                                    value={staffForm.phone}
                                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                                    placeholder="06 12 34 56 78"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Couleur</Label>
                            <div className="flex gap-2 flex-wrap">
                                {STAFF_COLORS.map(color => (
                                    <button
                                        key={color}
                                        type="button"
                                        className={cn(
                                            "w-8 h-8 rounded-full transition-transform",
                                            staffForm.color === color && "ring-2 ring-offset-2 ring-primary scale-110"
                                        )}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setStaffForm({ ...staffForm, color })}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Groupe</Label>
                            <div className="flex gap-2 flex-wrap">
                                {(Object.entries(STAFF_GROUPS) as [StaffGroup, { label: string; color: string; icon: string }][]).map(([key, group]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        className={cn(
                                            "px-3 py-2 rounded-lg border-2 transition-all flex items-center gap-2",
                                            staffForm.staffGroup === key
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-muted hover:border-primary/50"
                                        )}
                                        onClick={() => setStaffForm({ ...staffForm, staffGroup: key })}
                                    >
                                        <span>{group.icon}</span>
                                        <span className="font-medium">{group.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Jours de travail Semaine 1 */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <span className="text-blue-500">1️⃣</span>
                                Jours travaillés - Semaine 1
                            </Label>
                            <div className="flex gap-1 flex-wrap">
                                {WEEK_DAYS.map(day => {
                                    const isSelected = staffForm.workDaysWeek1.includes(day.key)
                                    return (
                                        <button
                                            key={day.key}
                                            type="button"
                                            className={cn(
                                                "w-10 h-10 rounded-lg border-2 font-bold transition-all",
                                                isSelected
                                                    ? "border-blue-500 bg-blue-500 text-white"
                                                    : "border-muted text-muted-foreground hover:border-blue-300"
                                            )}
                                            onClick={() => {
                                                const newDays = isSelected
                                                    ? staffForm.workDaysWeek1.filter(d => d !== day.key)
                                                    : [...staffForm.workDaysWeek1, day.key]
                                                setStaffForm({ ...staffForm, workDaysWeek1: newDays })
                                            }}
                                            title={day.label}
                                        >
                                            {day.short}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Jours de travail Semaine 2 */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <span className="text-green-500">2️⃣</span>
                                Jours travaillés - Semaine 2
                            </Label>
                            <div className="flex gap-1 flex-wrap">
                                {WEEK_DAYS.map(day => {
                                    const isSelected = staffForm.workDaysWeek2.includes(day.key)
                                    return (
                                        <button
                                            key={day.key}
                                            type="button"
                                            className={cn(
                                                "w-10 h-10 rounded-lg border-2 font-bold transition-all",
                                                isSelected
                                                    ? "border-green-500 bg-green-500 text-white"
                                                    : "border-muted text-muted-foreground hover:border-green-300"
                                            )}
                                            onClick={() => {
                                                const newDays = isSelected
                                                    ? staffForm.workDaysWeek2.filter(d => d !== day.key)
                                                    : [...staffForm.workDaysWeek2, day.key]
                                                setStaffForm({ ...staffForm, workDaysWeek2: newDays })
                                            }}
                                            title={day.label}
                                        >
                                            {day.short}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsStaffDialogOpen(false)}>
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                disabled={!staffForm.firstName || !staffForm.lastName || createStaffMutation.isPending || updateStaffMutation.isPending}
                            >
                                {(createStaffMutation.isPending || updateStaffMutation.isPending) && (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                )}
                                {editingStaff ? 'Modifier' : 'Ajouter'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Event Dialog */}
            <Dialog open={isEventDialogOpen} onOpenChange={(open) => {
                setIsEventDialogOpen(open)
                if (!open) resetEventForm()
            }}>
                <DialogContent className="bg-white dark:bg-slate-900">
                    <DialogHeader>
                        <DialogTitle>
                            {editingEvent ? 'Modifier l\'événement' : 'Nouvel événement'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmitEvent} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Collaborateur *</Label>
                            <Select
                                value={eventForm.staffId}
                                onValueChange={(v) => setEventForm({ ...eventForm, staffId: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner" />
                                </SelectTrigger>
                                <SelectContent>
                                    {staffList.map(s => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.firstName} {s.lastName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Type d'événement *</Label>
                            <div className="grid grid-cols-4 gap-2">
                                {Object.entries(EVENT_TYPES).map(([key, info]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        className={cn(
                                            "p-2 rounded-lg border text-center transition-all",
                                            eventForm.eventType === key
                                                ? "border-2"
                                                : "border-muted hover:border-primary/50"
                                        )}
                                        style={{
                                            borderColor: eventForm.eventType === key ? info.color : undefined,
                                            backgroundColor: eventForm.eventType === key ? `${info.color}20` : undefined
                                        }}
                                        onClick={() => setEventForm({ ...eventForm, eventType: key as ScheduleEventType })}
                                    >
                                        <div className="text-xl">{info.icon}</div>
                                        <div className="text-xs mt-1">{info.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date début *</Label>
                                <Input
                                    type="date"
                                    value={eventForm.startDate}
                                    onChange={(e) => setEventForm({
                                        ...eventForm,
                                        startDate: e.target.value,
                                        endDate: eventForm.endDate || e.target.value
                                    })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Date fin</Label>
                                <Input
                                    type="date"
                                    value={eventForm.endDate}
                                    onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                                    min={eventForm.startDate}
                                />
                            </div>
                        </div>

                        {(eventForm.eventType === 'work' || eventForm.eventType === 'overtime') && (
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Heure début</Label>
                                    <Input
                                        type="time"
                                        value={eventForm.startTime}
                                        onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Heure fin</Label>
                                    <Input
                                        type="time"
                                        value={eventForm.endTime}
                                        onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Heures</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={eventForm.hours}
                                        onChange={(e) => setEventForm({ ...eventForm, hours: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea
                                value={eventForm.notes}
                                onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                                placeholder="Notes optionnelles..."
                                rows={2}
                            />
                        </div>

                        <DialogFooter className="gap-2">
                            {editingEvent && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() => setConfirmDeleteEvent({ open: true, event: editingEvent })}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Supprimer
                                </Button>
                            )}
                            <div className="flex-1" />
                            <Button type="button" variant="outline" onClick={() => setIsEventDialogOpen(false)}>
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                disabled={!eventForm.staffId || !eventForm.startDate || createEventMutation.isPending || updateEventMutation.isPending}
                            >
                                {(createEventMutation.isPending || updateEventMutation.isPending) && (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                )}
                                {editingEvent ? 'Modifier' : 'Ajouter'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Confirm Delete Staff Dialog */}
            <ConfirmDialog
                open={confirmDeleteStaff.open}
                onOpenChange={(open) => setConfirmDeleteStaff({ open, staff: null })}
                title="Supprimer le collaborateur"
                description={
                    confirmDeleteStaff.staff
                        ? `Êtes-vous sûr de vouloir supprimer ${confirmDeleteStaff.staff.firstName} ${confirmDeleteStaff.staff.lastName} ? Cette action est irréversible.`
                        : ''
                }
                onConfirm={() => {
                    if (confirmDeleteStaff.staff) {
                        deleteStaffMutation.mutate(confirmDeleteStaff.staff.id)
                    }
                    setConfirmDeleteStaff({ open: false, staff: null })
                }}
                confirmText="Supprimer"
                cancelText="Annuler"
                variant="destructive"
            />

            {/* Confirm Delete Event Dialog */}
            <ConfirmDialog
                open={confirmDeleteEvent.open}
                onOpenChange={(open) => setConfirmDeleteEvent({ open, event: null })}
                title="Supprimer l'événement"
                description="Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible."
                onConfirm={() => {
                    if (confirmDeleteEvent.event) {
                        deleteEventMutation.mutate(confirmDeleteEvent.event.id)
                        setIsEventDialogOpen(false)
                    }
                    setConfirmDeleteEvent({ open: false, event: null })
                }}
                confirmText="Supprimer"
                cancelText="Annuler"
                variant="destructive"
            />
        </div>
    )
}
