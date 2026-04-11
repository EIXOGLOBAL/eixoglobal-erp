import { prisma } from '@/lib/prisma'

// Cache em memoria (TTL 60s) para nao bater no banco a cada request
let cache: Map<string, { value: string; expiresAt: number }> = new Map()
const CACHE_TTL = 60_000

async function ensureTable() {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "system_settings" (
        "key" TEXT PRIMARY KEY,
        "value" TEXT NOT NULL,
        "label" TEXT,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        "updatedBy" TEXT
      )
    `
  } catch {
    // tabela ja existe
  }
}

export async function getSetting(key: string): Promise<string | null> {
  // Checar cache
  const cached = cache.get(key)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value
  }

  try {
    await ensureTable()
    const rows = await prisma.$queryRaw<{ value: string }[]>`
      SELECT value FROM system_settings WHERE key = ${key} LIMIT 1
    `
    if (rows.length > 0) {
      cache.set(key, { value: rows[0].value, expiresAt: Date.now() + CACHE_TTL })
      return rows[0].value
    }
  } catch {
    // tabela nao existe ainda, retorna null
  }
  return null
}

export async function setSetting(key: string, value: string, label?: string, updatedBy?: string) {
  await ensureTable()
  await prisma.$executeRaw`
    INSERT INTO system_settings (key, value, label, "updatedAt", "updatedBy")
    VALUES (${key}, ${value}, ${label ?? key}, NOW(), ${updatedBy})
    ON CONFLICT (key) DO UPDATE SET
      value = ${value},
      "updatedAt" = NOW(),
      "updatedBy" = ${updatedBy}
  `
  // Invalidar cache
  cache.delete(key)
}

export async function deleteSetting(key: string) {
  await ensureTable()
  await prisma.$executeRaw`DELETE FROM system_settings WHERE key = ${key}`
  cache.delete(key)
}

export async function getAllSettings(): Promise<{ key: string; value: string; label: string | null; updatedAt: Date; updatedBy: string | null }[]> {
  await ensureTable()
  return prisma.$queryRaw`SELECT key, value, label, "updatedAt", "updatedBy" FROM system_settings ORDER BY key`
}

// Helper especifico para API key da Anthropic
export async function getAnthropicApiKey(): Promise<string | null> {
  // 1. Tentar banco de dados
  const dbKey = await getSetting('ANTHROPIC_API_KEY')
  if (dbKey) return dbKey

  // 2. Fallback para env var
  const envKey = process.env.ANTHROPIC_API_KEY
  if (envKey && envKey !== 'your_key_here') return envKey

  return null
}

// Helper para OpenRouter API key
export async function getOpenRouterApiKey(): Promise<string | null> {
  const dbKey = await getSetting('OPENROUTER_API_KEY')
  if (dbKey) return dbKey

  const envKey = process.env.OPENROUTER_API_KEY
  if (envKey && envKey !== 'your_key_here') return envKey

  return null
}

// Helper para provider de IA ativo
export async function getAIProvider(): Promise<'anthropic' | 'openrouter' | null> {
  const explicit = await getSetting('AI_PROVIDER')
  if (explicit === 'anthropic' || explicit === 'openrouter') return explicit

  // Auto-detect
  const anthropic = await getAnthropicApiKey()
  if (anthropic) return 'anthropic'

  const openrouter = await getOpenRouterApiKey()
  if (openrouter) return 'openrouter'

  return null
}

// Verifica se algum provider de IA esta configurado
export async function isAIConfigured(): Promise<boolean> {
  return (await getAIProvider()) !== null
}

// Limpar cache (util apos update)
export function clearSettingsCache() {
  cache = new Map()
}
