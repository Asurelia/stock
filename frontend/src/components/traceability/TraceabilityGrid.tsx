import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon } from 'lucide-react';
import type { TraceabilityPhotoExtended } from '@/types/traceability';

interface TraceabilityGridProps {
    groupedByDate: Record<string, TraceabilityPhotoExtended[]>;
    onPhotoClick: (photo: TraceabilityPhotoExtended) => void;
}

export function TraceabilityGrid({ groupedByDate, onPhotoClick }: TraceabilityGridProps) {
    if (Object.keys(groupedByDate).length === 0) {
        return (
            <Card className="p-12 text-center">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Aucune photo pour cette période</h3>
                <p className="text-muted-foreground">
                    Aucune photo de traçabilité n'a été enregistrée pour la période sélectionnée.
                </p>
            </Card>
        );
    }

    return (
        <div className="space-y-8">
            {Object.entries(groupedByDate).map(([date, datePhotos]) => (
                <div key={date} className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg capitalize">{date}</h3>
                        <Badge variant="outline">{datePhotos.length} photo{datePhotos.length > 1 ? 's' : ''}</Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {datePhotos.map((photo) => {
                            const outputs = photo.outputs; // Types already correct via TraceabilityPhotoExtended
                            const productName = outputs?.products?.name || 'Produit inconnu';

                            return (
                                <button
                                    key={photo.id}
                                    onClick={() => onPhotoClick(photo)}
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
    );
}
