/**
 * POST /api/ai/chat
 *
 * Endpoint de chat com streaming via Server-Sent Events.
 * Usa Vercel AI SDK com fallback automatico entre providers.
 */

import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { aiChat } from '@/lib/ai/client'
import { getSystemPromptForModule, SYSTEM_GLOBAL } from '@/lib/ai/prompts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ============================================================================
// Rate limiting
// ============================================================================

const rateLimits = new Map<string, { count: number; resetAt: number }>()
const MAX_PER_MINUTE = 60

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimits.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= MAX_PER_MINUTE) return false
  entry.count++
  return true
}

// ============================================================================
// Route handler
// ============================================================================

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.user) {
    return Response.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  const user = session.user as { id: string; role: string; companyId: string; name?: string }

  if (!checkRateLimit(user.id)) {
    return Response.json({ error: 'Limite de requisicoes atingido. Aguarde 1 minuto.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const {
      messages: rawMessages,
      module,
      context,
    } = body as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>
      module?: string
      context?: Record<string, unknown>
    }

    if (!rawMessages || !Array.isArray(rawMessages) || rawMessages.length === 0) {
      return Response.json({ error: 'Mensagens invalidas' }, { status: 400 })
    }

    // Selecionar system prompt baseado no modulo
    const systemPrompt = module ? getSystemPromptForModule(module) : SYSTEM_GLOBAL

    // Adicionar info do usuario ao system prompt
    const enhancedPrompt = `${systemPrompt}\n\nUsuario: ${user.name || 'Usuario'}\nCargo: ${user.role}${context ? `\n\nContexto adicional:\n${JSON.stringify(context)}` : ''}`

    // Preparar mensagens
    const messages = rawMessages.slice(-30).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // Stream
    const { stream, provider, model } = await aiChat(messages, {
      systemPrompt: enhancedPrompt,
      maxOutputTokens: 1024,
    })

    // Audit log (fire-and-forget)
    logAudit({
      action: 'AI_CHAT',
      entity: 'AIAssistant',
      entityName: `${provider}/${model}`,
      userId: user.id,
      companyId: user.companyId,
    }).catch(() => {})

    // Retornar como stream padrao do AI SDK v6
    return stream.toUIMessageStreamResponse()
  } catch (error) {
    console.error('[AI Chat] Error:', error)
    const message = error instanceof Error ? error.message : 'Erro interno ao processar mensagem'
    return Response.json({ error: message }, { status: 500 })
  }
}
