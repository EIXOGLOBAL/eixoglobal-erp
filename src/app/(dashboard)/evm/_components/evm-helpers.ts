// Client-side helpers for EVM (no server dependencies)

import type { EVMProject } from './evm-data'

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
// Generate monthly EVM trends for a project
// ---------------------------------------------------------------------------

export function generateMonthlyEVMTrends(
  project: EVMProject,
  months: number = 12
): MonthlyEVMTrend[] {
  const trends: MonthlyEVMTrend[] = []
  const now = new Date()

  for (let i = 0; i < months; i++) {
    const d = new Date(now)
    d.setMonth(d.getMonth() - (months - i - 1))
    const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })

    const timeProgress = (i + 1) / months
    const pv = project.budget * timeProgress
    const ev = project.budget * timeProgress * 0.95
    const ac = ev * 1.05

    const sv = ev - pv
    const cv = ev - ac
    const spi = pv > 0 ? ev / pv : 1
    const cpi = ac > 0 ? ev / ac : 1

    trends.push({
      month: monthLabel,
      spi: Math.max(0.8, Math.min(spi, 1.2)),
      cpi: Math.max(0.8, Math.min(cpi, 1.2)),
      sv,
      cv,
    })
  }

  return trends
}

// ---------------------------------------------------------------------------
// Generate monthly comparison data for a project
// ---------------------------------------------------------------------------

export function generateMonthlyComparison(
  project: EVMProject,
  months: number = 12
): MonthlyComparison[] {
  const data: MonthlyComparison[] = []
  const now = new Date()

  for (let i = 0; i < months; i++) {
    const d = new Date(now)
    d.setMonth(d.getMonth() - (months - i - 1))
    const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short' })

    const timeProgress = (i + 1) / months
    const pv = (project.budget * timeProgress) / 1000
    const ev = (project.budget * timeProgress * 0.95) / 1000
    const ac = (ev * 1000 * 1.05) / 1000

    data.push({
      month: monthLabel,
      PV: Math.round(pv),
      EV: Math.round(ev),
      AC: Math.round(ac),
    })
  }

  return data
}
