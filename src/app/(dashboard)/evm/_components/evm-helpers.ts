// Client-side helpers for EVM (no server dependencies)
// NOTE: These helpers use ONLY the real data already computed on the project.
// They do NOT fabricate or estimate any values.

import type { EVMProject } from './evm-data'

export interface MonthlyEVMTrend {
  month: string
  spi: number | null
  cpi: number | null
  sv: number | null
  cv: number | null
}

export interface MonthlyComparison {
  month: string
  PV: number
  EV: number
  AC: number
}

// ---------------------------------------------------------------------------
// Generate monthly EVM trends for a project.
// Returns a single data point with the project's REAL current indicators.
// Without real monthly snapshots from the server, we cannot fabricate a trend.
// ---------------------------------------------------------------------------

export function generateMonthlyEVMTrends(
  project: EVMProject,
  _months: number = 12
): MonthlyEVMTrend[] {
  // We only have real data for the current snapshot.
  // Fabricating monthly points would violate the no-mock-data rule.
  if (project.dataInsufficient) {
    return []
  }

  const now = new Date()
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })

  return [
    {
      month: monthLabel,
      spi: project.spi,
      cpi: project.cpi,
      sv: project.sv,
      cv: project.cv,
    },
  ]
}

// ---------------------------------------------------------------------------
// Generate monthly comparison data for a project.
// Returns a single data point with the project's REAL current PV/EV/AC.
// Without real monthly snapshots from the server, we cannot fabricate a trend.
// ---------------------------------------------------------------------------

export function generateMonthlyComparison(
  project: EVMProject,
  _months: number = 12
): MonthlyComparison[] {
  const now = new Date()
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'short' })

  return [
    {
      month: monthLabel,
      PV: Math.round(project.pv / 1000),
      EV: Math.round(project.ev / 1000),
      AC: Math.round(project.ac / 1000),
    },
  ]
}
