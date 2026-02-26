import { prisma } from '@/lib/prisma'

// ============================================================
// Types
// ============================================================

export interface DRELine {
  id: string
  label: string
  level: number // 0=group, 1=subitem, 2=result
  type: 'revenue' | 'deduction' | 'cost' | 'expense' | 'result' | 'tax'
  currentValue: number
  previousValue: number
  variationPercent: number
  yearToDate: number
  children?: DRELine[]
  isResult?: boolean
}

export interface DREReport {
  year: number
  month?: number
  lines: DRELine[]
  summary: {
    ebitda: number
    ebitdaMargin: number
    netProfit: number
    netMargin: number
  }
}

export interface ProjectedMonth {
  month: string // "2026-03"
  label: string // "Mar/2026"
  projectedInflow: number
  projectedOutflow: number
  projectedBalance: number
  cumulativeBalance: number
  confidence: 'high' | 'medium' | 'low'
}

export interface CashflowAlert {
  month: string
  type: 'negative_balance' | 'high_burn' | 'low_runway'
  message: string
  severity: 'high' | 'medium'
}

export interface CashflowProjection {
  currentBalance: number
  months: ProjectedMonth[]
  alerts: CashflowAlert[]
}

export interface CostCenterReportItem {
  id: string
  code: string
  name: string
  type: string
  budgeted: number
  realized: number
  variance: number
  variancePercent: number
  monthlyEvolution: { month: string; value: number }[]
  topTransactions: { description: string; amount: number; date: string }[]
}

export interface CostCenterReport {
  year: number
  items: CostCenterReportItem[]
  totalBudgeted: number
  totalRealized: number
  totalVariance: number
}

export interface FinancialKPIs {
  ebitda: number
  ebitdaMargin: number
  netMargin: number
  burnRate: number
  cashRunway: number
  projectedBalanceNextMonth: number
  overdueReceivables: number
}

// ============================================================
// Helpers
// ============================================================

function variation(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100
  return ((current - previous) / Math.abs(previous)) * 100
}

function getDateRange(year: number, month?: number): { start: Date; end: Date } {
  if (month !== undefined) {
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59, 999)
    return { start, end }
  }
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31, 23, 59, 59, 999)
  return { start, end }
}

function getPreviousRange(year: number, month?: number): { start: Date; end: Date } {
  if (month !== undefined) {
    // Same month last year
    return getDateRange(year - 1, month)
  }
  return getDateRange(year - 1)
}

function getYTDRange(year: number, month?: number): { start: Date; end: Date } {
  const start = new Date(year, 0, 1)
  const end = month !== undefined
    ? new Date(year, month, 0, 23, 59, 59, 999)
    : new Date(year, 11, 31, 23, 59, 59, 999)
  return { start, end }
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '')
}

const FINANCIAL_KEYWORDS = ['juros', 'financeiro', 'multa', 'tarifa bancária', 'iof', 'taxa bancária']

function isFinancialExpense(category: string | null, description: string): boolean {
  const text = `${category || ''} ${description}`.toLowerCase()
  return FINANCIAL_KEYWORDS.some(k => text.includes(k))
}

// ============================================================
// generateDRE
// ============================================================

export async function generateDRE(
  companyId: string,
  year: number,
  month?: number
): Promise<DREReport> {
  const { start: currentStart, end: currentEnd } = getDateRange(year, month)
  const { start: prevStart, end: prevEnd } = getPreviousRange(year, month)
  const { start: ytdStart, end: ytdEnd } = getYTDRange(year, month)

  // Fetch all necessary data in parallel
  const [currentRecords, prevRecords, ytdRecords, costCenters, employees] = await Promise.all([
    prisma.financialRecord.findMany({
      where: {
        companyId,
        dueDate: { gte: currentStart, lte: currentEnd },
        status: { not: 'CANCELLED' },
      },
      include: { costCenter: true },
    }),
    prisma.financialRecord.findMany({
      where: {
        companyId,
        dueDate: { gte: prevStart, lte: prevEnd },
        status: { not: 'CANCELLED' },
      },
      include: { costCenter: true },
    }),
    prisma.financialRecord.findMany({
      where: {
        companyId,
        dueDate: { gte: ytdStart, lte: ytdEnd },
        status: { not: 'CANCELLED' },
      },
      include: { costCenter: true },
    }),
    prisma.costCenter.findMany({
      where: { companyId, isActive: true },
    }),
    prisma.employee.findMany({
      where: { companyId, status: 'ACTIVE' },
      select: { monthlySalary: true },
    }),
  ])

  type RecordWithCC = typeof currentRecords[number]

  function getAmount(r: RecordWithCC): number {
    if (r.status === 'PAID') {
      const paid = r.paidAmount !== null ? Number(r.paidAmount) : 0
      return paid > 0 ? paid : Number(r.amount)
    }
    return Number(r.amount)
  }

  function sumByType(records: RecordWithCC[], type: 'INCOME' | 'EXPENSE'): number {
    return records
      .filter(r => r.type === type)
      .reduce((sum, r) => sum + getAmount(r), 0)
  }

  function groupByCostCenter(
    records: RecordWithCC[],
    type: 'INCOME' | 'EXPENSE',
    costCenterType?: string
  ): Map<string, { name: string; total: number }> {
    const map = new Map<string, { name: string; total: number }>()
    const filtered = records.filter(r => {
      if (r.type !== type) return false
      if (costCenterType && r.costCenter?.type !== costCenterType) return false
      return true
    })
    for (const r of filtered) {
      const ccName = r.costCenter?.name || 'Sem Centro de Custo'
      const ccId = r.costCenter?.id || 'no-cc'
      const existing = map.get(ccId)
      const amount = getAmount(r)
      if (existing) {
        existing.total += amount
      } else {
        map.set(ccId, { name: ccName, total: amount })
      }
    }
    return map
  }

  // -- Revenue --
  const currentRevenue = sumByType(currentRecords, 'INCOME')
  const prevRevenue = sumByType(prevRecords, 'INCOME')
  const ytdRevenue = sumByType(ytdRecords, 'INCOME')

  const revenueByCC = groupByCostCenter(currentRecords, 'INCOME')
  const revenueChildren: DRELine[] = Array.from(revenueByCC.entries()).map(([id, data]) => ({
    id: `rev-${id}`,
    label: data.name,
    level: 1,
    type: 'revenue' as const,
    currentValue: data.total,
    previousValue: 0,
    variationPercent: 0,
    yearToDate: 0,
  }))

  // -- Deductions (estimate 10% of revenue) --
  const currentDeductions = currentRevenue * 0.10
  const prevDeductions = prevRevenue * 0.10
  const ytdDeductions = ytdRevenue * 0.10

  // -- Net Revenue --
  const currentNetRevenue = currentRevenue - currentDeductions
  const prevNetRevenue = prevRevenue - prevDeductions
  const ytdNetRevenue = ytdRevenue - ytdDeductions

  // -- CSP (direct project expenses) --
  const currentCSP = currentRecords
    .filter(r => r.type === 'EXPENSE' && r.projectId)
    .reduce((sum, r) => sum + getAmount(r), 0)
  const prevCSP = prevRecords
    .filter(r => r.type === 'EXPENSE' && r.projectId)
    .reduce((sum, r) => sum + getAmount(r), 0)
  const ytdCSP = ytdRecords
    .filter(r => r.type === 'EXPENSE' && r.projectId)
    .reduce((sum, r) => sum + getAmount(r), 0)

  // -- Gross Profit --
  const currentGrossProfit = currentNetRevenue - currentCSP
  const prevGrossProfit = prevNetRevenue - prevCSP
  const ytdGrossProfit = ytdNetRevenue - ytdCSP

  // -- Operating Expenses by CostCenter type --
  function opexByType(
    records: RecordWithCC[],
    ccType: string
  ): number {
    return records
      .filter(r => r.type === 'EXPENSE' && !r.projectId && r.costCenter?.type === ccType)
      .reduce((sum, r) => sum + getAmount(r), 0)
  }

  function opexNoCC(records: RecordWithCC[]): number {
    return records
      .filter(r => r.type === 'EXPENSE' && !r.projectId && !r.costCenter)
      .reduce((sum, r) => sum + getAmount(r), 0)
  }

  const currentAdminExpenses = opexByType(currentRecords, 'ADMINISTRATIVE') + opexNoCC(currentRecords)
  const prevAdminExpenses = opexByType(prevRecords, 'ADMINISTRATIVE') + opexNoCC(prevRecords)
  const ytdAdminExpenses = opexByType(ytdRecords, 'ADMINISTRATIVE') + opexNoCC(ytdRecords)

  const currentCommercialExpenses = opexByType(currentRecords, 'COMMERCIAL')
  const prevCommercialExpenses = opexByType(prevRecords, 'COMMERCIAL')
  const ytdCommercialExpenses = opexByType(ytdRecords, 'COMMERCIAL')

  // Personnel: sum of Employee.monthlySalary for active employees
  const monthlyPayroll = employees.reduce(
    (sum, e) => sum + (e.monthlySalary ? Number(e.monthlySalary) : 0),
    0
  )
  const currentPersonnelExpenses = month !== undefined ? monthlyPayroll : monthlyPayroll * 12
  const prevPersonnelExpenses = currentPersonnelExpenses * 0.9 // estimate previous year (10% less)
  const ytdPersonnelExpenses = month !== undefined ? monthlyPayroll * month : monthlyPayroll * 12

  const currentTotalOpex = currentAdminExpenses + currentCommercialExpenses + currentPersonnelExpenses
  const prevTotalOpex = prevAdminExpenses + prevCommercialExpenses + prevPersonnelExpenses
  const ytdTotalOpex = ytdAdminExpenses + ytdCommercialExpenses + ytdPersonnelExpenses

  // -- EBITDA --
  const currentEBITDA = currentGrossProfit - currentTotalOpex
  const prevEBITDA = prevGrossProfit - prevTotalOpex
  const ytdEBITDA = ytdGrossProfit - ytdTotalOpex

  // -- Depreciation (estimate 2% of total expenses) --
  const totalCurrentExpenses = currentCSP + currentTotalOpex
  const totalPrevExpenses = prevCSP + prevTotalOpex
  const totalYtdExpenses = ytdCSP + ytdTotalOpex
  const currentDepreciation = totalCurrentExpenses * 0.02
  const prevDepreciation = totalPrevExpenses * 0.02
  const ytdDepreciation = totalYtdExpenses * 0.02

  // -- EBIT --
  const currentEBIT = currentEBITDA - currentDepreciation
  const prevEBIT = prevEBITDA - prevDepreciation
  const ytdEBIT = ytdEBITDA - ytdDepreciation

  // -- Financial Result --
  function financialResult(records: RecordWithCC[]): number {
    return records
      .filter(r => r.type === 'EXPENSE' && isFinancialExpense(r.category, r.description))
      .reduce((sum, r) => sum + getAmount(r), 0)
  }
  const currentFinancialResult = financialResult(currentRecords)
  const prevFinancialResult = financialResult(prevRecords)
  const ytdFinancialResult = financialResult(ytdRecords)

  // -- LAIR (Lucro Antes do IR) --
  const currentLAIR = currentEBIT - currentFinancialResult
  const prevLAIR = prevEBIT - prevFinancialResult
  const ytdLAIR = ytdEBIT - ytdFinancialResult

  // -- Taxes (estimate 15%) --
  const currentTaxes = currentLAIR > 0 ? currentLAIR * 0.15 : 0
  const prevTaxes = prevLAIR > 0 ? prevLAIR * 0.15 : 0
  const ytdTaxes = ytdLAIR > 0 ? ytdLAIR * 0.15 : 0

  // -- Net Profit --
  const currentNetProfit = currentLAIR - currentTaxes
  const prevNetProfit = prevLAIR - prevTaxes
  const ytdNetProfit = ytdLAIR - ytdTaxes

  // Build DRE lines
  const lines: DRELine[] = [
    {
      id: 'receita-bruta',
      label: 'RECEITA OPERACIONAL BRUTA',
      level: 0,
      type: 'revenue',
      currentValue: currentRevenue,
      previousValue: prevRevenue,
      variationPercent: variation(currentRevenue, prevRevenue),
      yearToDate: ytdRevenue,
      children: revenueChildren,
    },
    {
      id: 'deducoes',
      label: 'Deduções sobre Receita',
      level: 1,
      type: 'deduction',
      currentValue: -currentDeductions,
      previousValue: -prevDeductions,
      variationPercent: variation(currentDeductions, prevDeductions),
      yearToDate: -ytdDeductions,
    },
    {
      id: 'receita-liquida',
      label: 'RECEITA LÍQUIDA',
      level: 0,
      type: 'result',
      currentValue: currentNetRevenue,
      previousValue: prevNetRevenue,
      variationPercent: variation(currentNetRevenue, prevNetRevenue),
      yearToDate: ytdNetRevenue,
      isResult: true,
    },
    {
      id: 'csp',
      label: 'Custo dos Serviços Prestados (CSP)',
      level: 1,
      type: 'cost',
      currentValue: -currentCSP,
      previousValue: -prevCSP,
      variationPercent: variation(currentCSP, prevCSP),
      yearToDate: -ytdCSP,
    },
    {
      id: 'lucro-bruto',
      label: 'LUCRO BRUTO',
      level: 0,
      type: 'result',
      currentValue: currentGrossProfit,
      previousValue: prevGrossProfit,
      variationPercent: variation(currentGrossProfit, prevGrossProfit),
      yearToDate: ytdGrossProfit,
      isResult: true,
    },
    {
      id: 'despesas-admin',
      label: 'Despesas Administrativas',
      level: 1,
      type: 'expense',
      currentValue: -currentAdminExpenses,
      previousValue: -prevAdminExpenses,
      variationPercent: variation(currentAdminExpenses, prevAdminExpenses),
      yearToDate: -ytdAdminExpenses,
    },
    {
      id: 'despesas-comerciais',
      label: 'Despesas Comerciais',
      level: 1,
      type: 'expense',
      currentValue: -currentCommercialExpenses,
      previousValue: -prevCommercialExpenses,
      variationPercent: variation(currentCommercialExpenses, prevCommercialExpenses),
      yearToDate: -ytdCommercialExpenses,
    },
    {
      id: 'despesas-pessoal',
      label: 'Despesas com Pessoal',
      level: 1,
      type: 'expense',
      currentValue: -currentPersonnelExpenses,
      previousValue: -prevPersonnelExpenses,
      variationPercent: variation(currentPersonnelExpenses, prevPersonnelExpenses),
      yearToDate: -ytdPersonnelExpenses,
    },
    {
      id: 'ebitda',
      label: 'EBITDA',
      level: 0,
      type: 'result',
      currentValue: currentEBITDA,
      previousValue: prevEBITDA,
      variationPercent: variation(currentEBITDA, prevEBITDA),
      yearToDate: ytdEBITDA,
      isResult: true,
    },
    {
      id: 'depreciacao',
      label: 'Depreciação e Amortização',
      level: 1,
      type: 'expense',
      currentValue: -currentDepreciation,
      previousValue: -prevDepreciation,
      variationPercent: variation(currentDepreciation, prevDepreciation),
      yearToDate: -ytdDepreciation,
    },
    {
      id: 'ebit',
      label: 'EBIT (Lucro Operacional)',
      level: 0,
      type: 'result',
      currentValue: currentEBIT,
      previousValue: prevEBIT,
      variationPercent: variation(currentEBIT, prevEBIT),
      yearToDate: ytdEBIT,
      isResult: true,
    },
    {
      id: 'resultado-financeiro',
      label: 'Resultado Financeiro',
      level: 1,
      type: 'expense',
      currentValue: -currentFinancialResult,
      previousValue: -prevFinancialResult,
      variationPercent: variation(currentFinancialResult, prevFinancialResult),
      yearToDate: -ytdFinancialResult,
    },
    {
      id: 'lair',
      label: 'LAIR (Lucro Antes do IR)',
      level: 0,
      type: 'result',
      currentValue: currentLAIR,
      previousValue: prevLAIR,
      variationPercent: variation(currentLAIR, prevLAIR),
      yearToDate: ytdLAIR,
      isResult: true,
    },
    {
      id: 'impostos',
      label: 'Impostos sobre Lucro (est. 15%)',
      level: 1,
      type: 'tax',
      currentValue: -currentTaxes,
      previousValue: -prevTaxes,
      variationPercent: variation(currentTaxes, prevTaxes),
      yearToDate: -ytdTaxes,
    },
    {
      id: 'lucro-liquido',
      label: 'LUCRO LÍQUIDO',
      level: 0,
      type: 'result',
      currentValue: currentNetProfit,
      previousValue: prevNetProfit,
      variationPercent: variation(currentNetProfit, prevNetProfit),
      yearToDate: ytdNetProfit,
      isResult: true,
    },
  ]

  const ebitdaMargin = currentRevenue > 0 ? (currentEBITDA / currentRevenue) * 100 : 0
  const netMargin = currentRevenue > 0 ? (currentNetProfit / currentRevenue) * 100 : 0

  return {
    year,
    month,
    lines,
    summary: {
      ebitda: currentEBITDA,
      ebitdaMargin,
      netProfit: currentNetProfit,
      netMargin,
    },
  }
}

// ============================================================
// generateCashflowProjection
// ============================================================

export async function generateCashflowProjection(
  companyId: string,
  months: number
): Promise<CashflowProjection> {
  const now = new Date()

  // Fetch bank account balances
  const bankAccounts = await prisma.bankAccount.findMany({
    where: { companyId },
    select: { balance: true },
  })
  const currentBalance = bankAccounts.reduce((sum, ba) => sum + Number(ba.balance), 0)

  // Last 6 months of records for trend analysis
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)
  const [historicalRecords, activeEmployees, pendingPOs, activeBulletins, activeRentals, activeContracts] =
    await Promise.all([
      prisma.financialRecord.findMany({
        where: {
          companyId,
          dueDate: { gte: sixMonthsAgo, lte: now },
          status: { not: 'CANCELLED' },
        },
      }),
      prisma.employee.findMany({
        where: { companyId, status: 'ACTIVE' },
        select: { monthlySalary: true },
      }),
      prisma.purchaseOrder.findMany({
        where: {
          companyId,
          status: { in: ['APPROVED', 'ORDERED'] },
        },
        select: { totalValue: true },
      }),
      prisma.measurementBulletin.findMany({
        where: {
          project: { companyId },
          status: { in: ['APPROVED', 'BILLED'] },
        },
        select: { totalValue: true, status: true },
      }),
      prisma.rental.findMany({
        where: {
          companyId,
          status: 'ACTIVE',
        },
        select: { unitRate: true, billingCycle: true },
      }),
      prisma.contract.findMany({
        where: {
          companyId,
          status: 'ACTIVE',
        },
        select: { value: true },
      }),
    ])

  // Calculate monthly averages from historical records
  const monthlyIncome: number[] = []
  const monthlyExpense: number[] = []

  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)

    const mIncome = historicalRecords
      .filter(r => r.type === 'INCOME' && new Date(r.dueDate) >= mStart && new Date(r.dueDate) <= mEnd)
      .reduce((sum, r) => sum + Number(r.amount), 0)
    const mExpense = historicalRecords
      .filter(r => r.type === 'EXPENSE' && new Date(r.dueDate) >= mStart && new Date(r.dueDate) <= mEnd)
      .reduce((sum, r) => sum + Number(r.amount), 0)

    monthlyIncome.push(mIncome)
    monthlyExpense.push(mExpense)
  }

  const avgIncome = monthlyIncome.length > 0
    ? monthlyIncome.reduce((a, b) => a + b, 0) / monthlyIncome.length
    : 0
  const avgExpense = monthlyExpense.length > 0
    ? monthlyExpense.reduce((a, b) => a + b, 0) / monthlyExpense.length
    : 0

  // Payroll projection
  const monthlyPayroll = activeEmployees.reduce(
    (sum, e) => sum + (e.monthlySalary ? Number(e.monthlySalary) : 0),
    0
  )

  // Pending POs total (distribute over 3 months)
  const pendingPOTotal = pendingPOs.reduce((sum, po) => sum + po.totalValue, 0)
  const monthlyPOBurn = pendingPOTotal / 3

  // Approved bulletins as future income (distribute over 2 months)
  const bulletinIncome = activeBulletins
    .filter(b => b.status === 'APPROVED' || b.status === 'BILLED')
    .reduce((sum, b) => sum + Number(b.totalValue), 0)
  const monthlyBulletinIncome = bulletinIncome / 2

  // Rental monthly cost
  const monthlyRentalCost = activeRentals.reduce((sum, r) => {
    const rate = Number(r.unitRate)
    if (r.billingCycle === 'DAILY') return sum + rate * 30
    if (r.billingCycle === 'WEEKLY') return sum + rate * 4.3
    return sum + rate // MONTHLY
  }, 0)

  // Build projection months
  const projectedMonths: ProjectedMonth[] = []
  let cumBalance = currentBalance

  for (let i = 1; i <= months; i++) {
    const projDate = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const mKey = `${projDate.getFullYear()}-${String(projDate.getMonth() + 1).padStart(2, '0')}`
    const mLabel = projDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '')

    // Determine confidence level
    let confidence: 'high' | 'medium' | 'low'
    if (i <= 2) confidence = 'high'
    else if (i <= 6) confidence = 'medium'
    else confidence = 'low'

    // Inflows: bulletins (first 2 months) + trend
    let inflow = avgIncome
    if (i <= 2) {
      inflow += monthlyBulletinIncome
    }

    // Outflows: payroll + rentals + POs (first 3 months) + trend of other expenses
    let outflow = monthlyPayroll + monthlyRentalCost
    if (i <= 3) {
      outflow += monthlyPOBurn
    }
    // Add remaining average expenses beyond payroll
    const otherExpenses = Math.max(0, avgExpense - monthlyPayroll - monthlyRentalCost)
    outflow += otherExpenses

    const monthBalance = inflow - outflow
    cumBalance += monthBalance

    projectedMonths.push({
      month: mKey,
      label: mLabel,
      projectedInflow: Math.round(inflow * 100) / 100,
      projectedOutflow: Math.round(outflow * 100) / 100,
      projectedBalance: Math.round(monthBalance * 100) / 100,
      cumulativeBalance: Math.round(cumBalance * 100) / 100,
      confidence,
    })
  }

  // Generate alerts
  const alerts: CashflowAlert[] = []

  for (const pm of projectedMonths) {
    if (pm.cumulativeBalance < 0) {
      alerts.push({
        month: pm.month,
        type: 'negative_balance',
        message: `Saldo projetado negativo em ${pm.label}: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pm.cumulativeBalance)}`,
        severity: 'high',
      })
    }
  }

  // Burn rate alert
  const burnRate = avgExpense
  if (burnRate > 0 && currentBalance > 0) {
    const runway = currentBalance / burnRate
    if (runway < 3) {
      alerts.push({
        month: projectedMonths[0]?.month || '',
        type: 'low_runway',
        message: `Runway atual de apenas ${runway.toFixed(1)} meses com burn rate de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(burnRate)}/mês`,
        severity: runway < 1.5 ? 'high' : 'medium',
      })
    }
  }

  // High burn alert
  if (months >= 2 && projectedMonths.length >= 2) {
    const firstMonth = projectedMonths[0]!
    const secondMonth = projectedMonths[1]!
    if (secondMonth.projectedOutflow > firstMonth.projectedOutflow * 1.3) {
      alerts.push({
        month: secondMonth.month,
        type: 'high_burn',
        message: `Aumento de 30%+ nas saídas projetadas entre ${firstMonth.label} e ${secondMonth.label}`,
        severity: 'medium',
      })
    }
  }

  return {
    currentBalance: Math.round(currentBalance * 100) / 100,
    months: projectedMonths,
    alerts,
  }
}

// ============================================================
// generateCostCenterReport
// ============================================================

export async function generateCostCenterReport(
  companyId: string,
  year: number
): Promise<CostCenterReport> {
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999)

  const [costCenters, records, budgets] = await Promise.all([
    prisma.costCenter.findMany({
      where: { companyId, isActive: true },
    }),
    prisma.financialRecord.findMany({
      where: {
        companyId,
        dueDate: { gte: yearStart, lte: yearEnd },
        status: { not: 'CANCELLED' },
        costCenterId: { not: null },
      },
      orderBy: { dueDate: 'desc' },
    }),
    prisma.costCenterBudget.findMany({
      where: {
        costCenter: { companyId },
        year,
      },
    }),
  ])

  const items: CostCenterReportItem[] = costCenters.map(cc => {
    const ccRecords = records.filter(r => r.costCenterId === cc.id)
    const ccBudgets = budgets.filter(b => b.costCenterId === cc.id)

    const budgeted = ccBudgets.reduce((sum, b) => sum + b.budgetedAmount, 0)
    const realized = ccRecords.reduce((sum, r) => {
      const amount = Number(r.amount)
      return sum + (r.type === 'EXPENSE' ? amount : -amount)
    }, 0)
    const variance = budgeted - realized
    const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0

    // Monthly evolution
    const monthlyEvolution: { month: string; value: number }[] = []
    for (let m = 0; m < 12; m++) {
      const mStart = new Date(year, m, 1)
      const mEnd = new Date(year, m + 1, 0, 23, 59, 59, 999)
      const monthTotal = ccRecords
        .filter(r => {
          const d = new Date(r.dueDate)
          return d >= mStart && d <= mEnd
        })
        .reduce((sum, r) => sum + Number(r.amount), 0)

      const mLabel = new Date(year, m, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
      monthlyEvolution.push({ month: mLabel, value: monthTotal })
    }

    // Top 5 transactions
    const topTransactions = ccRecords
      .slice(0, 5)
      .map(r => ({
        description: r.description,
        amount: Number(r.amount),
        date: new Date(r.dueDate).toLocaleDateString('pt-BR'),
      }))

    return {
      id: cc.id,
      code: cc.code,
      name: cc.name,
      type: cc.type,
      budgeted,
      realized,
      variance,
      variancePercent,
      monthlyEvolution,
      topTransactions,
    }
  })

  const totalBudgeted = items.reduce((sum, i) => sum + i.budgeted, 0)
  const totalRealized = items.reduce((sum, i) => sum + i.realized, 0)

  return {
    year,
    items,
    totalBudgeted,
    totalRealized,
    totalVariance: totalBudgeted - totalRealized,
  }
}

// ============================================================
// getFinancialKPIs
// ============================================================

export async function getFinancialKPIs(companyId: string): Promise<FinancialKPIs> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  // Run DRE for current month and get cash flow data
  const [dre, bankAccounts, employees, overdueRecords, overdueFiscalNotes, historicalRecords] =
    await Promise.all([
      generateDRE(companyId, year, month),
      prisma.bankAccount.findMany({
        where: { companyId },
        select: { balance: true },
      }),
      prisma.employee.findMany({
        where: { companyId, status: 'ACTIVE' },
        select: { monthlySalary: true },
      }),
      prisma.financialRecord.findMany({
        where: {
          companyId,
          type: 'INCOME',
          status: 'PENDING',
          dueDate: { lt: now },
        },
        select: { amount: true },
      }),
      prisma.fiscalNote.findMany({
        where: {
          companyId,
          status: 'ISSUED',
          dueDate: { lt: now, not: null },
        },
        select: { value: true },
      }),
      prisma.financialRecord.findMany({
        where: {
          companyId,
          type: 'EXPENSE',
          status: { not: 'CANCELLED' },
          dueDate: {
            gte: new Date(now.getFullYear(), now.getMonth() - 6, 1),
            lte: now,
          },
        },
        select: { amount: true },
      }),
    ])

  const currentBalance = bankAccounts.reduce((sum, ba) => sum + Number(ba.balance), 0)

  // Burn rate: average monthly expenses over last 6 months
  const totalHistoricalExpenses = historicalRecords.reduce((sum, r) => sum + Number(r.amount), 0)
  const burnRate = totalHistoricalExpenses / 6

  // Cash runway
  const cashRunway = burnRate > 0 ? currentBalance / burnRate : 999

  // Overdue receivables
  const overdueReceivables =
    overdueRecords.reduce((sum, r) => sum + Number(r.amount), 0) +
    overdueFiscalNotes.reduce((sum, n) => sum + Number(n.value), 0)

  // Simple next month projection
  const monthlyPayroll = employees.reduce(
    (sum, e) => sum + (e.monthlySalary ? Number(e.monthlySalary) : 0),
    0
  )
  const projectedBalanceNextMonth = currentBalance + (dre.summary.ebitda > 0 ? dre.summary.ebitda : -burnRate)

  return {
    ebitda: dre.summary.ebitda,
    ebitdaMargin: dre.summary.ebitdaMargin,
    netMargin: dre.summary.netMargin,
    burnRate: Math.round(burnRate * 100) / 100,
    cashRunway: Math.round(cashRunway * 10) / 10,
    projectedBalanceNextMonth: Math.round(projectedBalanceNextMonth * 100) / 100,
    overdueReceivables: Math.round(overdueReceivables * 100) / 100,
  }
}
