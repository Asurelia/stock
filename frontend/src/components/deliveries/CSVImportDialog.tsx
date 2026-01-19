import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, type DeliveryItem, type Product } from '@/lib/api'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Upload,
    FileText,
    AlertCircle,
    Check,
    X,
    Download,
    Loader2,
    HelpCircle,
} from 'lucide-react'
import { toast } from 'sonner'

interface CSVImportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (items: DeliveryItem[], supplierName: string) => void
}

interface ParsedRow {
    raw: string[]
    productName: string
    quantity: number
    unit: string
    price: number
    matched: boolean
    matchedProduct?: Product
    error?: string
}

interface ColumnMapping {
    productName: number
    quantity: number
    unit: number
    price: number
}

const DEFAULT_MAPPING: ColumnMapping = {
    productName: 0,
    quantity: 1,
    unit: 2,
    price: 3,
}

export function CSVImportDialog({ open, onOpenChange, onConfirm }: CSVImportDialogProps) {
    const [file, setFile] = useState<File | null>(null)
    const [rawData, setRawData] = useState<string[][]>([])
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
    const [hasHeader, setHasHeader] = useState(true)
    const [delimiter, setDelimiter] = useState<',' | ';' | '\t'>(',')
    const [columnMapping, setColumnMapping] = useState<ColumnMapping>(DEFAULT_MAPPING)
    const [supplierName, setSupplierName] = useState('')
    const [step, setStep] = useState<'upload' | 'mapping' | 'review'>('upload')
    const [isProcessing, setIsProcessing] = useState(false)

    const { data: products } = useQuery({
        queryKey: ['products'],
        queryFn: api.products.getAll,
    })

    const { data: suppliers } = useQuery({
        queryKey: ['suppliers'],
        queryFn: api.suppliers.getAll,
    })

    const resetState = useCallback(() => {
        setFile(null)
        setRawData([])
        setParsedRows([])
        setHasHeader(true)
        setDelimiter(',')
        setColumnMapping(DEFAULT_MAPPING)
        setSupplierName('')
        setStep('upload')
        setIsProcessing(false)
    }, [])

    const handleClose = useCallback(() => {
        resetState()
        onOpenChange(false)
    }, [resetState, onOpenChange])

    const parseCSV = useCallback((content: string, delim: string): string[][] => {
        const lines = content.split(/\r?\n/).filter(line => line.trim())
        return lines.map(line => {
            const values: string[] = []
            let current = ''
            let inQuotes = false

            for (let i = 0; i < line.length; i++) {
                const char = line[i]
                if (char === '"') {
                    inQuotes = !inQuotes
                } else if (char === delim && !inQuotes) {
                    values.push(current.trim())
                    current = ''
                } else {
                    current += char
                }
            }
            values.push(current.trim())
            return values
        })
    }, [])

    const detectDelimiter = useCallback((content: string): ',' | ';' | '\t' => {
        const firstLine = content.split(/\r?\n/)[0] || ''
        const commaCount = (firstLine.match(/,/g) || []).length
        const semicolonCount = (firstLine.match(/;/g) || []).length
        const tabCount = (firstLine.match(/\t/g) || []).length

        if (tabCount > commaCount && tabCount > semicolonCount) return '\t'
        if (semicolonCount > commaCount) return ';'
        return ','
    }, [])

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        if (!selectedFile.name.match(/\.(csv|txt)$/i)) {
            toast.error('Format invalide. Utilisez un fichier CSV ou TXT.')
            return
        }

        setIsProcessing(true)
        setFile(selectedFile)

        try {
            const content = await selectedFile.text()
            const detectedDelim = detectDelimiter(content)
            setDelimiter(detectedDelim)

            const data = parseCSV(content, detectedDelim)
            setRawData(data)

            if (data.length > 0) {
                setStep('mapping')
            } else {
                toast.error('Le fichier est vide')
            }
        } catch {
            toast.error('Erreur lors de la lecture du fichier')
        } finally {
            setIsProcessing(false)
        }
    }, [detectDelimiter, parseCSV])

    const matchProduct = useCallback((name: string): Product | undefined => {
        if (!products) return undefined

        const normalizedName = name.toLowerCase().trim()

        // Exact match
        let match = products.find(p => p.name.toLowerCase() === normalizedName)
        if (match) return match

        // Partial match
        match = products.find(p =>
            p.name.toLowerCase().includes(normalizedName) ||
            normalizedName.includes(p.name.toLowerCase())
        )
        if (match) return match

        // Fuzzy match (first word)
        const firstWord = normalizedName.split(/\s+/)[0]
        if (firstWord.length >= 3) {
            match = products.find(p =>
                p.name.toLowerCase().startsWith(firstWord)
            )
        }

        return match
    }, [products])

    const processRows = useCallback(() => {
        const dataRows = hasHeader ? rawData.slice(1) : rawData
        const processed: ParsedRow[] = dataRows.map(row => {
            const productName = row[columnMapping.productName] || ''
            const quantityStr = row[columnMapping.quantity] || '0'
            const unit = row[columnMapping.unit] || ''
            const priceStr = row[columnMapping.price] || '0'

            const quantity = parseFloat(quantityStr.replace(',', '.')) || 0
            const price = parseFloat(priceStr.replace(',', '.').replace('€', '').trim()) || 0

            const matchedProduct = matchProduct(productName)

            let error: string | undefined
            if (!productName) error = 'Nom produit manquant'
            else if (quantity <= 0) error = 'Quantité invalide'
            else if (!matchedProduct) error = 'Produit non reconnu'

            return {
                raw: row,
                productName,
                quantity,
                unit: unit || matchedProduct?.unit || 'kg',
                price,
                matched: !!matchedProduct,
                matchedProduct,
                error,
            }
        })

        setParsedRows(processed)
        setStep('review')
    }, [rawData, hasHeader, columnMapping, matchProduct])

    const updateRowProduct = useCallback((index: number, productId: string) => {
        const product = products?.find(p => p.id === productId)
        if (!product) return

        setParsedRows(prev => prev.map((row, i) => {
            if (i !== index) return row
            return {
                ...row,
                matched: true,
                matchedProduct: product,
                error: row.quantity <= 0 ? 'Quantité invalide' : undefined,
            }
        }))
    }, [products])

    const removeRow = useCallback((index: number) => {
        setParsedRows(prev => prev.filter((_, i) => i !== index))
    }, [])

    const handleConfirm = useCallback(() => {
        const validRows = parsedRows.filter(row => row.matched && row.matchedProduct && row.quantity > 0)

        if (validRows.length === 0) {
            toast.error('Aucune ligne valide à importer')
            return
        }

        if (!supplierName) {
            toast.error('Veuillez sélectionner un fournisseur')
            return
        }

        const items: DeliveryItem[] = validRows.map(row => ({
            productId: row.matchedProduct!.id,
            productName: row.matchedProduct!.name,
            quantity: row.quantity,
            price: row.price,
        }))

        onConfirm(items, supplierName)
        handleClose()
        toast.success(`${items.length} article(s) importé(s)`)
    }, [parsedRows, supplierName, onConfirm, handleClose])

    const downloadTemplate = useCallback(() => {
        const template = 'produit,quantité,unité,prix\nPoulet entier,10,kg,7.50\nCarottes,20,kg,1.80\nPommes de terre,30,kg,1.20'
        const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'modele_livraison.csv'
        link.click()
        URL.revokeObjectURL(url)
    }, [])

    const validCount = parsedRows.filter(r => r.matched && r.quantity > 0).length
    const errorCount = parsedRows.filter(r => r.error).length

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Import CSV - Livraison
                    </DialogTitle>
                    <DialogDescription>
                        Importez vos bons de livraison au format CSV
                    </DialogDescription>
                </DialogHeader>

                {step === 'upload' && (
                    <div className="space-y-6">
                        <div
                            className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                            onClick={() => document.getElementById('csv-file-input')?.click()}
                        >
                            <Input
                                id="csv-file-input"
                                type="file"
                                accept=".csv,.txt"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            {isProcessing ? (
                                <Loader2 className="h-12 w-12 mx-auto text-muted-foreground animate-spin" />
                            ) : (
                                <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                            )}
                            <p className="mt-4 text-lg font-medium">
                                {file ? file.name : 'Cliquez ou déposez un fichier CSV'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Format: produit, quantité, unité, prix
                            </p>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">Besoin d'un modèle ?</span>
                            </div>
                            <Button variant="outline" size="sm" onClick={downloadTemplate}>
                                <Download className="h-4 w-4 mr-2" />
                                Télécharger modèle
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'mapping' && rawData.length > 0 && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Délimiteur</Label>
                                <Select
                                    value={delimiter}
                                    onValueChange={(v) => {
                                        const newDelim = v as ',' | ';' | '\t'
                                        setDelimiter(newDelim)
                                        if (file) {
                                            file.text().then(content => {
                                                setRawData(parseCSV(content, newDelim))
                                            })
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value=",">Virgule (,)</SelectItem>
                                        <SelectItem value=";">Point-virgule (;)</SelectItem>
                                        <SelectItem value={'\t'}>Tabulation</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={hasHeader}
                                        onChange={(e) => setHasHeader(e.target.checked)}
                                        className="rounded"
                                    />
                                    Première ligne = en-têtes
                                </Label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Aperçu des colonnes</Label>
                            <div className="border rounded-lg overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {rawData[0]?.map((_, i) => (
                                                <TableHead key={i}>Colonne {i + 1}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rawData.slice(0, 3).map((row, i) => (
                                            <TableRow key={i}>
                                                {row.map((cell, j) => (
                                                    <TableCell key={j} className="font-mono text-sm">
                                                        {cell || '-'}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {(['productName', 'quantity', 'unit', 'price'] as const).map((field) => (
                                <div key={field} className="space-y-2">
                                    <Label>
                                        {field === 'productName' && 'Produit'}
                                        {field === 'quantity' && 'Quantité'}
                                        {field === 'unit' && 'Unité'}
                                        {field === 'price' && 'Prix'}
                                    </Label>
                                    <Select
                                        value={columnMapping[field].toString()}
                                        onValueChange={(v) =>
                                            setColumnMapping(prev => ({ ...prev, [field]: parseInt(v) }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {rawData[0]?.map((_, i) => (
                                                <SelectItem key={i} value={i.toString()}>
                                                    Colonne {i + 1}
                                                    {hasHeader && rawData[0][i] ? ` (${rawData[0][i]})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between">
                            <Button variant="outline" onClick={() => setStep('upload')}>
                                Retour
                            </Button>
                            <Button onClick={processRows}>
                                Analyser les données
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'review' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <Badge variant="outline" className="text-green-600">
                                <Check className="h-3 w-3 mr-1" />
                                {validCount} valide(s)
                            </Badge>
                            {errorCount > 0 && (
                                <Badge variant="outline" className="text-red-600">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    {errorCount} erreur(s)
                                </Badge>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Fournisseur *</Label>
                            <Select value={supplierName} onValueChange={setSupplierName}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner le fournisseur" />
                                </SelectTrigger>
                                <SelectContent>
                                    {suppliers?.map(s => (
                                        <SelectItem key={s.id} value={s.name}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="border rounded-lg overflow-x-auto max-h-[300px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Statut</TableHead>
                                        <TableHead>Produit (CSV)</TableHead>
                                        <TableHead>Produit (Système)</TableHead>
                                        <TableHead>Quantité</TableHead>
                                        <TableHead>Prix</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {parsedRows.map((row, i) => (
                                        <TableRow key={i} className={row.error ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                                            <TableCell>
                                                {row.matched && !row.error ? (
                                                    <Check className="h-4 w-4 text-green-600" />
                                                ) : (
                                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                                )}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {row.productName}
                                            </TableCell>
                                            <TableCell>
                                                {row.matched ? (
                                                    <Badge variant="secondary">
                                                        {row.matchedProduct?.name}
                                                    </Badge>
                                                ) : (
                                                    <Select onValueChange={(v) => updateRowProduct(i, v)}>
                                                        <SelectTrigger className="h-8">
                                                            <SelectValue placeholder="Associer..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {products?.map(p => (
                                                                <SelectItem key={p.id} value={p.id}>
                                                                    {p.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {row.quantity} {row.unit}
                                            </TableCell>
                                            <TableCell>
                                                {row.price.toFixed(2)} €
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => removeRow(i)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex justify-between">
                            <Button variant="outline" onClick={() => setStep('mapping')}>
                                Retour
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleClose}>
                                    Annuler
                                </Button>
                                <Button
                                    onClick={handleConfirm}
                                    disabled={validCount === 0 || !supplierName}
                                >
                                    Importer {validCount} article(s)
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
