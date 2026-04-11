/**
 * Unified AI Client - Suporta Anthropic e OpenRouter
 *
 * OpenRouter usa formato compativel com OpenAI.
 * Anthropic usa SDK proprio.
 *
 * Settings usados:
 * - AI_PROVIDER: 'anthropic' | 'openrouter' (default: auto-detect baseado na chave disponivel)
 * - ANTHROPIC_API_KEY: chave Anthropic
 * - OPENROUTER_API_KEY: chave OpenRouter
 * - OPENROUTER_MODEL: modelo personalizado (default: google/gemini-2.0-flash-exp:free)
 */

import { getSetting, getAnthropicApiKey } from '@/lib/system-settings'

// ============================================================================
// Types
// ============================================================================

export type AIProvider = 'anthropic' | 'openrouter'

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AICompletionOptions {
  system?: string
  messages: AIMessage[]
  maxTokens?: number
}

export interface AIStreamOptions extends AICompletionOptions {
  onText: (text: string) => void
  onDone: () => void
  onError: (error: string) => void
}

export interface AICompletionResult {
  content: string
  model: string
  provider: AIProvider
}

// ============================================================================
// Constants
// ============================================================================

// Modelos padrao por provider
const ANTHROPIC_MODEL_SMART = 'claude-sonnet-4-5-20250929'
const ANTHROPIC_MODEL_FAST = 'claude-haiku-4-5-20251001'
const OPENROUTER_MODEL_DEFAULT = 'google/gemini-2.0-flash-exp:free'

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

// ============================================================================
// Provider Resolution
// ============================================================================

export async function getActiveProvider(): Promise<AIProvider | null> {
  // 1. Check explicit provider setting
  const providerSetting = await getSetting('AI_PROVIDER')
  if (providerSetting === 'anthropic' || providerSetting === 'openrouter') {
    return providerSetting
  }

  // 2. Auto-detect: prioritize Anthropic, fallback to OpenRouter
  const anthropicKey = await getAnthropicApiKey()
  if (anthropicKey) return 'anthropic'

  const openrouterKey = await getOpenRouterApiKey()
  if (openrouterKey) return 'openrouter'

  return null
}

export async function getOpenRouterApiKey(): Promise<string | null> {
  const dbKey = await getSetting('OPENROUTER_API_KEY')
  if (dbKey) return dbKey

  const envKey = process.env.OPENROUTER_API_KEY
  if (envKey && envKey !== 'your_key_here') return envKey

  return null
}

export async function getOpenRouterModel(): Promise<string> {
  const custom = await getSetting('OPENROUTER_MODEL')
  return custom || OPENROUTER_MODEL_DEFAULT
}

export async function getActiveApiKey(): Promise<{ provider: AIProvider; apiKey: string } | null> {
  const provider = await getActiveProvider()
  if (!provider) return null

  if (provider === 'anthropic') {
    const key = await getAnthropicApiKey()
    if (!key) return null
    return { provider, apiKey: key }
  }

  const key = await getOpenRouterApiKey()
  if (!key) return null
  return { provider, apiKey: key }
}

// ============================================================================
// OpenRouter API (OpenAI-compatible format)
// ============================================================================

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: OpenRouterMessage[],
  maxTokens: number
): Promise<AICompletionResult> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://erp.eixoglobal.com.br',
      'X-Title': 'ERP Eixo Global',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''

  return {
    content,
    model: data.model || model,
    provider: 'openrouter',
  }
}

async function streamOpenRouter(
  apiKey: string,
  model: string,
  messages: OpenRouterMessage[],
  maxTokens: number,
  onText: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): Promise<void> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://erp.eixoglobal.com.br',
      'X-Title': 'ERP Eixo Global',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
      stream: true,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    onError(`OpenRouter API error (${response.status}): ${errorBody}`)
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    onError('No response body')
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') {
          onDone()
          return
        }

        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) {
            onText(delta)
          }
        } catch {
          // skip malformed SSE data
        }
      }
    }
    onDone()
  } catch (err) {
    onError(err instanceof Error ? err.message : 'Stream error')
  }
}

// ============================================================================
// Anthropic API (via SDK)
// ============================================================================

async function callAnthropicSDK(
  apiKey: string,
  model: string,
  system: string | undefined,
  messages: AIMessage[],
  maxTokens: number
): Promise<AICompletionResult> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    ...(system ? { system } : {}),
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  })

  const block = response.content[0]
  const content = block && block.type === 'text' ? block.text : ''

  return {
    content,
    model: response.model,
    provider: 'anthropic',
  }
}

// ============================================================================
// Unified Public API
// ============================================================================

/**
 * Faz uma chamada de completion para o provider ativo.
 * Retorna o texto da resposta.
 */
export async function aiComplete(options: AICompletionOptions): Promise<AICompletionResult> {
  const active = await getActiveApiKey()
  if (!active) {
    throw new Error('Nenhum provedor de IA configurado. Acesse Configurações > IA.')
  }

  const { provider, apiKey } = active
  const maxTokens = options.maxTokens || 1024

  if (provider === 'openrouter') {
    const model = await getOpenRouterModel()
    // OpenRouter: system message goes in messages array
    const messages: OpenRouterMessage[] = []
    if (options.system) {
      messages.push({ role: 'system', content: options.system })
    }
    messages.push(...options.messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })))
    return callOpenRouter(apiKey, model, messages, maxTokens)
  }

  // Anthropic
  return callAnthropicSDK(apiKey, ANTHROPIC_MODEL_SMART, options.system, options.messages, maxTokens)
}

/**
 * Faz uma chamada de completion rapida (modelo mais barato/rapido).
 * Usa haiku na Anthropic, modelo free no OpenRouter.
 */
export async function aiCompleteFast(options: AICompletionOptions): Promise<AICompletionResult> {
  const active = await getActiveApiKey()
  if (!active) {
    throw new Error('Nenhum provedor de IA configurado. Acesse Configurações > IA.')
  }

  const { provider, apiKey } = active
  const maxTokens = options.maxTokens || 1024

  if (provider === 'openrouter') {
    const model = await getOpenRouterModel()
    const messages: OpenRouterMessage[] = []
    if (options.system) {
      messages.push({ role: 'system', content: options.system })
    }
    messages.push(...options.messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })))
    return callOpenRouter(apiKey, model, messages, maxTokens)
  }

  // Anthropic - usa haiku para velocidade
  return callAnthropicSDK(apiKey, ANTHROPIC_MODEL_FAST, options.system, options.messages, maxTokens)
}

/**
 * Streaming - retorna um ReadableStream de SSE events.
 * Formato de saida e padronizado: data: {"text": "..."}\n\n
 */
export async function aiStream(options: AICompletionOptions): Promise<ReadableStream> {
  const active = await getActiveApiKey()
  if (!active) {
    throw new Error('Nenhum provedor de IA configurado. Acesse Configurações > IA.')
  }

  const { provider, apiKey } = active
  const maxTokens = options.maxTokens || 1024
  const encoder = new TextEncoder()

  if (provider === 'openrouter') {
    const model = await getOpenRouterModel()
    const messages: OpenRouterMessage[] = []
    if (options.system) {
      messages.push({ role: 'system', content: options.system })
    }
    messages.push(...options.messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })))

    return new ReadableStream({
      async start(controller) {
        try {
          await streamOpenRouter(
            apiKey,
            model,
            messages,
            maxTokens,
            (text) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            },
            () => {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              controller.close()
            },
            (error) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error })}\n\n`))
              controller.close()
            }
          )
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Erro ao gerar resposta' })}\n\n`))
          controller.close()
        }
      },
    })
  }

  // Anthropic streaming
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey })

  const stream = await client.messages.stream({
    model: ANTHROPIC_MODEL_SMART,
    max_tokens: maxTokens,
    ...(options.system ? { system: options.system } : {}),
    messages: options.messages.map(m => ({ role: m.role, content: m.content })),
  })

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Erro ao gerar resposta' })}\n\n`))
        controller.close()
      }
    },
  })
}

/**
 * Testa conexao com um provider especifico.
 */
export async function testProvider(
  provider: AIProvider,
  apiKey: string
): Promise<{ success: boolean; model?: string; error?: string }> {
  try {
    if (provider === 'openrouter') {
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://erp.eixoglobal.com.br',
          'X-Title': 'ERP Eixo Global',
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL_DEFAULT,
          messages: [{ role: 'user', content: 'Responda apenas: OK' }],
          max_tokens: 10,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        return { success: false, error: `HTTP ${response.status}: ${errorBody.slice(0, 200)}` }
      }

      const data = await response.json()
      return { success: true, model: data.model || OPENROUTER_MODEL_DEFAULT }
    }

    // Anthropic
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: apiKey.trim() })

    const response = await client.messages.create({
      model: ANTHROPIC_MODEL_FAST,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Responda apenas: OK' }],
    })

    return { success: true, model: response.model }
  } catch (e: any) {
    return { success: false, error: e.message?.slice(0, 200) || 'Erro desconhecido' }
  }
}

/**
 * Info sobre o provider ativo (para exibir no dashboard).
 */
export async function getProviderInfo(): Promise<{
  provider: AIProvider | null
  configured: boolean
  model: string
  label: string
}> {
  const provider = await getActiveProvider()

  if (!provider) {
    return { provider: null, configured: false, model: '', label: 'Nenhum provedor configurado' }
  }

  if (provider === 'openrouter') {
    const model = await getOpenRouterModel()
    return {
      provider: 'openrouter',
      configured: true,
      model,
      label: `OpenRouter (${model.split('/').pop()?.replace(':free', '') || model})`,
    }
  }

  return {
    provider: 'anthropic',
    configured: true,
    model: ANTHROPIC_MODEL_SMART,
    label: 'Anthropic Claude',
  }
}
