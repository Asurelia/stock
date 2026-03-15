import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScanLine, X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onScan: (code: string) => void
}

export function BarcodeScannerDialog({ open, onClose, onScan }: Props) {
  const scannerRef = useRef<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return

    let scanner: any = null

    const initScanner = async () => {
      try {
        const { Html5QrcodeScanner, Html5QrcodeSupportedFormats } = await import('html5-qrcode')

        scanner = new Html5QrcodeScanner('barcode-reader', {
          fps: 10,
          qrbox: { width: 280, height: 120 },
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          rememberLastUsedCamera: true,
        }, false)

        scanner.render(
          (text: string) => {
            onScan(text)
            scanner?.clear()
            onClose()
          },
          () => {} // ignore per-frame errors
        )
        scannerRef.current = scanner
      } catch (err) {
        setError('Camera non disponible')
      }
    }

    initScanner()

    return () => {
      scannerRef.current?.clear().catch(() => {})
      scannerRef.current = null
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Scanner un code-barres
          </DialogTitle>
        </DialogHeader>
        {error ? (
          <div className="text-center py-8 text-destructive">{error}</div>
        ) : (
          <div id="barcode-reader" className="w-full" />
        )}
        <Button variant="outline" onClick={onClose} className="w-full">
          <X className="h-4 w-4 mr-2" />
          Fermer
        </Button>
      </DialogContent>
    </Dialog>
  )
}
