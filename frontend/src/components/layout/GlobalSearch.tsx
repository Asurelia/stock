import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Package, ChefHat, Truck, X } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { apiClient } from '@/lib/api/core'

interface SearchResult {
  id: string
  type: 'product' | 'recipe' | 'supplier'
  name: string
  subtitle: string
  icon: typeof Package
  route: string
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcut: Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  // Fetch all data for search (cached by React Query)
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => apiClient.get<any[]>('/products'), staleTime: 60000 })
  const { data: recipes = [] } = useQuery({ queryKey: ['recipes'], queryFn: () => apiClient.get<any[]>('/recipes'), staleTime: 60000 })
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: () => apiClient.get<any[]>('/suppliers'), staleTime: 60000 })

  const results: SearchResult[] = query.length < 2 ? [] : [
    ...products.filter(p => p.name?.toLowerCase().includes(query.toLowerCase())).slice(0, 5).map(p => ({
      id: p.id, type: 'product' as const, name: p.name, subtitle: `${p.category} — ${p.quantity} ${p.unit}`, icon: Package, route: '/products'
    })),
    ...recipes.filter(r => r.name?.toLowerCase().includes(query.toLowerCase())).slice(0, 5).map(r => ({
      id: r.id, type: 'recipe' as const, name: r.name, subtitle: r.category || 'Recette', icon: ChefHat, route: '/recipes'
    })),
    ...suppliers.filter(s => s.name?.toLowerCase().includes(query.toLowerCase())).slice(0, 5).map(s => ({
      id: s.id, type: 'supplier' as const, name: s.name, subtitle: s.category || 'Fournisseur', icon: Truck, route: '/deliveries'
    })),
  ]

  const handleSelect = (result: SearchResult) => {
    setOpen(false)
    setQuery('')
    navigate(result.route)
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground bg-muted/50 rounded-lg hover:bg-muted transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Rechercher...</span>
        <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
          Ctrl+K
        </kbd>
      </button>

      {/* Search dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg p-0 gap-0">
          <div className="flex items-center border-b px-4">
            <Search className="h-4 w-4 text-muted-foreground mr-2" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher produits, recettes, fournisseurs..."
              className="flex-1 py-3 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button onClick={() => setQuery('')}><X className="h-4 w-4 text-muted-foreground" /></button>
            )}
          </div>
          <div className="max-h-[300px] overflow-y-auto p-2">
            {query.length < 2 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Tapez au moins 2 caractères</p>
            ) : results.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Aucun résultat</p>
            ) : (
              results.map(result => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-left transition-colors"
                >
                  <result.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{result.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{result.subtitle}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
