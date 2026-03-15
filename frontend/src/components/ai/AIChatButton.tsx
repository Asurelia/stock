import { useState, useRef, useEffect } from 'react'
import { apiClient } from '@/lib/api/core'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Bot, X, Send, Loader2, Zap, Brain, Trash2, WifiOff } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
  actions?: Array<{ type: string; [key: string]: any }>
  actionResults?: string[]
}

export function AIChatButton() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    apiClient.get<{available: boolean}>('/llm/status')
      .then(s => setAvailable(s.available))
      .catch(() => setAvailable(false))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200)
  }, [open])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMsg: Message = { role: 'user', content: input.trim() }
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
        message: userMsg.content,
        conversationHistory: newMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
      })

      const assistantMsg: Message = {
        role: 'assistant',
        content: data.response,
        actions: data.actions,
        actionResults: data.actionResults,
      }
      setMessages(prev => [...prev, assistantMsg])

      // If actions were executed, refresh relevant data
      if (data.actionResults?.length) {
        queryClient.invalidateQueries({ queryKey: ['products'] })
        queryClient.invalidateQueries({ queryKey: ['deliveries'] })
        queryClient.invalidateQueries({ queryKey: ['menus'] })
        queryClient.invalidateQueries({ queryKey: ['outputs'] })
        toast.success(`${data.actionResults.length} action(s) exécutée(s)`)
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Désolé, je ne suis pas disponible actuellement. Vérifiez que LM Studio est lancé.' }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setMessages([])
  }

  const quickActions = [
    { label: 'État du stock', prompt: 'Fais un résumé de l\'état du stock actuel. Quels produits sont critiques ?' },
    { label: 'Menu demain', prompt: 'Propose un menu pour demain midi en utilisant les recettes existantes et le stock disponible.' },
    { label: 'Commandes', prompt: 'Quels produits devrais-je commander cette semaine ? Priorise par urgence.' },
    { label: 'Expirations', prompt: 'Quels produits expirent bientôt ? Comment les utiliser en priorité ?' },
  ]

  return (
    <>
      {!open && (
        /* CUSTOMIZATION: Button style changes when IA is unavailable (muted) */
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform",
            available === false
              ? "bg-muted text-muted-foreground"
              : "bg-primary text-primary-foreground animate-pulse hover:animate-none"
          )}
          title={available === false ? "IA hors ligne" : "Assistant IA"}
        >
          <Brain className="h-7 w-7" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-[340px] md:w-[420px] h-[520px] bg-background border rounded-xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              <span className="font-medium text-sm">Assistant StockPro</span>
              <Badge variant="secondary" className="text-[10px] h-5 bg-primary-foreground/20 text-primary-foreground">IA</Badge>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button onClick={handleClear} className="p-1 hover:bg-primary-foreground/20 rounded" title="Effacer">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-primary-foreground/20 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Offline notice — shown when LLM backend is unavailable */}
          {available === false && (
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/60 border-b text-xs text-muted-foreground">
              <WifiOff className="h-3.5 w-3.5 flex-shrink-0" />
              IA hors ligne — vérifiez que LM Studio est lancé
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="text-center text-sm text-muted-foreground py-4">
                  <Brain className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Assistant intelligent</p>
                  <p className="text-xs mt-1">Je connais votre stock, vos recettes et vos menus. Je peux agir directement sur l'application.</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map((qa, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(qa.prompt); setTimeout(() => handleSend(), 100) }}
                      className="text-xs text-left p-2.5 rounded-lg border hover:bg-accent transition-colors"
                    >
                      {qa.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {/* Show executed actions */}
                  {msg.actionResults && msg.actionResults.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-current/10 space-y-1">
                      {msg.actionResults.map((r, j) => (
                        <div key={j} className="flex items-center gap-1.5 text-xs opacity-80">
                          <Zap className="h-3 w-3 flex-shrink-0" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs text-muted-foreground">Réflexion...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 p-3 border-t">
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={available === false ? "IA hors ligne..." : "Demandez-moi n'importe quoi..."}
              className="flex-1 h-9 text-sm"
              disabled={isLoading || available === false}
            />
            <Button size="icon" className="h-9 w-9" onClick={handleSend} disabled={isLoading || !input.trim() || available === false}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
