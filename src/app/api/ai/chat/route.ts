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
import { getChatDataContext } from '@/lib/ai/chat-context'

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
      messages: Array<{
        role: 'user' | 'assistant'
        content?: string
        parts?: Array<{ type: string; text?: string }>
      }>
      module?: string
      context?: Record<string, unknown>
    }

    if (!rawMessages || !Array.isArray(rawMessages) || rawMessages.length === 0) {
      return Response.json({ error: 'Mensagens invalidas' }, { status: 400 })
    }

    // Selecionar system prompt baseado no modulo
    const systemPrompt = module ? getSystemPromptForModule(module) : SYSTEM_GLOBAL

    // Buscar dados reais do banco para contexto da IA
    const dataContext = await getChatDataContext({
      companyId: user.companyId,
      userId: user.id,
      module: module || '/',
      userRole: user.role,
    })

    // Montar prompt completo: system + dados reais + info do usuario
    const enhancedPrompt = [
      systemPrompt,
      '',
      dataContext,
      '',
      `Usuario: ${user.name || 'Usuario'}`,
      `Cargo: ${user.role}`,
      '',
      'IMPORTANTE: Os dados acima sao REAIS do sistema. Use-os para responder com numeros e informacoes concretas. Nunca diga que nao tem acesso aos dados — eles estao acima.',
      context ? `\nContexto adicional:\n${JSON.stringify(context)}` : '',
    ].filter(Boolean).join('\n')

    // Converter UIMessage (v6 parts) para formato ModelMessage (role + content)
    // O AI SDK v6 useChat/TextStreamChatTransport envia mensagens com "parts" em vez de "content"
    const messages = rawMessages.slice(-30).map((m) => {
      let content: string

      if (typeof m.content === 'string' && m.content.length > 0) {
        // Formato legado ou direto: { role, content }
        content = m.content
      } else if (Array.isArray(m.parts)) {
        // Formato AI SDK v6 UIMessage: { role, parts: [{ type: 'text', text: '...' }] }
        content = m.parts
          .filter((p) => p.type === 'text' && typeof p.text === 'string')
          .map((p) => p.text!)
          .join('')
      } else {
        content = ''
      }

      return {
        role: m.role as 'user' | 'assistant',
        content,
      }
    }).filter((m) => m.content.length > 0)

    if (messages.length === 0) {
      return Response.json({ error: 'Nenhuma mensagem com conteudo valido' }, { status: 400 })
    }

    // Stream — o modelo ja foi verificado por getAIModel() (cache 5 min)
    const { stream, provider, model } = await aiChat(messages, {
      systemPrompt: enhancedPrompt,
      maxOutputTokens: 1024,
    })

    console.log(`[AI Chat] Streaming com ${provider}/${model} para usuario ${user.id}`)

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
    console.error('[AI Chat] Erro completo:', error)

    let message: string
    if (error instanceof Error) {
      // Incluir info util sobre o erro
      const cause = (error as Error & { cause?: unknown }).cause
      if (cause instanceof Error) {
        message = `${error.message} — ${cause.message}`
      } else {
        message = error.message
      }
    } else {
      message = 'Erro interno ao processar mensagem'
    }

    // Se o erro indica falha de provider, dar dica ao usuario
    if (
      message.includes('provedor') ||
      message.includes('provider') ||
      message.includes('modelo') ||
      message.includes('Timeout')
    ) {
      message += '. Verifique as configuracoes de IA em Configuracoes > IA.'
    }

    return Response.json({ error: message }, { status: 500 })
  }
}
