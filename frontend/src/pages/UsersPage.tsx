import { useState, useEffect } from 'react'
import { useAuth, type UserRole } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Pencil, Trash2, UserCog, Shield, ChefHat, Waves, Eye, EyeOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface UserProfile {
    id: string
    displayName: string
    role: UserRole
    avatarEmoji: string
    pinCode?: string
    staffId?: string | null
    isActive: boolean
    lastLogin?: string | null
    createdAt: string
}

interface Staff {
    id: string
    firstName: string
    lastName: string
}

const ROLE_CONFIG: Record<UserRole, { label: string; icon: React.ReactNode; color: string }> = {
    gerant: { label: 'Gérant', icon: <Shield className="w-4 h-4" />, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
    cuisinier: { label: 'Cuisinier', icon: <ChefHat className="w-4 h-4" />, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
    plongeur: { label: 'Plongeur', icon: <Waves className="w-4 h-4" />, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' }
}

const EMOJI_OPTIONS = ['👨‍💼', '👩‍💼', '👨‍🍳', '👩‍🍳', '🧑‍🍳', '👤', '🧑', '👨', '👩', '🧔', '👱']

export function UsersPage() {
    const { user, isGerant } = useAuth()
    const navigate = useNavigate()
    const [users, setUsers] = useState<UserProfile[]>([])
    const [staffList, setStaffList] = useState<Staff[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    
    // Dialog state
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    
    // Form state
    const [formData, setFormData] = useState({
        displayName: '',
        role: 'cuisinier' as UserRole,
        avatarEmoji: '👤',
        pinCode: '',
        staffId: '',
        isActive: true
    })
    const [showPin, setShowPin] = useState(false)
    
    // Delete confirmation
    const [deleteConfirm, setDeleteConfirm] = useState<UserProfile | null>(null)

    useEffect(() => {
        if (!isGerant) {
            navigate('/')
            return
        }
        loadData()
    }, [isGerant, navigate])

    const loadData = async () => {
        if (!supabase) return
        setIsLoading(true)
        setError('')

        try {
            // Load users
            const { data: usersData, error: usersError } = await supabase
                .from('user_profiles')
                .select('*')
                .order('display_name')

            if (usersError) throw usersError

            setUsers(usersData?.map(u => ({
                id: u.id,
                displayName: u.display_name,
                role: u.role as UserRole,
                avatarEmoji: u.avatar_emoji || '👤',
                pinCode: u.pin_code,
                staffId: u.staff_id,
                isActive: u.is_active ?? true,
                lastLogin: u.last_login,
                createdAt: u.created_at ?? ''
            })) || [])

            // Load staff for linking
            const { data: staffData, error: staffError } = await supabase
                .from('staff')
                .select('id, first_name, last_name')
                .eq('is_active', true)
                .order('first_name')

            if (staffError) throw staffError

            setStaffList(staffData?.map(s => ({
                id: s.id,
                firstName: s.first_name,
                lastName: s.last_name
            })) || [])

        } catch (err) {
            console.error('Error loading data:', err)
            setError('Erreur lors du chargement des données')
        } finally {
            setIsLoading(false)
        }
    }

    const openCreateDialog = () => {
        setEditingUser(null)
        setFormData({
            displayName: '',
            role: 'cuisinier',
            avatarEmoji: '👤',
            pinCode: generatePin(),
            staffId: '',
            isActive: true
        })
        setShowPin(true)
        setIsDialogOpen(true)
    }

    const openEditDialog = (userProfile: UserProfile) => {
        setEditingUser(userProfile)
        setFormData({
            displayName: userProfile.displayName,
            role: userProfile.role,
            avatarEmoji: userProfile.avatarEmoji,
            pinCode: userProfile.pinCode || '',
            staffId: userProfile.staffId || '',
            isActive: userProfile.isActive
        })
        setShowPin(false)
        setIsDialogOpen(true)
    }

    const generatePin = (): string => {
        return Math.floor(1000 + Math.random() * 9000).toString()
    }

    const handleSave = async () => {
        if (!supabase) return
        
        if (!formData.displayName.trim()) {
            setError('Le nom est requis')
            return
        }
        if (!formData.pinCode || formData.pinCode.length < 4) {
            setError('Le code PIN doit contenir au moins 4 chiffres')
            return
        }

        // Check PIN uniqueness
        const { data: existingPin } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('pin_code', formData.pinCode)
            .neq('id', editingUser?.id || '')
            .single()

        if (existingPin) {
            setError('Ce code PIN est déjà utilisé')
            return
        }

        setIsSaving(true)
        setError('')

        try {
            const userData = {
                display_name: formData.displayName.trim(),
                role: formData.role,
                avatar_emoji: formData.avatarEmoji,
                pin_code: formData.pinCode,
                staff_id: formData.staffId || null,
                is_active: formData.isActive,
                updated_at: new Date().toISOString()
            }

            if (editingUser) {
                const { error } = await supabase
                    .from('user_profiles')
                    .update(userData)
                    .eq('id', editingUser.id)

                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('user_profiles')
                    .insert([userData])

                if (error) throw error
            }

            setIsDialogOpen(false)
            loadData()
        } catch (err) {
            console.error('Error saving user:', err)
            setError('Erreur lors de la sauvegarde')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!supabase || !deleteConfirm) return

        // Prevent deleting yourself
        if (deleteConfirm.id === user?.id) {
            setError('Vous ne pouvez pas supprimer votre propre compte')
            setDeleteConfirm(null)
            return
        }

        try {
            const { error } = await supabase
                .from('user_profiles')
                .delete()
                .eq('id', deleteConfirm.id)

            if (error) throw error

            setDeleteConfirm(null)
            loadData()
        } catch (err) {
            console.error('Error deleting user:', err)
            setError('Erreur lors de la suppression')
        }
    }

    const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return 'Jamais'
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (!isGerant) {
        return null
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <UserCog className="w-8 h-8" />
                        Gestion des utilisateurs
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Créez et gérez les comptes utilisateurs de l'application
                    </p>
                </div>
                <Button onClick={openCreateDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvel utilisateur
                </Button>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Utilisateurs ({users.length})</CardTitle>
                    <CardDescription>
                        Liste de tous les utilisateurs avec leurs rôles et accès
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Aucun utilisateur trouvé
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Utilisateur</TableHead>
                                    <TableHead>Rôle</TableHead>
                                    <TableHead>Code PIN</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead>Dernière connexion</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((userProfile) => (
                                    <TableRow key={userProfile.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{userProfile.avatarEmoji}</span>
                                                <div>
                                                    <div className="font-medium">{userProfile.displayName}</div>
                                                    {userProfile.id === user?.id && (
                                                        <span className="text-xs text-muted-foreground">(Vous)</span>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={ROLE_CONFIG[userProfile.role].color}>
                                                {ROLE_CONFIG[userProfile.role].icon}
                                                <span className="ml-1">{ROLE_CONFIG[userProfile.role].label}</span>
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <code className="bg-muted px-2 py-1 rounded text-sm">
                                                {userProfile.pinCode || '****'}
                                            </code>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={userProfile.isActive ? 'default' : 'secondary'}>
                                                {userProfile.isActive ? 'Actif' : 'Inactif'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatDate(userProfile.lastLogin)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEditDialog(userProfile)}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setDeleteConfirm(userProfile)}
                                                    disabled={userProfile.id === user?.id}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingUser 
                                ? 'Modifiez les informations de l\'utilisateur'
                                : 'Créez un nouveau compte utilisateur'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="displayName">Nom d'affichage *</Label>
                            <Input
                                id="displayName"
                                value={formData.displayName}
                                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                placeholder="Ex: Jean Dupont"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role">Rôle *</Label>
                            <Select
                                value={formData.role}
                                onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gerant">
                                        <div className="flex items-center gap-2">
                                            <Shield className="w-4 h-4" />
                                            Gérant (accès complet)
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="cuisinier">
                                        <div className="flex items-center gap-2">
                                            <ChefHat className="w-4 h-4" />
                                            Cuisinier
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="plongeur">
                                        <div className="flex items-center gap-2">
                                            <Waves className="w-4 h-4" />
                                            Plongeur
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Cuisinier et Plongeur ont les mêmes accès. Seul le Gérant peut gérer les utilisateurs.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="pinCode">Code PIN *</Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        id="pinCode"
                                        type={showPin ? 'text' : 'password'}
                                        value={formData.pinCode}
                                        onChange={(e) => setFormData({ ...formData, pinCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                                        placeholder="4-6 chiffres"
                                        inputMode="numeric"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full"
                                        onClick={() => setShowPin(!showPin)}
                                    >
                                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </Button>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setFormData({ ...formData, pinCode: generatePin() })}
                                >
                                    Générer
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Avatar</Label>
                            <div className="flex flex-wrap gap-2">
                                {EMOJI_OPTIONS.map((emoji) => (
                                    <Button
                                        key={emoji}
                                        type="button"
                                        variant={formData.avatarEmoji === emoji ? 'default' : 'outline'}
                                        size="icon"
                                        className="text-xl"
                                        onClick={() => setFormData({ ...formData, avatarEmoji: emoji })}
                                    >
                                        {emoji}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="staffId">Lier à un collaborateur (optionnel)</Label>
                            <Select
                                value={formData.staffId}
                                onValueChange={(value) => setFormData({ ...formData, staffId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Aucun" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Aucun</SelectItem>
                                    {staffList.map((staff) => (
                                        <SelectItem key={staff.id} value={staff.id}>
                                            {staff.firstName} {staff.lastName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="isActive">Compte actif</Label>
                            <Switch
                                id="isActive"
                                checked={formData.isActive}
                                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {editingUser ? 'Enregistrer' : 'Créer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmer la suppression</DialogTitle>
                        <DialogDescription>
                            Êtes-vous sûr de vouloir supprimer l'utilisateur "{deleteConfirm?.displayName}" ?
                            Cette action est irréversible.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                            Annuler
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Supprimer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
