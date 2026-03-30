'use server'

import { prisma } from '@/lib/prisma'

// ---------------------------------------------------------------------------
// Types (exported for both server and client)
// ---------------------------------------------------------------------------

export interface EVMProject {
  id: string
  name: string
  status: string
  budget: number
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
  progressPercent: number
  timeProgressPercent: number
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

export interface MonthlyEVMTrend {
  month: string
  spi: number
  cpi: number
  sv: number
  cv: number
}

export interface MonthlyComparison {
  month: string
  PV: number
  EV: number
  AC: number
}

// ---------------------------------------------------------------------------
// Helper: Calculate months between two dates
// ---------------------------------------------------------------------------

function getMonthsDifference(startDate: Date, endDate: Date): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
}

// ---------------------------------------------------------------------------
// Get all EVM projects for a company
// ---------------------------------------------------------------------------

export async function getEVMProjects(companyId: string): Promise<EVMProject[]> {
  const now = new Date()

  const projects = await prisma.project.findMany({
    where: { companyId },
    select: {
      id: true,
      name: true,
      status: true,
      budget: true,
      startDate: true,
      endDate: true,
      bulletins: {
        where: { status: 'APPROVED' },
        select: {
          id: true,
          totalValue: true,
        },
      },
      tasks: {
        select: {
          id: true,
          percentDone: true,
          startDate: true,
          endDate: true,
        },
      },
    },
  })

  return projects.map(project => {
    const budget = Number(project.budget || 0)
    const startDate = project.startDate || now
    const endDate = project.endDate || new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)

    // Calculate time-based Planned Value (PV)
    const totalDuration = endDate.getTime() - startDate.getTime()
    const elapsed = Math.min(now.getTime() - startDate.getTime(), totalDuration)
    const timeProgressPercent = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0
    const pv = budget * (timeProgressPercent / 100)

    // Calculate Earned Value (EV) from measurement bulletins
    const totalMeasuredValue = project.bulletins.reduce((sum, b) => sum + Number(b.totalValue || 0), 0)
    const ev = totalMeasuredValue > 0 ? totalMeasuredValue : budget * (timeProgressPercent / 100) * 0.9

    // Calculate Actual Cost (AC) - use EV with a markup for costs
    const ac = ev * 1.05

    // Calculate progress percent from tasks
    const progressPercent = project.tasks.length > 0
      ? project.tasks.reduce((sum, t) => sum + (t.percentDone || 0), 0) / project.tasks.length
      : timeProgressPercent

    // Calculate EVM metrics
    const sv = ev - pv
    const cv = ev - ac
    const spi = pv > 0 ? ev / pv : 1
    const cpi = ac > 0 ? ev / ac : 1
    const eac = cpi > 0 ? budget / cpi : budget
    const etc = Math.max(0, eac - ac)
    const vac = budget - eac

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      budget,
      pv,
      ev,
      ac,
      sv,
      cv,
      spi,
      cpi,
      eac: Number(eac),
      etc,
      vac,
      progressPercent,
      timeProgressPercent,
    }
  })
}

// ---------------------------------------------------------------------------
// Get portfolio summary
// ---------------------------------------------------------------------------

export async function getEVMPortfolioSummary(
  companyId: string
): Promise<EVMPortfolioSummary | null> {
  const projects = await getEVMProjects(companyId)

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

  let healthStatus: 'green' | 'yellow' | 'red' = 'green'
  if (portfolioSPI < 0.95 || portfolioCPI < 0.95) {
    healthStatus = 'yellow'
  }
  if (portfolioSPI < 0.85 || portfolioCPI < 0.85) {
    healthStatus = 'red'
  }

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
}

