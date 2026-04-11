import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// In-memory cache for recent corrections
const correctionCache = new Map<string, { result: any; timestamp: number }>()
const CACHE_TTL = 3600000 // 1 hour
const MAX_CACHE_SIZE = 1000

// Rate limiting
const rateLimits = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 60 // 60 calls per minute
const RATE_WINDOW = 60000 // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const limit = rateLimits.get(userId)

  if (!limit || now > limit.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }

  if (limit.count >= RATE_LIMIT) return false
  limit.count++
  return true
}

function getCachedCorrection(text: string) {
  const cached = correctionCache.get(text)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result
  }
  correctionCache.delete(text)
  return null
}

function setCachedCorrection(text: string, result: any) {
  // Evict oldest entries if cache is full
  if (correctionCache.size >= MAX_CACHE_SIZE) {
    const firstKey = correctionCache.keys().next().value
    if (firstKey) correctionCache.delete(firstKey)
  }
  correctionCache.set(text, { result, timestamp: Date.now() })
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    if (!checkRateLimit(session.user.id)) {
      return NextResponse.json({ error: 'Rate limit excedido. Tente novamente em breve.' }, { status: 429 })
    }

    const { text } = await request.json()

    if (!text || typeof text !== 'string' || text.length > 5000) {
      return NextResponse.json({ error: 'Texto inválido ou muito longo' }, { status: 400 })
    }

    // Check cache first
    const cached = getCachedCorrection(text)
    if (cached) {
      return NextResponse.json({ ...cached, fromCache: true })
    }

    // Call Claude for advanced correction
    const { getAnthropicApiKey } = await import('@/lib/system-settings')
    const apiKey = await getAnthropicApiKey()
    if (!apiKey) {
      return NextResponse.json({ error: 'API key nao configurada. Acesse Configuracoes > IA.' }, { status: 500 })
    }

    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `Você é um corretor ortográfico de português brasileiro (PT-BR).
Corrija o texto recebido mantendo o significado original.
Responda APENAS com JSON no formato: {"corrected": "texto corrigido", "changes": [{"original": "palavra errada", "corrected": "palavra correta"}]}
Se o texto estiver correto, retorne o mesmo texto com changes vazio.
Não adicione explicações. Apenas o JSON.`,
      messages: [{ role: 'user', content: text }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ corrected: text, changes: [] })
    }

    try {
      const result = JSON.parse(content.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
      setCachedCorrection(text, result)
      return NextResponse.json(result)
    } catch {
      return NextResponse.json({ corrected: text, changes: [] })
    }
  } catch (error) {
    console.error('Erro no spell-check:', error)
    return NextResponse.json({ error: 'Erro ao verificar ortografia' }, { status: 500 })
  }
}
