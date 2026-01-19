import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NumericKeypadProps {
    value: string
    onChange: (value: string) => void
    unit: string
    max?: number
}

export function NumericKeypad({ value, onChange, unit, max }: NumericKeypadProps) {
    const handleKey = (key: string) => {
        if (key === '⌫') {
            onChange(value.slice(0, -1))
        } else if (key === 'C') {
            onChange('')
        } else if (key === '.') {
            // Only allow one decimal point
            if (!value.includes('.')) {
                onChange(value + key)
            }
        } else {
            const newValue = value + key
            // Validate against max if provided
            if (max !== undefined && parseFloat(newValue) > max) {
                return
            }
            onChange(newValue)
        }
    }

    const handleQuickValue = (n: number) => {
        if (max !== undefined && n > max) {
            onChange(max.toString())
        } else {
            onChange(n.toString())
        }
    }

    const numericValue = parseFloat(value) || 0
    const isOverMax = max !== undefined && numericValue > max
    const isValid = numericValue > 0 && !isOverMax

    return (
        <div className="space-y-4">
            {/* Display */}
            <div className={cn(
                "text-center py-6 rounded-xl transition-colors",
                isValid ? "bg-primary/10" : "bg-muted/50",
                isOverMax && "bg-destructive/10"
            )}>
                <span className={cn(
                    "text-5xl font-bold tabular-nums transition-colors",
                    isOverMax && "text-destructive"
                )}>
                    {value || '0'}
                </span>
                <span className="text-xl ml-2 text-muted-foreground">{unit}</span>
                {max !== undefined && (
                    <div className="text-sm text-muted-foreground mt-1">
                        Max: {max} {unit}
                    </div>
                )}
            </div>

            {/* Quick values */}
            <div className="flex gap-2">
                {[1, 5, 10, 25].map(n => (
                    <Button
                        key={n}
                        variant="outline"
                        className="flex-1 h-12 text-lg font-semibold"
                        onClick={() => handleQuickValue(n)}
                        disabled={max !== undefined && n > max}
                    >
                        {n}
                    </Button>
                ))}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map(key => (
                    <Button
                        key={key}
                        variant="secondary"
                        className={cn(
                            "h-14 text-2xl font-bold",
                            "touch-manipulation active:scale-95 transition-transform",
                            key === '⌫' && "text-xl"
                        )}
                        onClick={() => handleKey(key)}
                    >
                        {key}
                    </Button>
                ))}
            </div>

            {/* Clear button */}
            <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => onChange('')}
            >
                Effacer
            </Button>
        </div>
    )
}
