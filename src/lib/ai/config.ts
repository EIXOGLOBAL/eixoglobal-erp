/**
 * Configuracao central dos providers de IA — Vercel AI SDK v6.
 *
 * Prioridade definida pela env AI_PRIMARY_PROVIDER:
 *   google (padrao) → groq → openrouter
 *
 * Fallback automatico com verificacao de modelo:
 *   1. Tenta modelo customizado do DB
 *   2. Se falhar, tenta modelo padrao do provider
 *   3. Se falhar, tenta proximo provider
 *   4. Cache de modelo verificado por 5 min
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { getSetting } from '@/lib/system-settings'

// ============================================================================
// Types
// ============================================================================

export type AIProviderName = 'google' | 'groq' | 'openrouter'

export interface AIProviderConfig {
  name: AIProviderName
  label: string
  model: string
  /** Modelos alternativos para fallback (tentados se o custom e o padrao falharem) */
  fallbackModels: string[]
  getKey: () => Promise<string | null>
  createModel: (key: string, model: string) => Parameters<typeof import('ai').streamText>[0]['model']
}

// ============================================================================
// Resolucao de chaves (DB > env)
// ============================================================================

async function getGoogleKey(): Promise<string | null> {
  const db = await getSetting('GOOGLE_GENERATIVE_AI_API_KEY')
  if (db) return db
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY || null
}

async function getGroqKey(): Promise<string | null> {
  const db = await getSetting('GROQ_API_KEY')
  if (db) return db
  return process.env.GROQ_API_KEY || null
}

async function getOpenRouterKey(): Promise<string | null> {
  const db = await getSetting('OPENROUTER_API_KEY')
  if (db) return db
  return process.env.OPENROUTER_API_KEY || null
}

// ============================================================================
// Provider factories
// ============================================================================

const providers: AIProviderConfig[] = [
  {
    name: 'google',
    label: 'Google Gemini',
    model: 'gemini-2.0-flash',
    fallbackModels: ['gemini-2.0-flash-lite', 'gemini-1.5-flash'],
    getKey: getGoogleKey,
    createModel: (key, model) => {
      const provider = createGoogleGenerativeAI({ apiKey: key })
      return provider(model)
    },
  },
  {
    name: 'groq',
    label: 'Groq',
    model: 'llama-3.3-70b-versatile',
    fallbackModels: ['llama-3.1-8b-instant'],
    getKey: getGroqKey,
    createModel: (key, model) => {
      const groq = createGroq({ apiKey: key })
      return groq(model)
    },
  },
  {
    name: 'openrouter',
    label: 'OpenRouter',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    fallbackModels: [
      'google/gemma-3-27b-it:free',
      'google/gemma-4-31b-it:free',
      'qwen/qwen3-coder:free',
    ],
    getKey: getOpenRouterKey,
    createModel: (key, model) => {
      const or = createOpenAI({
        apiKey: key,
        baseURL: 'https://openrouter.ai/api/v1',
        headers: {
          'HTTP-Referer': 'https://erp.eixoglobal.com.br',
          'X-Title': 'ERP Eixo Global',
        },
      })
      return or(model)
    },
  },
]

// ============================================================================
// Model verification cache
// ============================================================================

interface VerifiedModel {
  model: Parameters<typeof import('ai').streamText>[0]['model']
  provider: AIProviderName
  modelId: string
  verifiedAt: number
}

let verifiedModelCache: VerifiedModel | null = null
const VERIFY_TTL = 5 * 60_000 // 5 minutos

/** Invalida o cache de modelo verificado (chamar apos atualizar configuracoes) */
export function invalidateModelCache() {
  verifiedModelCache = null
}

/**
 * Verifica se um modelo funciona fazendo uma chamada minima.
 * Retorna true se o modelo respondeu, false se falhou.
 */
async function verifyModel(
  model: Parameters<typeof import('ai').streamText>[0]['model']
): Promise<boolean> {
  try {
    await generateText({
      model,
      prompt: 'ok',
      maxOutputTokens: 1,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(15_000),
    })
    return true
  } catch {
    return false
  }
}

// ============================================================================
// Selecao automatica
// ============================================================================

/** Retorna a ordem de prioridade com base em AI_PRIMARY_PROVIDER */
async function getPriorityOrder(): Promise<AIProviderConfig[]> {
  const primary =
    (await getSetting('AI_PRIMARY_PROVIDER')) ||
    process.env.AI_PRIMARY_PROVIDER ||
    'google'

  const idx = providers.findIndex((p) => p.name === primary)
  if (idx <= 0) return [...providers]

  // Move o primario para o inicio, mantendo ordem dos demais
  const ordered = [providers[idx], ...providers.filter((_, i) => i !== idx)]
  return ordered
}

/**
 * Retorna o modelo de IA ativo com verificacao e fallback robusto.
 *
 * Cadeia de fallback por provider:
 *   1. Modelo customizado do banco (OPENROUTER_MODEL, etc.)
 *   2. Modelo padrao do provider
 *   3. Modelos alternativos do provider (fallbackModels)
 *   4. Proximo provider na fila
 *
 * O modelo verificado e cacheado por 5 minutos para evitar
 * chamadas de verificacao repetidas.
 */
export async function getAIModel(): Promise<{
  model: Parameters<typeof import('ai').streamText>[0]['model']
  provider: AIProviderName
  modelId: string
}> {
  // Retornar cache se verificado recentemente
  if (verifiedModelCache && Date.now() - verifiedModelCache.verifiedAt < VERIFY_TTL) {
    return {
      model: verifiedModelCache.model,
      provider: verifiedModelCache.provider,
      modelId: verifiedModelCache.modelId,
    }
  }

  const ordered = await getPriorityOrder()
  const errors: string[] = []

  for (const cfg of ordered) {
    const key = await cfg.getKey()
    if (!key) continue

    // Montar lista de modelos para tentar: custom → padrao → fallbacks
    const customModel = await getSetting(`${cfg.name.toUpperCase()}_MODEL`)
    const modelsToTry = [
      ...(customModel ? [customModel] : []),
      cfg.model,
      ...cfg.fallbackModels,
    ]
    // Remover duplicatas mantendo ordem
    const uniqueModels = [...new Set(modelsToTry)]

    for (const modelId of uniqueModels) {
      try {
        const model = cfg.createModel(key, modelId)

        // Verificar se o modelo responde
        const ok = await verifyModel(model)
        if (!ok) {
          const msg = `${cfg.name}/${modelId}: modelo nao respondeu`
          errors.push(msg)
          console.warn(`[AI] ${msg}`)
          continue
        }

        // Sucesso — cachear
        verifiedModelCache = {
          model,
          provider: cfg.name,
          modelId,
          verifiedAt: Date.now(),
        }

        console.log(`[AI] Provider ativo: ${cfg.label} (${modelId})`)

        // Se usou fallback (nao o custom), avisar no log
        if (customModel && modelId !== customModel) {
          console.warn(
            `[AI] AVISO: Modelo customizado "${customModel}" falhou. ` +
            `Usando fallback "${modelId}". ` +
            `Atualize o modelo em Configuracoes > IA.`
          )
        }

        return { model, provider: cfg.name, modelId }
      } catch (error) {
        const msg = `${cfg.name}/${modelId}: ${error instanceof Error ? error.message : String(error)}`
        errors.push(msg)
        console.warn(`[AI] ${msg}`)
        continue
      }
    }
  }

  throw new Error(
    `Nenhum provedor de IA disponivel. Tentativas:\n${errors.join('\n')}\n\n` +
    `Acesse Configuracoes > IA para verificar as chaves e modelos.`
  )
}

/**
 * Retorna info sobre todos os providers configurados (para dashboard admin).
 */
export async function getProvidersStatus(): Promise<
  Array<{
    name: AIProviderName
    label: string
    configured: boolean
    model: string
    active: boolean
    activeModelId?: string
  }>
> {
  const ordered = await getPriorityOrder()
  let foundActive = false

  const statuses = []
  for (const cfg of ordered) {
    const key = await cfg.getKey()
    const configured = !!key
    const customModel = await getSetting(`${cfg.name.toUpperCase()}_MODEL`)
    const active = configured && !foundActive
    if (active) foundActive = true

    statuses.push({
      name: cfg.name,
      label: cfg.label,
      configured,
      model: customModel || cfg.model,
      active,
      // Se temos um modelo verificado, mostrar qual esta realmente em uso
      activeModelId: active && verifiedModelCache?.provider === cfg.name
        ? verifiedModelCache.modelId
        : undefined,
    })
  }

  return statuses
}
