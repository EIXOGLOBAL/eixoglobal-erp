import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { aiCompleteFast, getActiveApiKey } from '@/lib/ai-client'

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
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    if (!checkRateLimit(session.user.id)) {
      return NextResponse.json({ error: 'Rate limit excedido. Tente novamente em breve.' }, { status: 429 })
    }

    const { text } = await request.json()

    if (!text || typeof text !== 'string' || text.length > 5000) {
      return NextResponse.json({ error: 'Texto invalido ou muito longo' }, { status: 400 })
    }

    // Check cache first
    const cached = getCachedCorrection(text)
    if (cached) {
      return NextResponse.json({ ...cached, fromCache: true })
    }

    // Verificar se IA esta configurada
    const active = await getActiveApiKey()
    if (!active) {
      return NextResponse.json({ error: 'Provedor de IA não configurado. Acesse Configurações > IA.' }, { status: 500 })
    }

    const response = await aiCompleteFast({
      system: `Voce e um corretor ortografico de portugues brasileiro (PT-BR).
Corrija o texto recebido mantendo o significado original.
Responda APENAS com JSON no formato: {"corrected": "texto corrigido", "changes": [{"original": "palavra errada", "corrected": "palavra correta"}]}
Se o texto estiver correto, retorne o mesmo texto com changes vazio.
Nao adicione explicacoes. Apenas o JSON.`,
      messages: [{ role: 'user', content: text }],
      maxTokens: 1024,
    })

    try {
      const result = JSON.parse(response.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
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
