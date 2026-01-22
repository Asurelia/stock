import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CompletionDonut } from './CompletionDonut';

interface TraceabilityStatsProps {
    stats: {
        total: number;
        withPhotos: number;
        percentage: number;
    } | undefined;
    totalPhotos: number;
}

export function TraceabilityStats({ stats, totalPhotos }: TraceabilityStatsProps) {
    return (
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
                            <p className="text-3xl font-bold mt-2">{totalPhotos}</p>
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
    );
}
