import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { asyncHandler, AppError, nowISO } from '../lib/errors'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const router = Router()
const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234'

const uploadDir = path.join(__dirname, '../../uploads/ai-temp')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
const upload = multer({ dest: uploadDir, limits: { fileSize: 10 * 1024 * 1024 } })

async function callLLM(messages: Array<{role: string; content: string}>, temperature = 0.3): Promise<string> {
  const res = await fetch(`${LM_STUDIO_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, temperature, max_tokens: 4000, stream: false }),
  })
  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    console.error('LLM error:', res.status, errBody)
    throw new AppError(502, `LLM erreur ${res.status}: ${errBody.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

async function callLLMWithImage(
  messages: Array<{role: string; content: any}>,
  temperature = 0.3
): Promise<string> {
  const res = await fetch(`${LM_STUDIO_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, temperature, max_tokens: 4000, stream: false }),
  })
  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    console.error('LLM vision error:', res.status, errBody)
    throw new AppError(502, `LLM erreur ${res.status}: ${errBody.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

// Helper: get full app context for AI
async function getAppContext() {
  const [products, recipes, menus, recentOutputs, recentDeliveries, expiringLots, memories] = await Promise.all([
    prisma.product.findMany({ orderBy: { name: 'asc' } }),
    prisma.recipe.findMany({ include: { ingredients: { include: { product: { select: { name: true, quantity: true, unit: true } } } } } }),
    prisma.menu.findMany({ orderBy: { menu_date: 'desc' }, take: 14, include: { menu_recipes: { include: { recipe: { select: { name: true } } } } } }),
    prisma.output.findMany({ orderBy: { output_date: 'desc' }, take: 50, include: { product: { select: { name: true } } } }),
    prisma.delivery.findMany({ orderBy: { delivery_date: 'desc' }, take: 20, include: { product: { select: { name: true } } } }),
    prisma.productLot.findMany({ where: { quantity: { gt: 0 } }, include: { product: { select: { name: true } } } }),
    prisma.aIMemory.findMany(),
  ])

  const lowStock = products.filter(p => p.min_stock > 0 && p.quantity <= p.min_stock)
  const outOfStock = products.filter(p => p.quantity <= 0)

  const now = new Date()
  const soonExpiring = expiringLots.filter(l => {
    const exp = new Date(l.expiry_date)
    return exp.getTime() - now.getTime() < 7 * 86400000
  })

  return {
    products: products.map(p => ({ id: p.id, name: p.name, category: p.category, quantity: p.quantity, unit: p.unit, minStock: p.min_stock, price: p.price })),
    lowStock: lowStock.map(p => ({ name: p.name, quantity: p.quantity, unit: p.unit, minStock: p.min_stock })),
    outOfStock: outOfStock.map(p => p.name),
    recipes: recipes.map(r => ({
      id: r.id, name: r.name, category: r.category, servings: r.servings,
      ingredients: r.ingredients.map(i => ({ productName: i.product.name, quantity: i.quantity, unit: i.unit, available: i.product.quantity }))
    })),
    recentMenus: menus.map(m => ({ date: m.menu_date, mealType: m.meal_type, recipes: m.menu_recipes.map(mr => mr.recipe.name) })),
    recentOutputs: recentOutputs.slice(0, 20).map(o => ({ product: o.product.name, quantity: o.quantity, reason: o.reason, date: o.output_date })),
    soonExpiring: soonExpiring.map(l => ({ product: (l.product as any).name, expiryDate: l.expiry_date, quantity: l.quantity })),
    memories: memories.reduce((acc, m) => { acc[`${m.category}:${m.key}`] = m.value; return acc }, {} as Record<string, string>),
    today: now.toISOString().split('T')[0],
    dayOfWeek: ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'][now.getDay()],
  }
}

// Helper: execute AI actions
async function executeAction(action: any): Promise<string> {
  try {
    switch (action.type) {
      case 'add_stock': {
        const product = await prisma.product.findFirst({ where: { name: { contains: action.productName } } })
        if (!product) return `Produit "${action.productName}" non trouve`
        await prisma.product.update({ where: { id: product.id }, data: { quantity: product.quantity + action.quantity } })
        return `+${action.quantity} ${product.unit} de ${product.name} (stock: ${product.quantity + action.quantity})`
      }
      case 'remove_stock': {
        const product = await prisma.product.findFirst({ where: { name: { contains: action.productName } } })
        if (!product) return `Produit "${action.productName}" non trouve`
        const newQty = Math.max(0, product.quantity - action.quantity)
        await prisma.product.update({ where: { id: product.id }, data: { quantity: newQty } })
        await prisma.output.create({ data: { product_id: product.id, quantity: action.quantity, reason: action.reason || 'Assistant IA', output_date: nowISO().split('T')[0], created_at: nowISO() } })
        return `-${action.quantity} ${product.unit} de ${product.name} (stock: ${newQty})`
      }
      case 'create_menu': {
        const menu = await prisma.menu.create({ data: { name: action.name || '', menu_date: action.date, meal_type: action.mealType || 'lunch', notes: action.notes || '', created_at: nowISO(), updated_at: nowISO() } })
        if (action.recipeNames?.length) {
          for (const recipeName of action.recipeNames) {
            const recipe = await prisma.recipe.findFirst({ where: { name: { contains: recipeName } } })
            if (recipe) {
              await prisma.menuRecipe.create({ data: { menu_id: menu.id, recipe_id: recipe.id, servings: action.servings || recipe.servings } })
            }
          }
        }
        return `Menu cree pour ${action.date}: ${action.recipeNames?.join(', ') || action.name}`
      }
      case 'remember': {
        await prisma.aIMemory.upsert({
          where: { category_key: { category: action.category || 'general', key: action.key } },
          update: { value: action.value, updated_at: nowISO() },
          create: { category: action.category || 'general', key: action.key, value: action.value, created_at: nowISO(), updated_at: nowISO() },
        })
        return `Memorise: ${action.key} = ${action.value}`
      }
      case 'suggest_recipe_adaptation': {
        return action.suggestion || 'Suggestion generee'
      }
      case 'web_search': {
        // Search the web using DuckDuckGo instant answer API (no API key needed)
        const query = encodeURIComponent(action.query)
        try {
          const res = await fetch(`https://api.duckduckgo.com/?q=${query}&format=json&no_html=1&skip_disambig=1`)
          const data = await res.json()
          const results: string[] = []
          if (data.AbstractText) results.push(`Resume: ${data.AbstractText}`)
          if (data.Answer) results.push(`Reponse: ${data.Answer}`)
          if (data.RelatedTopics?.length) {
            for (const topic of data.RelatedTopics.slice(0, 5)) {
              if (topic.Text) results.push(`- ${topic.Text}`)
            }
          }
          if (results.length === 0) {
            // Fallback: use DuckDuckGo HTML search and scrape
            const htmlRes = await fetch(`https://html.duckduckgo.com/html/?q=${query}`, {
              headers: { 'User-Agent': 'StockPro/1.0' }
            })
            const html = await htmlRes.text()
            const snippets = html.match(/class="result__snippet">(.*?)<\//g)?.slice(0, 5)
            if (snippets) {
              for (const s of snippets) {
                results.push('- ' + s.replace(/class="result__snippet">/, '').replace(/<\//, '').replace(/<[^>]*>/g, ''))
              }
            }
          }
          return results.length > 0 ? `Resultats pour "${action.query}":\n${results.join('\n')}` : `Aucun resultat pour "${action.query}"`
        } catch (err: any) {
          return `Erreur recherche: ${err.message}`
        }
      }
      case 'fetch_url': {
        // Fetch a URL and return its text content
        try {
          const res = await fetch(action.url, {
            headers: { 'User-Agent': 'StockPro/1.0' },
            signal: AbortSignal.timeout(10000),
          })
          const text = await res.text()
          // Strip HTML tags for readability
          const clean = text.replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 3000)
          return `Contenu de ${action.url}:\n${clean}`
        } catch (err: any) {
          return `Erreur fetch: ${err.message}`
        }
      }
      case 'calculate': {
        // Simple math evaluation
        try {
          // Safe eval: only allow numbers and basic operators
          const expr = action.expression.replace(/[^0-9+\-*/().,%\s]/g, '')
          const result = Function(`"use strict"; return (${expr})`)()
          return `${action.expression} = ${result}`
        } catch {
          return `Erreur calcul: expression invalide`
        }
      }
      case 'get_date_info': {
        // Return current date/time info
        const now = new Date()
        const days = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi']
        return `Date: ${now.toLocaleDateString('fr-FR')} | Heure: ${now.toLocaleTimeString('fr-FR')} | Jour: ${days[now.getDay()]}`
      }
      case 'update_delivery_status': {
        const delivery = await prisma.delivery.findFirst({
          where: action.deliveryId ? { id: action.deliveryId } : {},
        })
        if (!delivery) return 'Livraison non trouvée'
        await prisma.delivery.update({ where: { id: delivery.id }, data: { status: action.status } })
        return `Livraison ${delivery.id.slice(0, 8)} → ${action.status}`
      }
      default:
        return `Action inconnue: ${action.type}`
    }
  } catch (err: any) {
    return `Erreur: ${err.message}`
  }
}

const SYSTEM_PROMPT = `Tu es l'assistant IA de StockPro, une application de gestion de stock pour clinique/restaurant.

TU PEUX AGIR sur l'application via des outils. Retourne TOUJOURS un JSON valide:

{
  "response": "Ta reponse en francais",
  "actions": [...]
}

OUTILS DISPONIBLES (utilise le champ "type" dans actions):

GESTION STOCK:
- {"type": "add_stock", "productName": "...", "quantity": nombre} — Ajouter du stock
- {"type": "remove_stock", "productName": "...", "quantity": nombre, "reason": "..."} — Retirer du stock

MENUS & RECETTES:
- {"type": "create_menu", "date": "YYYY-MM-DD", "mealType": "lunch|dinner|breakfast", "name": "...", "recipeNames": ["..."], "servings": nombre} — Creer un menu

RECHERCHE & WEB:
- {"type": "web_search", "query": "..."} — Rechercher sur internet (DuckDuckGo)
- {"type": "fetch_url", "url": "https://..."} — Lire le contenu d'une page web

UTILITAIRES:
- {"type": "calculate", "expression": "..."} — Calculer une expression mathematique
- {"type": "get_date_info"} — Obtenir la date et l'heure actuelles
- {"type": "remember", "category": "preference|rule|info", "key": "...", "value": "..."} — Memoriser une information

LIVRAISONS:
- {"type": "update_delivery_status", "deliveryId": "...", "status": "brouillon|en_cours|livre|archive"} — Changer le statut d'une livraison

VISION:
- Les images sont analysées via un endpoint séparé. Si l'utilisateur parle d'une image déjà analysée, utilise les données structurées fournies.

REGLES:
- Reponds TOUJOURS en JSON valide avec "response" et "actions" (actions peut etre vide [])
- Tu peux enchainer plusieurs actions dans une seule reponse
- Pour les recherches web: utilise web_search, lis les resultats, et resume pour l'utilisateur
- Si tu as besoin de plus de details sur un resultat web, utilise fetch_url
- Memorise les preferences de l'utilisateur pour les conversations futures
- Priorise les produits qui expirent bientot dans tes suggestions
- Sois proactif: signale les problemes et propose des solutions`

// POST /api/llm/analyze-image — Analyze an image with Qwen vision
router.post('/analyze-image', upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, 'Image requise')

  const { prompt } = req.body
  const defaultPrompt = "Analyse cette image en detail. Si c'est un bon de livraison, extrais: fournisseur, date, liste des produits avec quantites et prix. Retourne un JSON structure."

  // Read file and convert to base64
  const filePath = req.file.path
  const fileBuffer = fs.readFileSync(filePath)
  const base64Image = fileBuffer.toString('base64')
  const mimeType = req.file.mimetype || 'image/jpeg'
  const dataUrl = `data:${mimeType};base64,${base64Image}`

  // Clean up temp file
  fs.unlinkSync(filePath)

  const messages = [
    {
      role: 'system',
      content: `Tu es un assistant expert en analyse d'images pour une application de gestion de stock.
Quand tu analyses un bon de livraison, retourne un JSON:
{
  "type": "bon_livraison",
  "supplierName": "...",
  "date": "YYYY-MM-DD",
  "deliveryNumber": "...",
  "items": [{"productName": "...", "quantity": nombre, "unit": "...", "unitPrice": nombre, "totalPrice": nombre}],
  "totalAmount": nombre,
  "notes": "..."
}
Pour toute autre image, decris ce que tu vois de maniere utile pour la gestion de stock.
Reponds toujours en francais.`
    },
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: dataUrl }
        },
        {
          type: 'text',
          text: prompt || defaultPrompt
        }
      ]
    }
  ]

  const llmResponse = await callLLMWithImage(messages, 0.2)

  // Clean think blocks
  const cleaned = llmResponse.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

  // Try to parse JSON
  let parsed: any = null
  try {
    const jsonStart = cleaned.indexOf('{')
    const jsonEnd = cleaned.lastIndexOf('}')
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1))
    }
  } catch {}

  res.json({
    analysis: cleaned,
    structured: parsed,
  })
}))

// POST /api/llm/assistant -- The main smart assistant endpoint
router.post('/assistant', asyncHandler(async (req, res) => {
  const { message, conversationHistory = [] } = req.body
  if (!message) throw new AppError(400, 'message requis')

  const context = await getAppContext()

  const contextSummary = `
DONNEES ACTUELLES (${context.today}, ${context.dayOfWeek}):

STOCK (${context.products.length} produits):
${context.products.map(p => `- ${p.name}: ${p.quantity} ${p.unit} (min: ${p.minStock}, prix: ${p.price}EUR)`).join('\n')}

ALERTES STOCK BAS: ${context.lowStock.map(p => `${p.name} (${p.quantity}/${p.minStock} ${p.unit})`).join(', ') || 'Aucune'}
RUPTURES: ${context.outOfStock.join(', ') || 'Aucune'}
EXPIRATIONS PROCHES: ${context.soonExpiring.map(l => `${l.product} expire ${l.expiryDate}`).join(', ') || 'Aucune'}

RECETTES (${context.recipes.length}):
${context.recipes.map(r => `- ${r.name} (${r.servings} pers.): ${r.ingredients.map(i => `${i.productName} ${i.quantity}${i.unit} [dispo: ${i.available}]`).join(', ')}`).join('\n')}

MENUS RECENTS:
${context.recentMenus.slice(0, 7).map(m => `- ${m.date} (${m.mealType}): ${m.recipes.join(', ')}`).join('\n') || 'Aucun'}

SORTIES RECENTES:
${context.recentOutputs.slice(0, 10).map(o => `- ${o.product}: ${o.quantity} (${o.reason}, ${o.date})`).join('\n') || 'Aucune'}

MEMOIRE IA:
${Object.entries(context.memories).map(([k, v]) => `- ${k}: ${v}`).join('\n') || 'Vide'}
`

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + '\n\n' + contextSummary },
    ...conversationHistory.slice(-10).map((m: any) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ]

  const llmResponse = await callLLM(messages, 0.4)

  // Parse response — strip <think>...</think> blocks from Qwen 3.5
  let cleaned = llmResponse.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

  let parsed: any
  try {
    // Try extracting JSON from markdown code blocks first
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1].trim())
    } else {
      // Try parsing the whole cleaned response as JSON
      const jsonStart = cleaned.indexOf('{')
      const jsonEnd = cleaned.lastIndexOf('}')
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1))
      } else {
        parsed = { response: cleaned, actions: [] }
      }
    }
  } catch {
    // If not JSON, treat as plain text response
    parsed = { response: cleaned || llmResponse, actions: [] }
  }

  // Execute actions
  const actionResults: string[] = []
  if (parsed.actions?.length) {
    for (const action of parsed.actions) {
      const result = await executeAction(action)
      actionResults.push(result)
    }
  }

  res.json({
    response: parsed.response || llmResponse,
    actions: parsed.actions || [],
    actionResults,
  })
}))

// Keep existing endpoints
// POST /extract-delivery
router.post('/extract-delivery', asyncHandler(async (req, res) => {
  const { ocrText } = req.body
  if (!ocrText) throw new AppError(400, 'ocrText requis')

  const systemPrompt = `Tu es un assistant specialise dans l'extraction de donnees de bons de livraison.
Retourne UNIQUEMENT un JSON valide:
{"supplierName":"...","date":"YYYY-MM-DD","items":[{"productName":"...","quantity":nombre,"unit":"...","unitPrice":nombre_ou_null,"totalPrice":nombre_ou_null}],"totalAmount":nombre_ou_null,"deliveryNumber":"..."}`

  const response = await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Texte OCR:\n\n${ocrText}` },
  ])

  let parsed = null
  try {
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, response]
    parsed = JSON.parse(jsonMatch[1]!.trim())
  } catch {
    parsed = { raw: response, parseError: true }
  }
  res.json(parsed)
}))

// POST /extract-and-match
router.post('/extract-and-match', asyncHandler(async (req, res) => {
  const { ocrText, supplierId } = req.body
  if (!ocrText) throw new AppError(400, 'ocrText requis')

  const systemPrompt = `Tu es un assistant specialise dans l'extraction de donnees de bons de livraison.
Retourne UNIQUEMENT un JSON valide:
{"supplierName":"...","date":"YYYY-MM-DD","items":[{"productName":"...","quantity":nombre,"unit":"...","unitPrice":nombre_ou_null,"totalPrice":nombre_ou_null}],"totalAmount":nombre_ou_null,"deliveryNumber":"..."}`

  const llmResponse = await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Texte OCR:\n\n${ocrText}` },
  ])

  let extracted: any = null
  try {
    const jsonMatch = llmResponse.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, llmResponse]
    extracted = JSON.parse(jsonMatch[1]!.trim())
  } catch {
    res.json({ extracted: null, matches: [], parseError: true, raw: llmResponse })
    return
  }

  const productNames = (extracted.items || []).map((i: any) => i.productName)
  const matchRes = await fetch(`http://localhost:${process.env.PORT || 3001}/api/product-mappings/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ names: productNames, supplierId }),
  })
  const matches = await matchRes.json()

  const mergedItems = (extracted.items || []).map((item: any, i: number) => ({
    ...item,
    match: matches[i] || { matched: false, source: 'none' },
  }))

  res.json({ extracted: { ...extracted, items: mergedItems }, parseError: false })
}))

// GET /status
router.get('/status', asyncHandler(async (_req, res) => {
  try {
    const r = await fetch(`${LM_STUDIO_URL}/v1/models`, { signal: AbortSignal.timeout(3000) })
    if (r.ok) {
      const data = await r.json()
      res.json({ available: true, models: data.data || [] })
    } else {
      res.json({ available: false })
    }
  } catch {
    res.json({ available: false })
  }
}))

// GET /memory -- Get all AI memories
router.get('/memory', asyncHandler(async (_req, res) => {
  const memories = await prisma.aIMemory.findMany({ orderBy: { category: 'asc' } })
  res.json(memories.map(m => ({
    id: m.id, category: m.category, key: m.key, value: m.value,
    createdAt: m.created_at, updatedAt: m.updated_at,
  })))
}))

// DELETE /memory/:id -- Delete a memory
router.delete('/memory/:id', asyncHandler(async (req, res) => {
  const id = req.params.id as string
  await prisma.aIMemory.delete({ where: { id } })
  res.json({ ok: true })
}))

export default router

