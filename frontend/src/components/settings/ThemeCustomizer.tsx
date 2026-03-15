import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Palette, Upload, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

const DEFAULT_CONFIG = {
  clinicName: 'StockPro Clinique',
  primaryColor: '#3b82f6',
  accentColor: '#22c55e',
  logoUrl: '',
}

type ThemeConfig = typeof DEFAULT_CONFIG

const STORAGE_KEY = 'stockpro_theme_config'

export function getThemeConfig(): ThemeConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG
  } catch {
    return DEFAULT_CONFIG
  }
}

export function applyThemeConfig(config: ThemeConfig) {
  document.documentElement.style.setProperty('--color-primary', config.primaryColor)
  document.documentElement.style.setProperty('--color-accent', config.accentColor)
}

export function ThemeCustomizer() {
  const [config, setConfig] = useState<ThemeConfig>(getThemeConfig)

  useEffect(() => {
    applyThemeConfig(config)
  }, [config])

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    applyThemeConfig(config)
    toast.success('Theme sauvegarde')
  }

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG)
    localStorage.removeItem(STORAGE_KEY)
    applyThemeConfig(DEFAULT_CONFIG)
    toast.success('Theme reinitialise')
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setConfig(prev => ({ ...prev, logoUrl: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Personnalisation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Nom de la clinique</Label>
          <Input
            value={config.clinicName}
            onChange={e => setConfig(prev => ({ ...prev, clinicName: e.target.value }))}
            placeholder="StockPro Clinique"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Couleur principale</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.primaryColor}
                onChange={e => setConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                className="h-10 w-10 rounded border cursor-pointer"
              />
              <Input value={config.primaryColor} onChange={e => setConfig(prev => ({ ...prev, primaryColor: e.target.value }))} className="flex-1" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Couleur accent</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.accentColor}
                onChange={e => setConfig(prev => ({ ...prev, accentColor: e.target.value }))}
                className="h-10 w-10 rounded border cursor-pointer"
              />
              <Input value={config.accentColor} onChange={e => setConfig(prev => ({ ...prev, accentColor: e.target.value }))} className="flex-1" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Logo clinique</Label>
          <div className="flex items-center gap-4">
            {config.logoUrl && (
              <img src={config.logoUrl} alt="Logo" className="h-12 w-12 object-contain rounded" />
            )}
            <label className="cursor-pointer">
              <Button variant="outline" asChild>
                <span><Upload className="h-4 w-4 mr-2" />Charger un logo</span>
              </Button>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} className="flex-1">Sauvegarder</Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
