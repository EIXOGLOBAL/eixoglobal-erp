'use client'

import { useState, useRef, useEffect, useCallback, type KeyboardEvent, type FormEvent } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Bot, X, SendHorizontal, Sparkles, User, MoreVertical, Trash2 } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  action?: NavigateAction | null
}

interface NavigateAction {
  action: 'navigate'
  path: string
  buttonLabel: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SESSION_KEY = 'ai-assistant-history'

function generateId() {
  return Math.random().toString(36).substring(2, 11)
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** Extracts a trailing JSON action line from the assistant text, if present. */
function extractAction(text: string): { cleanText: string; action: NavigateAction | null } {
  // Match a JSON object on its own line at the very end
  const regex = /\n?\s*(\{"action"\s*:\s*"navigate"\s*,\s*"path"\s*:\s*"[^"]+"\s*,\s*"buttonLabel"\s*:\s*"[^"]+"\s*\})\s*$/
  const match = text.match(regex)
  if (match) {
    try {
      const parsed = JSON.parse(match[1]!)
      if (parsed.action === 'navigate' && parsed.path && parsed.buttonLabel) {
        return { cleanText: text.slice(0, match.index).trimEnd(), action: parsed as NavigateAction }
      }
    } catch {
      // ignore parse errors
    }
  }
  return { cleanText: text, action: null }
}

function loadHistory(): ChatMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return (parsed as ChatMessage[]).map(m => ({ ...m, timestamp: new Date(m.timestamp) }))
  } catch {
    return []
  }
}

function saveHistory(messages: ChatMessage[]) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages.slice(-30)))
  } catch {
    // storage full — silently ignore
  }
}

// ---------------------------------------------------------------------------
// Quick suggestion chips
// ---------------------------------------------------------------------------

const QUICK_SUGGESTIONS = [
  'Resumo do dia',
  'Projetos em atraso',
  'Saldo atual',
  'Pendências para mim',
  'Contratos vencendo',
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const pathname = usePathname()
  const router = useRouter()

  // Load history from sessionStorage on mount
  useEffect(() => {
    setMessages(loadHistory())
  }, [])

  // Persist messages whenever they change
  useEffect(() => {
    if (messages.length > 0) saveHistory(messages)
  }, [messages])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [showMenu])

  // Auto-resize textarea
  const adjustTextarea = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    // Max 3 lines (~72px)
    el.style.height = Math.min(el.scrollHeight, 72) + 'px'
  }, [])

  // ------ Send message ------
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isStreaming) return

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsStreaming(true)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    // Prepare history for API (exclude the new message)
    const history = messages.map(m => ({ role: m.role, content: m.content }))

    const assistantId = generateId()

    // Add placeholder assistant message
    setMessages(prev => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', timestamp: new Date() },
    ])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          context: pathname,
          history,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => null)
        const errMsg = errBody?.error || `Erro ${res.status}. Tente novamente.`
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId ? { ...m, content: errMsg } : m
          )
        )
        setIsStreaming(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()

          if (payload === '[DONE]') continue

          try {
            const parsed = JSON.parse(payload)
            if (parsed.error) {
              fullText += parsed.error
            } else if (parsed.text) {
              fullText += parsed.text
            }
          } catch {
            // skip unparseable
          }
        }

        // Update assistant message with streamed text so far
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId ? { ...m, content: fullText } : m
          )
        )
      }

      // Final processing: extract action
      const { cleanText, action } = extractAction(fullText)
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId ? { ...m, content: cleanText, action } : m
        )
      )
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') {
        // User aborted — keep partial text
      } else {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: m.content || 'Erro ao se conectar com o assistente. Tente novamente.' }
              : m
          )
        )
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [isStreaming, messages, pathname])

  // ------ Key handling for textarea ------
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const clearConversation = () => {
    setMessages([])
    sessionStorage.removeItem(SESSION_KEY)
    setShowMenu(false)
  }

  // ------ Render ------

  // Closed state — floating button
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          title="Assistente Eixo Global"
          aria-label="Abrir Assistente Eixo Global"
        >
          <Sparkles className="h-6 w-6 animate-[pulse_3s_ease-in-out_infinite]" />
          {/* Tooltip */}
          <span className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-md bg-popover px-3 py-1.5 text-xs font-medium text-popover-foreground shadow-md opacity-0 transition-opacity group-hover:opacity-100">
            Assistente Eixo Global
          </span>
        </button>
      </div>
    )
  }

  // Open state — chat panel
  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[560px] w-[400px] flex-col overflow-hidden rounded-xl border bg-background shadow-2xl">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between border-b bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <span className="text-sm font-semibold">Assistente Eixo Global</span>
        </div>
        <div className="flex items-center gap-1">
          {/* More menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(v => !v)}
              className="rounded-md p-1 transition-colors hover:bg-white/20"
              aria-label="Menu"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                <button
                  onClick={clearConversation}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                >
                  <Trash2 className="h-4 w-4" />
                  Limpar conversa
                </button>
              </div>
            )}
          </div>
          {/* Close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-md p-1 transition-colors hover:bg-white/20"
            aria-label="Fechar assistente"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ---- Messages area ---- */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Welcome / quick chips when empty */}
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center gap-4 pt-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
              <Bot className="h-6 w-6" />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Olá! Sou o assistente do ERP Eixo Global. Como posso ajudar?
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_SUGGESTIONS.map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${
                msg.role === 'assistant'
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              {msg.role === 'assistant' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
            </div>

            {/* Bubble */}
            <div className={`max-w-[75%] space-y-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                  msg.role === 'assistant'
                    ? 'bg-muted text-foreground'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                {msg.content || (
                  isStreaming ? null : <span className="italic text-muted-foreground">...</span>
                )}
                {/* Blinking cursor during streaming for this message */}
                {isStreaming && msg === messages[messages.length - 1] && msg.role === 'assistant' && (
                  <span className="ml-0.5 inline-block h-4 w-0.5 animate-[blink_1s_steps(2)_infinite] bg-current align-middle" />
                )}
              </div>

              {/* Navigation action button */}
              {msg.action && (
                <button
                  onClick={() => router.push(msg.action!.path)}
                  className="mt-1 inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
                >
                  {msg.action.buttonLabel}
                </button>
              )}

              {/* Timestamp */}
              <p className={`text-[10px] text-muted-foreground ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                {formatTime(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isStreaming && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.content === '' && (
          <div className="flex items-center gap-2 pl-9">
            <div className="flex items-center gap-1 rounded-lg bg-muted px-3 py-2">
              <span className="text-xs text-muted-foreground">Digitando</span>
              <span className="flex gap-0.5">
                <span className="h-1.5 w-1.5 animate-[bounce_1.4s_ease-in-out_0s_infinite] rounded-full bg-muted-foreground/50" />
                <span className="h-1.5 w-1.5 animate-[bounce_1.4s_ease-in-out_0.2s_infinite] rounded-full bg-muted-foreground/50" />
                <span className="h-1.5 w-1.5 animate-[bounce_1.4s_ease-in-out_0.4s_infinite] rounded-full bg-muted-foreground/50" />
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ---- Input area ---- */}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 border-t bg-background px-3 py-2"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => {
            setInput(e.target.value)
            adjustTextarea()
          }}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          disabled={isStreaming}
          rows={1}
          className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          style={{ maxHeight: 72 }}
        />
        <Button
 type="submit"
 size="icon" aria-label="Enviar mensagem" 
 disabled={isStreaming || !input.trim()}
 className="h-9 w-9 shrink-0 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
>
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </form>

      {/* ---- Inline keyframes for blink animation ---- */}
      <style jsx global>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
