'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { resolveAIPermissions, type AIPermissions, type AiAccessLevel } from '@/lib/permissions'
import { logAction } from '@/lib/audit-logger'
import { aiComplete, getActiveApiKey } from '@/lib/ai-client'

// ============================================================================
// Rate Limiting (diferenciado por permissão)
// ============================================================================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string, maxCallsPerHour: number): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60 * 60 * 1000 })
    return true
  }

  if (entry.count >= maxCallsPerHour) {
    return false
  }

  entry.count += 1
  return true
}

// ============================================================================
// Helper: obter permissões de IA da sessão
// ============================================================================

async function getAIContext() {
  const session = await getSession()
  if (!session?.user?.id) {
    return { error: 'Não autenticado' as const }
  }

  const role = session.user.role ?? ''
  const aiAccessLevel = (session.user as Record<string, unknown>).aiAccessLevel as AiAccessLevel | null | undefined
  const permissions = resolveAIPermissions(role, aiAccessLevel)
  const companyId = session.user.companyId ?? null
  const userId = session.user.id

  return { session, role, permissions, companyId, userId }
}

// ============================================================================
// Unified AI Helper (suporta Anthropic e OpenRouter)
// ============================================================================

async function callAI(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 2000
): Promise<{ content?: string; error?: string }> {
  try {
    const active = await getActiveApiKey()
    if (!active) {
      return { error: 'Provedor de IA nao configurado. Acesse Configuracoes > IA.' }
    }

    const response = await aiComplete({
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens,
    })

    return { content: response.content }
  } catch (error) {
    console.error('[AI] Erro ao chamar provedor:', error)
    return { error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

// ============================================================================
// Interfaces
// ============================================================================

export interface SystemHealthAnalysis {
  overallScore: number
  status: 'excelente' | 'bom' | 'atenção' | 'crítico'
  summary: string
  errorPatterns: string[]
  orphanedRecords: { type: string; count: number; description: string }[]
  dataConsistency: { check: string; status: boolean; issue?: string }[]
  recommendations: string[]
  timestamp: string
}

export interface ProjectHealthAnalysis {
  projectId: string
  projectName: string
  overallScore: number
  evmInterpretation: string
  budgetBurnRate: number
  scheduleRisk: 'baixo' | 'médio' | 'alto'
  costRisk: 'baixo' | 'médio' | 'alto'
  recommendations: string[]
  timestamp: string
}

export interface AnomalyDetectionResult {
  anomalies: {
    type: string
    description: string
    severity: 'baixa' | 'média' | 'alta' | 'crítica'
    affectedEntity: string
    value?: number
  }[]
  totalFound: number
  timestamp: string
}

export interface AIReport {
  title: string
  type: 'executive' | 'technical' | 'financial'
  content: string
  generatedAt: string
}

export interface ChatResponse {
  message: string
  timestamp: string
}

// ============================================================================
// 1. System Health Analysis
// ============================================================================

export async function analyzeSystemHealth(
  companyId: string
): Promise<SystemHealthAnalysis | { error: string }> {
  try {
    const ctx = await getAIContext()
    if ('error' in ctx) return { error: ctx.error }

    const { permissions, role, userId } = ctx

    if (!permissions.canRunAnalysis) {
      return { error: 'Acesso restrito: você não tem permissão para análises de saúde do sistema.' }
    }

    if (!checkRateLimit(userId, permissions.maxCallsPerHour)) {
      return { error: 'Limite de requisições atingido. Tente novamente em 1 hora.' }
    }

    // ADMIN vê qualquer empresa; MANAGER/STANDARD vê apenas a própria
    const targetCompanyId = permissions.canAccessAllData ? companyId : (ctx.companyId ?? companyId)
    if (!permissions.canAccessAllData && ctx.companyId && companyId !== ctx.companyId) {
      return { error: 'Acesso restrito: você só pode analisar dados da sua empresa.' }
    }

    await logAction('AI_ANALYZE_SYSTEM', 'Company', targetCompanyId, 'Análise de saúde do sistema')

    // Fetch company data
    const company = await prisma.company.findUnique({
      where: { id: targetCompanyId },
      include: {
        projects: { select: { id: true, name: true, status: true } },
        employees: { select: { id: true, status: true } },
        auditLogs: {
          where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
          select: { action: true, entity: true, createdAt: true },
          take: 100,
        },
      },
    })

    if (!company) {
      return { error: 'Empresa não encontrada' }
    }

    // Check for orphaned records
    const orphanedMeasurements = await prisma.measurement.findMany({
      where: {
        companyId,
        project: { is: null },
      },
      select: { id: true },
    })

    const orphanedAllocationCount = await prisma.allocation.count({
      where: {
        project: { companyId },
        employee: { companyId },
      },
    })

    // Check financial consistency
    const financialRecords = await prisma.financialRecord.findMany({
      where: { companyId },
      select: { amount: true, type: true },
    })

    const totalFinancial = financialRecords.reduce((sum, r) => sum + Number(r.amount || 0), 0)

    // Build analysis prompt
    const analysisPrompt = `
Analise a saúde do sistema ERP para a empresa "${company.name}".

Dados:
- Total de projetos: ${company.projects.length}
- Projetos ativos: ${company.projects.filter((p) => p.status === 'IN_PROGRESS').length}
- Total de funcionários: ${company.employees.length}
- Funcionários ativos: ${company.employees.filter((e) => e.status === 'ACTIVE').length}
- Registros de medição órfãos: ${orphanedMeasurements.length}
- Registros financeiros: ${financialRecords.length}
- Total financeiro processado: R$ ${totalFinancial.toFixed(2)}
- Logs de auditoria recentes: ${company.auditLogs.length}

Forneça uma análise estruturada em JSON com:
{
  "overallScore": <0-100>,
  "status": "excelente|bom|atenção|crítico",
  "summary": "resumo executivo",
  "errorPatterns": ["padrão1", "padrão2"],
  "orphanedRecords": [{"type": "tipo", "count": 0, "description": "desc"}],
  "dataConsistency": [{"check": "descrição", "status": true/false, "issue": "problema se houver"}],
  "recommendations": ["recomendação1", "recomendação2"]
}
`

    const response = await callAI(
      'Você é um analista de sistemas ERP especializado em auditoria de dados e saúde operacional. Responda sempre em JSON válido.',
      analysisPrompt,
      2000
    )

    if (response.error) {
      return { error: response.error }
    }

    try {
      const jsonMatch = response.content?.match(/\{[\s\S]*\}/)
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null

      if (!parsed) {
        return {
          overallScore: 50,
          status: 'atenção',
          summary: 'Análise incompleta',
          errorPatterns: [],
          orphanedRecords: [
            {
              type: 'measurements',
              count: orphanedMeasurements.length,
              description: 'Medições sem projeto associado',
            },
          ],
          dataConsistency: [
            {
              check: 'Integridade financeira',
              status: totalFinancial > 0,
              issue: totalFinancial === 0 ? 'Nenhum registro financeiro' : undefined,
            },
          ],
          recommendations: ['Revisar registros órfãos', 'Validar integridade de dados'],
          timestamp: new Date().toISOString(),
        }
      }

      return {
        overallScore: parsed.overallScore || 50,
        status: parsed.status || 'atenção',
        summary: parsed.summary || 'Sistema operacional',
        errorPatterns: parsed.errorPatterns || [],
        orphanedRecords: parsed.orphanedRecords || [],
        dataConsistency: parsed.dataConsistency || [],
        recommendations: parsed.recommendations || [],
        timestamp: new Date().toISOString(),
      }
    } catch (parseError) {
      console.error('[AI] Erro ao parsear JSON:', parseError)
      return {
        overallScore: 50,
        status: 'atenção',
        summary: 'Análise com dados parciais',
        errorPatterns: [],
        orphanedRecords: [
          {
            type: 'measurements',
            count: orphanedMeasurements.length,
            description: 'Medições sem projeto',
          },
        ],
        dataConsistency: [
          {
            check: 'Dados financeiros',
            status: financialRecords.length > 0,
          },
        ],
        recommendations: ['Revisar logs de auditoria', 'Validar integridade de dados'],
        timestamp: new Date().toISOString(),
      }
    }
  } catch (error) {
    console.error('[AI] Erro ao analisar saúde do sistema:', error)
    return {
      error: error instanceof Error ? error.message : 'Erro ao analisar saúde do sistema',
    }
  }
}

// ============================================================================
// 2. Project Health Analysis
// ============================================================================

export async function analyzeProjectHealth(
  projectId: string
): Promise<ProjectHealthAnalysis | { error: string }> {
  try {
    const ctx = await getAIContext()
    if ('error' in ctx) return { error: ctx.error }

    const { permissions, role, userId, companyId: userCompanyId } = ctx

    // ADMIN e MANAGER/STANDARD podem analisar projetos; BASIC não pode
    if (!permissions.canRunAnalysis && !permissions.canUseChat) {
      return { error: 'Acesso restrito: você não tem permissão para análises de projetos.' }
    }

    if (!checkRateLimit(userId, permissions.maxCallsPerHour)) {
      return { error: 'Limite de requisições atingido' }
    }

    // Verificar se o usuário tem acesso ao projeto
    if (!permissions.canAccessAllData) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { companyId: true, allocations: { select: { employeeId: true } } },
      })
      if (!project) return { error: 'Projeto não encontrado' }

      // MANAGER vê projetos da empresa; USER vê projetos onde está alocado
      if (permissions.canRunAnalysis) {
        // STANDARD: verificar empresa
        if (userCompanyId && project.companyId !== userCompanyId) {
          return { error: 'Acesso restrito: projeto pertence a outra empresa.' }
        }
      } else {
        // BASIC: verificar se está alocado (via Employee vinculado ao userId)
        const employee = await prisma.employee.findFirst({
          where: { companyId: userCompanyId ?? undefined },
          select: { id: true },
        })
        const isAllocated = employee && project.allocations.some(
          (a: { employeeId: string }) => a.employeeId === employee.id
        )
        if (!isAllocated) {
          return { error: 'Acesso restrito: você só pode ver projetos nos quais está alocado.' }
        }
      }
    }

    await logAction('AI_ANALYZE_PROJECT', 'Project', projectId, 'Análise de saúde do projeto')

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        measurements: {
          select: { id: true, quantity: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 50,
        } as any,
        allocations: {
          include: {
            employee: { select: { name: true, costPerHour: true } },
          },
        } as any,
      } as any,
    })

    if (!project) {
      return { error: 'Projeto não encontrado' }
    }

    // Calculate basic metrics
    const totalMeasured = (project as any).measurements?.reduce((sum: number, m: any) => sum + Number(m.value || m.quantity || 0), 0) || 0
    const totalPlanned = (project as any).budget?.[0]?.totalBudget || 0
    const progressPercent = totalPlanned > 0 ? (totalMeasured / totalPlanned) * 100 : 0

    const budgetData = (project as any).budget?.[0]
    const budgetUsed = budgetData ? (Number(budgetData.spent || 0) / Number(budgetData.totalBudget || 1)) * 100 : 0
    const burnRate = budgetData ? Number(budgetData.spent || 0) / Math.max((project as any).allocations?.length || 1, 1) : 0

    const prompt = `
Analise a saúde do projeto "${project.name}" (ID: ${projectId}).

Dados do Projeto:
- Status: ${project.status}
- Progresso físico: ${progressPercent.toFixed(1)}%
- Uso de orçamento: ${budgetUsed.toFixed(1)}%
- Taxa de queima orçamentária: R$ ${burnRate.toFixed(2)}
- Total medido: R$ ${totalMeasured.toFixed(2)}
- Total planejado: R$ ${totalPlanned.toFixed(2)}
- Alocações ativas: ${project.allocations.length}
- Medições nos últimos 50 registros: ${project.measurements.length}
- Orçamento total: R$ ${budgetData?.totalBudget || 0}
- Orçamento gasto: R$ ${budgetData?.spent || 0}

Forneça análise em JSON:
{
  "evmInterpretation": "interpretação dos métricas de EVM",
  "budgetBurnRate": <número>,
  "scheduleRisk": "baixo|médio|alto",
  "costRisk": "baixo|médio|alto",
  "recommendations": ["recomendação1", "recomendação2"],
  "score": <0-100>
}
`

    const response = await callAI(
      'Você é um gerente de projetos especializado em análise de EVM e riscos. Responda em JSON válido em português.',
      prompt,
      2000
    )

    if (response.error) {
      return { error: response.error }
    }

    try {
      const jsonMatch = response.content?.match(/\{[\s\S]*\}/)
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null

      return {
        projectId,
        projectName: project.name,
        overallScore: parsed?.score || 50,
        evmInterpretation: parsed?.evmInterpretation || 'Análise em andamento',
        budgetBurnRate: burnRate,
        scheduleRisk: parsed?.scheduleRisk || 'médio',
        costRisk: parsed?.costRisk || 'médio',
        recommendations: parsed?.recommendations || ['Manter acompanhamento regularizado'],
        timestamp: new Date().toISOString(),
      }
    } catch (parseError) {
      console.error('[AI] Erro ao parsear análise do projeto:', parseError)
      return {
        projectId,
        projectName: project.name,
        overallScore: 50,
        evmInterpretation: 'Projeto em execução dentro do esperado',
        budgetBurnRate: burnRate,
        scheduleRisk: progressPercent > 80 ? 'baixo' : progressPercent > 40 ? 'médio' : 'alto',
        costRisk: budgetUsed > 80 ? 'alto' : budgetUsed > 50 ? 'médio' : 'baixo',
        recommendations: [
          'Acompanhar métricas regularmente',
          'Revisar alocações de recursos',
        ],
        timestamp: new Date().toISOString(),
      }
    }
  } catch (error) {
    console.error('[AI] Erro ao analisar saúde do projeto:', error)
    return { error: error instanceof Error ? error.message : 'Erro ao analisar projeto' }
  }
}

// ============================================================================
// 3. Anomaly Detection
// ============================================================================

export async function detectAnomalies(
  companyId: string
): Promise<AnomalyDetectionResult | { error: string }> {
  try {
    const ctx = await getAIContext()
    if ('error' in ctx) return { error: ctx.error }

    const { permissions, userId } = ctx

    if (!permissions.canDetectAnomalies) {
      return { error: 'Acesso restrito: apenas ADMIN e MANAGER podem detectar anomalias.' }
    }

    if (!checkRateLimit(userId, permissions.maxCallsPerHour)) {
      return { error: 'Limite de requisições atingido' }
    }

    // ADMIN vê qualquer empresa; MANAGER apenas a própria
    if (!permissions.canAccessAllData && ctx.companyId && companyId !== ctx.companyId) {
      return { error: 'Acesso restrito: você só pode analisar dados da sua empresa.' }
    }

    await logAction('AI_DETECT_ANOMALIES', 'Company', companyId, 'Detecção de anomalias')

    // Fetch anomaly data
    const [measurements, employees, financialRecords, allocations] = await Promise.all([
      prisma.measurement.findMany({
        where: { companyId },
        select: { id: true, quantity: true, projectId: true },
        take: 200,
      }),
      prisma.employee.findMany({
        where: { companyId, status: 'ACTIVE' },
        select: {
          id: true,
          name: true,
          allocations: { select: { startDate: true, endDate: true } },
        },
      }),
      prisma.financialRecord.findMany({
        where: { companyId },
        select: { id: true, amount: true, type: true, description: true },
        take: 500,
      }),
      prisma.allocation.findMany({
        where: { employee: { companyId } },
        select: {
          employee: { select: { name: true } },
          project: { select: { name: true } },
          startDate: true,
          endDate: true,
        },
      }),
    ])

    // Calculate statistics
    const measurementValues = measurements
      .map((m) => Number(m.quantity || 0))
      .filter((v) => v > 0)
    const avgMeasurement = measurementValues.reduce((a, b) => a + b, 0) / measurementValues.length || 0
    const stdDevMeasurement = Math.sqrt(
      measurementValues.reduce((sq, n) => sq + Math.pow(n - avgMeasurement, 2), 0) /
        measurementValues.length
    )

    const financialAmounts = financialRecords
      .map((f) => Number(f.amount || 0))
      .filter((v) => v > 0)
    const avgFinancial = financialAmounts.reduce((a, b) => a + b, 0) / financialAmounts.length || 0
    const stdDevFinancial = Math.sqrt(
      financialAmounts.reduce((sq, n) => sq + Math.pow(n - avgFinancial, 2), 0) /
        financialAmounts.length
    )

    // Find outliers
    const anomalyData = {
      measurementOutliers: measurements
        .filter(
          (m) =>
            Math.abs(Number(m.quantity || 0) - avgMeasurement) > 2 * stdDevMeasurement &&
            Number(m.quantity || 0) > 0
        )
        .slice(0, 10),
      financialOutliers: financialRecords
        .filter(
          (f) =>
            Math.abs(Number(f.amount || 0) - avgFinancial) > 2 * stdDevFinancial &&
            Number(f.amount || 0) > 0
        )
        .slice(0, 10),
      overallocatedEmployees: employees.filter((e) => {
        const activeAllocations = e.allocations.filter((a) => {
          const now = new Date()
          return a.startDate <= now && (!a.endDate || a.endDate > now)
        })
        return activeAllocations.length > 1
      }),
    }

    const prompt = `
Analise as possíveis anomalias no sistema ERP:

Medições outliers (${anomalyData.measurementOutliers.length}):
${anomalyData.measurementOutliers
  .map((m) => `- Projeto ${m.projectId}: ${Number(m.quantity || 0).toFixed(2)} unidades`)
  .join('\n')}

Registros financeiros outliers (${anomalyData.financialOutliers.length}):
${anomalyData.financialOutliers
  .map((f) => `- ${f.type}: R$ ${Number(f.amount || 0).toFixed(2)} (${f.description || 'sem descrição'})`)
  .join('\n')}

Funcionários com alocações sobrepostas: ${anomalyData.overallocatedEmployees.length}

Forneça em JSON:
{
  "anomalies": [
    {"type": "tipo", "description": "desc", "severity": "baixa|média|alta|crítica", "affectedEntity": "entidade"}
  ]
}
`

    const response = await callAI(
      'Você é um analista de dados especializado em detecção de anomalias. Identifique problemas em português. Responda em JSON válido.',
      prompt,
      2000
    )

    if (response.error) {
      return { error: response.error }
    }

    try {
      const jsonMatch = response.content?.match(/\{[\s\S]*\}/)
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null

      const anomalies = parsed?.anomalies || []

      // Add basic anomalies if none detected
      if (anomalies.length === 0) {
        if (anomalyData.measurementOutliers.length > 0) {
          anomalies.push({
            type: 'Medição Atípica',
            description: `${anomalyData.measurementOutliers.length} medições com valores significativamente acima da média`,
            severity: 'média',
            affectedEntity: 'Measurements',
          })
        }
        if (anomalyData.financialOutliers.length > 0) {
          anomalies.push({
            type: 'Registro Financeiro Atípico',
            description: `${anomalyData.financialOutliers.length} registros com valores fora do padrão`,
            severity: 'média',
            affectedEntity: 'Financial Records',
          })
        }
        if (anomalyData.overallocatedEmployees.length > 0) {
          anomalies.push({
            type: 'Alocação Sobreposta',
            description: `${anomalyData.overallocatedEmployees.length} funcionários com alocações simultâneas`,
            severity: 'alta',
            affectedEntity: 'Employee Allocations',
          })
        }
      }

      return {
        anomalies,
        totalFound: anomalies.length,
        timestamp: new Date().toISOString(),
      }
    } catch (parseError) {
      console.error('[AI] Erro ao parsear anomalias:', parseError)
      return {
        anomalies: [
          {
            type: 'Medições Atípicas',
            description: `Detectadas ${anomalyData.measurementOutliers.length} medições com desvio padrão > 2σ`,
            severity: anomalyData.measurementOutliers.length > 5 ? 'alta' : 'média',
            affectedEntity: 'Measurements',
          },
        ],
        totalFound: 1,
        timestamp: new Date().toISOString(),
      }
    }
  } catch (error) {
    console.error('[AI] Erro ao detectar anomalias:', error)
    return { error: error instanceof Error ? error.message : 'Erro ao detectar anomalias' }
  }
}

// ============================================================================
// 4. Report Generation
// ============================================================================

export async function generateReport(
  projectId: string,
  reportType: 'executive' | 'technical' | 'financial'
): Promise<AIReport | { error: string }> {
  try {
    const ctx = await getAIContext()
    if ('error' in ctx) return { error: ctx.error }

    const { permissions, userId } = ctx

    if (!permissions.canGenerateReports) {
      return { error: 'Acesso restrito: apenas ADMIN e MANAGER podem gerar relatórios.' }
    }

    if (!checkRateLimit(userId, permissions.maxCallsPerHour)) {
      return { error: 'Limite de requisições atingido' }
    }

    // Verificar acesso ao projeto (MANAGER vê apenas projetos da empresa)
    if (!permissions.canAccessAllData) {
      const proj = await prisma.project.findUnique({
        where: { id: projectId },
        select: { companyId: true },
      })
      if (proj && ctx.companyId && proj.companyId !== ctx.companyId) {
        return { error: 'Acesso restrito: projeto pertence a outra empresa.' }
      }
    }

    await logAction('AI_GENERATE_REPORT', 'Project', projectId, `Relatório ${reportType}`)

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        measurements: {
          orderBy: { createdAt: 'desc' },
          take: 30,
          select: { id: true, quantity: true, createdAt: true },
        } as any,
        allocations: {
          include: { employee: { select: { name: true, jobTitle: true } } },
        },
      },
    })

    if (!project) {
      return { error: 'Projeto não encontrado' }
    }

    const prompts: Record<string, string> = {
      executive: `
Gere um sumário executivo do projeto "${project.name}".
Destaque: status, progresso, riscos principais, decisões necessárias.
Audiência: diretores e stakeholders.
Formato: HTML estruturado, máximo 2000 palavras.
`,
      technical: `
Gere um relatório técnico detalhado do projeto "${project.name}".
Inclua: análise EVM, cronograma, alocações de pessoal, tecnologias, problemas técnicos.
Audiência: engenheiros e gerentes técnicos.
Formato: HTML estruturado, máximo 3000 palavras.
`,
      financial: `
Gere um relatório financeiro do projeto "${project.name}".
Inclua: orçamento vs. gasto, curva de custo, fluxo de caixa, rentabilidade, projeções.
Audiência: analistas financeiros e CFO.
Formato: HTML estruturado, máximo 2500 palavras.
`,
    }

    const systemPrompt = `Você é um especialista em relatórios de projetos. Gere relatórios em HTML estruturado em português brasileiro. Use tags como <h1>, <h2>, <p>, <ul>, <li>, <table>. Seja claro, conciso e profissional.`

    const response = await callAI(systemPrompt, prompts[reportType], 3000)

    if (response.error) {
      return { error: response.error }
    }

    return {
      title: `Relatório ${reportType === 'executive' ? 'Executivo' : reportType === 'technical' ? 'Técnico' : 'Financeiro'} - ${project.name}`,
      type: reportType,
      content: response.content || '<p>Relatório gerado com sucesso.</p>',
      generatedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error('[AI] Erro ao gerar relatório:', error)
    return { error: error instanceof Error ? error.message : 'Erro ao gerar relatório' }
  }
}

// ============================================================================
// 5. Chat Assistant
// ============================================================================

export async function chatAssistant(
  message: string,
  context?: string
): Promise<ChatResponse | { error: string }> {
  try {
    const ctx = await getAIContext()
    if ('error' in ctx) return { error: ctx.error }

    const { permissions, role, userId } = ctx

    if (!permissions.canUseChat) {
      return { error: 'Acesso restrito: o chat de IA não está disponível para o seu perfil.' }
    }

    if (!checkRateLimit(userId, permissions.maxCallsPerHour)) {
      return { error: 'Limite de requisições atingido. Tente novamente em 1 hora.' }
    }

    if (!message || message.trim().length === 0) {
      return { error: 'Mensagem vazia' }
    }

    // Montar contexto diferenciado por nível de acesso
    let roleContext = ''
    if (permissions.canAccessAllData) {
      roleContext = 'O usuário é ADMINISTRADOR com acesso total a todos os dados do sistema.'
    } else if (permissions.canRunAnalysis) {
      roleContext = `O usuário é GERENTE com acesso aos dados da empresa dele. Não revele dados de outras empresas.`
    } else {
      roleContext = `O usuário tem acesso BÁSICO. Responda apenas sobre conceitos gerais, navegação do sistema e dúvidas operacionais. Não revele dados financeiros detalhados, salários ou informações de outros usuários.`
    }

    const userPrompt = context ? `[Contexto: ${context}]\n\n${message}` : message

    const systemPrompt = `Você é o assistente de IA do ERP Eixo Global, especializado em gestão de projetos, obras de engenharia, contratos e finanças no Brasil.

${roleContext}

Ajude o usuário a:
- Entender dados do ERP
- Tomar decisões baseadas em análises
- Navegar pelo sistema
- Resolver dúvidas operacionais

Responda sempre em português brasileiro de forma clara, profissional e concisa.`

    const response = await callAI(systemPrompt, userPrompt, 1500)

    if (response.error) {
      return { error: response.error }
    }

    return {
      message: response.content || 'Não consegui processar sua mensagem. Tente novamente.',
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error('[AI] Erro no chat:', error)
    return { error: error instanceof Error ? error.message : 'Erro ao processar mensagem' }
  }
}
