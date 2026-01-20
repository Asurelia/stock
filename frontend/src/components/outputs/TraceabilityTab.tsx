import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Camera } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CompletionChart } from './CompletionChart'
import { TraceabilityCard } from './TraceabilityCard'
import { PhotoCapture } from './PhotoCapture'
import { api, type Output, type Product } from '@/lib/api'

// Categories exempt from traceability photos
const EXEMPT_CATEGORIES = ['Fruits', 'Légumes']

interface GroupedOutput {
    productId: string
    productName: string
    product: Product
    totalQuantity: number
    outputs: Output[]
    hasPhoto: boolean
    photoUrl: string | null
    firstOutputId: string
}

interface TraceabilityTabProps {
    products: Product[]
    todayOutputs: Output[]
    onPhotoUploaded: () => void
}

export function TraceabilityTab({ products, todayOutputs, onPhotoUploaded }: TraceabilityTabProps) {
    const [photoDialogOpen, setPhotoDialogOpen] = useState(false)
    const [selectedGroup, setSelectedGroup] = useState<GroupedOutput | null>(null)
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)

    // Get today's traceability photos
    const today = new Date().toISOString().split('T')[0]
    const { data: todayPhotos = [], refetch: refetchPhotos } = useQuery({
        queryKey: ['traceability-photos', today],
        queryFn: () => api.traceabilityPhotos.getByDateRange(today, today + 'T23:59:59'),
    })

    // Group outputs by product
    const groupedOutputs = useMemo(() => {
        const groups = new Map<string, GroupedOutput>()

        todayOutputs.forEach(output => {
            const existing = groups.get(output.productId)
            const product = products.find(p => p.id === output.productId)

            if (!product) return

            if (existing) {
                existing.totalQuantity += output.quantity
                existing.outputs.push(output)
            } else {
                // Check if there's a photo for any output of this product today
                // The API returns: outputs { id, product_id, quantity, products { name, category } }
                const photoForProduct = todayPhotos.find(p => {
                    const outputs = p.outputs as { id: string; product_id: string; quantity: number } | null
                    return outputs?.product_id === output.productId
                })

                groups.set(output.productId, {
                    productId: output.productId,
                    productName: output.productName || product.name,
                    product,
                    totalQuantity: output.quantity,
                    outputs: [output],
                    hasPhoto: !!photoForProduct,
                    photoUrl: photoForProduct?.url || null,
                    firstOutputId: output.id,
                })
            }
        })

        return Array.from(groups.values())
    }, [todayOutputs, products, todayPhotos])

    // Calculate completion stats
    const stats = useMemo(() => {
        const needingPhoto = groupedOutputs.filter(g =>
            !EXEMPT_CATEGORIES.includes(g.product.category || '')
        )
        const withPhoto = needingPhoto.filter(g => g.hasPhoto)
        const exempt = groupedOutputs.filter(g =>
            EXEMPT_CATEGORIES.includes(g.product.category || '')
        )

        return {
            total: needingPhoto.length,
            completed: withPhoto.length,
            exempt: exempt.length,
        }
    }, [groupedOutputs])

    const handleOpenPhotoDialog = (group: GroupedOutput) => {
        setSelectedGroup(group)
        setPhotoDialogOpen(true)
    }

    const handleCapture = (file: File) => {
        setPhotoFile(file)
        // Create preview URL
        const url = URL.createObjectURL(file)
        setPhotoPreview(url)
    }

    const handleClearPhoto = () => {
        if (photoPreview) {
            URL.revokeObjectURL(photoPreview)
        }
        setPhotoPreview(null)
        setPhotoFile(null)
    }

    const handleUploadPhoto = async () => {
        if (!photoFile || !selectedGroup) return

        setIsUploading(true)
        try {
            await api.traceabilityPhotos.upload(photoFile, selectedGroup.firstOutputId)
            await refetchPhotos()
            onPhotoUploaded()
            handleClearPhoto()
            setPhotoDialogOpen(false)
            setSelectedGroup(null)

            // Import toast dynamically to show success message
            import('sonner').then(({ toast }) => {
                toast.success('Photo de traçabilité enregistrée')
            })
        } catch (error) {
            console.error('Failed to upload photo:', error)
            import('sonner').then(({ toast }) => {
                toast.error('Erreur lors de l\'enregistrement de la photo')
            })
        } finally {
            setIsUploading(false)
        }
    }

    const handleCloseDialog = () => {
        handleClearPhoto()
        setPhotoDialogOpen(false)
        setSelectedGroup(null)
    }

    return (
        <div className="space-y-6">
            {/* Completion Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Camera className="h-5 w-5" />
                        Traçabilité du jour
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {groupedOutputs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Camera className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>Aucune sortie aujourd'hui</p>
                            <p className="text-sm">Les sorties de produits apparaîtront ici</p>
                        </div>
                    ) : (
                        <CompletionChart
                            completed={stats.completed}
                            total={stats.total}
                            exempt={stats.exempt}
                        />
                    )}
                </CardContent>
            </Card>

            {/* Products list */}
            {groupedOutputs.length > 0 && (
                <div className="space-y-3">
                    <h3 className="font-semibold text-lg">Produits sortis aujourd'hui</h3>
                    {groupedOutputs.map(group => (
                        <TraceabilityCard
                            key={group.productId}
                            product={group.product}
                            totalQuantity={group.totalQuantity}
                            hasPhoto={group.hasPhoto}
                            photoUrl={group.photoUrl}
                            needsPhoto={!EXEMPT_CATEGORIES.includes(group.product.category || '')}
                            onTakePhoto={() => handleOpenPhotoDialog(group)}
                        />
                    ))}
                </div>
            )}

            {/* Photo capture dialog */}
            <Dialog open={photoDialogOpen} onOpenChange={handleCloseDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            Photo de traçabilité - {selectedGroup?.productName}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <PhotoCapture
                            preview={photoPreview}
                            onCapture={handleCapture}
                            onClear={handleClearPhoto}
                            isUploading={isUploading}
                        />
                        {photoPreview && (
                            <Button
                                onClick={handleUploadPhoto}
                                disabled={isUploading}
                                className="w-full"
                            >
                                {isUploading ? 'Envoi en cours...' : 'Enregistrer la photo'}
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
