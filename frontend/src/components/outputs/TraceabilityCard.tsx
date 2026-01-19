import { Check, Camera } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getProductEmoji } from './ProductButton'
import type { Product } from '@/lib/api'

interface TraceabilityCardProps {
    product: Product
    totalQuantity: number
    hasPhoto: boolean
    photoUrl?: string | null
    needsPhoto: boolean
    onTakePhoto: () => void
}

export function TraceabilityCard({
    product,
    totalQuantity,
    hasPhoto,
    photoUrl,
    needsPhoto,
    onTakePhoto,
}: TraceabilityCardProps) {
    return (
        <Card className={cn(
            "transition-all duration-200",
            hasPhoto && "border-green-500/50 bg-green-50/30 dark:bg-green-950/10",
            needsPhoto && !hasPhoto && "border-orange-500/50 bg-orange-50/30 dark:bg-orange-950/10",
            !needsPhoto && "border-muted opacity-70"
        )}>
            <CardContent className="p-4">
                <div className="flex items-center gap-4">
                    {/* Product emoji */}
                    <span className="text-3xl flex-shrink-0">
                        {getProductEmoji(product)}
                    </span>

                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                            Sorti: {totalQuantity} {product.unit}
                        </div>
                    </div>

                    {/* Status / Action */}
                    {!needsPhoto ? (
                        <Badge variant="secondary" className="flex-shrink-0">
                            Exempt
                        </Badge>
                    ) : hasPhoto ? (
                        <div className="relative flex-shrink-0">
                            {photoUrl ? (
                                <img
                                    src={photoUrl}
                                    alt="Photo traçabilité"
                                    className="w-14 h-14 rounded-lg object-cover border"
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <Check className="h-6 w-6 text-green-600" />
                                </div>
                            )}
                            <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 shadow-sm">
                                <Check className="h-3 w-3 text-white" />
                            </div>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onTakePhoto}
                            className="flex-shrink-0"
                        >
                            <Camera className="h-4 w-4 mr-1.5" />
                            Photo
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
