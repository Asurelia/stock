import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Archive, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DateNavigator } from '@/components/traceability/DateNavigator';
import { TraceabilityStats } from '@/components/traceability/TraceabilityStats';
import { TraceabilityGrid } from '@/components/traceability/TraceabilityGrid';
import { PhotoViewerDialog } from '@/components/traceability/PhotoViewerDialog';
import type { TraceabilityPhotoExtended } from '@/types/traceability';
import { supabase } from '@/lib/supabase';

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

export function TraceabilityArchivePage() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('day');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPhoto, setSelectedPhoto] = useState<TraceabilityPhotoExtended | null>(null);
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

    // Fetch all photo dates for calendar indicators (last 12 months)
    const { data: allPhotoDates } = useQuery({
        queryKey: ['traceability-all-dates'],
        queryFn: async () => {
            if (!supabase) return { dates: new Set<string>(), months: new Set<string>() };

            // Get photos from last 12 months
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

            const { data, error } = await supabase
                .from('traceability_photos')
                .select('captured_at')
                .gte('captured_at', oneYearAgo.toISOString())
                .order('captured_at', { ascending: false });

            if (error || !data) {
                console.error('Error fetching photo dates:', error);
                return { dates: new Set<string>(), months: new Set<string>() };
            }

            const dates = new Set<string>();
            const months = new Set<string>();

            data.forEach(photo => {
                const date = new Date(photo.captured_at);
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                dates.add(dateStr);
                months.add(monthStr);
            });

            return { dates, months };
        },
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
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
            dateKey = new Date(photo.captured_at).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } else if (viewMode === 'month') {
            dateKey = new Date(photo.captured_at).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
            });
        } else {
            dateKey = new Date(photo.captured_at).toLocaleDateString('fr-FR', {
                month: 'long',
                year: 'numeric',
            });
        }
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(photo);
        return acc;
    }, {} as Record<string, TraceabilityPhotoExtended[]>);

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

    const openPhotoViewer = (photo: TraceabilityPhotoExtended) => {
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
                datesWithPhotos={allPhotoDates?.dates}
                monthsWithPhotos={allPhotoDates?.months}
            />

            {/* Stats Card */}
            <TraceabilityStats stats={stats} totalPhotos={photos.length} />

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

            {/* Photos Grid */}
            <TraceabilityGrid groupedByDate={groupedByDate} onPhotoClick={openPhotoViewer} />

            {/* Photo Viewer Dialog */}
            <PhotoViewerDialog
                photo={selectedPhoto}
                isOpen={!!selectedPhoto}
                onClose={() => setSelectedPhoto(null)}
                onNext={handleNextPhoto}
                onPrev={handlePrevPhoto}
                hasNext={photoIndex < filteredPhotos.length - 1}
                hasPrev={photoIndex > 0}
                currentIndex={photoIndex}
                totalPhotos={filteredPhotos.length}
            />
        </div>
    );
}

