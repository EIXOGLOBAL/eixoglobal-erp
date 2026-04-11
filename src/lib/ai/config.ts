/**
 * Configuracao central dos providers de IA — Vercel AI SDK v6.
 *
 * Prioridade definida pela env AI_PRIMARY_PROVIDER:
 *   google (padrao) → groq → openrouter
 *
 * Fallback automatico: se o provider primario nao tiver chave configurada
 * o sistema tenta o proximo na cadeia.
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createOpenAI } from '@ai-sdk/openai'
import { getSetting } from '@/lib/system-settings'

// ============================================================================
// Types
// ============================================================================

export type AIProviderName = 'google' | 'groq' | 'openrouter'

export interface AIProviderConfig {
  name: AIProviderName
  label: string
  model: string
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
 * Retorna o modelo de IA ativo com fallback automatico.
 * Percorre os providers na ordem de prioridade ate encontrar um com chave valida.
 */
export async function getAIModel(): Promise<{
  model: Parameters<typeof import('ai').streamText>[0]['model']
  provider: AIProviderName
  modelId: string
}> {
  const ordered = await getPriorityOrder()

  for (const cfg of ordered) {
    const key = await cfg.getKey()
    if (key) {
      // Permite override do modelo via DB
      const customModel = await getSetting(`${cfg.name.toUpperCase()}_MODEL`)
      const modelId = customModel || cfg.model
      const model = cfg.createModel(key, modelId)

      if (process.env.NODE_ENV === 'development') {
        console.log(`[AI] Provider ativo: ${cfg.label} (${modelId})`)
      }

      return { model, provider: cfg.name, modelId }
    }
  }

  throw new Error('Nenhum provedor de IA configurado. Acesse Configuracoes > IA.')
}

/**
 * Retorna info sobre todos os providers configurados (para dashboard admin).
 */
export async function getProvidersStatus(): Promise<
  Array<{ name: AIProviderName; label: string; configured: boolean; model: string; active: boolean }>
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
    })
  }

  return statuses
}
