import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, type Supplier, SUPPLIER_CATEGORIES } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { PlusCircle, Loader2, Trash2, Phone, Mail, User, Building2, Pencil } from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"

const WEEKDAYS = [
    { value: 'lundi', label: 'Lundi' },
    { value: 'mardi', label: 'Mardi' },
    { value: 'mercredi', label: 'Mercredi' },
    { value: 'jeudi', label: 'Jeudi' },
    { value: 'vendredi', label: 'Vendredi' },
    { value: 'samedi', label: 'Samedi' },
    { value: 'dimanche', label: 'Dimanche' },
]

export function SuppliersPage() {
    const queryClient = useQueryClient()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean
        supplierId: string | null
    }>({ isOpen: false, supplierId: null })

    // Form state
    const [name, setName] = useState("")
    const [category, setCategory] = useState("autre")
    const [phone, setPhone] = useState("")
    const [email, setEmail] = useState("")
    const [contact, setContact] = useState("")
    const [notes, setNotes] = useState("")
    const [orderDays, setOrderDays] = useState<string[]>([])
    const [deliveryDays, setDeliveryDays] = useState<string[]>([])

    const { data: suppliers, isLoading } = useQuery({
        queryKey: ['suppliers'],
        queryFn: api.suppliers.getAll
    })

    const { data: orderReminders } = useQuery({
        queryKey: ['suppliers', 'reminders'],
        queryFn: api.suppliers.getTodayOrderReminders
    })

    const createMutation = useMutation({
        mutationFn: api.suppliers.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
            toast.success("Fournisseur ajouté")
            resetForm()
            setIsDialogOpen(false)
        },
        onError: () => toast.error("Erreur lors de l'ajout")
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Supplier> }) =>
            api.suppliers.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
            toast.success("Fournisseur modifié")
            resetForm()
            setIsDialogOpen(false)
        },
        onError: () => toast.error("Erreur lors de la modification")
    })

    const deleteMutation = useMutation({
        mutationFn: api.suppliers.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
            toast.success("Fournisseur supprimé")
        },
        onError: () => toast.error("Erreur lors de la suppression")
    })

    const resetForm = () => {
        setName("")
        setCategory("autre")
        setPhone("")
        setEmail("")
        setContact("")
        setNotes("")
        setOrderDays([])
        setDeliveryDays([])
        setEditingSupplier(null)
    }

    const handleEdit = (supplier: Supplier) => {
        setEditingSupplier(supplier)
        setName(supplier.name)
        setCategory(supplier.category)
        setPhone(supplier.phone)
        setEmail(supplier.email)
        setContact(supplier.contact)
        setNotes(supplier.notes)
        setOrderDays(supplier.orderDays)
        setDeliveryDays(supplier.deliveryDays)
        setIsDialogOpen(true)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!name) return

        const supplierData = {
            name,
            category,
            phone,
            email,
            contact,
            notes,
            logoUrl: "",
            orderDays,
            deliveryDays
        }

        if (editingSupplier) {
            updateMutation.mutate({ id: editingSupplier.id, data: supplierData })
        } else {
            createMutation.mutate(supplierData)
        }
    }

    const handleDelete = (id: string) => {
        setConfirmDialog({ isOpen: true, supplierId: id })
    }

    const confirmDelete = () => {
        if (confirmDialog.supplierId) {
            deleteMutation.mutate(confirmDialog.supplierId)
        }
        setConfirmDialog({ isOpen: false, supplierId: null })
    }

    const toggleDay = (day: string, list: string[], setList: (days: string[]) => void) => {
        if (list.includes(day)) {
            setList(list.filter(d => d !== day))
        } else {
            setList([...list, day])
        }
    }

    // Group suppliers by category
    const groupedSuppliers = suppliers?.reduce((acc, supplier) => {
        const cat = supplier.category || 'autre'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(supplier)
        return acc
    }, {} as Record<string, Supplier[]>) || {}

    const getCategoryInfo = (cat: string) => {
        return SUPPLIER_CATEGORIES.find(c => c.value === cat) || { value: cat, label: cat, color: 'bg-gray-500' }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Fournisseurs</h2>
                    <p className="text-muted-foreground">
                        Gérez vos fournisseurs et leurs informations
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open)
                    if (!open) resetForm()
                }}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Ajouter
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>
                                {editingSupplier ? "Modifier le fournisseur" : "Nouveau Fournisseur"}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nom *</Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Nom du fournisseur"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="category">Catégorie</Label>
                                    <Select value={category} onValueChange={setCategory}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SUPPLIER_CATEGORIES.map(cat => (
                                                <SelectItem key={cat.value} value={cat.value}>
                                                    {cat.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Téléphone</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="01 23 45 67 89"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="contact@fournisseur.fr"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="contact">Contact</Label>
                                <Input
                                    id="contact"
                                    value={contact}
                                    onChange={(e) => setContact(e.target.value)}
                                    placeholder="Nom du contact"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Jours de commande</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {WEEKDAYS.map(day => (
                                            <Badge
                                                key={day.value}
                                                variant={orderDays.includes(day.value) ? "default" : "outline"}
                                                className="cursor-pointer"
                                                onClick={() => toggleDay(day.value, orderDays, setOrderDays)}
                                            >
                                                {day.label.substring(0, 3)}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Jours de livraison</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {WEEKDAYS.map(day => (
                                            <Badge
                                                key={day.value}
                                                variant={deliveryDays.includes(day.value) ? "default" : "outline"}
                                                className="cursor-pointer"
                                                onClick={() => toggleDay(day.value, deliveryDays, setDeliveryDays)}
                                            >
                                                {day.label.substring(0, 3)}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Notes, conditions particulières..."
                                    rows={3}
                                />
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Annuler
                                </Button>
                                <Button type="submit" disabled={!name || createMutation.isPending || updateMutation.isPending}>
                                    {(createMutation.isPending || updateMutation.isPending) && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    {editingSupplier ? "Modifier" : "Ajouter"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Order Reminders */}
            {orderReminders && orderReminders.length > 0 && (
                <Card className="border-orange-200 bg-orange-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-orange-800 flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Rappel Commande Aujourd'hui
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {orderReminders.map(supplier => (
                                <Badge key={supplier.id} variant="outline" className="bg-white">
                                    {supplier.name}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Suppliers by Category */}
            {Object.keys(groupedSuppliers).length > 0 ? (
                <Accordion type="multiple" defaultValue={Object.keys(groupedSuppliers)} className="space-y-4">
                    {Object.entries(groupedSuppliers).map(([cat, catSuppliers]) => {
                        const categoryInfo = getCategoryInfo(cat)
                        return (
                            <AccordionItem key={cat} value={cat} className="border rounded-lg">
                                <AccordionTrigger className="px-4 hover:no-underline">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${categoryInfo.color}`} />
                                        <span className="font-semibold">{categoryInfo.label}</span>
                                        <Badge variant="secondary">{catSuppliers.length}</Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-4">
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        {catSuppliers.map(supplier => (
                                            <Card key={supplier.id}>
                                                <CardContent className="pt-4">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <h4 className="font-semibold text-lg">{supplier.name}</h4>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => handleEdit(supplier)}
                                                                aria-label="Modifier le fournisseur"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-red-500"
                                                                onClick={() => handleDelete(supplier.id)}
                                                                aria-label="Supprimer le fournisseur"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2 text-sm">
                                                        {supplier.contact && (
                                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                                <User className="h-4 w-4" />
                                                                {supplier.contact}
                                                            </div>
                                                        )}
                                                        {supplier.phone && (
                                                            <a href={`tel:${supplier.phone}`} className="flex items-center gap-2 text-blue-600 hover:underline">
                                                                <Phone className="h-4 w-4" />
                                                                {supplier.phone}
                                                            </a>
                                                        )}
                                                        {supplier.email && (
                                                            <a href={`mailto:${supplier.email}`} className="flex items-center gap-2 text-blue-600 hover:underline">
                                                                <Mail className="h-4 w-4" />
                                                                {supplier.email}
                                                            </a>
                                                        )}
                                                    </div>

                                                    {(supplier.orderDays.length > 0 || supplier.deliveryDays.length > 0) && (
                                                        <div className="mt-3 pt-3 border-t space-y-2">
                                                            {supplier.orderDays.length > 0 && (
                                                                <div>
                                                                    <span className="text-xs text-muted-foreground">Commande: </span>
                                                                    <span className="text-xs">{supplier.orderDays.join(', ')}</span>
                                                                </div>
                                                            )}
                                                            {supplier.deliveryDays.length > 0 && (
                                                                <div>
                                                                    <span className="text-xs text-muted-foreground">Livraison: </span>
                                                                    <span className="text-xs">{supplier.deliveryDays.join(', ')}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            ) : (
                <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                        Aucun fournisseur enregistré. Ajoutez votre premier fournisseur.
                    </CardContent>
                </Card>
            )}

            <ConfirmDialog
                open={confirmDialog.isOpen}
                onOpenChange={(open) => setConfirmDialog({ isOpen: open, supplierId: open ? confirmDialog.supplierId : null })}
                onConfirm={confirmDelete}
                title="Supprimer ce fournisseur ?"
                description="Cette action est irréversible. Toutes les informations du fournisseur seront définitivement supprimées."
                confirmText="Supprimer"
                variant="destructive"
            />
        </div>
    )
}
