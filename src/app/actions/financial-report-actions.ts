'use server'

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  generateDRE,
  generateCashflowProjection,
  generateCostCenterReport,
  getFinancialKPIs,
} from '@/lib/financial-reports'
import type {
  DREReport,
  CashflowProjection,
  CostCenterReport,
  FinancialKPIs,
} from '@/lib/financial-reports'

// ============================================================================
// CONSOLIDATED REPORTS
// ============================================================================

export interface TopProjectByRevenue {
  id: string
  name: string
  status: string
  totalRevenue: number
  totalExpense: number
  profit: number
}

export interface EmployeeHours {
  id: string
  name: string
  jobTitle: string
  totalHours: number
  projectCount: number
}

export interface ExpiringContract {
  id: string
  identifier: string
  projectName: string
  endDate: string
  daysRemaining: number
  value: number
}

export interface LowStockMaterial {
  id: string
  name: string
  code: string
  currentStock: number
  minStock: number
  unit: string
}

export interface ConsolidatedReport {
  // Resumo financeiro do mes
  receitaTotal: number
  despesaTotal: number
  lucro: number
  margemPercent: number
  // Top 5 projetos por faturamento
  topProjects: TopProjectByRevenue[]
  // Funcionarios com mais horas no mes
  topEmployeesByHours: EmployeeHours[]
  // Contratos proximos do vencimento (30 dias)
  expiringContracts: ExpiringContract[]
  // Materiais com estoque baixo
  lowStockMaterials: LowStockMaterial[]
}

export async function getConsolidatedReports(): Promise<{
  success: boolean
  data?: ConsolidatedReport
  error?: string
}> {
  try {
    const session = await getSession()
    if (!session?.user?.companyId) {
      return { success: false, error: 'Sessao invalida' }
    }

    const companyId = session.user.companyId
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const [
      financialByType,
      projectsWithFinancials,
      employeesWithHours,
      expiringContracts,
      lowStockMaterials,
    ] = await Promise.all([
      // 1. Total receitas vs despesas do mes
      prisma.financialRecord.groupBy({
        by: ['type'],
        where: {
          companyId,
          dueDate: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),

      // 2. Top 5 projetos por faturamento (receitas vinculadas a projetos)
      prisma.project.findMany({
        where: { companyId, status: { in: ['IN_PROGRESS', 'PLANNING', 'COMPLETED'] } },
        select: {
          id: true,
          name: true,
          status: true,
          financialRecords: {
            where: {
              dueDate: { gte: startOfMonth, lte: endOfMonth },
            },
            select: {
              amount: true,
              type: true,
            },
          },
        },
      }),

      // 3. Funcionarios com mais horas no mes
      prisma.timeEntry.findMany({
        where: {
          companyId,
          date: { gte: startOfMonth, lte: endOfMonth },
          totalHours: { not: null },
        },
        select: {
          employeeId: true,
          totalHours: true,
          projectId: true,
          employee: {
            select: {
              id: true,
              name: true,
              jobTitle: true,
            },
          },
        },
      }),

      // 4. Contratos proximos do vencimento (30 dias)
      prisma.contract.findMany({
        where: {
          companyId,
          status: 'ACTIVE',
          endDate: {
            gte: now,
            lte: thirtyDaysFromNow,
          },
        },
        select: {
          id: true,
          identifier: true,
          endDate: true,
          value: true,
          project: {
            select: { name: true },
          },
        },
        orderBy: { endDate: 'asc' },
        take: 10,
      }),

      // 5. Materiais com estoque baixo
      prisma.$queryRawUnsafe<Array<{
        id: string
        name: string
        code: string
        currentStock: number
        minStock: number
        unit: string
      }>>(
        `SELECT id, name, code, "currentStock"::float as "currentStock", "minStock"::float as "minStock", unit
         FROM materials
         WHERE "companyId" = $1
           AND "isDeleted" = false
           AND "isActive" = true
           AND "minStock" > 0
           AND "currentStock" <= "minStock"
         ORDER BY ("currentStock" / NULLIF("minStock", 0)) ASC
         LIMIT 10`,
        companyId
      ),
    ])

    // Processar receita/despesa
    const receitaTotal = Number(
      financialByType.find((f) => f.type === 'INCOME')?._sum.amount || 0
    )
    const despesaTotal = Number(
      financialByType.find((f) => f.type === 'EXPENSE')?._sum.amount || 0
    )
    const lucro = receitaTotal - despesaTotal
    const margemPercent = receitaTotal > 0 ? (lucro / receitaTotal) * 100 : 0

    // Processar top projetos
    const topProjects: TopProjectByRevenue[] = projectsWithFinancials
      .map((p) => {
        const totalRevenue = p.financialRecords
          .filter((r) => r.type === 'INCOME')
          .reduce((sum, r) => sum + Number(r.amount), 0)
        const totalExpense = p.financialRecords
          .filter((r) => r.type === 'EXPENSE')
          .reduce((sum, r) => sum + Number(r.amount), 0)
        return {
          id: p.id,
          name: p.name,
          status: p.status,
          totalRevenue,
          totalExpense,
          profit: totalRevenue - totalExpense,
        }
      })
      .filter((p) => p.totalRevenue > 0 || p.totalExpense > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5)

    // Processar funcionarios com mais horas
    const employeeMap = new Map<
      string,
      { name: string; jobTitle: string; totalHours: number; projects: Set<string> }
    >()
    for (const entry of employeesWithHours) {
      const existing = employeeMap.get(entry.employeeId)
      if (existing) {
        existing.totalHours += entry.totalHours || 0
        if (entry.projectId) existing.projects.add(entry.projectId)
      } else {
        const projects = new Set<string>()
        if (entry.projectId) projects.add(entry.projectId)
        employeeMap.set(entry.employeeId, {
          name: entry.employee.name,
          jobTitle: entry.employee.jobTitle,
          totalHours: entry.totalHours || 0,
          projects,
        })
      }
    }
    const topEmployeesByHours: EmployeeHours[] = Array.from(employeeMap.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        jobTitle: data.jobTitle,
        totalHours: Math.round(data.totalHours * 10) / 10,
        projectCount: data.projects.size,
      }))
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 10)

    // Processar contratos vencendo
    const expiringContractsList: ExpiringContract[] = expiringContracts.map((c) => {
      const endDate = c.endDate ? new Date(c.endDate) : now
      const daysRemaining = Math.ceil(
        (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      return {
        id: c.id,
        identifier: c.identifier,
        projectName: c.project.name,
        endDate: endDate.toISOString(),
        daysRemaining,
        value: Number(c.value || 0),
      }
    })

    // Materiais com estoque baixo
    const lowStockList: LowStockMaterial[] = lowStockMaterials.map((m) => ({
      id: m.id,
      name: m.name,
      code: m.code,
      currentStock: Number(m.currentStock),
      minStock: Number(m.minStock),
      unit: m.unit,
    }))

    return {
      success: true,
      data: {
        receitaTotal,
        despesaTotal,
        lucro,
        margemPercent,
        topProjects,
        topEmployeesByHours,
        expiringContracts: expiringContractsList,
        lowStockMaterials: lowStockList,
      },
    }
  } catch (error) {
    console.error('Erro ao gerar relatorio consolidado:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Erro ao gerar relatorio consolidado',
    }
  }
}

export async function getDREReport(
  year: number,
  month?: number
): Promise<{ success: boolean; data?: DREReport; error?: string }> {
  try {
    const session = await getSession()
    if (!session?.user?.companyId) {
      return { success: false, error: 'Sessão inválida' }
    }
    const data = await generateDRE(session.user.companyId, year, month)
    return { success: true, data }
  } catch (error) {
    console.error('Erro ao gerar DRE:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao gerar DRE',
    }
  }
}

export async function getCashflowProjectionData(
  months: number
): Promise<{ success: boolean; data?: CashflowProjection; error?: string }> {
  try {
    const session = await getSession()
    if (!session?.user?.companyId) {
      return { success: false, error: 'Sessão inválida' }
    }
    const data = await generateCashflowProjection(session.user.companyId, months)
    return { success: true, data }
  } catch (error) {
    console.error('Erro ao gerar projeção de fluxo de caixa:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao gerar projeção',
    }
  }
}

export async function getCostCenterReportData(
  year: number
): Promise<{ success: boolean; data?: CostCenterReport; error?: string }> {
  try {
    const session = await getSession()
    if (!session?.user?.companyId) {
      return { success: false, error: 'Sessão inválida' }
    }
    const data = await generateCostCenterReport(session.user.companyId, year)
    return { success: true, data }
  } catch (error) {
    console.error('Erro ao gerar relatório de centros de custo:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao gerar relatório',
    }
  }
}

export async function getFinancialKPIsData(): Promise<{
  success: boolean
  data?: FinancialKPIs
  error?: string
}> {
  try {
    const session = await getSession()
    if (!session?.user?.companyId) {
      return { success: false, error: 'Sessão inválida' }
    }
    const data = await getFinancialKPIs(session.user.companyId)
    return { success: true, data }
  } catch (error) {
    console.error('Erro ao obter KPIs financeiros:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao obter KPIs',
    }
  }
}
