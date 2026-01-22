import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, Download, Image as ImageIcon } from 'lucide-react';
import type { TraceabilityPhotoExtended } from '@/types/traceability';

interface PhotoViewerDialogProps {
    photo: TraceabilityPhotoExtended | null;
    isOpen: boolean;
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
    hasNext: boolean;
    hasPrev: boolean;
    currentIndex: number;
    totalPhotos: number;
}

export function PhotoViewerDialog({
    photo,
    isOpen,
    onClose,
    onNext,
    onPrev,
    hasNext,
    hasPrev,
    currentIndex,
    totalPhotos
}: PhotoViewerDialogProps) {
    if (!photo) return null;

    const outputs = photo.outputs;
    const productName = outputs?.products?.name || 'Produit inconnu';
    const date = new Date(photo.captured_at);
    const dateString = date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden">
                <DialogHeader className="p-4 pb-0">
                    <DialogTitle className="flex items-center justify-between">
                        <span>{productName} - {dateString}</span>
                        <div className="flex items-center gap-2">
                            {photo.url && (
                                <Button variant="ghost" size="icon" asChild>
                                    <a href={photo.url} download target="_blank" rel="noopener noreferrer">
                                        <Download className="h-4 w-4" />
                                    </a>
                                </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={onClose}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="relative bg-black">
                    {photo.url ? (
                        <img
                            src={photo.url}
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
                        onClick={onPrev}
                        disabled={!hasPrev}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
                        onClick={onNext}
                        disabled={!hasNext}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                {photo.notes && (
                    <div className="p-4 border-t">
                        <p className="text-sm font-medium mb-1">Notes:</p>
                        <p className="text-sm text-muted-foreground">{photo.notes}</p>
                    </div>
                )}

                <div className="p-4 pt-0 text-center text-sm text-muted-foreground border-t">
                    Photo {currentIndex + 1} sur {totalPhotos}
                </div>
            </DialogContent>
        </Dialog>
    );
}
