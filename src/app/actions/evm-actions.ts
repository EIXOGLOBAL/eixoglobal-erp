'use server'

import { prisma } from '@/lib/prisma'
import { assertAuthenticated } from '@/lib/auth-helpers'
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'evm' })

// ============================================================================
// Types
// ============================================================================

export interface EVMMetrics {
  pv: number
  ev: number
  ac: number
  sv: number | null
  cv: number | null
  spi: number | null
  cpi: number | null
  eac: number | null
  etc: number | null
  vac: number | null
  /** true when both EV and AC come from real data (bulletins + financial records) */
  hasRealData: boolean
  /** true when EV=0 or AC=0, meaning indicators cannot be reliably calculated */
  dataInsufficient: boolean
}

export interface EVMProjectData extends EVMMetrics {
  id: string
  name: string
  status: string
  budget: number
  progressPercent: number
  timeProgressPercent: number
  startDate?: Date
}

export interface EVMPortfolioSummary {
  totalPV: number
  totalEV: number
  totalAC: number
  totalBudget: number
  portfolioSPI: number | null
  portfolioCPI: number | null
  avgProgressPercent: number
  projectCount: number
  healthStatus: 'green' | 'yellow' | 'red' | 'unknown'
}

export interface MonthlySCurveData {
  month: string
  pv: number
  ev: number
  ac: number
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate EVM metrics for a project based on contract value and bulletins.
 * NEVER fabricates data — when real data is absent, returns null for derived indicators.
 */
function calculateEVMMetrics(
  budget: number,
  startDate: Date,
  endDate: Date | null,
  approvedBulletinValue: number,
  actualCostValue: number,
  now: Date = new Date()
): EVMMetrics {
  const finalEndDate = endDate || new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)

  // Calculate time-based Planned Value
  const totalDuration = finalEndDate.getTime() - startDate.getTime()
  const elapsed = Math.min(now.getTime() - startDate.getTime(), totalDuration)
  const timeProgressPercent = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0
  const pv = budget * (timeProgressPercent / 100)

  // Earned Value from approved bulletins — REAL data only, no fabrication
  const ev = approvedBulletinValue > 0 ? approvedBulletinValue : 0

  // Actual Cost from financial records — REAL data only, no fabrication
  const ac = actualCostValue > 0 ? actualCostValue : 0

  // Determine data sufficiency
  const hasEV = ev > 0
  const hasAC = ac > 0
  const dataInsufficient = !hasEV || !hasAC
  const hasRealData = hasEV && hasAC

  // Schedule Variance: only meaningful when EV has real data
  const sv = hasEV ? ev - pv : null

  // Cost Variance: only meaningful when both EV and AC have real data
  const cv = hasRealData ? ev - ac : null

  // Schedule Performance Index: protect division by zero
  const spi = hasEV && pv > 0 ? ev / pv : null

  // Cost Performance Index: protect division by zero
  const cpi = hasRealData && ac > 0 ? ev / ac : null

  // Estimate At Completion: requires valid CPI
  const eac = cpi !== null && cpi > 0 ? Number((budget / cpi).toFixed(2)) : null

  // Estimate To Complete: requires valid EAC
  const etc = eac !== null ? Number(Math.max(0, eac - ac).toFixed(2)) : null

  // Variance At Completion: requires valid EAC
  const vac = eac !== null ? Number((budget - eac).toFixed(2)) : null

  return {
    pv,
    ev,
    ac,
    sv,
    cv,
    spi,
    cpi,
    eac,
    etc,
    vac,
    hasRealData,
    dataInsufficient,
  }
}

/**
 * Get health status based on SPI and CPI.
 * Returns 'unknown' when data is insufficient (null indicators).
 */
function getHealthStatus(spi: number | null, cpi: number | null): 'green' | 'yellow' | 'red' | 'unknown' {
  if (spi === null || cpi === null) {
    return 'unknown'
  }
  if (spi >= 0.95 && cpi >= 0.95) {
    return 'green'
  } else if (spi >= 0.85 && cpi >= 0.85) {
    return 'yellow'
  }
  return 'red'
}

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Get EVM data for a specific project
 */
export async function getProjectEVMData(projectId: string): Promise<EVMProjectData | null> {
  try {
    const session = await assertAuthenticated()
    const project = await prisma.project.findFirst({
      where: { id: projectId, ...(session.user.companyId ? { companyId: session.user.companyId } : {}) },
      select: {
        id: true,
        name: true,
        status: true,
        budget: true,
        startDate: true,
        endDate: true,
        contracts: {
          select: {
            value: true,
          },
        },
        bulletins: {
          where: { status: 'APPROVED' },
          select: { totalValue: true },
        },
        financialRecords: {
          where: { type: 'EXPENSE', status: 'PAID' },
          select: { paidAmount: true },
        },
      },
    })

    if (!project) return null

    const now = new Date()
    const budget = Number(project.budget || 0) ||
                   project.contracts.reduce((sum, c) => sum + Number(c.value || 0), 0)

    const approvedBulletinValue = project.bulletins.reduce(
      (sum, b) => sum + Number(b.totalValue || 0),
      0
    )

    const actualCostValue = project.financialRecords.reduce(
      (sum, f) => sum + Number(f.paidAmount || 0),
      0
    )

    // Calculate time progress
    const startDate = project.startDate || now
    const endDate = project.endDate || new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
    const totalDuration = endDate.getTime() - startDate.getTime()
    const elapsed = Math.min(now.getTime() - startDate.getTime(), totalDuration)
    const timeProgressPercent = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0

    // Calculate progress from bulletins
    const progressPercent = budget > 0 ? (approvedBulletinValue / budget) * 100 : timeProgressPercent

    const metrics = calculateEVMMetrics(
      budget,
      startDate,
      endDate,
      approvedBulletinValue,
      actualCostValue,
      now
    )

    return {
      id: project.id,
      name: project.name,
      status: project.status as string,
      budget,
      progressPercent: Math.min(100, progressPercent),
      timeProgressPercent,
      ...metrics,
    }
  } catch (error) {
    log.error({ err: error }, 'Error getting EVM data for project')
    return null
  }
}

/**
 * Get EVM data for all projects in a company
 */
export async function getAllProjectsEVMData(_companyId?: string): Promise<EVMProjectData[]> {
  try {
    const session = await assertAuthenticated()
    const companyId = session.user.companyId
    if (!companyId) return []
    const projects = await prisma.project.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        status: true,
        budget: true,
        startDate: true,
        endDate: true,
        contracts: {
          select: { value: true },
        },
        bulletins: {
          where: { status: 'APPROVED' },
          select: { totalValue: true },
        },
        financialRecords: {
          where: { type: 'EXPENSE', status: 'PAID' },
          select: { paidAmount: true },
        },
      },
    })

    const now = new Date()

    return projects.map(project => {
      const budget = Number(project.budget || 0) ||
                     project.contracts.reduce((sum, c) => sum + Number(c.value || 0), 0)

      const approvedBulletinValue = project.bulletins.reduce(
        (sum, b) => sum + Number(b.totalValue || 0),
        0
      )

      const actualCostValue = project.financialRecords.reduce(
        (sum, f) => sum + Number(f.paidAmount || 0),
        0
      )

      const startDate = project.startDate || now
      const endDate = project.endDate || new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      const totalDuration = endDate.getTime() - startDate.getTime()
      const elapsed = Math.min(now.getTime() - startDate.getTime(), totalDuration)
      const timeProgressPercent = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0
      const progressPercent = budget > 0 ? (approvedBulletinValue / budget) * 100 : timeProgressPercent

      const metrics = calculateEVMMetrics(
        budget,
        startDate,
        endDate,
        approvedBulletinValue,
        actualCostValue,
        now
      )

      return {
        id: project.id,
        name: project.name,
        status: project.status as string,
        budget,
        progressPercent: Math.min(100, progressPercent),
        timeProgressPercent,
        ...metrics,
      }
    })
  } catch (error) {
    log.error({ err: error }, 'Error getting EVM data for all projects')
    return []
  }
}

/**
 * Get portfolio summary for all projects in a company
 */
export async function getPortfolioEVMSummary(_companyId?: string): Promise<EVMPortfolioSummary | null> {
  try {
    const projects = await getAllProjectsEVMData()

    if (projects.length === 0) {
      return null
    }

    const totalPV = projects.reduce((sum, p) => sum + p.pv, 0)
    const totalEV = projects.reduce((sum, p) => sum + p.ev, 0)
    const totalAC = projects.reduce((sum, p) => sum + p.ac, 0)
    const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0)

    const portfolioSPI = totalPV > 0 && totalEV > 0 ? totalEV / totalPV : null
    const portfolioCPI = totalAC > 0 && totalEV > 0 ? totalEV / totalAC : null
    const avgProgressPercent = projects.reduce((sum, p) => sum + p.progressPercent, 0) / projects.length

    const healthStatus = getHealthStatus(portfolioSPI, portfolioCPI)

    return {
      totalPV,
      totalEV,
      totalAC,
      totalBudget,
      portfolioSPI,
      portfolioCPI,
      avgProgressPercent,
      projectCount: projects.length,
      healthStatus,
    }
  } catch (error) {
    log.error({ err: error }, 'Error getting portfolio EVM summary')
    return null
  }
}

/**
 * Get monthly S-Curve data for a project.
 * AC comes from real financial records, never fabricated from EV.
 */
export async function getProjectSCurveData(projectId: string): Promise<MonthlySCurveData[]> {
  try {
    const session = await assertAuthenticated()
    const project = await prisma.project.findFirst({
      where: { id: projectId, ...(session.user.companyId ? { companyId: session.user.companyId } : {}) },
      select: {
        id: true,
        budget: true,
        startDate: true,
        endDate: true,
        contracts: {
          select: { value: true },
        },
        bulletins: {
          where: { status: 'APPROVED' },
          select: {
            createdAt: true,
            totalValue: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        financialRecords: {
          where: { type: 'EXPENSE', status: 'PAID' },
          select: {
            paidDate: true,
            paidAmount: true,
          },
          orderBy: { paidDate: 'asc' },
        },
      },
    })

    if (!project) return []

    const now = new Date()
    const budget = Number(project.budget || 0) ||
                   project.contracts.reduce((sum, c) => sum + Number(c.value || 0), 0)
    const startDate = project.startDate || new Date()
    const endDate = project.endDate || new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)

    // Generate months from start to end date
    const months: MonthlySCurveData[] = []
    let currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1)

    while (currentMonth <= endDate && months.length < 60) {
      const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
      const monthStr = currentMonth.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })

      // Calculate PV for this month
      const totalDuration = endDate.getTime() - startDate.getTime()
      const monthEnd = Math.min(nextMonth.getTime(), now.getTime(), endDate.getTime())
      const elapsed = monthEnd - startDate.getTime()
      const timeProgress = totalDuration > 0 ? elapsed / totalDuration : 0
      const pv = budget * Math.min(1, Math.max(0, timeProgress))

      // Calculate EV from bulletins up to this month
      let ev = 0
      for (const bulletin of project.bulletins) {
        if (new Date(bulletin.createdAt) <= nextMonth) {
          ev += Number(bulletin.totalValue || 0)
        }
      }

      // Calculate AC from REAL financial records up to this month — no fabrication
      let ac = 0
      for (const record of project.financialRecords) {
        const paidDate = record.paidDate ? new Date(record.paidDate) : null
        if (paidDate && paidDate <= nextMonth) {
          ac += Number(record.paidAmount || 0)
        }
      }

      months.push({
        month: monthStr,
        pv: Number(pv.toFixed(2)),
        ev: Number(ev.toFixed(2)),
        ac: Number(ac.toFixed(2)),
      })

      currentMonth = nextMonth
    }

    return months
  } catch (error) {
    log.error({ err: error }, 'Error getting S-Curve data')
    return []
  }
}

/**
 * Get monthly comparison data for a company's projects
 */
export async function getMonthlyComparison(
  _companyId?: string,
  months: number = 12
): Promise<MonthlySCurveData[]> {
  try {
    const projects = await getAllProjectsEVMData()

    if (projects.length === 0) return []

    // Generate last N months
    const data: MonthlySCurveData[] = []
    const now = new Date()

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStr = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })

      // Aggregate across all projects for this month
      let totalPV = 0
      let totalEV = 0
      let totalAC = 0

      for (const project of projects) {
        const age = project.startDate ? now.getTime() - new Date(project.startDate).getTime() : 0
        const projectMonths = Math.ceil(age / (30 * 24 * 60 * 60 * 1000))

        if (projectMonths >= months - i) {
          totalPV += project.pv
          totalEV += project.ev
          totalAC += project.ac
        }
      }

      data.push({
        month: monthStr,
        pv: Number(totalPV.toFixed(2)),
        ev: Number(totalEV.toFixed(2)),
        ac: Number(totalAC.toFixed(2)),
      })
    }

    return data
  } catch (error) {
    log.error({ err: error }, 'Error getting monthly comparison')
    return []
  }
}
