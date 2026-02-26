import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { prisma } from '@/lib/prisma'
import {
  ReportDocument,
  ExecutiveReportContent,
  ProjectReportContent,
  FinancialReportContent,
  HRReportContent,
  formatDate,
  formatCurrency,
} from '@/components/pdf/ReportTemplate'
import type {
  ExecutiveKPIs,
  ProjectSummary,
  FinancialSummaryItem,
  ProjectDetail,
  ContractSummary,
  MeasurementSummary,
  FinancialRecordItem,
  FinancialReportSummary,
  EmployeeSummaryItem,
  AllocationSummaryItem,
  VacationSummaryItem,
} from '@/components/pdf/ReportTemplate'

// ────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'object' && 'toNumber' in (value as any)) {
    return (value as any).toNumber()
  }
  return Number(value) || 0
}

function getMonthLabel(date: Date): string {
  const months = [
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]
  return `${months[date.getMonth()]}/${date.getFullYear()}`
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// ────────────────────────────────────────────────────────
// 1. Relatorio Executivo
// ────────────────────────────────────────────────────────

export async function generateExecutiveReport(
  companyId: string,
  period: { start: Date; end: Date },
  userName: string
): Promise<Buffer> {
  try {
    // Buscar dados em paralelo
    const [projects, contracts, financialRecords, employees, measurements] =
      await Promise.all([
        prisma.project.findMany({
          where: {
            companyId,
            createdAt: { gte: period.start, lte: period.end },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.contract.findMany({
          where: {
            companyId,
            createdAt: { gte: period.start, lte: period.end },
          },
        }),
        prisma.financialRecord.findMany({
          where: {
            companyId,
            dueDate: { gte: period.start, lte: period.end },
          },
        }),
        prisma.employee.findMany({
          where: { companyId },
        }),
        prisma.measurement.findMany({
          where: {
            project: { companyId },
            date: { gte: period.start, lte: period.end },
          },
        }),
      ])

    // Calcular KPIs
    const totalRevenue = financialRecords
      .filter((r) => r.type === 'INCOME')
      .reduce((sum, r) => sum + toNumber(r.amount), 0)

    const totalExpenses = financialRecords
      .filter((r) => r.type === 'EXPENSE')
      .reduce((sum, r) => sum + toNumber(r.amount), 0)

    const activeProjects = projects.filter(
      (p) => p.status === 'IN_PROGRESS' || p.status === 'PLANNING'
    ).length

    const approvedMeasurements = measurements.filter(
      (m) => m.status === 'APPROVED'
    ).length

    const pendingPayments = financialRecords.filter(
      (r) => r.status === 'PENDING'
    ).length

    const kpis: ExecutiveKPIs = {
      totalRevenue,
      totalExpenses,
      balance: totalRevenue - totalExpenses,
      activeProjects,
      totalContracts: contracts.length,
      totalEmployees: employees.filter((e) => e.status === 'ACTIVE').length,
      approvedMeasurements,
      pendingPayments,
    }

    // Projetos resumo
    const projectSummaries: ProjectSummary[] = projects.slice(0, 20).map((p) => ({
      name: p.name,
      status: p.status,
      budget: toNumber(p.budget),
      progress: 0, // Calculado se houver tasks
    }))

    // Agrupamento financeiro mensal
    const monthlyMap = new Map<string, { income: number; expense: number }>()

    financialRecords.forEach((r) => {
      const key = getMonthKey(r.dueDate)
      const existing = monthlyMap.get(key) || { income: 0, expense: 0 }
      if (r.type === 'INCOME') {
        existing.income += toNumber(r.amount)
      } else if (r.type === 'EXPENSE') {
        existing.expense += toNumber(r.amount)
      }
      monthlyMap.set(key, existing)
    })

    const financialSummary: FinancialSummaryItem[] = Array.from(
      monthlyMap.entries()
    )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => {
        const [year, month] = key.split('-')
        const date = new Date(Number(year), Number(month) - 1)
        return {
          month: getMonthLabel(date),
          income: data.income,
          expense: data.expense,
          balance: data.income - data.expense,
        }
      })

    // Gerar PDF
    const doc = React.createElement(
      ReportDocument,
      {
        title: 'Relatorio Executivo',
        subtitle: 'Visao geral do periodo',
        period,
        userName,
      },
      React.createElement(ExecutiveReportContent, {
        kpis,
        projects: projectSummaries,
        financialSummary,
      })
    )

    const buffer = await renderToBuffer(doc as any)
    return Buffer.from(buffer)
  } catch (error) {
    console.error('Erro ao gerar relatorio executivo:', error)
    throw new Error('Falha ao gerar relatorio executivo. Tente novamente.')
  }
}

// ────────────────────────────────────────────────────────
// 2. Relatorio de Projeto
// ────────────────────────────────────────────────────────

export async function generateProjectReport(
  projectId: string,
  userName: string
): Promise<Buffer> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: true,
        contracts: {
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        },
        measurements: {
          include: {
            employee: true,
            contractItem: true,
          },
          orderBy: { date: 'desc' },
          take: 50,
        },
      },
    })

    if (!project) {
      throw new Error('Projeto nao encontrado.')
    }

    const projectDetail: ProjectDetail = {
      name: project.name,
      code: project.code || undefined,
      description: project.description || undefined,
      location: project.location || undefined,
      status: project.status,
      startDate: formatDate(project.startDate),
      endDate: project.endDate ? formatDate(project.endDate) : undefined,
      budget: toNumber(project.budget),
      clientName: project.client?.displayName || undefined,
    }

    const contractSummaries: ContractSummary[] = project.contracts.map((c) => ({
      identifier: c.identifier,
      description: c.description || undefined,
      value: toNumber(c.value),
      status: c.status,
      startDate: formatDate(c.startDate),
      endDate: c.endDate ? formatDate(c.endDate) : undefined,
    }))

    const measurementSummaries: MeasurementSummary[] = project.measurements.map(
      (m) => ({
        date: formatDate(m.date),
        description: m.description || undefined,
        quantity: toNumber(m.quantity),
        unit: m.contractItem?.unit || '-',
        status: m.status,
        employeeName: m.employee?.name || undefined,
      })
    )

    const period = {
      start: project.startDate,
      end: project.endDate || new Date(),
    }

    const doc = React.createElement(
      ReportDocument,
      {
        title: `Relatorio do Projeto`,
        subtitle: project.name,
        period,
        userName,
      },
      React.createElement(ProjectReportContent, {
        project: projectDetail,
        contracts: contractSummaries,
        measurements: measurementSummaries,
      })
    )

    const buffer = await renderToBuffer(doc as any)
    return Buffer.from(buffer)
  } catch (error) {
    console.error('Erro ao gerar relatorio do projeto:', error)
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Falha ao gerar relatorio do projeto.'
    )
  }
}

// ────────────────────────────────────────────────────────
// 3. Relatorio Financeiro
// ────────────────────────────────────────────────────────

export async function generateFinancialReport(
  companyId: string,
  period: { start: Date; end: Date },
  userName: string
): Promise<Buffer> {
  try {
    const financialRecords = await prisma.financialRecord.findMany({
      where: {
        companyId,
        dueDate: { gte: period.start, lte: period.end },
      },
      orderBy: { dueDate: 'desc' },
    })

    // Mapear registros
    const records: FinancialRecordItem[] = financialRecords.map((r) => ({
      date: formatDate(r.dueDate),
      description: r.description,
      type: r.type as 'INCOME' | 'EXPENSE' | 'TRANSFER',
      amount: toNumber(r.amount),
      status: r.status,
      category: r.category || undefined,
    }))

    // Calcular totais
    const totalIncome = financialRecords
      .filter((r) => r.type === 'INCOME')
      .reduce((sum, r) => sum + toNumber(r.amount), 0)

    const totalExpense = financialRecords
      .filter((r) => r.type === 'EXPENSE')
      .reduce((sum, r) => sum + toNumber(r.amount), 0)

    const paidCount = financialRecords.filter((r) => r.status === 'PAID').length
    const pendingCount = financialRecords.filter(
      (r) => r.status === 'PENDING'
    ).length

    // Agrupamento mensal
    const monthlyMap = new Map<string, { income: number; expense: number }>()

    financialRecords.forEach((r) => {
      const key = getMonthKey(r.dueDate)
      const existing = monthlyMap.get(key) || { income: 0, expense: 0 }
      if (r.type === 'INCOME') {
        existing.income += toNumber(r.amount)
      } else if (r.type === 'EXPENSE') {
        existing.expense += toNumber(r.amount)
      }
      monthlyMap.set(key, existing)
    })

    const monthlyBreakdown: FinancialSummaryItem[] = Array.from(
      monthlyMap.entries()
    )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => {
        const [year, month] = key.split('-')
        const date = new Date(Number(year), Number(month) - 1)
        return {
          month: getMonthLabel(date),
          income: data.income,
          expense: data.expense,
          balance: data.income - data.expense,
        }
      })

    const summary: FinancialReportSummary = {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      paidCount,
      pendingCount,
      monthlyBreakdown,
    }

    const doc = React.createElement(
      ReportDocument,
      {
        title: 'Relatorio Financeiro',
        subtitle: 'Movimentacoes do periodo',
        period,
        userName,
      },
      React.createElement(FinancialReportContent, {
        records,
        summary,
      })
    )

    const buffer = await renderToBuffer(doc as any)
    return Buffer.from(buffer)
  } catch (error) {
    console.error('Erro ao gerar relatorio financeiro:', error)
    throw new Error('Falha ao gerar relatorio financeiro. Tente novamente.')
  }
}

// ────────────────────────────────────────────────────────
// 4. Relatorio de RH
// ────────────────────────────────────────────────────────

export async function generateHRReport(
  companyId: string,
  period: { start: Date; end: Date },
  userName: string
): Promise<Buffer> {
  try {
    const [employees, allocations, vacationRequests, trainings] =
      await Promise.all([
        prisma.employee.findMany({
          where: { companyId },
          orderBy: { name: 'asc' },
        }),
        prisma.allocation.findMany({
          where: {
            employee: { companyId },
            startDate: { lte: period.end },
            OR: [
              { endDate: null },
              { endDate: { gte: period.start } },
            ],
          },
          include: {
            employee: true,
            project: true,
          },
          orderBy: { startDate: 'desc' },
        }),
        prisma.vacationRequest.findMany({
          where: {
            employee: { companyId },
            startDate: { lte: period.end },
            endDate: { gte: period.start },
          },
          include: { employee: true },
          orderBy: { startDate: 'desc' },
        }),
        prisma.training.findMany({
          where: {
            companyId,
            startDate: { gte: period.start, lte: period.end },
          },
          include: {
            participants: {
              include: { employee: true },
            },
          },
          orderBy: { startDate: 'desc' },
        }),
      ])

    const employeeSummaries: EmployeeSummaryItem[] = employees.map((e) => ({
      name: e.name,
      jobTitle: e.jobTitle,
      department: e.department || undefined,
      status: e.status,
      admissionDate: e.admissionDate
        ? formatDate(e.admissionDate)
        : undefined,
    }))

    const allocationSummaries: AllocationSummaryItem[] = allocations.map(
      (a) => ({
        employeeName: a.employee.name,
        projectName: a.project.name,
        startDate: formatDate(a.startDate),
        endDate: a.endDate ? formatDate(a.endDate) : undefined,
      })
    )

    const vacationSummaries: VacationSummaryItem[] = vacationRequests.map(
      (v) => ({
        employeeName: v.employee.name,
        type: v.type,
        startDate: formatDate(v.startDate),
        endDate: formatDate(v.endDate),
        days: v.days,
        status: v.status,
      })
    )

    const doc = React.createElement(
      ReportDocument,
      {
        title: 'Relatorio de Recursos Humanos',
        subtitle: `${employees.length} colaboradores | Periodo analisado`,
        period,
        userName,
      },
      React.createElement(HRReportContent, {
        employees: employeeSummaries,
        allocations: allocationSummaries,
        vacations: vacationSummaries,
      })
    )

    const buffer = await renderToBuffer(doc as any)
    return Buffer.from(buffer)
  } catch (error) {
    console.error('Erro ao gerar relatorio de RH:', error)
    throw new Error('Falha ao gerar relatorio de RH. Tente novamente.')
  }
}
