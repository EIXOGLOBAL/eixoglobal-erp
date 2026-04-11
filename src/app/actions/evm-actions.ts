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
  sv: number
  cv: number
  spi: number
  cpi: number
  eac: number
  etc: number
  vac: number
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
  portfolioSPI: number
  portfolioCPI: number
  avgProgressPercent: number
  projectCount: number
  healthStatus: 'green' | 'yellow' | 'red'
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
 * Calculate EVM metrics for a project based on contract value and bulletins
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

  // Earned Value from approved bulletins
  const ev = approvedBulletinValue > 0 ? approvedBulletinValue : pv * 0.9

  // Actual Cost
  const ac = actualCostValue > 0 ? actualCostValue : ev * 1.05

  // Schedule Variance
  const sv = ev - pv

  // Cost Variance
  const cv = ev - ac

  // Schedule Performance Index
  const spi = pv > 0 ? ev / pv : 1

  // Cost Performance Index
  const cpi = ac > 0 ? ev / ac : 1

  // Estimate At Completion
  const eac = cpi > 0 ? budget / cpi : budget

  // Estimate To Complete
  const etc = Math.max(0, eac - ac)

  // Variance At Completion
  const vac = budget - eac

  return {
    pv,
    ev,
    ac,
    sv,
    cv,
    spi,
    cpi,
    eac: Number(eac.toFixed(2)),
    etc: Number(etc.toFixed(2)),
    vac: Number(vac.toFixed(2)),
  }
}

/**
 * Get health status based on SPI and CPI
 */
function getHealthStatus(spi: number, cpi: number): 'green' | 'yellow' | 'red' {
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

    const portfolioSPI = totalPV > 0 ? totalEV / totalPV : 1
    const portfolioCPI = totalAC > 0 ? totalEV / totalAC : 1
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
 * Get monthly S-Curve data for a project
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

      // AC is typically EV with a markup
      const ac = ev > 0 ? ev * 1.05 : 0

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
