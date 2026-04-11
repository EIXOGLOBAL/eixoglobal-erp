/**
 * POST /api/ai/complete
 *
 * Endpoint para completions simples (sem streaming).
 * Retorna JSON estruturado quando schema fornecido.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { aiComplete } from '@/lib/ai/client'
import { getSystemPromptForModule, SYSTEM_GLOBAL } from '@/lib/ai/prompts'

export const dynamic = 'force-dynamic'

// ============================================================================
// Rate limiting
// ============================================================================

const rateLimits = new Map<string, { count: number; resetAt: number }>()
const MAX_PER_MINUTE = 30

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
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  const user = session.user as { id: string; role: string; companyId: string }

  if (!checkRateLimit(user.id)) {
    return NextResponse.json({ error: 'Limite de requisicoes atingido. Aguarde 1 minuto.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { prompt, schema, module } = body as {
      prompt: string
      schema?: Record<string, unknown>
      module?: string
    }

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt invalido' }, { status: 400 })
    }

    const systemPrompt = module ? getSystemPromptForModule(module) : SYSTEM_GLOBAL

    // Completion (com ou sem schema — schema sera tratado como instrucao no prompt)
    const finalPrompt = schema
      ? `${prompt}\n\nResponda em JSON valido seguindo este formato:\n${JSON.stringify(schema, null, 2)}`
      : prompt

    const result = await aiComplete(finalPrompt, { systemPrompt })

    logAudit({
      action: 'AI_COMPLETE',
      entity: 'AIComplete',
      entityName: `text/${result.provider}`,
      userId: user.id,
      companyId: user.companyId,
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      content: result.content,
      provider: result.provider,
      model: result.model,
      tokensUsed: result.tokensUsed,
    })
  } catch (error) {
    console.error('[AI Complete] Error:', error)
    const message = error instanceof Error ? error.message : 'Erro ao processar completion'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
