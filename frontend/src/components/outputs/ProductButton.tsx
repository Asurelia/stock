import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { Product } from '@/lib/api'

// Mapping des emojis par nom de produit
const PRODUCT_EMOJIS: Record<string, string> = {
    // Fruits
    'Pommes': '🍎', 'Bananes': '🍌', 'Oranges': '🍊', 'Citrons': '🍋',
    'Fraises': '🍓', 'Raisins': '🍇', 'Poires': '🍐', 'Pêches': '🍑',
    'Cerises': '🍒', 'Ananas': '🍍', 'Mangues': '🥭', 'Pastèque': '🍉',
    'Melon': '🍈', 'Kiwis': '🥝', 'Avocats': '🥑',
    // Légumes
    'Carottes': '🥕', 'Tomates': '🍅', 'Salade verte': '🥬', 'Salade': '🥬',
    'Pommes de terre': '🥔', 'Oignons': '🧅', 'Ail': '🧄', 'Poivrons': '🫑',
    'Concombres': '🥒', 'Aubergines': '🍆', 'Brocoli': '🥦', 'Maïs': '🌽',
    'Champignons': '🍄', 'Haricots': '🫘', 'Petits pois': '🫛',
    // Viandes
    'Poulet entier': '🍗', 'Poulet': '🍗', 'Steak haché': '🥩', 'Bœuf': '🥩',
    'Porc': '🥓', 'Bacon': '🥓', 'Jambon': '🍖', 'Saucisses': '🌭',
    'Dinde': '🦃', 'Agneau': '🍖',
    // Poissons
    'Saumon frais': '🐟', 'Saumon': '🐟', 'Thon': '🐟', 'Crevettes': '🦐',
    'Moules': '🦪', 'Huîtres': '🦪', 'Cabillaud': '🐟', 'Sardines': '🐟',
    // Produits laitiers
    'Lait demi-écrémé': '🥛', 'Lait': '🥛', 'Fromage râpé': '🧀', 'Fromage': '🧀',
    'Beurre doux': '🧈', 'Beurre': '🧈', 'Yaourt nature': '🥛', 'Yaourt': '🥛',
    'Crème fraîche': '🥛', 'Œufs': '🥚',
    // Épicerie
    'Farine T55': '🌾', 'Farine': '🌾', 'Riz basmati': '🍚', 'Riz': '🍚',
    'Pâtes penne': '🍝', 'Pâtes': '🍝', 'Huile d\'olive': '🫒',
    'Sucre blanc': '🍬', 'Sucre': '🍬', 'Sel fin': '🧂', 'Sel': '🧂',
    'Poivre noir': '🌶️', 'Poivre': '🌶️', 'Pain': '🍞', 'Miel': '🍯',
    'Café': '☕', 'Thé': '🍵', 'Chocolat': '🍫',
}

const CATEGORY_EMOJIS: Record<string, string> = {
    'Fruits': '🍇',
    'Légumes': '🥦',
    'Viandes': '🥩',
    'Poissons': '🐠',
    'Produits laitiers': '🧀',
    'Épicerie': '📦',
    'Boulangerie': '🥖',
    'Boissons': '🥤',
    'Surgelés': '🧊',
}

// eslint-disable-next-line react-refresh/only-export-components
export function getProductEmoji(product: Product): string {
    // Check custom emoji first
    if (product.emoji) return product.emoji
    // Then check by name
    if (PRODUCT_EMOJIS[product.name]) return PRODUCT_EMOJIS[product.name]
    // Then by category
    if (product.category && CATEGORY_EMOJIS[product.category]) {
        return CATEGORY_EMOJIS[product.category]
    }
    // Default
    return '📦'
}

interface ProductButtonProps {
    product: Product
    onClick: () => void
    disabled?: boolean
}

export function ProductButton({ product, onClick, disabled }: ProductButtonProps) {
    const isLowStock = product.quantity <= (product.minStock || 5)
    const isOutOfStock = product.quantity <= 0

    return (
        <button
            onClick={onClick}
            disabled={disabled || isOutOfStock}
            className={cn(
                // Base StreamDeck style - Square aspect ratio
                "aspect-square min-h-[100px] p-3 rounded-2xl",
                "flex flex-col items-center justify-center gap-2",
                "touch-manipulation select-none",
                "transition-all duration-150 ease-out",

                // Default state - Dark gradient like StreamDeck
                "bg-gradient-to-br from-slate-700 to-slate-900",
                "dark:from-slate-600 dark:to-slate-800",
                "border-2 shadow-lg",

                // Interactive states
                !isOutOfStock && [
                    "border-slate-500/50",
                    "hover:border-primary hover:shadow-xl hover:scale-[1.02]",
                    "active:scale-95 active:shadow-md",
                ],

                // Low stock warning
                isLowStock && !isOutOfStock && "border-orange-500/70 shadow-orange-500/20",

                // Out of stock - greyed out
                isOutOfStock && [
                    "opacity-40 cursor-not-allowed grayscale",
                    "border-slate-600/30",
                ]
            )}
        >
            {/* Product emoji - Large */}
            <span className="text-4xl sm:text-5xl drop-shadow-md">
                {getProductEmoji(product)}
            </span>

            {/* Product name */}
            <span className="text-xs sm:text-sm font-medium text-white text-center line-clamp-2 leading-tight">
                {product.name}
            </span>

            {/* Stock badge */}
            <Badge
                variant={isOutOfStock ? "destructive" : isLowStock ? "destructive" : "secondary"}
                className={cn(
                    "text-xs font-semibold",
                    !isOutOfStock && !isLowStock && "bg-white/20 text-white hover:bg-white/30"
                )}
            >
                {product.quantity} {product.unit}
            </Badge>
        </button>
    )
}
