import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Server, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { API_BASE, setApiUrl, getApiUrl } from '@/lib/api/core'

/* CUSTOMIZATION: This screen appears on Vercel when the backend tunnel is not configured.
 * It lets the user paste their cloudflared tunnel URL to connect.
 */

interface Props {
  children: React.ReactNode
}

export function BackendConnect({ children }: Props) {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
  const [tunnelUrl, setTunnelUrl] = useState(getApiUrl() || '')
  const [testing, setTesting] = useState(false)

  const isLocal = window.location.hostname === 'localhost'

  useEffect(() => {
    checkConnection()
  }, [])

  async function checkConnection() {
    setStatus('checking')
    try {
      const res = await fetch(`${API_BASE}/products`, { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        // Verify it's actually JSON from our backend, not an HTML page from Vercel
        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          setStatus('connected')
        } else {
          setStatus('disconnected')
        }
      } else {
        setStatus('disconnected')
      }
    } catch {
      setStatus('disconnected')
    }
  }

  async function testAndSave() {
    if (!tunnelUrl.trim()) return
    setTesting(true)

    // Normalize URL: remove trailing slash, ensure /api suffix
    let url = tunnelUrl.trim().replace(/\/+$/, '')
    if (!url.endsWith('/api')) {
      url = url + '/api'
    }

    try {
      const res = await fetch(`${url}/products`, { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        setApiUrl(url) // saves + reloads
      } else {
        alert('Le serveur a répondu mais avec une erreur. Vérifiez l\'URL.')
      }
    } catch {
      alert('Impossible de se connecter. Vérifiez que le backend et le tunnel sont lancés.')
    } finally {
      setTesting(false)
    }
  }

  // On localhost, skip this screen entirely
  if (isLocal) return <>{children}</>

  // Connected — render the app
  if (status === 'connected') return <>{children}</>

  // Checking — loading
  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Connexion au backend...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Disconnected — show connection form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-2">
            <WifiOff className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-2xl font-bold">StockPro Clinique</CardTitle>
          <CardDescription>
            Le backend n'est pas joignable. Lancez le serveur sur votre PC et connectez-le ici.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Instructions */}
          <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
            <p className="font-medium">Sur votre PC :</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Ouvrez un terminal dans <code className="bg-background px-1 rounded">F:\Dev\stock</code></li>
              <li>Lancez <code className="bg-background px-1 rounded">npm run dev</code></li>
              <li>Dans un 2e terminal : <code className="bg-background px-1 rounded">cloudflared tunnel --url http://localhost:3005</code></li>
              <li>Copiez l'URL affichée ci-dessous</li>
            </ol>
          </div>

          {/* URL input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">URL du tunnel</label>
            <Input
              value={tunnelUrl}
              onChange={e => setTunnelUrl(e.target.value)}
              placeholder="https://xxx-xxx-xxx.trycloudflare.com"
              onKeyDown={e => e.key === 'Enter' && testAndSave()}
            />
          </div>

          {/* Connect button */}
          <Button className="w-full h-12" onClick={testAndSave} disabled={testing || !tunnelUrl.trim()}>
            {testing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Test de connexion...</>
            ) : (
              <><Server className="h-4 w-4 mr-2" />Se connecter</>
            )}
          </Button>

          {/* Retry with existing URL */}
          {getApiUrl() && (
            <Button variant="outline" className="w-full" onClick={checkConnection}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer ({getApiUrl()?.replace('https://', '').replace('/api', '').slice(0, 30)}...)
            </Button>
          )}

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
            <Badge variant="outline">Gratuit</Badge>
            <span>Tunnel via Cloudflare — aucun compte requis</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
