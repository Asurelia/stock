import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Camera, Calendar, Search, Filter, Image as ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { TraceabilityPhoto } from '@/lib/database.types';

type DateFilter = 'today' | 'week' | 'month' | 'all';

function getDateRange(filter: DateFilter): { from: string; to: string } {
    const now = new Date();
    const to = now.toISOString();

    switch (filter) {
        case 'today': {
            const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            return { from, to };
        }
        case 'week': {
            const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            return { from, to };
        }
        case 'month': {
            const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
            return { from, to };
        }
        default:
            return { from: '1970-01-01', to };
    }
}

function CompletionDonut({ percentage, size = 120 }: { percentage: number; size?: number }) {
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-muted/30"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className={cn(
                        "transition-all duration-500",
                        percentage === 100 ? "text-green-500" : percentage >= 50 ? "text-orange-500" : "text-red-500"
                    )}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">{percentage}%</span>
            </div>
        </div>
    );
}

export function TraceabilityPage() {
    const [dateFilter, setDateFilter] = useState<DateFilter>('week');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPhoto, setSelectedPhoto] = useState<TraceabilityPhoto | null>(null);
    const [photoIndex, setPhotoIndex] = useState(0);

    const { from, to } = getDateRange(dateFilter);

    const { data: photos = [], isLoading } = useQuery({
        queryKey: ['traceability-photos', from, to],
        queryFn: () => api.traceabilityPhotos.getByDateRange(from, to),
    });

    // Get stats
    const { data: stats } = useQuery({
        queryKey: ['traceability-stats', from, to],
        queryFn: async () => {
            // In a real app, this would be a dedicated endpoint
            // For now, we calculate from photos
            const todayOutputs = await api.outputs.getByDateRange(from, to);
            const uniqueProducts = new Set(todayOutputs.map(o => o.productId));

            // Get unique product IDs from photos (via outputs relation)
            const productsWithPhotos = new Set(
                photos
                    .map(p => {
                        const outputs = p.outputs as { id: string; product_id: string } | null;
                        return outputs?.product_id;
                    })
                    .filter((id): id is string => id !== null && id !== undefined)
            );

            return {
                total: uniqueProducts.size,
                withPhotos: productsWithPhotos.size,
                percentage: uniqueProducts.size > 0
                    ? Math.round((productsWithPhotos.size / uniqueProducts.size) * 100)
                    : 100,
            };
        },
        enabled: photos !== undefined,
    });

    const filteredPhotos = photos.filter(photo => {
        if (!searchQuery) return true;
        return photo.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Group photos by date
    const groupedByDate = filteredPhotos.reduce((acc, photo) => {
        const date = new Date(photo.captured_at).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        });
        if (!acc[date]) acc[date] = [];
        acc[date].push(photo);
        return acc;
    }, {} as Record<string, TraceabilityPhoto[]>);

    const handlePrevPhoto = () => {
        if (photoIndex > 0) {
            setPhotoIndex(photoIndex - 1);
            setSelectedPhoto(filteredPhotos[photoIndex - 1]);
        }
    };

    const handleNextPhoto = () => {
        if (photoIndex < filteredPhotos.length - 1) {
            setPhotoIndex(photoIndex + 1);
            setSelectedPhoto(filteredPhotos[photoIndex + 1]);
        }
    };

    const openPhotoViewer = (photo: TraceabilityPhoto) => {
        const index = filteredPhotos.findIndex(p => p.id === photo.id);
        setPhotoIndex(index);
        setSelectedPhoto(photo);
    };

    if (isLoading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-muted rounded w-48" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="aspect-square bg-muted rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Camera className="h-6 w-6" />
                        Tracabilite Photos
                    </h1>
                    <p className="text-muted-foreground">
                        Historique des photos d'etiquettes pour la tracabilite
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                        <SelectTrigger className="w-[150px]">
                            <Calendar className="h-4 w-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Aujourd'hui</SelectItem>
                            <SelectItem value="week">Cette semaine</SelectItem>
                            <SelectItem value="month">Ce mois</SelectItem>
                            <SelectItem value="all">Tout</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Stats Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <CompletionDonut percentage={stats?.percentage || 0} />
                        <div className="flex-1 space-y-4">
                            <h3 className="font-semibold text-lg">Taux de completion</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-2xl font-bold text-green-600">{stats?.withPhotos || 0}</p>
                                    <p className="text-sm text-muted-foreground">Photos prises</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-2xl font-bold text-orange-600">{(stats?.total || 0) - (stats?.withPhotos || 0)}</p>
                                    <p className="text-sm text-muted-foreground">En attente</p>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Les categories "Fruits" et "Legumes" sont exemptees de tracabilite photo.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Search */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher par notes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Badge variant="secondary">
                    {filteredPhotos.length} photo{filteredPhotos.length > 1 ? 's' : ''}
                </Badge>
            </div>

            {/* Photos Grid by Date */}
            {Object.keys(groupedByDate).length === 0 ? (
                <Card className="p-12 text-center">
                    <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">Aucune photo</h3>
                    <p className="text-muted-foreground">
                        Les photos de tracabilite apparaitront ici lorsque vous en prendrez depuis l'onglet Sorties.
                    </p>
                </Card>
            ) : (
                <div className="space-y-8">
                    {Object.entries(groupedByDate).map(([date, datePhotos]) => (
                        <div key={date} className="space-y-3">
                            <h3 className="font-medium text-muted-foreground capitalize">{date}</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                {datePhotos.map((photo) => (
                                    <button
                                        key={photo.id}
                                        onClick={() => openPhotoViewer(photo)}
                                        className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-colors group relative"
                                    >
                                        {photo.url ? (
                                            <img
                                                src={photo.url}
                                                alt="Tracabilite"
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-muted flex items-center justify-center">
                                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                            <p className="text-white text-xs truncate">
                                                {new Date(photo.captured_at).toLocaleTimeString('fr-FR', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Photo Viewer Dialog */}
            <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
                <DialogContent className="max-w-3xl p-0 overflow-hidden">
                    <DialogHeader className="p-4 pb-0">
                        <DialogTitle className="flex items-center justify-between">
                            <span>
                                Photo du {selectedPhoto && new Date(selectedPhoto.captured_at).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedPhoto(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="relative">
                        {selectedPhoto?.url ? (
                            <img
                                src={selectedPhoto.url}
                                alt="Tracabilite"
                                className="w-full max-h-[70vh] object-contain bg-black"
                            />
                        ) : (
                            <div className="w-full h-64 bg-muted flex items-center justify-center">
                                <ImageIcon className="h-16 w-16 text-muted-foreground" />
                            </div>
                        )}

                        {/* Navigation buttons */}
                        <Button
                            variant="secondary"
                            size="icon"
                            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full"
                            onClick={handlePrevPhoto}
                            disabled={photoIndex === 0}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
                            onClick={handleNextPhoto}
                            disabled={photoIndex === filteredPhotos.length - 1}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {selectedPhoto?.notes && (
                        <div className="p-4 border-t">
                            <p className="text-sm text-muted-foreground">{selectedPhoto.notes}</p>
                        </div>
                    )}

                    <div className="p-4 pt-0 text-center text-sm text-muted-foreground">
                        {photoIndex + 1} / {filteredPhotos.length}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
