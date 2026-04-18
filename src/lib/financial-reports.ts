import { prisma } from '@/lib/prisma'
import { toNumber } from '@/lib/formatters'

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
  month?: number,
  regime: 'COMPETENCIA' | 'CAIXA' = 'COMPETENCIA'
): Promise<DREReport> {
  const { start: currentStart, end: currentEnd } = getDateRange(year, month)
  const { start: prevStart, end: prevEnd } = getPreviousRange(year, month)
  const { start: ytdStart, end: ytdEnd } = getYTDRange(year, month)

  // A03: Filtros baseados no regime contabil
  const isCaixa = regime === 'CAIXA'
  const dateField = isCaixa ? 'paidDate' : 'dueDate'
  const baseStatusFilter = isCaixa
    ? { status: 'PAID' as const }
    : { status: { not: 'CANCELLED' as const } }

  const buildDateWhere = (start: Date, end: Date) => ({
    companyId,
    ...baseStatusFilter,
    [dateField]: { gte: start, lte: end },
  })

  // Fetch all necessary data in parallel
  const [
    currentRecords,
    prevRecords,
    ytdRecords,
    employees,
    bdiConfig,
    activeEquipments,
    prevPersonnelAgg,
  ] = await Promise.all([
    prisma.financialRecord.findMany({
      where: buildDateWhere(currentStart, currentEnd),
      include: { costCenter: true },
    }),
    prisma.financialRecord.findMany({
      where: buildDateWhere(prevStart, prevEnd),
      include: { costCenter: true },
    }),
    prisma.financialRecord.findMany({
      where: buildDateWhere(ytdStart, ytdEnd),
      include: { costCenter: true },
    }),
    prisma.employee.findMany({
      where: { companyId, status: 'ACTIVE' },
      select: { monthlySalary: true },
    }),
    // A02: Buscar BDI config para tributos reais
    prisma.bDIConfig.findFirst({
      where: { companyId, isDefault: true },
    }),
    // A02: Buscar equipamentos ativos para depreciacao real
    prisma.equipment.findMany({
      where: {
        companyId,
        status: { in: ['AVAILABLE', 'IN_USE', 'RESERVED'] },
      },
      select: {
        acquisitionValue: true,
        depreciationRate: true,
        usefulLifeYears: true,
      },
    }),
    // A02: Buscar despesas de pessoal reais do periodo anterior
    prisma.financialRecord.aggregate({
      where: {
        companyId,
        type: 'EXPENSE',
        ...(isCaixa
          ? { status: 'PAID', paidDate: { gte: prevStart, lte: prevEnd } }
          : { status: { not: 'CANCELLED' }, dueDate: { gte: prevStart, lte: prevEnd } }),
        OR: [
          { category: { contains: 'pessoal', mode: 'insensitive' as const } },
          { category: { contains: 'salario', mode: 'insensitive' as const } },
          { category: { contains: 'folha', mode: 'insensitive' as const } },
          { description: { contains: 'folha', mode: 'insensitive' as const } },
          { description: { contains: 'salário', mode: 'insensitive' as const } },
        ],
      },
      _sum: { amount: true },
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

  // -- Deductions: ISS + PIS + COFINS reais do BDI, ou fallback 10% --
  const taxRate = bdiConfig
    ? (Number(bdiConfig.iss) + Number(bdiConfig.pis) + Number(bdiConfig.cofins)) / 100
    : 0.10 // fallback 10% se nao configurado
  const currentDeductions = currentRevenue * taxRate
  const prevDeductions = prevRevenue * taxRate
  const ytdDeductions = ytdRevenue * taxRate

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
  // A02: Buscar dados reais de pessoal do periodo anterior em vez de 90% estimado
  const prevPersonnelFromRecords = Number(prevPersonnelAgg._sum.amount ?? 0)
  const prevPersonnelExpenses = prevPersonnelFromRecords > 0
    ? prevPersonnelFromRecords
    : currentPersonnelExpenses // fallback: usar valor atual se nao houver registros anteriores
  const ytdPersonnelExpenses = month !== undefined ? monthlyPayroll * month : monthlyPayroll * 12

  const currentTotalOpex = currentAdminExpenses + currentCommercialExpenses + currentPersonnelExpenses
  const prevTotalOpex = prevAdminExpenses + prevCommercialExpenses + prevPersonnelExpenses
  const ytdTotalOpex = ytdAdminExpenses + ytdCommercialExpenses + ytdPersonnelExpenses

  // -- EBITDA --
  const currentEBITDA = currentGrossProfit - currentTotalOpex
  const prevEBITDA = prevGrossProfit - prevTotalOpex
  const ytdEBITDA = ytdGrossProfit - ytdTotalOpex

  // -- Depreciation: calcular a partir dos equipamentos ativos --
  // A02: Depreciar com base no valor de aquisicao e taxa de depreciacao real dos equipamentos
  const annualDepreciation = activeEquipments.reduce((sum, eq) => {
    const acqValue = eq.acquisitionValue ? Number(eq.acquisitionValue) : 0
    if (acqValue <= 0) return sum
    // Usar taxa de depreciacao configurada, ou calcular pela vida util, ou fallback 10% a.a.
    const rate = eq.depreciationRate
      ? Number(eq.depreciationRate) / 100
      : eq.usefulLifeYears && eq.usefulLifeYears > 0
        ? 1 / eq.usefulLifeYears
        : 0.10
    return sum + acqValue * rate
  }, 0)
  const monthlyDepreciation = annualDepreciation / 12
  const hasEquipmentData = activeEquipments.length > 0 && annualDepreciation > 0
  const currentDepreciation = hasEquipmentData
    ? (month !== undefined ? monthlyDepreciation : annualDepreciation)
    : 0 // Sem dados de equipamento = sem estimativa
  const prevDepreciation = currentDepreciation // Usa mesma base (sem historico de equipamentos antigos)
  const ytdDepreciation = hasEquipmentData
    ? (month !== undefined ? monthlyDepreciation * month : annualDepreciation)
    : 0

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

  // -- Taxes: IRPJ + CSLL reais do BDI, ou fallback 15% --
  const profitTaxRate = bdiConfig
    ? (Number(bdiConfig.irpj) + Number(bdiConfig.csll)) / 100
    : 0.15 // fallback 15% se nao configurado
  const currentTaxes = currentLAIR > 0 ? currentLAIR * profitTaxRate : 0
  const prevTaxes = prevLAIR > 0 ? prevLAIR * profitTaxRate : 0
  const ytdTaxes = ytdLAIR > 0 ? ytdLAIR * profitTaxRate : 0

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
      label: bdiConfig ? 'Impostos sobre Lucro (IRPJ + CSLL)' : 'Impostos sobre Lucro (est. 15%)',
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

  // A19: Usar aggregate para saldo bancario em vez de findMany
  const bankBalanceAgg = await prisma.bankAccount.aggregate({
    where: { companyId },
    _sum: { balance: true },
  })
  const currentBalance = Number(bankBalanceAgg._sum.balance ?? 0)

  // Last 6 months of records for trend analysis
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)

  // A19: Usar aggregate para somas historicas em vez de findMany + soma em JS
  const [
    historicalIncomeAgg,
    historicalExpenseAgg,
    activeEmployees,
    pendingPOAgg,
    bulletinAgg,
    activeRentals,
  ] = await Promise.all([
    prisma.financialRecord.aggregate({
      where: {
        companyId,
        type: 'INCOME',
        dueDate: { gte: sixMonthsAgo, lte: now },
        status: { not: 'CANCELLED' },
      },
      _sum: { amount: true },
    }),
    prisma.financialRecord.aggregate({
      where: {
        companyId,
        type: 'EXPENSE',
        dueDate: { gte: sixMonthsAgo, lte: now },
        status: { not: 'CANCELLED' },
      },
      _sum: { amount: true },
    }),
    prisma.employee.findMany({
      where: { companyId, status: 'ACTIVE' },
      select: { monthlySalary: true },
    }),
    // A19: Aggregate para POs pendentes
    prisma.purchaseOrder.aggregate({
      where: {
        companyId,
        status: { in: ['APPROVED', 'ORDERED'] },
      },
      _sum: { totalValue: true },
    }),
    // A19: Aggregate para boletins de medicao aprovados
    prisma.measurementBulletin.aggregate({
      where: {
        project: { companyId },
        status: { in: ['APPROVED', 'MANAGER_APPROVED'] },
      },
      _sum: { totalValue: true },
    }),
    prisma.rental.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
      },
      select: { unitRate: true, billingCycle: true },
    }),
  ])

  // Calculate monthly averages from aggregated totals (6 months)
  const totalHistIncome = Number(historicalIncomeAgg._sum.amount ?? 0)
  const totalHistExpense = Number(historicalExpenseAgg._sum.amount ?? 0)
  const avgIncome = totalHistIncome / 6
  const avgExpense = totalHistExpense / 6

  // Payroll projection
  const monthlyPayroll = activeEmployees.reduce(
    (sum, e) => sum + (e.monthlySalary ? toNumber(e.monthlySalary) : 0),
    0
  )

  // Pending POs total (distribute over 3 months)
  const pendingPOTotal = Number(pendingPOAgg._sum.totalValue ?? 0)
  const monthlyPOBurn = pendingPOTotal / 3

  // Approved bulletins as future income (distribute over 2 months)
  const bulletinIncome = Number(bulletinAgg._sum.totalValue ?? 0)
  const monthlyBulletinIncome = bulletinIncome / 2

  // Rental monthly cost
  const monthlyRentalCost = activeRentals.reduce((sum, r) => {
    const rate = toNumber(r.unitRate)
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

  // A19: Usar groupBy para agregar por costCenter e reduzir transferencia de dados
  const [costCenters, expenseGrouped, incomeGrouped, budgets, topRecords] = await Promise.all([
    prisma.costCenter.findMany({
      where: { companyId, isActive: true },
    }),
    // A19: groupBy para despesas por costCenter
    prisma.financialRecord.groupBy({
      by: ['costCenterId'],
      where: {
        companyId,
        type: 'EXPENSE',
        dueDate: { gte: yearStart, lte: yearEnd },
        status: { not: 'CANCELLED' },
        costCenterId: { not: null },
      },
      _sum: { amount: true },
    }),
    // A19: groupBy para receitas por costCenter
    prisma.financialRecord.groupBy({
      by: ['costCenterId'],
      where: {
        companyId,
        type: 'INCOME',
        dueDate: { gte: yearStart, lte: yearEnd },
        status: { not: 'CANCELLED' },
        costCenterId: { not: null },
      },
      _sum: { amount: true },
    }),
    prisma.costCenterBudget.findMany({
      where: {
        costCenter: { companyId },
        year,
      },
    }),
    // Manter findMany apenas para top transacoes e evolucao mensal (precisa de datas individuais)
    prisma.financialRecord.findMany({
      where: {
        companyId,
        dueDate: { gte: yearStart, lte: yearEnd },
        status: { not: 'CANCELLED' },
        costCenterId: { not: null },
      },
      orderBy: { dueDate: 'desc' },
      select: {
        costCenterId: true,
        description: true,
        amount: true,
        dueDate: true,
      },
    }),
  ])

  // Mapear os groupBy results para lookup rapido
  const expenseMap = new Map<string, number>()
  for (const g of expenseGrouped) {
    if (g.costCenterId) expenseMap.set(g.costCenterId, Number(g._sum.amount ?? 0))
  }
  const incomeMap = new Map<string, number>()
  for (const g of incomeGrouped) {
    if (g.costCenterId) incomeMap.set(g.costCenterId, Number(g._sum.amount ?? 0))
  }

  const items: CostCenterReportItem[] = costCenters.map(cc => {
    const ccBudgets = budgets.filter(b => b.costCenterId === cc.id)

    const budgeted = ccBudgets.reduce((sum, b) => sum + toNumber(b.budgetedAmount), 0)
    // A19: Usar valores pre-agregados do groupBy
    const expenseTotal = expenseMap.get(cc.id) ?? 0
    const incomeTotal = incomeMap.get(cc.id) ?? 0
    const realized = expenseTotal - incomeTotal
    const variance = budgeted - realized
    const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0

    // Monthly evolution (ainda precisa de dados granulares para detalhe mensal)
    const ccTopRecords = topRecords.filter(r => r.costCenterId === cc.id)
    const monthlyEvolution: { month: string; value: number }[] = []
    for (let m = 0; m < 12; m++) {
      const mStart = new Date(year, m, 1)
      const mEnd = new Date(year, m + 1, 0, 23, 59, 59, 999)
      const monthTotal = ccTopRecords
        .filter(r => {
          const d = new Date(r.dueDate)
          return d >= mStart && d <= mEnd
        })
        .reduce((sum, r) => sum + toNumber(r.amount), 0)

      const mLabel = new Date(year, m, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
      monthlyEvolution.push({ month: mLabel, value: monthTotal })
    }

    // Top 5 transactions
    const topTransactions = ccTopRecords
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

  // A19: Usar aggregate em vez de findMany para KPIs
  const [dre, bankBalanceAgg, employees, overdueAgg, overdueFiscalAgg, historicalExpenseAgg] =
    await Promise.all([
      generateDRE(companyId, year, month),
      prisma.bankAccount.aggregate({
        where: { companyId },
        _sum: { balance: true },
      }),
      prisma.employee.findMany({
        where: { companyId, status: 'ACTIVE' },
        select: { monthlySalary: true },
      }),
      prisma.financialRecord.aggregate({
        where: {
          companyId,
          type: 'INCOME',
          status: 'PENDING',
          dueDate: { lt: now },
        },
        _sum: { amount: true },
      }),
      prisma.fiscalNote.aggregate({
        where: {
          companyId,
          status: 'ISSUED',
          dueDate: { lt: now, not: null },
        },
        _sum: { value: true },
      }),
      prisma.financialRecord.aggregate({
        where: {
          companyId,
          type: 'EXPENSE',
          status: { not: 'CANCELLED' },
          dueDate: {
            gte: new Date(now.getFullYear(), now.getMonth() - 6, 1),
            lte: now,
          },
        },
        _sum: { amount: true },
      }),
    ])

  const currentBalance = Number(bankBalanceAgg._sum.balance ?? 0)

  // Burn rate: average monthly expenses over last 6 months
  const totalHistoricalExpenses = Number(historicalExpenseAgg._sum.amount ?? 0)
  const burnRate = totalHistoricalExpenses / 6

  // Cash runway
  const cashRunway = burnRate > 0 ? currentBalance / burnRate : 999

  // Overdue receivables
  const overdueReceivables =
    Number(overdueAgg._sum.amount ?? 0) +
    Number(overdueFiscalAgg._sum.value ?? 0)

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
