import { cn } from '@/lib/utils'

interface CompletionChartProps {
    completed: number
    total: number
    exempt: number
}

export function CompletionChart({ completed, total, exempt }: CompletionChartProps) {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 100
    const pending = total - completed

    // Calculate stroke-dasharray for the progress arc
    const circumference = 2 * Math.PI * 40 // r=40
    const progressLength = (percentage / 100) * circumference

    return (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
            {/* Pie Chart */}
            <div className="relative w-36 h-36">
                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                    {/* Background circle */}
                    <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="16"
                        className="text-muted/30"
                    />
                    {/* Progress arc */}
                    <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="16"
                        strokeDasharray={`${progressLength} ${circumference}`}
                        strokeLinecap="round"
                        className={cn(
                            "transition-all duration-500",
                            percentage === 100 ? "text-green-500" : "text-orange-500"
                        )}
                    />
                </svg>
                {/* Percentage text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn(
                        "text-3xl font-bold",
                        percentage === 100 ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"
                    )}>
                        {percentage}%
                    </span>
                    <span className="text-xs text-muted-foreground">complétion</span>
                </div>
            </div>

            {/* Legend */}
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-green-500 shadow-sm" />
                    <span className="text-sm">
                        <span className="font-semibold">{completed}</span> photo{completed > 1 ? 's' : ''} prise{completed > 1 ? 's' : ''}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-orange-500 shadow-sm" />
                    <span className="text-sm">
                        <span className="font-semibold">{pending}</span> en attente
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-muted shadow-sm" />
                    <span className="text-sm text-muted-foreground">
                        <span className="font-semibold">{exempt}</span> exempté{exempt > 1 ? 's' : ''}
                    </span>
                </div>
            </div>
        </div>
    )
}
