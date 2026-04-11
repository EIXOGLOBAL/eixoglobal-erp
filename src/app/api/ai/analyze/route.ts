import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import {
  analyzeProjectPortfolio,
  analyzeFinancialHealth,
  analyzeHRMetrics,
  generateExecutiveSummary,
  detectAnomalies,
  generateProjectRiskReport,
} from '@/lib/ai-analytics'

export const dynamic = 'force-dynamic'

// --------------------------------------------------------
// Rate limiting: in-memory Map — userId -> { count, resetAt }
// --------------------------------------------------------

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const MAX_CALLS_PER_HOUR = 10

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60 * 60 * 1000 })
    return true
  }

  if (entry.count >= MAX_CALLS_PER_HOUR) {
    return false
  }

  entry.count += 1
  return true
}

// --------------------------------------------------------
// POST /api/ai/analyze
// --------------------------------------------------------

type AnalysisType = 'portfolio' | 'financial' | 'hr' | 'executive' | 'anomalies' | 'project-risk'

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { role, id: userId, companyId: sessionCompanyId } = session.user as {
      id: string
      role: string
      companyId: string
      name: string
    }

    if (role !== 'ADMIN' && role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Acesso restrito a administradores e gestores' },
        { status: 403 }
      )
    }

    // 2. Check ANTHROPIC_API_KEY (banco > env)
    const { getAnthropicApiKey } = await import('@/lib/system-settings')
    if (!(await getAnthropicApiKey())) {
      return NextResponse.json(
        { error: 'Chave da API de IA nao configurada. Acesse Configuracoes > IA.' },
        { status: 503 }
      )
    }

    // 3. Rate limiting
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { error: 'Limite de requisicoes atingido. Tente novamente em 1 hora.' },
        { status: 429 }
      )
    }

    // 4. Parse body
    const body = await req.json()
    const { type, companyId, projectId } = body as {
      type: AnalysisType
      companyId: string
      projectId?: string
    }

    if (!type || !companyId) {
      return NextResponse.json(
        { error: 'Parametros obrigatorios: type, companyId' },
        { status: 400 }
      )
    }

    // 5. Execute analysis
    let data: unknown

    switch (type) {
      case 'portfolio':
        data = await analyzeProjectPortfolio(companyId)
        break
      case 'financial':
        data = await analyzeFinancialHealth(companyId)
        break
      case 'hr':
        data = await analyzeHRMetrics(companyId)
        break
      case 'executive':
        data = await generateExecutiveSummary(companyId)
        break
      case 'anomalies':
        data = await detectAnomalies(companyId)
        break
      case 'project-risk':
        if (!projectId) {
          return NextResponse.json(
            { error: 'projectId obrigatorio para analise de risco' },
            { status: 400 }
          )
        }
        data = await generateProjectRiskReport(projectId)
        break
      default:
        return NextResponse.json(
          { error: 'Tipo de analise invalido' },
          { status: 400 }
        )
    }

    // 6. Audit log
    await logAudit({
      action: 'AI_ANALYZE',
      entity: type,
      userId,
      companyId: companyId || sessionCompanyId,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[AI Analyze] Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno ao processar analise de IA' },
      { status: 500 }
    )
  }
}
