'use client'

import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Bot,
  X,
  SendHorizontal,
  Sparkles,
  User,
  Trash2,
  Minimize2,
  Maximize2,
  Square,
} from 'lucide-react'
import { useAIChat } from '@/hooks/useAI'
import ReactMarkdown from 'react-markdown'
import type { UIMessage } from 'ai'

// ============================================================================
// Helpers
// ============================================================================

function getMessageText(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: 'text'; text: string } =>
      p.type === 'text' && typeof (p as any).text === 'string' && (p as any).text.length > 0
    )
    .map((p) => p.text)
    .join('')
}

interface NavigateAction {
  action: 'navigate'
  path: string
  buttonLabel: string
}

function extractAction(text: string): { cleanText: string; action: NavigateAction | null } {
  const regex = /\n?\s*(\{"action"\s*:\s*"navigate"\s*,\s*"path"\s*:\s*"[^"]+"\s*,\s*"buttonLabel"\s*:\s*"[^"]+"\s*\})\s*$/
  const match = text.match(regex)
  if (match) {
    try {
      const parsed = JSON.parse(match[1]!)
      if (parsed.action === 'navigate' && parsed.path && parsed.buttonLabel) {
        return { cleanText: text.slice(0, match.index).trimEnd(), action: parsed as NavigateAction }
      }
    } catch { /* ignore */ }
  }
  return { cleanText: text, action: null }
}

// ============================================================================
// Component
// ============================================================================

export function AIChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  const {
    messages,
    status,
    error,
    sendMessage,
    stop,
    clearHistory,
  } = useAIChat({ module: pathname })

  const isLoading = status === 'streaming' || status === 'submitted'

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input ao abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault()
      if (!input.trim() || isLoading) return
      sendMessage({ text: input.trim() })
      setInput('')
    },
    [input, isLoading, sendMessage]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const handleNavigate = useCallback(
    (path: string) => {
      router.push(path)
      setIsOpen(false)
    },
    [router]
  )

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  // Botao flutuante
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="Abrir assistente de IA"
      >
        <Bot className="h-6 w-6" />
      </button>
    )
  }

  const panelWidth = isExpanded ? 'w-[700px]' : 'w-[420px]'
  const panelHeight = isExpanded ? 'h-[85vh]' : 'h-[600px]'

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 ${panelWidth} ${panelHeight} flex flex-col rounded-2xl border bg-background shadow-2xl transition-all duration-200`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Assistente IA</h3>
            <p className="text-xs text-muted-foreground">Eixo Global ERP</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isLoading && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={stop}
              title="Parar"
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={clearHistory}
            title="Limpar conversa"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Reduzir' : 'Expandir'}
          >
            {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsOpen(false)}
            title="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Como posso ajudar?</p>
              <p className="text-xs text-muted-foreground mt-1">
                Pergunte sobre projetos, financeiro, RH, estoque ou qualquer modulo do ERP.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {[
                'Resumo dos projetos ativos',
                'Como esta o financeiro?',
                'Estoque com itens baixos',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion)
                    setTimeout(() => inputRef.current?.focus(), 50)
                  }}
                  className="text-xs border rounded-full px-3 py-1.5 hover:bg-muted transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user'
          const text = getMessageText(msg)
          if (!isUser && !text.trim()) return null
          const { cleanText, action } = isUser
            ? { cleanText: text, action: null }
            : extractAction(text)

          return (
            <div key={msg.id} className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  isUser
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted rounded-bl-md'
                }`}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap">{text}</p>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown>{cleanText}</ReactMarkdown>
                  </div>
                )}
                {action && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7 text-xs"
                    onClick={() => handleNavigate(action.path)}
                  >
                    {action.buttonLabel}
                  </Button>
                )}
              </div>
              {isUser && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/10 mt-0.5">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          )
        })}

        {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-md px-3.5 py-2.5">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:0ms]" />
                <div className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:150ms]" />
                <div className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center">
            <Badge variant="destructive" className="text-xs">
              Erro: {error.message}
            </Badge>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            rows={1}
            className="flex-1 resize-none rounded-xl border bg-muted/50 px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/30 min-h-[40px] max-h-[120px]"
            style={{
              height: 'auto',
              minHeight: '40px',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = Math.min(target.scrollHeight, 120) + 'px'
            }}
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 rounded-xl shrink-0"
            disabled={!input.trim() || isLoading}
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}
