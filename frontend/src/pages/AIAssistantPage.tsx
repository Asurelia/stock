import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Brain, Send, Loader2, Zap, Trash2,
  Package, ChefHat, Calendar, ShoppingCart, Thermometer,
  AlertTriangle, TrendingUp, FileText, Sparkles, Wifi, WifiOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { AIImageAnalyzer } from '@/components/ai/AIImageAnalyzer'

/* ============================================
 * CUSTOMIZATION: Modify quick actions here
 * Each action has a label, icon, prompt, and color
 * ============================================ */
const QUICK_ACTIONS = [
  { label: 'État du stock', icon: Package, prompt: 'Fais un résumé complet de l\'état du stock. Quels produits sont critiques ?', color: 'text-blue-500' },
  { label: 'Menu du jour', icon: ChefHat, prompt: 'Propose un menu pour aujourd\'hui en utilisant les recettes existantes et le stock disponible. Priorise les produits qui expirent bientôt.', color: 'text-orange-500' },
  { label: 'Menu semaine', icon: Calendar, prompt: 'Propose les menus de la semaine (lundi à vendredi, midi et soir) en variant les recettes et en optimisant le stock.', color: 'text-purple-500' },
  { label: 'Commandes urgentes', icon: ShoppingCart, prompt: 'Quels produits dois-je commander en urgence ? Donne-moi une liste avec les quantités suggérées.', color: 'text-red-500' },
  { label: 'Alertes températures', icon: Thermometer, prompt: 'Y a-t-il des problèmes de température aujourd\'hui ? Résume la situation HACCP.', color: 'text-cyan-500' },
  { label: 'Expirations', icon: AlertTriangle, prompt: 'Quels produits expirent bientôt ? Comment les utiliser en priorité dans les menus ?', color: 'text-amber-500' },
  { label: 'Analyse tendances', icon: TrendingUp, prompt: 'Analyse les tendances de consommation des 30 derniers jours. Quels produits sont les plus utilisés ?', color: 'text-green-500' },
  { label: 'Rapport journalier', icon: FileText, prompt: 'Génère un rapport résumé de la journée : entrées, sorties, températures, alertes.', color: 'text-indigo-500' },
]

interface Message {
  role: 'user' | 'assistant'
  content: string
  actions?: Array<{ type: string; [key: string]: any }>
  actionResults?: string[]
  timestamp: string
}

interface AIMemoryEntry {
  id: string
  category: string
  key: string
  value: string
  createdAt: string
  updatedAt: string
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const queryClient = useQueryClient()

  /* ============================================
   * API: LLM status check
   * Modify URL if LM Studio runs on different port
   * ============================================ */
  const { data: llmStatus } = useQuery({
    queryKey: ['llm-status'],
    queryFn: () => apiClient.get<{ available: boolean; models?: any[] }>('/llm/status'),
    refetchInterval: 30000,
    staleTime: 10000,
  })

  const { data: memories = [], refetch: refetchMemories } = useQuery({
    queryKey: ['ai-memory'],
    queryFn: () => apiClient.get<AIMemoryEntry[]>('/llm/memory').catch(() => []),
    staleTime: 30000,
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || isLoading) return

    const userMsg: Message = { role: 'user', content: msg, timestamp: new Date().toISOString() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const data = await apiClient.post<{
        response: string
        actions: any[]
        actionResults: string[]
      }>('/llm/assistant', {
        message: msg,
        conversationHistory: newMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
      })

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        actions: data.actions,
        actionResults: data.actionResults,
        timestamp: new Date().toISOString(),
      }])

      if (data.actionResults?.length) {
        queryClient.invalidateQueries({ queryKey: ['products'] })
        queryClient.invalidateQueries({ queryKey: ['deliveries'] })
        queryClient.invalidateQueries({ queryKey: ['menus'] })
        queryClient.invalidateQueries({ queryKey: ['outputs'] })
        refetchMemories()
        toast.success(`${data.actionResults.length} action(s) exécutée(s)`)
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Désolé, je ne suis pas disponible. Vérifiez que LM Studio est lancé.',
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteMemory = async (id: string) => {
    try {
      await apiClient.del(`/llm/memory/${id}`)
      refetchMemories()
      toast.success('Mémoire supprimée')
    } catch {
      toast.error('Erreur')
    }
  }

  const isAvailable = llmStatus?.available === true

  return (
    /* ============================================
     * LAYOUT: Main AI page container
     * Modify padding, gap, max-width here
     * ============================================ */
    <div className="flex flex-col h-[calc(100vh-2rem)] md:h-[calc(100vh-1rem)] p-4 md:p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* CUSTOMIZATION: Page title and icon */}
          <Brain className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Assistant IA</h1>
            <p className="text-sm text-muted-foreground">Votre copilote intelligent pour la gestion quotidienne</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAvailable ? (
            <Badge variant="outline" className="text-green-600 border-green-300">
              <Wifi className="h-3 w-3 mr-1" />Qwen 3.5 connecté
            </Badge>
          ) : (
            <Badge variant="destructive">
              <WifiOff className="h-3 w-3 mr-1" />IA hors ligne
            </Badge>
          )}
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setMessages([])}>
              <Trash2 className="h-4 w-4 mr-1" />Effacer
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Card className="flex-1 flex flex-col overflow-hidden">
            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Sparkles className="h-16 w-16 text-primary/20 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Que puis-je faire pour vous ?</h3>
                  <p className="text-sm text-muted-foreground max-w-md mb-6">
                    Je connais votre stock, vos recettes et vos menus. Je peux agir directement : ajouter/retirer du stock, créer des menus, adapter des recettes, et mémoriser vos préférences.
                  </p>
                  {/* Image analysis */}
                  <div className="w-full max-w-md mb-4">
                    <AIImageAnalyzer onAnalyzed={(result) => {
                      const text = result.structured?.type === 'bon_livraison'
                        ? `J'ai analysé une photo de bon de livraison. Voici les données extraites:\n${JSON.stringify(result.structured, null, 2)}\n\nQue veux-tu faire avec ces données ?`
                        : `J'ai analysé une image. Voici ce que j'ai vu:\n${result.analysis}`
                      handleSend(text)
                    }} />
                  </div>
                  {/* CUSTOMIZATION: Quick action grid layout */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full max-w-2xl">
                    {QUICK_ACTIONS.map((qa, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(qa.prompt)}
                        disabled={!isAvailable}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl border hover:bg-accent hover:border-primary/30 transition-all text-center disabled:opacity-50"
                      >
                        <qa.icon className={`h-5 w-5 ${qa.color}`} />
                        <span className="text-xs font-medium">{qa.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}>
                      {/* CUSTOMIZATION: Message bubble styling */}
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                      {msg.actionResults && msg.actionResults.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-current/10 space-y-1.5">
                          {msg.actionResults.map((r, j) => (
                            <div key={j} className="flex items-center gap-2 text-xs">
                              <Zap className="h-3.5 w-3.5 flex-shrink-0 text-yellow-500" />
                              <span className="font-medium">{r}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="text-[10px] opacity-50 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-xl px-4 py-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Réflexion en cours...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </CardContent>

            {/* Input area */}
            {/* CUSTOMIZATION: Input styling, placeholder text */}
            <div className="flex items-end gap-2 p-4 border-t">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder={isAvailable ? "Demandez-moi n'importe quoi... (Entrée pour envoyer, Shift+Entrée pour nouvelle ligne)" : "LM Studio n'est pas connecté..."}
                className="flex-1 min-h-[44px] max-h-[120px] resize-none text-sm"
                disabled={isLoading || !isAvailable}
                rows={1}
              />
              <Button size="icon" className="h-11 w-11 flex-shrink-0" onClick={() => handleSend()} disabled={isLoading || !input.trim() || !isAvailable}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>

        {/* Right sidebar — AI Memory + Info (hidden on mobile) */}
        <div className="hidden lg:flex w-72 flex-col gap-4 flex-shrink-0">
          <Tabs defaultValue="memory" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full">
              <TabsTrigger value="memory" className="flex-1">Mémoire</TabsTrigger>
              <TabsTrigger value="info" className="flex-1">Info</TabsTrigger>
            </TabsList>

            <TabsContent value="memory" className="flex-1 overflow-y-auto mt-2">
              <Card className="h-full">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Mémoire IA ({memories.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {memories.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      L'IA mémorisera vos préférences au fil des conversations.
                    </p>
                  ) : (
                    memories.map(mem => (
                      <div key={mem.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 text-xs">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{mem.key}</div>
                          <div className="text-muted-foreground">{mem.value}</div>
                          <Badge variant="outline" className="mt-1 text-[10px] h-4">{mem.category}</Badge>
                        </div>
                        <button onClick={() => handleDeleteMemory(mem.id)} className="text-muted-foreground hover:text-destructive flex-shrink-0">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="info" className="mt-2">
              <Card>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div>
                    <div className="font-medium mb-1">Modèle</div>
                    <div className="text-muted-foreground">Qwen 3.5 9B via LM Studio</div>
                  </div>
                  <div>
                    <div className="font-medium mb-1">Capacités</div>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• Ajouter / retirer du stock</li>
                      <li>• Créer des menus</li>
                      <li>• Adapter des recettes</li>
                      <li>• Analyser les tendances</li>
                      <li>• Mémoriser vos préférences</li>
                      <li>• Analyser les bons de livraison</li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium mb-1">Exemples</div>
                    <ul className="text-muted-foreground space-y-1 italic">
                      <li>"Ajoute 10kg de tomates"</li>
                      <li>"Propose un menu sans gluten"</li>
                      <li>"Retiens qu'on ne sert jamais de porc"</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
