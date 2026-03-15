import { useState, useRef } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Settings, Download, Upload, Trash2, HardDrive, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export function SettingsDialog() {
    const [isExporting, setIsExporting] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const [isClearing, setIsClearing] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const queryClient = useQueryClient()

    const { data: dbSize } = useQuery({
        queryKey: ['db-size'],
        queryFn: async () => {
            const { getDatabaseSize } = await import('@/lib/api/backup')
            return getDatabaseSize()
        },
        staleTime: 30000,
    })

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    const handleExport = async () => {
        setIsExporting(true)
        try {
            const { exportDatabase } = await import('@/lib/api/backup')
            await exportDatabase()
            toast.success('Base de données exportée')
        } catch {
            toast.error("Erreur lors de l'export")
        } finally {
            setIsExporting(false)
        }
    }

    const handleImport = async (file: File) => {
        setIsImporting(true)
        try {
            const { importDatabase } = await import('@/lib/api/backup')
            await importDatabase(file)
            queryClient.invalidateQueries()
            toast.success('Base de données importée avec succès')
        } catch {
            toast.error("Erreur lors de l'import")
        } finally {
            setIsImporting(false)
        }
    }

    const handleClear = async () => {
        if (!confirm('Voulez-vous vraiment vider toute la base de données ? Cette action est irréversible.')) return
        setIsClearing(true)
        try {
            const { clearAllCache } = await import('@/lib/offline/db')
            await clearAllCache()
            queryClient.invalidateQueries()
            toast.success('Base de données vidée')
        } catch {
            toast.error('Erreur lors de la suppression')
        } finally {
            setIsClearing(false)
        }
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                    <Settings className="w-4 h-4" />
                    Paramètres
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Paramètres</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Database Info */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                        <HardDrive className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                            <p className="text-sm font-medium">Base de données locale</p>
                            <p className="text-xs text-muted-foreground">
                                {dbSize ? formatSize(dbSize.used) : 'Calcul...'} utilisés
                                {dbSize?.quota ? ` / ${formatSize(dbSize.quota)}` : ''}
                            </p>
                        </div>
                    </div>

                    {/* Export */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Sauvegarde</h4>
                        <Button
                            variant="outline"
                            className="w-full justify-start gap-2"
                            onClick={handleExport}
                            disabled={isExporting}
                        >
                            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            Exporter la base de données
                        </Button>
                    </div>

                    {/* Import */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Restauration</h4>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleImport(file)
                                e.target.value = ''
                            }}
                        />
                        <Button
                            variant="outline"
                            className="w-full justify-start gap-2"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isImporting}
                        >
                            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            Importer une sauvegarde
                        </Button>
                    </div>

                    {/* Clear */}
                    <div className="space-y-2 pt-4 border-t">
                        <h4 className="text-sm font-medium text-destructive">Zone dangereuse</h4>
                        <Button
                            variant="destructive"
                            className="w-full justify-start gap-2"
                            onClick={handleClear}
                            disabled={isClearing}
                        >
                            {isClearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            Vider la base de données
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
