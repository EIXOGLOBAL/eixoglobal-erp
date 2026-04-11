/**
 * React hooks para integrar com a API de IA — AI SDK v6.
 *
 * useAIChat()     — gerencia conversa com streaming via useChat
 * useAIComplete() — para completions pontuais
 */

'use client'

import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport } from 'ai'
import { useState, useCallback, useMemo } from 'react'
import { usePathname } from 'next/navigation'

// ============================================================================
// useAIChat — conversa multi-turn com streaming
// ============================================================================

export interface UseAIChatOptions {
  /** Modulo inicial (default: detectado via pathname) */
  module?: string
  /** Contexto adicional enviado em cada mensagem */
  context?: Record<string, unknown>
}

export function useAIChat(options?: UseAIChatOptions) {
  const pathname = usePathname()
  const module = options?.module ?? pathname

  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: '/api/ai/chat',
        body: { module, context: options?.context },
      }),
    [module, options?.context]
  )

  const chat = useChat({
    transport,
    onError: (error) => {
      console.error('[useAIChat]', error.message)
    },
  })

  return {
    messages: chat.messages,
    status: chat.status,
    error: chat.error,
    /** Envia uma mensagem de texto */
    sendMessage: chat.sendMessage,
    /** Para o streaming */
    stop: chat.stop,
    /** Limpar historico */
    clearHistory: () => chat.setMessages([]),
    setMessages: chat.setMessages,
  }
}

// ============================================================================
// useAIComplete — completion pontual
// ============================================================================

export interface UseAICompleteResult {
  data: string | null
  isLoading: boolean
  error: string | null
  provider: string | null
  execute: (prompt: string) => Promise<string | null>
  reset: () => void
}

export function useAIComplete(): UseAICompleteResult {
  const pathname = usePathname()
  const [data, setData] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<string | null>(null)

  const execute = useCallback(
    async (prompt: string): Promise<string | null> => {
      setIsLoading(true)
      setError(null)
      setData(null)
      setProvider(null)

      try {
        const res = await fetch('/api/ai/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, module: pathname }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || `HTTP ${res.status}`)
        }

        const json = await res.json()
        setData(json.content)
        setProvider(json.provider)
        return json.content
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido'
        setError(msg)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [pathname]
  )

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setProvider(null)
  }, [])

  return { data, isLoading, error, provider, execute, reset }
}
