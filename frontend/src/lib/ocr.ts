import Tesseract from 'tesseract.js'
import type { Product } from './api'

// =============================================
// Types
// =============================================

export interface OCRProgress {
    status: string
    progress: number
}

export interface ParsedLine {
    raw: string
    quantity: number | null
    unit: string | null
    name: string
    price: number | null
    confidence: number
}

export interface MatchedItem {
    parsed: ParsedLine
    product: Product | null
    matchScore: number
    matchType: 'exact' | 'partial' | 'fuzzy' | 'none'
    alternatives: Product[]
    userCorrected?: boolean
    correctedProductId?: string
}

export interface OCRResult {
    text: string
    lines: ParsedLine[]
    matches: MatchedItem[]
    confidence: number
}

// =============================================
// Corrections Storage (for learning)
// =============================================

const CORRECTIONS_KEY = 'stockpro_ocr_corrections'

interface CorrectionEntry {
    originalText: string
    normalizedText: string
    productId: string
    productName: string
    count: number
    lastUsed: string
}

export function getCorrections(): CorrectionEntry[] {
    try {
        const data = localStorage.getItem(CORRECTIONS_KEY)
        return data ? JSON.parse(data) : []
    } catch {
        return []
    }
}

export function saveCorrection(originalText: string, productId: string, productName: string): void {
    const corrections = getCorrections()
    const normalized = normalizeText(originalText)

    const existing = corrections.find(c => c.normalizedText === normalized)

    if (existing) {
        existing.productId = productId
        existing.productName = productName
        existing.count++
        existing.lastUsed = new Date().toISOString()
    } else {
        corrections.push({
            originalText,
            normalizedText: normalized,
            productId,
            productName,
            count: 1,
            lastUsed: new Date().toISOString()
        })
    }

    // Keep only the last 500 corrections
    const sorted = corrections.sort((a, b) => b.count - a.count).slice(0, 500)
    localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(sorted))
}

export function findCorrectionMatch(text: string): CorrectionEntry | null {
    const corrections = getCorrections()
    const normalized = normalizeText(text)

    // Exact match first
    const exact = corrections.find(c => c.normalizedText === normalized)
    if (exact) return exact

    // Fuzzy match with high threshold
    for (const correction of corrections) {
        if (calculateSimilarity(normalized, correction.normalizedText) > 0.85) {
            return correction
        }
    }

    return null
}

// =============================================
// Text Processing
// =============================================

export function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

export function calculateSimilarity(str1: string, str2: string): number {
    const s1 = normalizeText(str1)
    const s2 = normalizeText(str2)

    if (s1 === s2) return 1
    if (s1.length === 0 || s2.length === 0) return 0

    // Word-based similarity
    const words1 = s1.split(' ').filter(w => w.length > 2)
    const words2 = s2.split(' ').filter(w => w.length > 2)

    if (words1.length === 0 || words2.length === 0) return 0

    let matchCount = 0
    for (const w1 of words1) {
        for (const w2 of words2) {
            if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
                matchCount++
                break
            }
        }
    }

    return matchCount / Math.max(words1.length, words2.length)
}

// =============================================
// Line Parsing
// =============================================

const QUANTITY_PATTERNS = [
    /^(\d+[.,]?\d*)\s*(kg|g|l|cl|ml|pce|pièce|boite|bte|paquet|pqt|bouteille|btl|unité|u)\b/i,
    /^(\d+[.,]?\d*)\s*x\s*/i,
    /^x\s*(\d+[.,]?\d*)\s*/i,
    /(\d+[.,]?\d*)\s*(kg|g|l|cl|ml)\s*$/i,
]

const PRICE_PATTERNS = [
    /(\d+[.,]\d{2})\s*€?\s*$/,
    /€\s*(\d+[.,]\d{2})/,
    /(\d+[.,]\d{2})\s*eur/i,
]

const UNIT_MAP: Record<string, string> = {
    'kg': 'kg',
    'kilo': 'kg',
    'kilos': 'kg',
    'g': 'g',
    'gr': 'g',
    'gramme': 'g',
    'grammes': 'g',
    'l': 'L',
    'litre': 'L',
    'litres': 'L',
    'cl': 'cL',
    'ml': 'mL',
    'pce': 'unité',
    'pièce': 'unité',
    'pieces': 'unité',
    'u': 'unité',
    'unite': 'unité',
    'unites': 'unité',
    'boite': 'boîte',
    'boites': 'boîte',
    'bte': 'boîte',
    'paquet': 'paquet',
    'pqt': 'paquet',
    'bouteille': 'bouteille',
    'btl': 'bouteille',
}

export function parseLine(line: string): ParsedLine {
    let text = line.trim()
    let quantity: number | null = null
    let unit: string | null = null
    let price: number | null = null
    let confidence = 0.5

    // Extract price
    for (const pattern of PRICE_PATTERNS) {
        const match = text.match(pattern)
        if (match) {
            price = parseFloat(match[1].replace(',', '.'))
            text = text.replace(pattern, '').trim()
            confidence += 0.1
            break
        }
    }

    // Extract quantity and unit
    for (const pattern of QUANTITY_PATTERNS) {
        const match = text.match(pattern)
        if (match) {
            quantity = parseFloat(match[1].replace(',', '.'))
            if (match[2]) {
                const unitKey = match[2].toLowerCase()
                unit = UNIT_MAP[unitKey] || match[2]
            }
            text = text.replace(pattern, '').trim()
            confidence += 0.2
            break
        }
    }

    // Clean remaining text as product name
    const name = text
        .replace(/^[-–—•*]\s*/, '') // Remove bullet points
        .replace(/\s+/g, ' ')
        .trim()

    if (name.length > 2) confidence += 0.2

    return {
        raw: line,
        quantity,
        unit,
        name,
        price,
        confidence: Math.min(confidence, 1)
    }
}

// =============================================
// Product Matching
// =============================================

export function matchProduct(parsed: ParsedLine, products: Product[]): MatchedItem {
    const name = normalizeText(parsed.name)

    if (!name || name.length < 2) {
        return {
            parsed,
            product: null,
            matchScore: 0,
            matchType: 'none',
            alternatives: []
        }
    }

    // Check learned corrections first
    const correction = findCorrectionMatch(parsed.name)
    if (correction) {
        const correctedProduct = products.find(p => p.id === correction.productId)
        if (correctedProduct) {
            return {
                parsed,
                product: correctedProduct,
                matchScore: 0.95,
                matchType: 'exact',
                alternatives: [],
                userCorrected: true
            }
        }
    }

    // Calculate scores for all products
    const scored = products.map(product => {
        const productName = normalizeText(product.name)
        let score = calculateSimilarity(name, productName)

        // Boost if category matches common words
        if (product.category) {
            const catNorm = normalizeText(product.category)
            if (name.includes(catNorm) || catNorm.includes(name.split(' ')[0])) {
                score += 0.1
            }
        }

        return { product, score }
    }).filter(s => s.score > 0.2)
        .sort((a, b) => b.score - a.score)

    if (scored.length === 0) {
        return {
            parsed,
            product: null,
            matchScore: 0,
            matchType: 'none',
            alternatives: []
        }
    }

    const best = scored[0]
    let matchType: 'exact' | 'partial' | 'fuzzy' | 'none' = 'none'

    if (best.score >= 0.9) matchType = 'exact'
    else if (best.score >= 0.6) matchType = 'partial'
    else if (best.score >= 0.3) matchType = 'fuzzy'

    return {
        parsed,
        product: best.product,
        matchScore: best.score,
        matchType,
        alternatives: scored.slice(1, 4).map(s => s.product)
    }
}

// =============================================
// OCR Processing
// =============================================

export async function processImage(
    imageFile: File,
    products: Product[],
    onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
    onProgress?.({ status: 'Initialisation...', progress: 0 })

    const result = await Tesseract.recognize(imageFile, 'fra', {
        logger: (m) => {
            if (m.status === 'recognizing text') {
                onProgress?.({
                    status: 'Reconnaissance en cours...',
                    progress: Math.round(m.progress * 80)
                })
            }
        }
    })

    onProgress?.({ status: 'Analyse du texte...', progress: 85 })

    const text = result.data.text
    const rawLines = text.split('\n').filter(line => line.trim().length > 2)

    onProgress?.({ status: 'Matching des produits...', progress: 90 })

    const lines = rawLines.map(parseLine)
    const matches = lines
        .filter(line => line.name.length > 2)
        .map(line => matchProduct(line, products))

    onProgress?.({ status: 'Terminé', progress: 100 })

    return {
        text,
        lines,
        matches,
        confidence: result.data.confidence / 100
    }
}

// =============================================
// Recipe Parsing
// =============================================

export interface ParsedRecipe {
    name: string
    portions: number
    ingredients: Array<{
        raw: string
        quantity: number | null
        unit: string | null
        name: string
        matchedProduct: Product | null
        alternatives: Product[]
    }>
    instructions: string[]
}

const PORTION_PATTERNS = [
    /pour\s*(\d+)\s*personnes?/i,
    /(\d+)\s*portions?/i,
    /(\d+)\s*parts?/i,
    /pour\s*(\d+)/i,
]

export function parseRecipeText(text: string, products: Product[]): ParsedRecipe {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)

    // First non-empty line is usually the name
    const name = lines[0]?.replace(/^#+\s*/, '') || 'Recette sans nom'

    // Find portions
    let portions = 4 // default
    for (const line of lines.slice(0, 5)) {
        for (const pattern of PORTION_PATTERNS) {
            const match = line.match(pattern)
            if (match) {
                portions = parseInt(match[1])
                break
            }
        }
    }

    // Parse ingredients (lines with quantities)
    const ingredients: ParsedRecipe['ingredients'] = []
    const instructions: string[] = []
    let inInstructions = false

    for (const line of lines.slice(1)) {
        // Check if we've hit instructions section
        if (/^(préparation|instructions|étapes|méthode|recette)/i.test(line)) {
            inInstructions = true
            continue
        }

        if (inInstructions) {
            instructions.push(line.replace(/^\d+[.)]\s*/, ''))
            continue
        }

        // Try to parse as ingredient
        const parsed = parseLine(line)

        if (parsed.quantity !== null || parsed.name.length > 3) {
            const match = matchProduct(parsed, products)
            ingredients.push({
                raw: line,
                quantity: parsed.quantity,
                unit: parsed.unit,
                name: parsed.name,
                matchedProduct: match.product,
                alternatives: match.alternatives
            })
        } else if (line.length > 20 && !line.match(/^\d/)) {
            // Long line without quantity is probably instruction
            instructions.push(line)
        }
    }

    return {
        name,
        portions,
        ingredients,
        instructions
    }
}

export async function processRecipeImage(
    imageFile: File,
    products: Product[],
    onProgress?: (progress: OCRProgress) => void
): Promise<ParsedRecipe> {
    onProgress?.({ status: 'Initialisation...', progress: 0 })

    const result = await Tesseract.recognize(imageFile, 'fra', {
        logger: (m) => {
            if (m.status === 'recognizing text') {
                onProgress?.({
                    status: 'Reconnaissance en cours...',
                    progress: Math.round(m.progress * 80)
                })
            }
        }
    })

    onProgress?.({ status: 'Analyse de la recette...', progress: 90 })

    const parsed = parseRecipeText(result.data.text, products)

    onProgress?.({ status: 'Terminé', progress: 100 })

    return parsed
}
