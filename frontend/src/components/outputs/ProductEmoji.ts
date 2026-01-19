// Product name to emoji mapping
const PRODUCT_EMOJIS: Record<string, string> = {
    // Fruits
    'Pommes': '🍎',
    'Bananes': '🍌',
    'Oranges': '🍊',
    'Citrons': '🍋',
    'Fraises': '🍓',
    'Raisins': '🍇',
    'Poires': '🍐',
    'Peches': '🍑',
    'Cerises': '🍒',
    'Ananas': '🍍',
    'Mangues': '🥭',
    'Kiwis': '🥝',
    'Pasteque': '🍉',
    'Melon': '🍈',

    // Legumes
    'Carottes': '🥕',
    'Tomates': '🍅',
    'Salade': '🥬',
    'Salade verte': '🥬',
    'Laitue': '🥬',
    'Pommes de terre': '🥔',
    'Patates': '🥔',
    'Oignons': '🧅',
    'Ail': '🧄',
    'Poivrons': '🫑',
    'Concombre': '🥒',
    'Brocoli': '🥦',
    'Aubergine': '🍆',
    'Champignons': '🍄',
    'Mais': '🌽',
    'Haricots': '🫘',
    'Pois': '🫛',
    'Avocat': '🥑',

    // Viandes
    'Poulet': '🍗',
    'Poulet entier': '🍗',
    'Cuisses de poulet': '🍗',
    'Filets de poulet': '🍗',
    'Boeuf': '🥩',
    'Steak': '🥩',
    'Steak hache': '🥩',
    'Viande hachee': '🥩',
    'Porc': '🥓',
    'Jambon': '🥓',
    'Lard': '🥓',
    'Bacon': '🥓',
    'Saucisses': '🌭',
    'Agneau': '🍖',

    // Poissons
    'Saumon': '🐟',
    'Saumon frais': '🐟',
    'Thon': '🐟',
    'Cabillaud': '🐟',
    'Crevettes': '🦐',
    'Moules': '🦪',
    'Huitres': '🦪',

    // Produits laitiers
    'Lait': '🥛',
    'Lait demi-ecreme': '🥛',
    'Lait entier': '🥛',
    'Fromage': '🧀',
    'Fromage rape': '🧀',
    'Beurre': '🧈',
    'Beurre doux': '🧈',
    'Yaourt': '🥛',
    'Yaourt nature': '🥛',
    'Creme fraiche': '🥛',
    'Oeufs': '🥚',

    // Epicerie
    'Farine': '🌾',
    'Farine T55': '🌾',
    'Riz': '🍚',
    'Riz basmati': '🍚',
    'Pates': '🍝',
    'Pates penne': '🍝',
    'Spaghetti': '🍝',
    'Pain': '🍞',
    'Baguette': '🥖',
    'Croissants': '🥐',

    // Condiments
    'Huile': '🫒',
    'Huile d\'olive': '🫒',
    'Huile olive': '🫒',
    'Sucre': '🍬',
    'Sucre blanc': '🍬',
    'Sel': '🧂',
    'Sel fin': '🧂',
    'Poivre': '🌶️',
    'Poivre noir': '🌶️',
    'Miel': '🍯',
    'Vinaigre': '🍶',

    // Boissons
    'Eau': '💧',
    'Jus d\'orange': '🧃',
    'Cafe': '☕',
    'The': '🍵',
    'Vin': '🍷',
    'Biere': '🍺',
}

// Category to emoji fallback
const CATEGORY_EMOJIS: Record<string, string> = {
    'Fruits': '🍇',
    'Legumes': '🥦',
    'Viandes': '🥩',
    'Poissons': '🐠',
    'Produits laitiers': '🧀',
    'Epicerie': '📦',
    'Boissons': '🥤',
    'Surgeles': '🧊',
    'Condiments': '🧂',
    'Boulangerie': '🥖',
    'Autre': '📦',
}

// Categories exempt from traceability photos
export const EXEMPT_CATEGORIES = ['Fruits', 'Legumes']

export function getProductEmoji(product: { name: string; category?: string | null; emoji?: string | null }): string {
    // Use custom emoji if set
    if (product.emoji) return product.emoji

    // Try exact match on product name
    const exactMatch = PRODUCT_EMOJIS[product.name]
    if (exactMatch) return exactMatch

    // Try partial match (case insensitive)
    const lowerName = product.name.toLowerCase()
    for (const [key, emoji] of Object.entries(PRODUCT_EMOJIS)) {
        if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
            return emoji
        }
    }

    // Fall back to category emoji
    if (product.category) {
        const categoryEmoji = CATEGORY_EMOJIS[product.category]
        if (categoryEmoji) return categoryEmoji
    }

    // Default
    return '📦'
}

export function needsTraceabilityPhoto(category: string | null | undefined): boolean {
    if (!category) return true
    return !EXEMPT_CATEGORIES.includes(category)
}
