import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Thermometer, Plus, Minus, Snowflake, ThermometerSun, Pencil, Trash2, History } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { TemperatureEquipment, TemperatureReading } from '@/lib/database.types';

const EQUIPMENT_TYPES = [
    { value: 'fridge', label: 'Refrigerateur', icon: '🧊' },
    { value: 'freezer', label: 'Congelateur', icon: '❄️' },
    { value: 'cold_room', label: 'Chambre froide', icon: '🏠' },
] as const;

function getEquipmentIcon(type: string) {
    return EQUIPMENT_TYPES.find(t => t.value === type)?.icon || '🧊';
}

function TemperatureInput({
    value,
    onChange,
    minTemp,
    maxTemp
}: {
    value: number;
    onChange: (value: number) => void;
    minTemp: number;
    maxTemp: number;
}) {
    const isCompliant = value >= minTemp && value <= maxTemp;

    const adjust = (delta: number) => {
        const newValue = Math.round((value + delta) * 10) / 10;
        onChange(newValue);
    };

    return (
        <div className="space-y-4">
            <div className={cn(
                "text-center py-8 rounded-xl transition-colors",
                isCompliant ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"
            )}>
                <div className="flex items-center justify-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-14 w-14 rounded-full"
                        onClick={() => adjust(-0.5)}
                    >
                        <Minus className="h-6 w-6" />
                    </Button>
                    <div className="text-center min-w-[140px]">
                        <span className={cn(
                            "text-6xl font-bold tabular-nums",
                            isCompliant ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        )}>
                            {value.toFixed(1)}
                        </span>
                        <span className="text-2xl ml-1">°C</span>
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-14 w-14 rounded-full"
                        onClick={() => adjust(0.5)}
                    >
                        <Plus className="h-6 w-6" />
                    </Button>
                </div>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground px-2">
                <span className="flex items-center gap-1">
                    <Snowflake className="h-3 w-3" /> Min: {minTemp}°C
                </span>
                <span className="flex items-center gap-1">
                    <ThermometerSun className="h-3 w-3" /> Max: {maxTemp}°C
                </span>
            </div>
        </div>
    );
}

function EquipmentCard({
    equipment,
    lastReading,
    onRecord,
    onEdit,
    onDelete,
    onViewHistory
}: {
    equipment: TemperatureEquipment;
    lastReading: TemperatureReading | null;
    onRecord: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onViewHistory: () => void;
}) {
    const isCompliant = lastReading
        ? lastReading.temperature >= equipment.min_temp && lastReading.temperature <= equipment.max_temp
        : true;

    const timeSinceReading = lastReading
        ? getTimeSince(new Date(lastReading.recorded_at))
        : null;

    return (
        <Card className={cn(
            "transition-all hover:shadow-md",
            !equipment.is_active && "opacity-60",
            lastReading && (isCompliant
                ? "border-green-500/50 bg-green-50/30 dark:bg-green-950/10"
                : "border-red-500 bg-red-50/50 dark:bg-red-950/20"
            )
        )}>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">{getEquipmentIcon(equipment.type)}</span>
                        <div>
                            <CardTitle className="text-lg">{equipment.name}</CardTitle>
                            {equipment.location && (
                                <CardDescription>{equipment.location}</CardDescription>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onViewHistory}>
                            <History className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {lastReading ? (
                    <>
                        <div className="text-center py-4">
                            <span className={cn(
                                "text-5xl font-bold tabular-nums",
                                isCompliant ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                            )}>
                                {lastReading.temperature.toFixed(1)}°C
                            </span>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                            <Badge variant={isCompliant ? "default" : "destructive"}>
                                {isCompliant ? '✓ Conforme' : '⚠ Hors plage'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                                {timeSinceReading}
                            </span>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-6 text-muted-foreground">
                        <Thermometer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Aucun releve</p>
                    </div>
                )}

                <div className="flex justify-between text-xs text-muted-foreground mb-3">
                    <span>Min: {equipment.min_temp}°C</span>
                    <span>Max: {equipment.max_temp}°C</span>
                </div>

                <Button className="w-full" onClick={onRecord} disabled={!equipment.is_active}>
                    <Thermometer className="mr-2 h-4 w-4" />
                    Saisir temperature
                </Button>
            </CardContent>
        </Card>
    );
}

function getTimeSince(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "A l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return `Il y a ${diffDays}j`;
}

export function TemperaturesPage() {
    const queryClient = useQueryClient();
    const [showAddEquipment, setShowAddEquipment] = useState(false);
    const [editingEquipment, setEditingEquipment] = useState<TemperatureEquipment | null>(null);
    const [recordingFor, setRecordingFor] = useState<TemperatureEquipment | null>(null);
    const [viewingHistory, setViewingHistory] = useState<TemperatureEquipment | null>(null);

    // Form states
    const [equipmentForm, setEquipmentForm] = useState<{
        name: string;
        type: 'fridge' | 'freezer' | 'cold_room';
        location: string;
        min_temp: number;
        max_temp: number;
    }>({
        name: '',
        type: 'fridge',
        location: '',
        min_temp: -5,
        max_temp: 5,
    });

    const [recordingTemp, setRecordingTemp] = useState(0);
    const [recordingNotes, setRecordingNotes] = useState('');

    // Queries
    const { data: equipments = [], isLoading } = useQuery({
        queryKey: ['temperature-equipment'],
        queryFn: api.temperatureEquipment.getAll,
    });

    const { data: latestReadings = {} } = useQuery({
        queryKey: ['temperature-readings-latest'],
        queryFn: async () => {
            const readings: Record<string, TemperatureReading> = {};
            await Promise.all(
                equipments.map(async (eq) => {
                    const latest = await api.temperatureReadings.getLatest(eq.id);
                    if (latest) readings[eq.id] = latest;
                })
            );
            return readings;
        },
        enabled: equipments.length > 0,
    });

    const { data: historyReadings = [] } = useQuery({
        queryKey: ['temperature-readings-history', viewingHistory?.id],
        queryFn: () => viewingHistory
            ? api.temperatureReadings.getByEquipment(viewingHistory.id, 20)
            : Promise.resolve([]),
        enabled: !!viewingHistory,
    });

    // Mutations
    const createEquipmentMutation = useMutation({
        mutationFn: api.temperatureEquipment.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['temperature-equipment'] });
            setShowAddEquipment(false);
            resetEquipmentForm();
            toast.success('Equipement ajoute');
        },
        onError: () => toast.error('Erreur lors de la creation'),
    });

    const updateEquipmentMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.temperatureEquipment.update>[1] }) =>
            api.temperatureEquipment.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['temperature-equipment'] });
            setEditingEquipment(null);
            resetEquipmentForm();
            toast.success('Equipement mis a jour');
        },
        onError: () => toast.error('Erreur lors de la mise a jour'),
    });

    const deleteEquipmentMutation = useMutation({
        mutationFn: api.temperatureEquipment.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['temperature-equipment'] });
            toast.success('Equipement supprime');
        },
        onError: () => toast.error('Erreur lors de la suppression'),
    });

    const createReadingMutation = useMutation({
        mutationFn: api.temperatureReadings.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['temperature-readings-latest'] });
            queryClient.invalidateQueries({ queryKey: ['temperature-readings-history'] });
            setRecordingFor(null);
            setRecordingTemp(0);
            setRecordingNotes('');
            toast.success('Temperature enregistree');
        },
        onError: () => toast.error('Erreur lors de l\'enregistrement'),
    });

    const resetEquipmentForm = () => {
        setEquipmentForm({
            name: '',
            type: 'fridge',
            location: '',
            min_temp: -5,
            max_temp: 5,
        });
    };

    const handleAddEquipment = () => {
        createEquipmentMutation.mutate(equipmentForm);
    };

    const handleUpdateEquipment = () => {
        if (!editingEquipment) return;
        updateEquipmentMutation.mutate({
            id: editingEquipment.id,
            data: equipmentForm,
        });
    };

    const handleRecordTemperature = () => {
        if (!recordingFor) return;
        createReadingMutation.mutate({
            equipment_id: recordingFor.id,
            temperature: recordingTemp,
            is_compliant: recordingTemp >= recordingFor.min_temp && recordingTemp <= recordingFor.max_temp,
            notes: recordingNotes || null,
        });
    };

    const openEditDialog = (equipment: TemperatureEquipment) => {
        setEquipmentForm({
            name: equipment.name,
            type: equipment.type as 'fridge' | 'freezer' | 'cold_room',
            location: equipment.location || '',
            min_temp: equipment.min_temp,
            max_temp: equipment.max_temp,
        });
        setEditingEquipment(equipment);
    };

    const openRecordDialog = (equipment: TemperatureEquipment) => {
        const latest = latestReadings[equipment.id];
        setRecordingTemp(latest?.temperature ?? (equipment.min_temp + equipment.max_temp) / 2);
        setRecordingNotes('');
        setRecordingFor(equipment);
    };

    if (isLoading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-muted rounded w-48" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 bg-muted rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Thermometer className="h-6 w-6" />
                        Releves de Temperature
                    </h1>
                    <p className="text-muted-foreground">
                        Suivi des temperatures des equipements frigorifiques
                    </p>
                </div>
                <Button onClick={() => setShowAddEquipment(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter equipement
                </Button>
            </div>

            {/* Equipment Grid */}
            {equipments.length === 0 ? (
                <Card className="p-12 text-center">
                    <Snowflake className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">Aucun equipement</h3>
                    <p className="text-muted-foreground mb-4">
                        Ajoutez vos refrigerateurs et congelateurs pour commencer le suivi
                    </p>
                    <Button onClick={() => setShowAddEquipment(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter un equipement
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {equipments.map((equipment) => (
                        <EquipmentCard
                            key={equipment.id}
                            equipment={equipment}
                            lastReading={latestReadings[equipment.id] || null}
                            onRecord={() => openRecordDialog(equipment)}
                            onEdit={() => openEditDialog(equipment)}
                            onDelete={() => {
                                if (confirm('Supprimer cet equipement ?')) {
                                    deleteEquipmentMutation.mutate(equipment.id);
                                }
                            }}
                            onViewHistory={() => setViewingHistory(equipment)}
                        />
                    ))}
                </div>
            )}

            {/* Add Equipment Dialog */}
            <Dialog open={showAddEquipment} onOpenChange={setShowAddEquipment}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ajouter un equipement</DialogTitle>
                        <DialogDescription>
                            Configurez un nouvel equipement frigorifique a surveiller
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nom</Label>
                            <Input
                                value={equipmentForm.name}
                                onChange={(e) => setEquipmentForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="Frigo cuisine"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select
                                value={equipmentForm.type}
                                onValueChange={(v) => setEquipmentForm(f => ({ ...f, type: v as typeof f.type }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {EQUIPMENT_TYPES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>
                                            {t.icon} {t.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Emplacement (optionnel)</Label>
                            <Input
                                value={equipmentForm.location}
                                onChange={(e) => setEquipmentForm(f => ({ ...f, location: e.target.value }))}
                                placeholder="Cuisine principale"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Temperature min (°C)</Label>
                                <Input
                                    type="number"
                                    step="0.5"
                                    value={equipmentForm.min_temp}
                                    onChange={(e) => setEquipmentForm(f => ({ ...f, min_temp: parseFloat(e.target.value) }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Temperature max (°C)</Label>
                                <Input
                                    type="number"
                                    step="0.5"
                                    value={equipmentForm.max_temp}
                                    onChange={(e) => setEquipmentForm(f => ({ ...f, max_temp: parseFloat(e.target.value) }))}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddEquipment(false)}>
                            Annuler
                        </Button>
                        <Button
                            onClick={handleAddEquipment}
                            disabled={!equipmentForm.name || createEquipmentMutation.isPending}
                        >
                            Ajouter
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Equipment Dialog */}
            <Dialog open={!!editingEquipment} onOpenChange={(open) => !open && setEditingEquipment(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Modifier l'equipement</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nom</Label>
                            <Input
                                value={equipmentForm.name}
                                onChange={(e) => setEquipmentForm(f => ({ ...f, name: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select
                                value={equipmentForm.type}
                                onValueChange={(v) => setEquipmentForm(f => ({ ...f, type: v as typeof f.type }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {EQUIPMENT_TYPES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>
                                            {t.icon} {t.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Emplacement</Label>
                            <Input
                                value={equipmentForm.location}
                                onChange={(e) => setEquipmentForm(f => ({ ...f, location: e.target.value }))}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Temperature min (°C)</Label>
                                <Input
                                    type="number"
                                    step="0.5"
                                    value={equipmentForm.min_temp}
                                    onChange={(e) => setEquipmentForm(f => ({ ...f, min_temp: parseFloat(e.target.value) }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Temperature max (°C)</Label>
                                <Input
                                    type="number"
                                    step="0.5"
                                    value={equipmentForm.max_temp}
                                    onChange={(e) => setEquipmentForm(f => ({ ...f, max_temp: parseFloat(e.target.value) }))}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingEquipment(null)}>
                            Annuler
                        </Button>
                        <Button
                            onClick={handleUpdateEquipment}
                            disabled={!equipmentForm.name || updateEquipmentMutation.isPending}
                        >
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Record Temperature Dialog */}
            <Dialog open={!!recordingFor} onOpenChange={(open) => !open && setRecordingFor(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span className="text-2xl">{recordingFor && getEquipmentIcon(recordingFor.type)}</span>
                            {recordingFor?.name}
                        </DialogTitle>
                        <DialogDescription>
                            Saisissez la temperature relevee
                        </DialogDescription>
                    </DialogHeader>

                    {recordingFor && (
                        <div className="space-y-4">
                            <TemperatureInput
                                value={recordingTemp}
                                onChange={setRecordingTemp}
                                minTemp={recordingFor.min_temp}
                                maxTemp={recordingFor.max_temp}
                            />

                            <div className="space-y-2">
                                <Label>Notes (optionnel)</Label>
                                <Textarea
                                    value={recordingNotes}
                                    onChange={(e) => setRecordingNotes(e.target.value)}
                                    placeholder="Observations particulieres..."
                                    rows={2}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRecordingFor(null)}>
                            Annuler
                        </Button>
                        <Button
                            onClick={handleRecordTemperature}
                            disabled={createReadingMutation.isPending}
                        >
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* History Dialog */}
            <Dialog open={!!viewingHistory} onOpenChange={(open) => !open && setViewingHistory(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <History className="h-5 w-5" />
                            Historique - {viewingHistory?.name}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="max-h-[400px] overflow-y-auto space-y-2">
                        {historyReadings.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                                Aucun releve enregistre
                            </p>
                        ) : (
                            historyReadings.map((reading) => {
                                const isCompliant = viewingHistory &&
                                    reading.temperature >= viewingHistory.min_temp &&
                                    reading.temperature <= viewingHistory.max_temp;

                                return (
                                    <div
                                        key={reading.id}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-lg border",
                                            isCompliant
                                                ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20"
                                                : "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20"
                                        )}
                                    >
                                        <div>
                                            <span className={cn(
                                                "text-xl font-bold",
                                                isCompliant ? "text-green-600" : "text-red-600"
                                            )}>
                                                {reading.temperature.toFixed(1)}°C
                                            </span>
                                            {reading.notes && (
                                                <p className="text-xs text-muted-foreground mt-1">{reading.notes}</p>
                                            )}
                                        </div>
                                        <div className="text-right text-sm text-muted-foreground">
                                            {new Date(reading.recorded_at).toLocaleDateString('fr-FR', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewingHistory(null)}>
                            Fermer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
