import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/ai/health
 *
 * Executa análise de saúde do sistema de forma assíncrona.
 * Pode ser chamado por cron jobs externos (GitHub Actions, etc).
 *
 * Query params:
 * - companyId: ID da empresa (opcional, analisa todas se não especificado)
 * - auth: Bearer token ou secret (recomendado para segurança)
 */

async function analyzeCompanyHealth(companyId: string): Promise<{
  companyId: string
  companyName: string
  score: number
  status: string
  timestamp: string
}> {
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        projects: {
          select: { id: true, status: true, name: true },
          take: 50,
        },
        employees: {
          select: { id: true, status: true },
        },
        financialRecords: {
          select: { amount: true },
          take: 100,
        },
      },
    })

    if (!company) {
      return {
        companyId,
        companyName: 'Desconhecida',
        score: 0,
        status: 'empresa_nao_encontrada',
        timestamp: new Date().toISOString(),
      }
    }

    const projectCount = company.projects.length
    const activeProjects = company.projects.filter((p) => p.status === 'IN_PROGRESS').length
    const employeeCount = company.employees.length
    const activeEmployees = company.employees.filter((e) => e.status === 'ACTIVE').length
    const totalFinancial = company.financialRecords.reduce(
      (sum, r) => sum + Number(r.amount || 0),
      0
    )

    // Basic health calculation
    let score = 50 // baseline

    // Adjust based on metrics
    if (projectCount > 0) score += 10
    if (activeProjects > 0) score += 10
    if (employeeCount > 0) score += 10
    if (totalFinancial > 0) score += 10
    if (activeEmployees / Math.max(employeeCount, 1) > 0.8) score += 10

    // Cap at 100
    score = Math.min(score, 100)

    const status =
      score >= 80 ? 'excelente' : score >= 60 ? 'bom' : score >= 40 ? 'atenção' : 'crítico'

    return {
      companyId,
      companyName: company.name,
      score,
      status,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error(`[Health Check] Erro ao analisar empresa ${companyId}:`, error)
    return {
      companyId,
      companyName: 'Erro',
      score: 0,
      status: 'erro_ao_analisar',
      timestamp: new Date().toISOString(),
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    // Check API key for security
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.AI_CRON_SECRET
    const { getActiveApiKey } = await import('@/lib/ai-client')
    const active = await getActiveApiKey()

    // Simple auth check - if secret is configured, require it
    if (cronSecret && cronSecret !== 'your_secret_here') {
      if (!authHeader || !authHeader.includes(cronSecret)) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    // Check if AI is configured
    if (!active) {
      return NextResponse.json(
        {
          error: 'Nenhum provedor de IA configurado',
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(req.url)
    const companyIdParam = searchParams.get('companyId')

    let companies: { id: string; name: string }[]

    if (companyIdParam) {
      // Analyze specific company
      companies = await prisma.company.findMany({
        where: { id: companyIdParam },
        select: { id: true, name: true },
      })
    } else {
      // Analyze all companies
      companies = await prisma.company.findMany({
        select: { id: true, name: true },
        take: 100,
      })
    }

    // Run health checks for all companies
    const healthChecks = await Promise.all(companies.map((c) => analyzeCompanyHealth(c.id)))

    // Calculate portfolio health
    const avgScore = healthChecks.reduce((sum, h) => sum + h.score, 0) / Math.max(healthChecks.length, 1)
    const portfolioStatus =
      avgScore >= 80 ? 'excelente' : avgScore >= 60 ? 'bom' : avgScore >= 40 ? 'atenção' : 'crítico'

    // Log audit (fire-and-forget)
    if (companies.length > 0) {
      logAudit({
        action: 'AI_HEALTH_CHECK',
        entity: 'System',
        entityName: `Health Check`,
        userId: 'system-cron',
        companyId: companies[0]?.id || 'system',
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      portfolioHealth: {
        averageScore: Math.round(avgScore),
        status: portfolioStatus,
        companiesAnalyzed: healthChecks.length,
      },
      companies: healthChecks,
    })
  } catch (error) {
    console.error('[Health Check] Erro:', error)
    return NextResponse.json(
      {
        error: 'Erro ao processar verificação de saúde',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
