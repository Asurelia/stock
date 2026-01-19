import { useState, useMemo } from 'react'
import { Search, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ProductButton } from './ProductButton'
import type { Product } from '@/lib/api'

interface StreamDeckGridProps {
    products: Product[]
    onProductClick: (product: Product) => void
    showOutOfStock?: boolean
}

export function StreamDeckGrid({ products, onProductClick, showOutOfStock = false }: StreamDeckGridProps) {
    const [search, setSearch] = useState('')
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])

    // Get unique categories
    const categories = useMemo(() => {
        const cats = new Set(products.map(p => p.category).filter(Boolean))
        return Array.from(cats).sort()
    }, [products])

    // Filter products
    const filteredProducts = useMemo(() => {
        return products
            .filter(p => {
                // Search filter
                if (search && !p.name.toLowerCase().includes(search.toLowerCase())) {
                    return false
                }
                // Category filter
                if (selectedCategories.length > 0 && !selectedCategories.includes(p.category)) {
                    return false
                }
                // Stock filter
                if (!showOutOfStock && p.quantity <= 0) {
                    return false
                }
                return true
            })
            .sort((a, b) => {
                // Sort: in-stock first, then by name
                if (a.quantity > 0 && b.quantity <= 0) return -1
                if (a.quantity <= 0 && b.quantity > 0) return 1
                return a.name.localeCompare(b.name)
            })
    }, [products, search, selectedCategories, showOutOfStock])

    const toggleCategory = (category: string) => {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        )
    }

    return (
        <div className="space-y-4">
            {/* Search and filters */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher un produit..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                            <Filter className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        {categories.map(cat => (
                            <DropdownMenuCheckboxItem
                                key={cat}
                                checked={selectedCategories.includes(cat)}
                                onCheckedChange={() => toggleCategory(cat)}
                            >
                                {cat}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Active filters */}
            {selectedCategories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedCategories.map(cat => (
                        <Button
                            key={cat}
                            variant="secondary"
                            size="sm"
                            onClick={() => toggleCategory(cat)}
                            className="h-7 text-xs"
                        >
                            {cat} ✕
                        </Button>
                    ))}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCategories([])}
                        className="h-7 text-xs text-muted-foreground"
                    >
                        Tout effacer
                    </Button>
                </div>
            )}

            {/* Product count */}
            <div className="text-sm text-muted-foreground">
                {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} disponible{filteredProducts.length > 1 ? 's' : ''}
            </div>

            {/* StreamDeck Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredProducts.map(product => (
                    <ProductButton
                        key={product.id}
                        product={product}
                        onClick={() => onProductClick(product)}
                        disabled={product.quantity <= 0}
                    />
                ))}
            </div>

            {/* Empty state */}
            {filteredProducts.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <p className="text-lg">Aucun produit trouvé</p>
                    {search && (
                        <Button
                            variant="link"
                            onClick={() => setSearch('')}
                            className="mt-2"
                        >
                            Effacer la recherche
                        </Button>
                    )}
                </div>
            )}
        </div>
    )
}
