/**
 * EVM — Earned Value Management
 *
 * Módulo de cálculo de métricas de Gestão pelo Valor Agregado (EVM),
 * exigido em obras públicas (TCMSP, TCU) e grandes obras privadas.
 */

// ---------------------------------------------------------------------------
// Input types (minimal shapes needed for the calculation)
// ---------------------------------------------------------------------------

export interface EVMProject {
  budget: number | null | undefined
}

export interface EVMTask {
  percentDone: number
  plannedEnd: Date | string | null
}

export interface EVMBulletin {
  status: string
  totalValue: number | string | null | undefined
}

// ---------------------------------------------------------------------------
// Output type
// ---------------------------------------------------------------------------

export interface EVMMetrics {
  /** Budget at Completion — orçamento total do projeto */
  bac: number
  /** Planned Value — valor que deveria ter sido feito até hoje */
  pv: number
  /** Earned Value — valor efetivamente realizado até hoje */
  ev: number
  /** Actual Cost — soma de todos os boletins aprovados/faturados */
  ac: number
  /** Cost Performance Index: EV / AC  (> 1 abaixo do orçamento) */
  cpi: number
  /** Schedule Performance Index: EV / PV (> 1 adiantado) */
  spi: number
  /** Estimate at Completion: AC + (BAC - EV) / CPI */
  eac: number
  /** Variance at Completion: BAC - EAC */
  vac: number
  /** Schedule Variance: EV - PV */
  sv: number
  /** Cost Variance: EV - AC */
  cv: number
  /** Percentual físico realizado médio das tarefas (0-100) */
  percentComplete: number
  /** Percentual planejado baseado em datas (0-100) */
  percentPlanned: number
}

// ---------------------------------------------------------------------------
// Helper — safely coerce a Date | string | null to a Date object
// ---------------------------------------------------------------------------

function toDate(value: Date | string | null | undefined): Date | null {
  if (value === null || value === undefined) return null
  const d = value instanceof Date ? value : new Date(value as string)
  return isNaN(d.getTime()) ? null : d
}

// ---------------------------------------------------------------------------
// Main calculation function
// ---------------------------------------------------------------------------

/**
 * Calcula todas as métricas EVM do projeto.
 *
 * @param project  Projeto com campo `budget`
 * @param tasks    Tarefas do projeto (ProjectTask[])
 * @param bulletins Boletins de medição do projeto (MeasurementBulletin[])
 * @returns        EVMMetrics com todos os índices calculados
 */
export function calculateEVM(
  project: EVMProject,
  tasks: EVMTask[],
  bulletins: EVMBulletin[],
): EVMMetrics {
  // -------------------------------------------------------------------------
  // BAC — Budget at Completion
  // -------------------------------------------------------------------------
  const bac = Number(project.budget ?? 0)

  // -------------------------------------------------------------------------
  // AC — Actual Cost (soma dos boletins aprovados ou faturados)
  // -------------------------------------------------------------------------
  const ac = bulletins
    .filter((b) => b.status === 'APPROVED' || b.status === 'BILLED')
    .reduce((sum, b) => sum + Number(b.totalValue ?? 0), 0)

  // -------------------------------------------------------------------------
  // percentComplete — média de percentDone de todas as tarefas
  // -------------------------------------------------------------------------
  const percentComplete =
    tasks.length === 0
      ? 0
      : tasks.reduce((sum, t) => sum + (t.percentDone ?? 0), 0) / tasks.length

  // -------------------------------------------------------------------------
  // percentPlanned — tarefas cujo plannedEnd <= hoje / total
  // -------------------------------------------------------------------------
  const today = new Date()
  today.setHours(23, 59, 59, 999) // fim do dia de hoje

  const tasksPlannedDone = tasks.filter((t) => {
    const plannedEnd = toDate(t.plannedEnd)
    return plannedEnd !== null && plannedEnd <= today
  }).length

  const percentPlanned =
    tasks.length === 0 ? 0 : (tasksPlannedDone / tasks.length) * 100

  // -------------------------------------------------------------------------
  // PV — Planned Value
  // -------------------------------------------------------------------------
  const pv = (percentPlanned / 100) * bac

  // -------------------------------------------------------------------------
  // EV — Earned Value
  // -------------------------------------------------------------------------
  const ev = (percentComplete / 100) * bac

  // -------------------------------------------------------------------------
  // CPI — Cost Performance Index (guard against division by zero)
  // -------------------------------------------------------------------------
  const cpi = ac === 0 ? (ev === 0 ? 1 : 0) : ev / ac

  // -------------------------------------------------------------------------
  // SPI — Schedule Performance Index (guard against division by zero)
  // -------------------------------------------------------------------------
  const spi = pv === 0 ? (ev === 0 ? 1 : 0) : ev / pv

  // -------------------------------------------------------------------------
  // EAC — Estimate at Completion
  // cpi === 0 means cost is wildly over budget; assume remaining at original rate
  // -------------------------------------------------------------------------
  const remainingWork = bac - ev
  const eac = cpi === 0 ? bac + ac : ac + remainingWork / cpi

  // -------------------------------------------------------------------------
  // VAC — Variance at Completion
  // -------------------------------------------------------------------------
  const vac = bac - eac

  // -------------------------------------------------------------------------
  // SV / CV — variances
  // -------------------------------------------------------------------------
  const sv = ev - pv
  const cv = ev - ac

  return {
    bac,
    pv,
    ev,
    ac,
    cpi,
    spi,
    eac,
    vac,
    sv,
    cv,
    percentComplete,
    percentPlanned,
  }
}
