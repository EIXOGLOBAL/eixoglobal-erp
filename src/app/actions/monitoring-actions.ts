'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { logAction } from '@/lib/audit-logger'
import { runFullFraudAnalysis } from '@/lib/fraud-detection'
import { getErrorStats } from '@/lib/error-tracker'
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'monitoring' })

// ============================================================================
// SYSTEM HEALTH
// ============================================================================

export async function getSystemHealthLogs(params?: {
  period?: '24h' | '7d' | '30d'
  metric?: string
}) {
  const session = await getSession()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Não autorizado' }
  }

  try {
    const period = params?.period || '24h'
    const hoursMap = { '24h': 24, '7d': 168, '30d': 720 }
    const since = new Date(Date.now() - hoursMap[period] * 3600000)

    const where: any = { timestamp: { gte: since } }
    if (params?.metric) where.metric = params.metric

    const logs = await (prisma as any).systemHealthLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 500,
    })

    return { success: true, data: logs }
  } catch (error) {
    log.error({ err: error }, 'Erro ao buscar health logs')
    return { success: false, error: 'Erro ao buscar logs de saúde' }
  }
}

// ============================================================================
// ANOMALIES
// ============================================================================

export async function getAnomalies(params?: {
  type?: string
  severity?: string
  resolved?: boolean
  page?: number
  limit?: number
}) {
  const session = await getSession()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Não autorizado' }
  }

  try {
    const page = params?.page || 1
    const limit = params?.limit || 20
    const skip = (page - 1) * limit

    const where: any = { companyId: session.user.companyId }
    if (params?.type) where.type = params.type
    if (params?.severity) where.severity = params.severity
    if (params?.resolved !== undefined) {
      where.resolvedAt = params.resolved ? { not: null } : null
    }

    const [data, total] = await Promise.all([
      (prisma as any).anomalyDetection.findMany({
        where,
        include: {
          resolvedBy: { select: { id: true, name: true } },
        },
        orderBy: { detectedAt: 'desc' },
        skip,
        take: limit,
      }),
      (prisma as any).anomalyDetection.count({ where }),
    ])

    return {
      success: true,
      data: {
        items: data,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    }
  } catch (error) {
    log.error({ err: error }, 'Erro ao buscar anomalias')
    return { success: false, error: 'Erro ao buscar anomalias' }
  }
}

export async function resolveAnomaly(
  id: string,
  falsePositive: boolean = false
) {
  const session = await getSession()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Não autorizado' }
  }

  try {
    const anomaly = await (prisma as any).anomalyDetection.update({
      where: { id },
      data: {
        resolvedAt: new Date(),
        resolvedById: session.user.id,
        falsePositive,
      },
    })

    await logAction(
      falsePositive ? 'MARK_FALSE_POSITIVE' : 'RESOLVE_ANOMALY',
      'AnomalyDetection',
      id,
      anomaly.description?.substring(0, 50) || 'N/A',
      falsePositive ? 'Marcado como falso positivo' : 'Anomalia resolvida'
    )

    return { success: true, data: anomaly }
  } catch (error) {
    return { success: false, error: 'Erro ao resolver anomalia' }
  }
}

// ============================================================================
// SECURITY SCANS
// ============================================================================

export async function getSecurityScans(params?: {
  page?: number
  limit?: number
}) {
  const session = await getSession()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Não autorizado' }
  }

  try {
    const page = params?.page || 1
    const limit = params?.limit || 10
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      (prisma as any).securityScan.findMany({
        orderBy: { scanDate: 'desc' },
        skip,
        take: limit,
      }),
      (prisma as any).securityScan.count(),
    ])

    return {
      success: true,
      data: {
        items: data,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    }
  } catch (error) {
    return { success: false, error: 'Erro ao buscar varreduras' }
  }
}

// ============================================================================
// FRAUD ANALYSIS
// ============================================================================

export async function runFraudAnalysis() {
  const session = await getSession()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Não autorizado' }
  }

  try {
    const companyId = session.user.companyId
    if (!companyId) return { success: false, error: 'Empresa não encontrada' }

    const result = await runFullFraudAnalysis(companyId)

    // Save detected anomalies to database
    if (result.alerts.length > 0) {
      await (prisma as any).anomalyDetection.createMany({
        data: result.alerts.map(alert => ({
          type: alert.type,
          severity: alert.severity,
          entity: alert.entity,
          entityId: alert.entityId || null,
          description: alert.description,
          evidence: alert.evidence,
          companyId,
        })),
      })
    }

    await logAction(
      'RUN_FRAUD_ANALYSIS',
      'System',
      'fraud-analysis',
      'Análise de Fraude',
      `${result.summary.total} alertas detectados (${result.summary.critical} críticos)`
    )

    return { success: true, data: result }
  } catch (error) {
    log.error({ err: error }, 'Erro na análise de fraude')
    return { success: false, error: 'Erro na análise de fraude' }
  }
}

// ============================================================================
// MONITORING DASHBOARD
// ============================================================================

export async function getMonitoringDashboard() {
  const session = await getSession()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Não autorizado' }
  }

  try {
    const companyId = session.user.companyId
    const last24h = new Date(Date.now() - 24 * 3600000)
    const last7d = new Date(Date.now() - 7 * 24 * 3600000)

    const [
      recentHealthLogs,
      openAnomalies,
      totalAnomalies,
      recentScans,
      recentAuditActions,
    ] = await Promise.all([
      (prisma as any).systemHealthLog.findMany({
        where: { timestamp: { gte: last24h } },
        orderBy: { timestamp: 'desc' },
        take: 50,
      }).catch(() => []),

      (prisma as any).anomalyDetection.count({
        where: { companyId, resolvedAt: null },
      }).catch(() => 0),

      (prisma as any).anomalyDetection.count({
        where: { companyId, detectedAt: { gte: last7d } },
      }).catch(() => 0),

      (prisma as any).securityScan.findMany({
        orderBy: { scanDate: 'desc' },
        take: 5,
      }).catch(() => []),

      prisma.auditLog.count({
        where: { companyId, createdAt: { gte: last24h } },
      }).catch(() => 0),
    ])

    // Calculate health score
    const criticalLogs = (recentHealthLogs as any[]).filter((l: any) => l.status === 'CRITICAL')
    const warningLogs = (recentHealthLogs as any[]).filter((l: any) => l.status === 'WARNING')
    let healthScore = 100
    healthScore -= criticalLogs.length * 20
    healthScore -= warningLogs.length * 5
    healthScore -= openAnomalies * 3
    healthScore = Math.max(0, Math.min(100, healthScore))

    const errorStats = getErrorStats()

    return {
      success: true,
      data: {
        healthScore,
        healthStatus: healthScore >= 80 ? 'Excelente' : healthScore >= 60 ? 'Bom' : healthScore >= 40 ? 'Atenção' : 'Crítico',
        openAnomalies,
        totalAnomaliesLast7d: totalAnomalies,
        recentScans,
        recentAuditActions,
        errorStats,
        lastScanStatus: (recentScans as any[])[0]?.status || 'N/A',
      },
    }
  } catch (error) {
    log.error({ err: error }, 'Erro ao buscar dashboard de monitoramento')
    return { success: false, error: 'Erro ao buscar dashboard' }
  }
}
