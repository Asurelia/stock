import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Camera, Archive, Search, Image as ImageIcon, X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DateNavigator } from '@/components/traceability/DateNavigator';
import { cn } from '@/lib/utils';
import type { TraceabilityPhoto } from '@/lib/database.types';

type ViewMode = 'day' | 'month' | 'year';

function getDateRangeForView(date: Date, viewMode: ViewMode): { from: string; to: string } {
    if (viewMode === 'day') {
        const from = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
        const to = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
        return { from: from.toISOString(), to: to.toISOString() };
    } else if (viewMode === 'month') {
        const from = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0);
        const to = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
        return { from: from.toISOString(), to: to.toISOString() };
    } else {
        const from = new Date(date.getFullYear(), 0, 1, 0, 0, 0);
        const to = new Date(date.getFullYear(), 11, 31, 23, 59, 59);
        return { from: from.toISOString(), to: to.toISOString() };
    }
}

function CompletionDonut({ percentage, size = 100 }: { percentage: number; size?: number }) {
    const strokeWidth = 10;
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
                <span className="text-xl font-bold">{percentage}%</span>
            </div>
        </div>
    );
}

export function TraceabilityArchivePage() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('day');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPhoto, setSelectedPhoto] = useState<TraceabilityPhoto | null>(null);
    const [photoIndex, setPhotoIndex] = useState(0);

    const { from, to } = getDateRangeForView(selectedDate, viewMode);

    const { data: photos = [], isLoading, error: photosError } = useQuery({
        queryKey: ['traceability-photos-archive', from, to],
        queryFn: async () => {
            try {
                return await api.traceabilityPhotos.getByDateRange(from, to);
            } catch (err) {
                console.error('Error fetching traceability photos:', err);
                return [];
            }
        },
    });

    // Get stats - Calculate independently
    const { data: stats } = useQuery({
        queryKey: ['traceability-stats-archive', from, to, photos.length],
        queryFn: async () => {
            try {
                const outputs = await api.outputs.getByDateRange(from, to);
                const uniqueProducts = new Set(outputs.map(o => o.productId));

                // Get unique product IDs from photos
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
            } catch (err) {
                console.error('Error calculating stats:', err);
                return {
                    total: 0,
                    withPhotos: 0,
                    percentage: 100,
                };
            }
        },
        enabled: photos !== undefined,
    });

    const filteredPhotos = photos.filter(photo => {
        if (!searchQuery) return true;
        const outputs = photo.outputs as { products: { name: string; category: string } | null } | null;
        const productName = outputs?.products?.name || '';
        const productCategory = outputs?.products?.category || '';
        const notes = photo.notes || '';
        const query = searchQuery.toLowerCase();
        return productName.toLowerCase().includes(query) ||
               productCategory.toLowerCase().includes(query) ||
               notes.toLowerCase().includes(query);
    });

    // Group photos by date
    const groupedByDate = filteredPhotos.reduce((acc, photo) => {
        let dateKey: string;
        if (viewMode === 'day') {
            // Group by hour for day view
            dateKey = new Date(photo.captured_at).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } else if (viewMode === 'month') {
            // Group by day for month view
            dateKey = new Date(photo.captured_at).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
            });
        } else {
            // Group by month for year view
            dateKey = new Date(photo.captured_at).toLocaleDateString('fr-FR', {
                month: 'long',
                year: 'numeric',
            });
        }
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(photo);
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
                    <div className="h-64 bg-muted rounded" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="aspect-square bg-muted rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (photosError) {
        return (
            <div className="p-6">
                <Card className="p-8 text-center border-destructive">
                    <div className="text-destructive mb-4 text-4xl">⚠️</div>
                    <h3 className="text-lg font-semibold mb-2">Erreur de chargement</h3>
                    <p className="text-muted-foreground mb-4">
                        Impossible de charger les archives de traçabilité.
                        <br />
                        Vérifiez que le bucket storage est configuré.
                    </p>
                    <Button onClick={() => window.location.reload()}>
                        Réessayer
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Archive className="h-6 w-6" />
                        Archives Traçabilité
                    </h1>
                    <p className="text-muted-foreground">
                        Consultez et archivez vos photos de traçabilité par période
                    </p>
                </div>
            </div>

            {/* Date Navigator */}
            <DateNavigator
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
            />

            {/* Stats Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        Statistiques de la période
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="flex items-center justify-center">
                            <CompletionDonut percentage={stats?.percentage || 0} />
                        </div>
                        <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">
                            <Card className="p-4 bg-muted/50">
                                <p className="text-sm text-muted-foreground">Total photos</p>
                                <p className="text-3xl font-bold mt-2">{photos.length}</p>
                            </Card>
                            <Card className="p-4 bg-green-500/10">
                                <p className="text-sm text-muted-foreground">Photos prises</p>
                                <p className="text-3xl font-bold mt-2 text-green-600">{stats?.withPhotos || 0}</p>
                            </Card>
                            <Card className="p-4 bg-orange-500/10">
                                <p className="text-sm text-muted-foreground">En attente</p>
                                <p className="text-3xl font-bold mt-2 text-orange-600">
                                    {(stats?.total || 0) - (stats?.withPhotos || 0)}
                                </p>
                            </Card>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Search & Filters */}
            <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher par produit, catégorie, notes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Badge variant="secondary" className="h-9 px-3">
                    {filteredPhotos.length} photo{filteredPhotos.length > 1 ? 's' : ''}
                </Badge>
            </div>

            {/* Photos Grid by Date */}
            {Object.keys(groupedByDate).length === 0 ? (
                <Card className="p-12 text-center">
                    <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">Aucune photo pour cette période</h3>
                    <p className="text-muted-foreground">
                        Aucune photo de traçabilité n'a été enregistrée pour la période sélectionnée.
                    </p>
                </Card>
            ) : (
                <div className="space-y-8">
                    {Object.entries(groupedByDate).map(([date, datePhotos]) => (
                        <div key={date} className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-lg capitalize">{date}</h3>
                                <Badge variant="outline">{datePhotos.length} photo{datePhotos.length > 1 ? 's' : ''}</Badge>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                {datePhotos.map((photo) => {
                                    const outputs = photo.outputs as { products: { name: string; category: string } | null } | null;
                                    const productName = outputs?.products?.name || 'Produit inconnu';

                                    return (
                                        <button
                                            key={photo.id}
                                            onClick={() => openPhotoViewer(photo)}
                                            className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-colors group relative"
                                        >
                                            {photo.url ? (
                                                <img
                                                    src={photo.url}
                                                    alt={productName}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-muted flex items-center justify-center">
                                                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                                </div>
                                            )}
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                                <p className="text-white text-xs font-medium truncate">
                                                    {productName}
                                                </p>
                                                <p className="text-white/70 text-xs">
                                                    {new Date(photo.captured_at).toLocaleTimeString('fr-FR', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Photo Viewer Dialog */}
            <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden">
                    <DialogHeader className="p-4 pb-0">
                        <DialogTitle className="flex items-center justify-between">
                            <span>
                                {selectedPhoto && (() => {
                                    const outputs = selectedPhoto.outputs as { products: { name: string } | null } | null;
                                    const productName = outputs?.products?.name || 'Produit inconnu';
                                    const date = new Date(selectedPhoto.captured_at);
                                    return `${productName} - ${date.toLocaleDateString('fr-FR', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}`;
                                })()}
                            </span>
                            <div className="flex items-center gap-2">
                                {selectedPhoto?.url && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        asChild
                                    >
                                        <a href={selectedPhoto.url} download target="_blank" rel="noopener noreferrer">
                                            <Download className="h-4 w-4" />
                                        </a>
                                    </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => setSelectedPhoto(null)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="relative bg-black">
                        {selectedPhoto?.url ? (
                            <img
                                src={selectedPhoto.url}
                                alt="Traçabilité"
                                className="w-full max-h-[70vh] object-contain"
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
                            <p className="text-sm font-medium mb-1">Notes:</p>
                            <p className="text-sm text-muted-foreground">{selectedPhoto.notes}</p>
                        </div>
                    )}

                    <div className="p-4 pt-0 text-center text-sm text-muted-foreground border-t">
                        Photo {photoIndex + 1} sur {filteredPhotos.length}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
