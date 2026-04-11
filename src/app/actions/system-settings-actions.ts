'use server'

import { getSession } from '@/lib/auth'
import { getSetting, setSetting, deleteSetting, getAllSettings, clearSettingsCache } from '@/lib/system-settings'
import { logAudit } from '@/lib/audit-logger'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await getSession()
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    throw new Error('Acesso negado')
  }
  return session.user as { id: string; name?: string }
}

const SENSITIVE_KEYS = ['ANTHROPIC_API_KEY', 'OPENROUTER_API_KEY', 'D4SIGN_TOKEN_API', 'D4SIGN_CRYPT_KEY']

function maskValue(key: string, value: string): string {
  if (SENSITIVE_KEYS.includes(key) && value.length > 8) {
    return value.slice(0, 8) + '...' + value.slice(-4)
  }
  return value
}

export async function getSystemSettings() {
  await requireAdmin()
  const settings = await getAllSettings()
  return settings.map(s => ({
    key: s.key,
    label: s.label,
    maskedValue: maskValue(s.key, s.value),
    updatedAt: s.updatedAt.toISOString(),
    updatedBy: s.updatedBy,
  }))
}

export async function upsertSystemSetting(key: string, value: string, label?: string) {
  const user = await requireAdmin()

  if (!key || !value) {
    return { error: 'Chave e valor sao obrigatorios' }
  }

  const oldValue = await getSetting(key)
  await setSetting(key, value.trim(), label, user.id)

  await logAudit({
    action: oldValue ? 'UPDATE_SETTING' : 'CREATE_SETTING',
    entity: 'SystemSetting',
    entityId: key,
    entityName: label || key,
    oldData: oldValue ? JSON.stringify({ value: maskValue(key, oldValue) }) : undefined,
    newData: JSON.stringify({ value: maskValue(key, value.trim()) }),
    userId: user.id,
  })

  clearSettingsCache()
  revalidatePath('/configuracoes/ia')
  return { success: true }
}

export async function removeSystemSetting(key: string) {
  const user = await requireAdmin()

  const oldValue = await getSetting(key)
  if (!oldValue) return { error: 'Configuracao nao encontrada' }

  await deleteSetting(key)

  await logAudit({
    action: 'DELETE_SETTING',
    entity: 'SystemSetting',
    entityId: key,
    entityName: key,
    oldData: JSON.stringify({ value: maskValue(key, oldValue) }),
    userId: user.id,
  })

  clearSettingsCache()
  revalidatePath('/configuracoes/ia')
  return { success: true }
}

export async function testAnthropicKey(apiKey: string): Promise<{ success: boolean; error?: string; model?: string }> {
  await requireAdmin()

  try {
    const { testProvider } = await import('@/lib/ai-client')
    return testProvider('anthropic', apiKey.trim())
  } catch (e: any) {
    return { success: false, error: e.message?.slice(0, 200) || 'Erro desconhecido' }
  }
}

export async function testOpenRouterKey(apiKey: string): Promise<{ success: boolean; error?: string; model?: string }> {
  await requireAdmin()

  try {
    const { testProvider } = await import('@/lib/ai-client')
    return testProvider('openrouter', apiKey.trim())
  } catch (e: any) {
    return { success: false, error: e.message?.slice(0, 200) || 'Erro desconhecido' }
  }
}

export async function setAIProvider(provider: 'anthropic' | 'openrouter'): Promise<{ success?: boolean; error?: string }> {
  const user = await requireAdmin()

  await setSetting('AI_PROVIDER', provider, 'Provedor de IA Ativo', user.id)

  await logAudit({
    action: 'UPDATE_SETTING',
    entity: 'SystemSetting',
    entityId: 'AI_PROVIDER',
    entityName: 'Provedor de IA',
    newData: JSON.stringify({ provider }),
    userId: user.id,
  })

  clearSettingsCache()
  revalidatePath('/configuracoes/ia')
  return { success: true }
}

export async function getAIProviderSetting(): Promise<string | null> {
  await requireAdmin()
  const { getSetting: getS } = await import('@/lib/system-settings')
  return getS('AI_PROVIDER')
}
