import { useRef } from 'react'
import { Camera, X, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PhotoCaptureProps {
    preview: string | null
    onCapture: (file: File) => void
    onClear: () => void
    isUploading?: boolean
}

export function PhotoCapture({ preview, onCapture, onClear, isUploading }: PhotoCaptureProps) {
    const inputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            onCapture(file)
        }
        // Reset input so same file can be selected again
        e.target.value = ''
    }

    if (preview) {
        return (
            <div className="relative">
                <img
                    src={preview}
                    alt="Aperçu"
                    className="w-full max-h-64 object-contain rounded-xl border"
                />
                <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={onClear}
                    disabled={isUploading}
                >
                    <X className="h-4 w-4" />
                </Button>
                {isUploading && (
                    <div className="absolute inset-0 bg-background/80 rounded-xl flex items-center justify-center">
                        <div className="flex items-center gap-2">
                            <Upload className="h-5 w-5 animate-bounce" />
                            <span>Envoi en cours...</span>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <label
            className={cn(
                "flex flex-col items-center justify-center",
                "h-48 border-2 border-dashed rounded-2xl",
                "cursor-pointer transition-colors",
                "hover:bg-muted/50 hover:border-primary/50",
                "touch-manipulation"
            )}
        >
            <Camera className="h-12 w-12 text-muted-foreground mb-3" />
            <span className="text-base font-medium">Prendre une photo</span>
            <span className="text-sm text-muted-foreground mt-1">
                Photo d'étiquette pour traçabilité
            </span>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
            />
        </label>
    )
}
