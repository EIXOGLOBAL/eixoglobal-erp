import { prisma } from '@/lib/prisma'

export interface FraudAlert {
  type: 'FRAUD' | 'DATA_INCONSISTENCY' | 'UNUSUAL_ACTIVITY' | 'POLICY_VIOLATION'
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  entity: string
  entityId?: string
  description: string
  evidence: Record<string, any>
  detectedAt: Date
}

// ============================================================================
// DATA INTEGRITY CHECKS (Pure SQL/Prisma - no AI needed)
// ============================================================================

/**
 * Check for self-approved records (user created and approved same record)
 */
export async function checkSelfApprovals(companyId: string): Promise<FraudAlert[]> {
  const alerts: FraudAlert[] = []

  // Check time entries where employee approved their own entry
  const selfApprovedTimeEntries = await prisma.timeEntry.findMany({
    where: {
      companyId,
      status: 'APPROVED',
      approvedById: { not: null },
    },
    include: {
      employee: { select: { id: true, name: true } },
    },
  })

  for (const entry of selfApprovedTimeEntries) {
    if (entry.employeeId === entry.approvedById) {
      alerts.push({
        type: 'POLICY_VIOLATION',
        severity: 'HIGH',
        entity: 'TimeEntry',
        entityId: entry.id,
        description: `Ponto auto-aprovado por ${entry.employee?.name}`,
        evidence: { employeeId: entry.employeeId, approvedById: entry.approvedById, date: entry.date },
        detectedAt: new Date(),
      })
    }
  }

  return alerts
}

/**
 * Check for suspicious time entries (>16h, <1min, overlapping)
 */
export async function checkSuspiciousTimeEntries(companyId: string): Promise<FraudAlert[]> {
  const alerts: FraudAlert[] = []

  const entries = await prisma.timeEntry.findMany({
    where: {
      companyId,
      clockOut: { not: null },
      totalHours: { not: null },
    },
    include: {
      employee: { select: { id: true, name: true } },
    },
    orderBy: { clockIn: 'desc' },
    take: 500,
  })

  for (const entry of entries) {
    if (entry.totalHours && entry.totalHours > 16) {
      alerts.push({
        type: 'DATA_INCONSISTENCY',
        severity: 'MEDIUM',
        entity: 'TimeEntry',
        entityId: entry.id,
        description: `Ponto com ${entry.totalHours}h registradas para ${entry.employee?.name}`,
        evidence: { totalHours: entry.totalHours, clockIn: entry.clockIn, clockOut: entry.clockOut },
        detectedAt: new Date(),
      })
    }

    if (entry.totalHours && entry.totalHours < 0.02) { // less than ~1 minute
      alerts.push({
        type: 'DATA_INCONSISTENCY',
        severity: 'LOW',
        entity: 'TimeEntry',
        entityId: entry.id,
        description: `Ponto com menos de 1 minuto para ${entry.employee?.name}`,
        evidence: { totalHours: entry.totalHours },
        detectedAt: new Date(),
      })
    }
  }

  return alerts
}

/**
 * Check for financial records with values far from average (>3 std deviations)
 */
export async function checkFinancialOutliers(companyId: string): Promise<FraudAlert[]> {
  const alerts: FraudAlert[] = []

  const records = await prisma.financialRecord.findMany({
    where: { companyId },
    select: { id: true, amount: true, description: true, type: true, projectId: true },
  })

  if (records.length < 10) return alerts // Not enough data

  const amounts = records.map(r => Number(r.amount))
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length
  const stdDev = Math.sqrt(amounts.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / amounts.length)

  for (const record of records) {
    const amount = Number(record.amount)
    if (Math.abs(amount - mean) > 3 * stdDev && stdDev > 0) {
      alerts.push({
        type: 'DATA_INCONSISTENCY',
        severity: 'HIGH',
        entity: 'FinancialRecord',
        entityId: record.id,
        description: `Registro financeiro com valor atípico: R$ ${amount.toLocaleString('pt-BR')} (média: R$ ${mean.toLocaleString('pt-BR')})`,
        evidence: { amount, mean: Math.round(mean * 100) / 100, stdDev: Math.round(stdDev * 100) / 100, deviations: Math.round(Math.abs(amount - mean) / stdDev * 100) / 100 },
        detectedAt: new Date(),
      })
    }
  }

  return alerts
}

/**
 * Check for negative stock or movements without backing
 */
export async function checkInventoryAnomalies(companyId: string): Promise<FraudAlert[]> {
  const alerts: FraudAlert[] = []

  const materials = await prisma.material.findMany({
    where: { companyId },
    select: { id: true, name: true, currentStock: true, minStock: true },
  })

  for (const material of materials) {
    const stock = Number(material.currentStock)
    if (stock < 0) {
      alerts.push({
        type: 'DATA_INCONSISTENCY',
        severity: 'CRITICAL',
        entity: 'Material',
        entityId: material.id,
        description: `Estoque negativo detectado: ${material.name} (${stock} unidades)`,
        evidence: { materialId: material.id, currentStock: stock },
        detectedAt: new Date(),
      })
    }
  }

  return alerts
}

/**
 * Check for excessive contract amendments from same approver
 */
export async function checkContractAmendmentPatterns(companyId: string): Promise<FraudAlert[]> {
  const alerts: FraudAlert[] = []

  const contracts = await prisma.contract.findMany({
    where: { companyId },
    include: {
      amendments: {
        select: { id: true, oldValue: true, newValue: true },
      },
    },
  })

  for (const contract of contracts) {
    if (!contract.amendments || contract.amendments.length === 0) continue
    const amendments = contract.amendments

    // Check if total amendments > 25% of original value
    if (amendments.length > 3) {
      const totalValue = Number(contract.value || 0)
      if (totalValue > 0) {
        const amendmentValue = amendments.reduce((sum: number, a) => {
          const oldVal = Number(a.oldValue || 0)
          const newVal = Number(a.newValue || 0)
          return sum + Math.abs(newVal - oldVal)
        }, 0)
        const percentage = (amendmentValue / totalValue) * 100

        if (percentage > 25) {
          alerts.push({
            type: 'UNUSUAL_ACTIVITY',
            severity: 'HIGH',
            entity: 'Contract',
            entityId: contract.id,
            description: `Contrato com aditivos totalizando ${percentage.toFixed(1)}% do valor original`,
            evidence: { contractId: contract.id, originalValue: totalValue, totalAmendments: amendments.length, amendmentValue, percentage },
            detectedAt: new Date(),
          })
        }
      }
    }
  }

  return alerts
}

/**
 * Check for unusual activity patterns (too many deletions, edits outside business hours)
 */
export async function checkUnusualActivityPatterns(companyId: string): Promise<FraudAlert[]> {
  const alerts: FraudAlert[] = []

  const last24h = new Date(Date.now() - 24 * 3600000)

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      companyId,
      createdAt: { gte: last24h },
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  })

  // Group by user
  const byUser = new Map<string, typeof auditLogs>()
  for (const log of auditLogs) {
    const userId = log.userId || 'unknown'
    if (!byUser.has(userId)) byUser.set(userId, [])
    byUser.get(userId)!.push(log)
  }

  for (const [userId, logs] of byUser) {
    // Check for excessive deletions
    const deletions = logs.filter(l => l.action === 'DELETE')
    if (deletions.length > 10) {
      alerts.push({
        type: 'UNUSUAL_ACTIVITY',
        severity: 'HIGH',
        entity: 'AuditLog',
        description: `Usuário ${logs[0].user?.name || userId} realizou ${deletions.length} exclusões nas últimas 24h`,
        evidence: { userId, deleteCount: deletions.length, entities: deletions.map(d => d.entity) },
        detectedAt: new Date(),
      })
    }

    // Check for activity outside business hours (before 6am or after 10pm)
    const offHoursActions = logs.filter(l => {
      const hour = l.createdAt.getHours()
      return hour < 6 || hour > 22
    })

    if (offHoursActions.length > 5) {
      alerts.push({
        type: 'UNUSUAL_ACTIVITY',
        severity: 'MEDIUM',
        entity: 'AuditLog',
        description: `Usuário ${logs[0].user?.name || userId} teve ${offHoursActions.length} ações fora do horário comercial`,
        evidence: { userId, offHoursCount: offHoursActions.length },
        detectedAt: new Date(),
      })
    }
  }

  return alerts
}

/**
 * Check for duplicate financial entries (same value, same day, same project)
 */
export async function checkDuplicateEntries(companyId: string): Promise<FraudAlert[]> {
  const alerts: FraudAlert[] = []

  const last30d = new Date(Date.now() - 30 * 24 * 3600000)

  const records = await prisma.financialRecord.findMany({
    where: {
      companyId,
      createdAt: { gte: last30d },
    },
    select: { id: true, amount: true, projectId: true, createdAt: true, description: true, type: true },
    orderBy: { createdAt: 'desc' },
  })

  // Group by project + amount + date
  const groups = new Map<string, typeof records>()
  for (const record of records) {
    const dateKey = record.createdAt.toISOString().split('T')[0]
    const key = `${record.projectId || 'none'}_${Number(record.amount)}_${dateKey}_${record.type}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(record)
  }

  for (const [, group] of groups) {
    if (group.length > 1) {
      alerts.push({
        type: 'DATA_INCONSISTENCY',
        severity: 'MEDIUM',
        entity: 'FinancialRecord',
        description: `${group.length} registros financeiros duplicados: R$ ${Number(group[0].amount).toLocaleString('pt-BR')} no mesmo dia/projeto`,
        evidence: { ids: group.map(r => r.id), amount: Number(group[0].amount), date: group[0].createdAt },
        detectedAt: new Date(),
      })
    }
  }

  return alerts
}

// ============================================================================
// MASTER ANALYSIS FUNCTION
// ============================================================================

/**
 * Run all fraud detection checks for a company
 */
export async function runFullFraudAnalysis(companyId: string): Promise<{
  alerts: FraudAlert[]
  summary: {
    total: number
    critical: number
    high: number
    medium: number
    low: number
    byType: Record<string, number>
  }
}> {
  const allAlerts: FraudAlert[] = []

  const checks = [
    checkSelfApprovals(companyId),
    checkSuspiciousTimeEntries(companyId),
    checkFinancialOutliers(companyId),
    checkInventoryAnomalies(companyId),
    checkContractAmendmentPatterns(companyId),
    checkUnusualActivityPatterns(companyId),
    checkDuplicateEntries(companyId),
  ]

  const results = await Promise.allSettled(checks)

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allAlerts.push(...result.value)
    } else {
      console.error('Fraud check failed:', result.reason)
    }
  }

  // Sort by severity
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
  allAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  const byType = allAlerts.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    alerts: allAlerts,
    summary: {
      total: allAlerts.length,
      critical: allAlerts.filter(a => a.severity === 'CRITICAL').length,
      high: allAlerts.filter(a => a.severity === 'HIGH').length,
      medium: allAlerts.filter(a => a.severity === 'MEDIUM').length,
      low: allAlerts.filter(a => a.severity === 'LOW').length,
      byType,
    },
  }
}
