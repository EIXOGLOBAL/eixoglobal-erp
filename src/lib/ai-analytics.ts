import { prisma } from '@/lib/prisma'

// --------------------------------------------------------
// Helper
// --------------------------------------------------------

function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key] ?? 'unknown')
    ;(acc[k] ??= []).push(item)
    return acc
  }, {} as Record<string, T[]>)
}

// --------------------------------------------------------
// Type Interfaces
// --------------------------------------------------------

export interface PortfolioAnalysis {
  score: number
  status: 'excellent' | 'good' | 'attention' | 'critical'
  headline: string
  insights: string[]
  risks: { title: string; severity: 'low' | 'medium' | 'high'; action: string }[]
  opportunities: string[]
  recommendation: string
}

export interface FinancialAnalysis {
  score: number
  cashflowTrend: 'improving' | 'stable' | 'declining'
  burnRate: number
  projectedBalance30d: number
  projectedBalance90d: number
  alerts: string[]
  recommendations: string[]
}

export interface HRAnalysis {
  headcount: number
  allocationRate: number
  pendingVacations: number
  upcomingTrainings: number
  salaryBudgetUsage: number
  alerts: string[]
}

export interface ExecutiveSummary {
  date: string
  overallScore: number
  highlights: string[]
  criticalAlerts: string[]
  monthlyKPIs: { label: string; value: string; trend: 'up' | 'down' | 'stable' }[]
}

export interface AnomalyReport {
  anomalies: {
    type: string
    description: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    affectedEntity: string
  }[]
}

export interface ProjectRiskReport {
  cpi: number
  spi: number
  trend: string
  estimatedCompletionDate: string
  costAtCompletion: number
  risks: { title: string; severity: string; probability: string }[]
  mitigations: string[]
}

// --------------------------------------------------------
// Internal: Anthropic call helper
// --------------------------------------------------------

const SYSTEM_PROMPT =
  'Voce e um analista de projetos de engenharia e infraestrutura especializado em obras publicas e privadas no Brasil. Analise os dados fornecidos e responda SEMPRE em JSON valido com a estrutura especificada. Seja objetivo e direto. Valores monetarios em BRL. Datas no formato brasileiro.'

async function callAnthropic(userPrompt: string): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic()

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const block = message.content[0]!
  if (block.type === 'text') return block.text
  return '{}'
}

function parseJSON<T>(raw: string, fallback: T): T {
  try {
    // Strip possible markdown fences
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
    return JSON.parse(cleaned) as T
  } catch {
    return fallback
  }
}

// --------------------------------------------------------
// 1. analyzeProjectPortfolio
// --------------------------------------------------------

export async function analyzeProjectPortfolio(companyId: string): Promise<PortfolioAnalysis> {
  const fallback: PortfolioAnalysis = {
    score: 0,
    status: 'attention',
    headline: 'Analise indisponivel no momento',
    insights: ['Chave da API de IA nao configurada ou erro na analise.'],
    risks: [],
    opportunities: [],
    recommendation: 'Configure a chave ANTHROPIC_API_KEY para habilitar analises de IA.',
  }

  try {
    if (!process.env.ANTHROPIC_API_KEY) return fallback

    const projects = await prisma.project.findMany({
      where: { companyId },
      select: { id: true, name: true, status: true, startDate: true, endDate: true, budget: true },
    })

    const contracts = await prisma.contract.findMany({
      where: { companyId },
      select: { id: true, identifier: true, value: true, status: true, startDate: true, endDate: true },
    })

    const recentBulletins = await prisma.measurementBulletin.findMany({
      where: { project: { companyId } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, number: true, totalValue: true, status: true, referenceMonth: true },
    })

    const byStatus = groupBy(projects, 'status')
    const now = new Date()
    const overdueProjects = projects.filter(
      (p) => p.endDate && new Date(p.endDate) < now && p.status !== 'COMPLETED' && p.status !== 'CANCELLED'
    )

    const contractValues = contracts.map((c) => Number(c.value ?? 0))
    const totalContractValue = contractValues.reduce((a, b) => a + b, 0)

    const context = {
      totalProjects: projects.length,
      byStatus: Object.fromEntries(Object.entries(byStatus).map(([k, v]) => [k, v.length])),
      overdueProjects: overdueProjects.length,
      contracts: {
        total: contracts.length,
        totalValue: totalContractValue,
        active: contracts.filter((c) => c.status === 'ACTIVE').length,
      },
      recentMeasurements: recentBulletins.length,
      recentMeasurementValues: recentBulletins.map((b) => ({
        number: b.number,
        value: Number(b.totalValue),
        status: b.status,
      })),
    }

    const prompt = `Analise o portfolio de projetos a seguir e retorne um JSON com esta estrutura exata:
{
  "score": <number 0-100>,
  "status": "excellent"|"good"|"attention"|"critical",
  "headline": "<string resumo>",
  "insights": ["<string>", ...] (3-5 itens),
  "risks": [{"title":"<string>","severity":"low"|"medium"|"high","action":"<string>"}],
  "opportunities": ["<string>"],
  "recommendation": "<string>"
}

Dados do portfolio:
${JSON.stringify(context, null, 2)}`

    const raw = await callAnthropic(prompt)
    return parseJSON<PortfolioAnalysis>(raw, fallback)
  } catch {
    return fallback
  }
}

// --------------------------------------------------------
// 2. analyzeFinancialHealth
// --------------------------------------------------------

export async function analyzeFinancialHealth(companyId: string): Promise<FinancialAnalysis> {
  const fallback: FinancialAnalysis = {
    score: 0,
    cashflowTrend: 'stable',
    burnRate: 0,
    projectedBalance30d: 0,
    projectedBalance90d: 0,
    alerts: ['Analise financeira indisponivel no momento.'],
    recommendations: ['Configure a chave ANTHROPIC_API_KEY para habilitar analises de IA.'],
  }

  try {
    if (!process.env.ANTHROPIC_API_KEY) return fallback

    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    const financialRecords = await prisma.financialRecord.findMany({
      where: { companyId, createdAt: { gte: twelveMonthsAgo } },
      select: { id: true, description: true, amount: true, type: true, status: true, dueDate: true, paidDate: true, paidAmount: true, category: true },
    })

    const bankAccounts = await prisma.bankAccount.findMany({
      where: { companyId },
      select: { id: true, name: true, balance: true },
    })

    const fiscalNotes = await prisma.fiscalNote.findMany({
      where: { companyId, createdAt: { gte: twelveMonthsAgo } },
      select: { id: true, type: true, value: true, status: true, issuedDate: true, dueDate: true },
    })

    const income = financialRecords.filter((r) => r.type === 'INCOME')
    const expenses = financialRecords.filter((r) => r.type === 'EXPENSE')
    const totalIncome = income.reduce((s, r) => s + Number(r.amount), 0)
    const totalExpenses = expenses.reduce((s, r) => s + Number(r.amount), 0)
    const totalBalances = bankAccounts.reduce((s, a) => s + Number(a.balance), 0)

    const receivables = financialRecords
      .filter((r) => r.type === 'INCOME' && r.status === 'PENDING')
      .reduce((s, r) => s + Number(r.amount), 0)

    const payables = financialRecords
      .filter((r) => r.type === 'EXPENSE' && r.status === 'PENDING')
      .reduce((s, r) => s + Number(r.amount), 0)

    const context = {
      periodo: '12 meses',
      receitaTotal: totalIncome,
      despesaTotal: totalExpenses,
      saldoBancario: totalBalances,
      contasAReceber: receivables,
      contasAPagar: payables,
      totalNotasFiscais: fiscalNotes.length,
      totalLancamentos: financialRecords.length,
      contas: bankAccounts.map((a) => ({ nome: a.name, saldo: Number(a.balance) })),
    }

    const prompt = `Analise a saude financeira desta empresa de construcao/engenharia e retorne JSON com esta estrutura:
{
  "score": <number 0-100>,
  "cashflowTrend": "improving"|"stable"|"declining",
  "burnRate": <number R$/mes>,
  "projectedBalance30d": <number>,
  "projectedBalance90d": <number>,
  "alerts": ["<string>", ...],
  "recommendations": ["<string>", ...]
}

Dados financeiros:
${JSON.stringify(context, null, 2)}`

    const raw = await callAnthropic(prompt)
    return parseJSON<FinancialAnalysis>(raw, fallback)
  } catch {
    return fallback
  }
}

// --------------------------------------------------------
// 3. analyzeHRMetrics
// --------------------------------------------------------

export async function analyzeHRMetrics(companyId: string): Promise<HRAnalysis> {
  const fallback: HRAnalysis = {
    headcount: 0,
    allocationRate: 0,
    pendingVacations: 0,
    upcomingTrainings: 0,
    salaryBudgetUsage: 0,
    alerts: ['Analise de RH indisponivel no momento.'],
  }

  try {
    if (!process.env.ANTHROPIC_API_KEY) return fallback

    const employees = await prisma.employee.findMany({
      where: { companyId, status: 'ACTIVE' },
      select: { id: true, name: true, jobTitle: true, monthlySalary: true, costPerHour: true },
    })

    const allocations = await prisma.allocation.findMany({
      where: { employee: { companyId }, endDate: null },
      select: { id: true, employeeId: true },
    })

    const vacationRequests = await prisma.vacationRequest.findMany({
      where: { employee: { companyId }, status: 'PENDING' },
      select: { id: true },
    })

    const now = new Date()
    const inThreeMonths = new Date()
    inThreeMonths.setMonth(inThreeMonths.getMonth() + 3)

    const trainings = await prisma.training.findMany({
      where: {
        companyId,
        startDate: { gte: now, lte: inThreeMonths },
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
      select: { id: true },
    })

    const headcount = employees.length
    const allocatedEmployeeIds = new Set(allocations.map((a) => a.employeeId))
    const allocationRate = headcount > 0 ? (allocatedEmployeeIds.size / headcount) * 100 : 0

    const totalSalaryBudget = employees.reduce((s, e) => s + Number(e.monthlySalary ?? 0), 0)

    const context = {
      headcount,
      taxaAlocacao: allocationRate.toFixed(1) + '%',
      feriasPendentes: vacationRequests.length,
      treinamentosProximos: trainings.length,
      orcamentoSalarial: totalSalaryBudget,
      cargos: groupBy(employees, 'jobTitle'),
    }

    const prompt = `Analise as metricas de RH desta empresa de construcao e retorne JSON com esta estrutura:
{
  "headcount": <number>,
  "allocationRate": <number 0-100>,
  "pendingVacations": <number>,
  "upcomingTrainings": <number>,
  "salaryBudgetUsage": <number 0-100>,
  "alerts": ["<string>", ...]
}

Dados de RH:
${JSON.stringify(context, null, 2)}`

    const raw = await callAnthropic(prompt)
    const result = parseJSON<HRAnalysis>(raw, fallback)

    // Ensure computed fields are correct
    result.headcount = headcount
    result.pendingVacations = vacationRequests.length
    result.upcomingTrainings = trainings.length
    result.allocationRate = Math.round(allocationRate * 100) / 100

    return result
  } catch {
    return fallback
  }
}

// --------------------------------------------------------
// 4. generateExecutiveSummary
// --------------------------------------------------------

export async function generateExecutiveSummary(companyId: string): Promise<ExecutiveSummary> {
  const fallback: ExecutiveSummary = {
    date: new Date().toLocaleDateString('pt-BR'),
    overallScore: 0,
    highlights: ['Relatorio executivo indisponivel no momento.'],
    criticalAlerts: [],
    monthlyKPIs: [],
  }

  try {
    if (!process.env.ANTHROPIC_API_KEY) return fallback

    const [portfolio, financial, hr] = await Promise.all([
      analyzeProjectPortfolio(companyId),
      analyzeFinancialHealth(companyId),
      analyzeHRMetrics(companyId),
    ])

    const context = {
      portfolio: {
        score: portfolio.score,
        status: portfolio.status,
        headline: portfolio.headline,
        risks: portfolio.risks,
        insights: portfolio.insights,
      },
      financeiro: {
        score: financial.score,
        tendencia: financial.cashflowTrend,
        burnRate: financial.burnRate,
        projecao30d: financial.projectedBalance30d,
        projecao90d: financial.projectedBalance90d,
        alertas: financial.alerts,
      },
      rh: {
        headcount: hr.headcount,
        taxaAlocacao: hr.allocationRate,
        feriasPendentes: hr.pendingVacations,
        treinamentos: hr.upcomingTrainings,
        alertas: hr.alerts,
      },
    }

    const prompt = `Gere um resumo executivo consolidado para CEO/Diretor com base nos dados a seguir. Retorne JSON com esta estrutura:
{
  "date": "<string dd/mm/aaaa>",
  "overallScore": <number 0-100>,
  "highlights": ["<string positivo>", ...],
  "criticalAlerts": ["<string alerta critico>", ...],
  "monthlyKPIs": [{"label":"<string>","value":"<string>","trend":"up"|"down"|"stable"}, ...]
}

Dados consolidados:
${JSON.stringify(context, null, 2)}`

    const raw = await callAnthropic(prompt)
    return parseJSON<ExecutiveSummary>(raw, fallback)
  } catch {
    return fallback
  }
}

// --------------------------------------------------------
// 5. detectAnomalies
// --------------------------------------------------------

export async function detectAnomalies(companyId: string): Promise<AnomalyReport> {
  const fallback: AnomalyReport = { anomalies: [] }

  try {
    if (!process.env.ANTHROPIC_API_KEY) return fallback

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentFinancial = await prisma.financialRecord.findMany({
      where: { companyId, createdAt: { gte: sevenDaysAgo } },
      select: { id: true, description: true, amount: true, type: true, status: true, dueDate: true, category: true },
    })

    const recentInventory = await prisma.inventoryMovement.findMany({
      where: { material: { companyId }, createdAt: { gte: sevenDaysAgo } },
      select: { id: true, type: true, quantity: true, notes: true, materialId: true },
      take: 100,
    })

    const recentAudit = await prisma.auditLog.findMany({
      where: { companyId, createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, action: true, entity: true, entityName: true, createdAt: true },
    })

    const context = {
      periodo: '7 dias',
      lancamentosFinanceiros: recentFinancial.map((r) => ({
        descricao: r.description,
        valor: Number(r.amount),
        tipo: r.type,
        status: r.status,
        categoria: r.category,
      })),
      movimentacoesEstoque: recentInventory.map((m) => ({
        tipo: m.type,
        quantidade: Number(m.quantity),
        obs: m.notes,
      })),
      totalAuditLogs: recentAudit.length,
      acoesAuditoria: recentAudit.slice(0, 30).map((a) => ({
        acao: a.action,
        entidade: a.entity,
        nome: a.entityName,
      })),
    }

    const prompt = `Analise os dados dos ultimos 7 dias e identifique anomalias ou padroes incomuns. Retorne JSON com esta estrutura:
{
  "anomalies": [
    {
      "type": "<string tipo da anomalia>",
      "description": "<string descricao detalhada>",
      "severity": "low"|"medium"|"high"|"critical",
      "affectedEntity": "<string entidade afetada>"
    }
  ]
}

Se nao houver anomalias, retorne {"anomalies":[]}.

Dados recentes:
${JSON.stringify(context, null, 2)}`

    const raw = await callAnthropic(prompt)
    return parseJSON<AnomalyReport>(raw, fallback)
  } catch {
    return fallback
  }
}

// --------------------------------------------------------
// 6. generateProjectRiskReport
// --------------------------------------------------------

export async function generateProjectRiskReport(projectId: string): Promise<ProjectRiskReport> {
  const fallback: ProjectRiskReport = {
    cpi: 1,
    spi: 1,
    trend: 'Analise indisponivel',
    estimatedCompletionDate: '-',
    costAtCompletion: 0,
    risks: [],
    mitigations: ['Configure a chave ANTHROPIC_API_KEY para habilitar analises de IA.'],
  }

  try {
    if (!process.env.ANTHROPIC_API_KEY) return fallback

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, status: true, startDate: true, endDate: true, budget: true },
    })

    if (!project) return fallback

    const contracts = await prisma.contract.findMany({
      where: { projectId },
      select: { id: true, identifier: true, value: true, status: true, startDate: true, endDate: true },
    })

    const bulletins = await prisma.measurementBulletin.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, number: true, totalValue: true, status: true, referenceMonth: true, periodStart: true, periodEnd: true },
    })

    const tasks = await prisma.projectTask.findMany({
      where: { projectId },
      select: { id: true, name: true, status: true, percentDone: true, startDate: true, endDate: true, priority: true },
    })

    const totalContractValue = contracts.reduce((s, c) => s + Number(c.value ?? 0), 0)
    const totalMeasured = bulletins
      .filter((b) => b.status === 'APPROVED' || b.status === 'MANAGER_APPROVED')
      .reduce((s, b) => s + Number(b.totalValue), 0)

    const totalTasks = tasks.length
    const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length
    const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

    const now = new Date()
    const start = new Date(project.startDate)
    const end = project.endDate ? new Date(project.endDate) : new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000)
    const totalDuration = end.getTime() - start.getTime()
    const elapsed = now.getTime() - start.getTime()
    const timeProgress = totalDuration > 0 ? Math.min((elapsed / totalDuration) * 100, 100) : 0

    const context = {
      projeto: {
        nome: project.name,
        status: project.status,
        inicio: start.toLocaleDateString('pt-BR'),
        previsaoTermino: end.toLocaleDateString('pt-BR'),
        orcamento: Number(project.budget ?? 0),
      },
      contratos: {
        total: contracts.length,
        valorTotal: totalContractValue,
        valorMedido: totalMeasured,
      },
      progresso: {
        tarefas: taskProgress.toFixed(1) + '%',
        tempo: timeProgress.toFixed(1) + '%',
        totalTarefas: totalTasks,
        tarefasConcluidas: completedTasks,
      },
      boletins: bulletins.length,
      tarefasCriticas: tasks.filter((t) => t.priority === 'CRITICAL' && t.status !== 'COMPLETED'),
    }

    const prompt = `Faca uma analise de risco aprofundada deste projeto de engenharia. Calcule CPI e SPI com base nos dados. Retorne JSON com esta estrutura:
{
  "cpi": <number indice de performance de custo>,
  "spi": <number indice de performance de prazo>,
  "trend": "<string tendencia>",
  "estimatedCompletionDate": "<string dd/mm/aaaa>",
  "costAtCompletion": <number custo estimado final>,
  "risks": [{"title":"<string>","severity":"low"|"medium"|"high"|"critical","probability":"low"|"medium"|"high"}],
  "mitigations": ["<string acao de mitigacao>"]
}

Dados do projeto:
${JSON.stringify(context, null, 2)}`

    const raw = await callAnthropic(prompt)
    return parseJSON<ProjectRiskReport>(raw, fallback)
  } catch {
    return fallback
  }
}
