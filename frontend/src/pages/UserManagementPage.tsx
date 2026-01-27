import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Users, Shield, ChevronRight, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { permissionsApi, AVAILABLE_PERMISSIONS, type UserWithPermissions, type PermissionKey } from '@/lib/api'

export function UserManagementPage() {
    const queryClient = useQueryClient()
    const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null)

    // Fetch all users with permissions
    const { data: users = [], isLoading } = useQuery({
        queryKey: ['users-permissions'],
        queryFn: permissionsApi.getAllUsersWithPermissions
    })

    // Update permission mutation
    const updatePermissionMutation = useMutation({
        mutationFn: ({ userId, permissionKey, isEnabled }: { userId: string; permissionKey: string; isEnabled: boolean }) =>
            permissionsApi.updatePermission(userId, permissionKey, isEnabled),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users-permissions'], refetchType: 'all' })
            toast.success('Permission mise à jour')
        },
        onError: (error) => {
            console.error('Error updating permission:', error)
            toast.error('Erreur lors de la mise à jour')
        }
    })

    // Update user status mutation
    const updateStatusMutation = useMutation({
        mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
            permissionsApi.updateUserStatus(userId, isActive),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users-permissions'], refetchType: 'all' })
            toast.success('Statut mis à jour')
        },
        onError: (error) => {
            console.error('Error updating status:', error)
            toast.error('Erreur lors de la mise à jour')
        }
    })

    const handleTogglePermission = (userId: string, permissionKey: PermissionKey, currentValue: boolean) => {
        updatePermissionMutation.mutate({
            userId,
            permissionKey,
            isEnabled: !currentValue
        })
        
        // Optimistic update
        if (selectedUser && selectedUser.id === userId) {
            setSelectedUser({
                ...selectedUser,
                permissions: {
                    ...selectedUser.permissions,
                    [permissionKey]: !currentValue
                }
            })
        }
    }

    const handleToggleStatus = (userId: string, currentStatus: boolean) => {
        updateStatusMutation.mutate({ userId, isActive: !currentStatus })
    }

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'gerant': return 'bg-purple-500'
            case 'cuisinier': return 'bg-blue-500'
            case 'plongeur': return 'bg-green-500'
            default: return 'bg-gray-500'
        }
    }

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'gerant': return 'Gérant'
            case 'cuisinier': return 'Cuisinier'
            case 'plongeur': return 'Plongeur'
            default: return role
        }
    }

    // Group permissions by category
    const permissionsByCategory = AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
        if (!acc[perm.category]) {
            acc[perm.category] = []
        }
        acc[perm.category].push(perm)
        return acc
    }, {} as Record<string, typeof AVAILABLE_PERMISSIONS[number][]>)

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6 space-y-4 md:space-y-6 pb-safe">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 md:gap-3">
                    <Users className="w-6 h-6 md:w-8 md:h-8" />
                    Gestion des Utilisateurs
                </h1>
                <p className="text-sm md:text-base text-muted-foreground mt-1">
                    Gérez les droits et permissions de chaque collaborateur
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Users List */}
                <Card className="lg:col-span-1">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Utilisateurs</CardTitle>
                        <CardDescription className="text-sm">Sélectionnez un utilisateur pour modifier ses droits</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {users.map(user => (
                            <Button
                                key={user.id}
                                variant={selectedUser?.id === user.id ? 'default' : 'outline'}
                                className="w-full justify-start h-auto min-h-[56px] py-3"
                                onClick={() => setSelectedUser(user)}
                            >
                                <span className="text-2xl mr-3">{user.avatarEmoji}</span>
                                <div className="flex-1 text-left min-w-0">
                                    <div className="font-medium truncate">{user.displayName}</div>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <Badge variant="secondary" className={`${getRoleColor(user.role)} text-white text-xs`}>
                                            {getRoleLabel(user.role)}
                                        </Badge>
                                        {!user.isActive && (
                                            <Badge variant="destructive" className="text-xs">Inactif</Badge>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 opacity-50 flex-shrink-0" />
                            </Button>
                        ))}
                    </CardContent>
                </Card>

                {/* Permissions Panel */}
                <Card className="lg:col-span-2">
                    {selectedUser ? (
                        <>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-4xl">{selectedUser.avatarEmoji}</span>
                                        <div>
                                            <CardTitle>{selectedUser.displayName}</CardTitle>
                                            <CardDescription className="flex items-center gap-2 mt-1">
                                                <Badge variant="secondary" className={`${getRoleColor(selectedUser.role)} text-white`}>
                                                    {getRoleLabel(selectedUser.role)}
                                                </Badge>
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">
                                            {selectedUser.isActive ? 'Actif' : 'Inactif'}
                                        </span>
                                        <Switch
                                            checked={selectedUser.isActive}
                                            onCheckedChange={() => handleToggleStatus(selectedUser.id, selectedUser.isActive)}
                                            disabled={selectedUser.role === 'gerant'}
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {selectedUser.role === 'gerant' ? (
                                    <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-4 text-center">
                                        <Shield className="w-12 h-12 mx-auto text-purple-500 mb-2" />
                                        <p className="font-medium text-purple-700 dark:text-purple-300">
                                            Le gérant a tous les droits
                                        </p>
                                        <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                                            Les permissions du gérant ne peuvent pas être modifiées
                                        </p>
                                    </div>
                                ) : (
                                    <Tabs defaultValue="Pages" className="w-full">
                                        <TabsList className="grid w-full grid-cols-2 h-12">
                                            <TabsTrigger value="Pages" className="h-10">Pages</TabsTrigger>
                                            <TabsTrigger value="Actions" className="h-10">Actions</TabsTrigger>
                                        </TabsList>

                                        {Object.entries(permissionsByCategory).map(([category, perms]) => (
                                            <TabsContent key={category} value={category} className="mt-4 space-y-3">
                                                {perms.map(perm => {
                                                    const isEnabled = selectedUser.permissions[perm.key as PermissionKey] ?? false
                                                    return (
                                                        <div
                                                            key={perm.key}
                                                            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors min-h-[72px]"
                                                        >
                                                            <div className="flex-1 min-w-0 mr-4">
                                                                <div className="font-medium flex items-center gap-2 flex-wrap">
                                                                    <span className="truncate">{perm.label}</span>
                                                                    {isEnabled ? (
                                                                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                                    ) : (
                                                                        <X className="w-4 h-4 text-red-500 flex-shrink-0" />
                                                                    )}
                                                                </div>
                                                                <p className="text-sm text-muted-foreground mt-1">{perm.description}</p>
                                                            </div>
                                                            <Switch
                                                                checked={isEnabled}
                                                                onCheckedChange={() => handleTogglePermission(selectedUser.id, perm.key as PermissionKey, isEnabled)}
                                                                disabled={updatePermissionMutation.isPending}
                                                            />
                                                        </div>
                                                    )
                                                })}
                                            </TabsContent>
                                        ))}
                                    </Tabs>
                                )}
                            </CardContent>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                            <Shield className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-lg font-medium">Sélectionnez un utilisateur</p>
                            <p className="text-sm">pour modifier ses permissions</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    )
}
