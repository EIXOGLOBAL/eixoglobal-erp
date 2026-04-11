import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit-logger'
import { aiCompleteFast, getActiveApiKey } from '@/lib/ai-client'

export const dynamic = 'force-dynamic'

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return authHeader === `Bearer ${cronSecret}`
}

async function collectSystemMetrics(companyId: string) {
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 3600000)
  const last7d = new Date(now.getTime() - 7 * 24 * 3600000)

  const [
    activeProjects,
    totalEmployees,
    recentFinancials,
    openIncidents,
    pendingApprovals,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.project.count({ where: { companyId, status: 'IN_PROGRESS' } }),
    prisma.user.count({ where: { companyId, isActive: true } }),
    prisma.financialRecord.findMany({
      where: { companyId, createdAt: { gte: last7d } },
      select: { amount: true, type: true, status: true },
    }),
    prisma.safetyIncident.count({ where: { companyId, status: 'OPEN' } }).catch(() => 0),
    prisma.timeEntry.count({ where: { companyId, status: 'PENDING' } }).catch(() => 0),
    prisma.auditLog.count({ where: { companyId, createdAt: { gte: last24h } } }),
  ])

  const totalIncome = recentFinancials
    .filter((r: any) => r.type === 'INCOME')
    .reduce((sum: number, r: any) => sum + Number(r.amount), 0)

  const totalExpense = recentFinancials
    .filter((r: any) => r.type === 'EXPENSE')
    .reduce((sum: number, r: any) => sum + Number(r.amount), 0)

  return {
    activeProjects,
    totalEmployees,
    financialSummary: {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      recordCount: recentFinancials.length,
    },
    openIncidents,
    pendingApprovals,
    recentAuditLogs,
    collectedAt: now.toISOString(),
  }
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const active = await getActiveApiKey()
    if (!active) {
      return NextResponse.json({ error: 'Nenhum provedor de IA configurado' }, { status: 500 })
    }

    // Get all companies
    const companies = await prisma.company.findMany({
      select: { id: true, name: true },
    })

    const results = []

    for (const company of companies) {
      try {
        const metrics = await collectSystemMetrics(company.id)

        const response = await aiCompleteFast({
          system: `Voce e um analista de sistemas ERP. Analise as metricas do sistema e identifique:
1. Tendencias preocupantes
2. Riscos operacionais
3. Sugestoes de acao imediata
Responda em JSON: {"insights": [{"type": "risk"|"warning"|"info", "title": "...", "description": "..."}], "healthScore": 0-100, "urgentActions": ["..."]}`,
          messages: [{
            role: 'user',
            content: `Metricas da empresa ${company.name}:\n${JSON.stringify(metrics, null, 2)}`,
          }],
          maxTokens: 1024,
        })

        let analysis = { insights: [], healthScore: 50, urgentActions: [] }

        try {
          analysis = JSON.parse(response.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
        } catch { /* use default */ }

        // Save health log
        await (prisma as any).systemHealthLog.create({
          data: {
            metric: 'AI_ANALYSIS',
            value: analysis.healthScore || 50,
            status: (analysis.healthScore || 50) >= 70 ? 'OK' : (analysis.healthScore || 50) >= 40 ? 'WARNING' : 'CRITICAL',
            details: { metrics, analysis },
            companyId: company.id,
          },
        })

        // Create notifications for urgent insights
        const urgentInsights = (analysis.insights as any[]).filter((i: any) => i.type === 'risk')

        if (urgentInsights.length > 0) {
          const admins = await prisma.user.findMany({
            where: { companyId: company.id, role: 'ADMIN', isActive: true },
            select: { id: true, companyId: true },
          })

          if (admins.length > 0) {
            await prisma.notification.createMany({
              data: admins.map(admin => ({
                type: 'AI_INSIGHT',
                title: 'Analise de IA: Riscos Identificados',
                message: urgentInsights.map((i: any) => i.title).join('; '),
                link: '/configuracoes/monitoramento',
                userId: admin.id,
                companyId: admin.companyId,
              })),
            })
          }
        }

        results.push({
          company: company.name,
          healthScore: analysis.healthScore,
          insights: (analysis.insights as any[]).length,
          urgentActions: (analysis.urgentActions as any[]).length,
        })
      } catch (companyError) {
        console.error(`Erro na analise da empresa ${company.name}:`, companyError)
        results.push({ company: company.name, error: 'Falha na analise' })
      }
    }

    await logAction('AI_CRON_ANALYSIS', 'System', 'cron', 'AI Analysis', `Analyzed ${companies.length} companies`)

    return NextResponse.json({
      success: true,
      analyzed: companies.length,
      results,
    })
  } catch (error) {
    console.error('Erro na analise de IA via cron:', error)
    return NextResponse.json({ error: 'Erro na analise' }, { status: 500 })
  }
}
