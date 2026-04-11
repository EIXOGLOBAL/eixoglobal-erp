/**
 * Cliente unificado de IA usando Vercel AI SDK v6.
 *
 * Funcoes exportadas:
 *   aiChat      — conversa multi-turn com streaming
 *   aiComplete  — completion simples, retorna string
 *   aiStructured — retorna JSON estruturado validado com Zod
 *   aiWithDB    — completion com contexto de dados do Prisma
 */

import { generateText, streamText, generateObject } from 'ai'
import { z } from 'zod'
import { getAIModel, invalidateModelCache, type AIProviderName } from './config'

// ============================================================================
// Types
// ============================================================================

export interface AIOptions {
  systemPrompt?: string
  maxOutputTokens?: number
  temperature?: number
  /** Timeout em ms (default: 30000) */
  timeout?: number
}

export interface AIResult {
  content: string
  provider: AIProviderName
  model: string
  tokensUsed?: number
}

export interface AIStreamResult {
  stream: ReturnType<typeof streamText>
  provider: AIProviderName
  model: string
}

export interface AIStructuredResult<T> {
  data: T
  provider: AIProviderName
  model: string
}

// ============================================================================
// Internals
// ============================================================================

const DEFAULT_TIMEOUT = 30_000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: IA nao respondeu em ${ms / 1000}s`)), ms)
    ),
  ])
}

function logUsage(provider: string, model: string, tokens?: number) {
  const parts = [`[AI] ${provider} / ${model}`]
  if (tokens !== undefined) parts.push(`tokens: ${tokens}`)
  console.log(parts.join(' | '))
}

// ============================================================================
// aiChat — conversa multi-turn com streaming
// ============================================================================

/**
 * Conversa multi-turn com streaming SSE.
 * Retorna o objeto stream do AI SDK.
 *
 * O modelo ja foi verificado por getAIModel() (cache de 5 min),
 * entao usamos maxRetries: 1 para falhas transientes.
 */
export async function aiChat(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options?: AIOptions
): Promise<AIStreamResult> {
  const { model, provider, modelId } = await getAIModel()

  console.log(`[AI Chat] Iniciando stream com ${provider}/${modelId}`)

  const result = streamText({
    model,
    messages: messages as Parameters<typeof generateText>[0]['messages'],
    ...(options?.systemPrompt ? { system: options.systemPrompt } : {}),
    maxOutputTokens: options?.maxOutputTokens ?? 1024,
    temperature: options?.temperature ?? 0.4,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(options?.timeout ?? DEFAULT_TIMEOUT),
    onError: ({ error }) => {
      console.error(`[AI Chat] Erro no stream ${provider}/${modelId}:`, error)
      // Invalida cache para forcar re-verificacao na proxima chamada
      invalidateModelCache()
    },
  })

  logUsage(provider, modelId)

  return { stream: result, provider, model: modelId }
}

/**
 * Conversa multi-turn sem streaming. Retorna texto completo.
 */
export async function aiChatComplete(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options?: AIOptions
): Promise<AIResult> {
  const { model, provider, modelId } = await getAIModel()

  const result = await withTimeout(
    generateText({
      model,
      messages: messages as Parameters<typeof generateText>[0]['messages'],
      ...(options?.systemPrompt ? { system: options.systemPrompt } : {}),
      maxOutputTokens: options?.maxOutputTokens ?? 1024,
      temperature: options?.temperature ?? 0.4,
      maxRetries: 1,
    }),
    options?.timeout ?? DEFAULT_TIMEOUT
  )

  const tokens = result.usage?.totalTokens
  logUsage(provider, modelId, tokens)

  return {
    content: result.text,
    provider,
    model: modelId,
    tokensUsed: tokens,
  }
}

// ============================================================================
// aiComplete — completion simples
// ============================================================================

/**
 * Completion simples a partir de um prompt de texto.
 */
export async function aiComplete(
  prompt: string,
  options?: AIOptions
): Promise<AIResult> {
  const { model, provider, modelId } = await getAIModel()

  const result = await withTimeout(
    generateText({
      model,
      prompt,
      ...(options?.systemPrompt ? { system: options.systemPrompt } : {}),
      maxOutputTokens: options?.maxOutputTokens ?? 2000,
      temperature: options?.temperature ?? 0.3,
      maxRetries: 1,
    }),
    options?.timeout ?? DEFAULT_TIMEOUT
  )

  const tokens = result.usage?.totalTokens
  logUsage(provider, modelId, tokens)

  return {
    content: result.text,
    provider,
    model: modelId,
    tokensUsed: tokens,
  }
}

// ============================================================================
// aiStructured — JSON estruturado com Zod
// ============================================================================

/**
 * Gera resposta em JSON estruturado validado com schema Zod.
 */
export async function aiStructured<T extends z.ZodType>(
  prompt: string,
  schema: T,
  options?: AIOptions
): Promise<AIStructuredResult<z.infer<T>>> {
  const { model, provider, modelId } = await getAIModel()

  const result = await withTimeout(
    generateObject({
      model,
      messages: [{ role: 'user' as const, content: prompt }],
      schema,
      output: 'object',
      ...(options?.systemPrompt ? { system: options.systemPrompt } : {}),
      maxOutputTokens: options?.maxOutputTokens ?? 2000,
      temperature: options?.temperature ?? 0.2,
      maxRetries: 1,
    } as Parameters<typeof generateObject>[0]),
    options?.timeout ?? DEFAULT_TIMEOUT
  )

  const tokens = (result as { usage?: { totalTokens?: number } }).usage?.totalTokens
  logUsage(provider, modelId, tokens)

  return {
    data: (result as { object: z.infer<T> }).object,
    provider,
    model: modelId,
  }
}

// ============================================================================
// aiWithDB — completion com contexto de dados
// ============================================================================

/**
 * Completion com contexto de dados do banco.
 * Recebe dados ja consultados via Prisma (NAO executa queries).
 */
export async function aiWithDB(
  prompt: string,
  context?: Record<string, unknown>,
  options?: AIOptions
): Promise<AIResult> {
  const contextStr = context
    ? `\n\n--- DADOS DO SISTEMA ---\n${JSON.stringify(context, null, 2)}\n--- FIM DADOS ---\n`
    : ''

  return aiComplete(prompt + contextStr, {
    ...options,
    systemPrompt:
      options?.systemPrompt ||
      'Voce e um analista do ERP Eixo Global. Analise os dados fornecidos e responda em portugues brasileiro de forma clara e objetiva.',
  })
}
