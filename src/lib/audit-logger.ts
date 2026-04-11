import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export type AuditLogParams = {
  action: string
  entity?: string | null
  entityId?: string | null
  entityName?: string | null
  userId?: string | null
  companyId?: string | null
  email?: string | null
  reason?: string | null
  details?: string | null
  oldData?: unknown
  newData?: unknown
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * Registra um evento no audit log. Falhas no logging NUNCA derrubam a operação
 * principal — apenas são logadas no console.
 *
 * Aceita tanto eventos de domínio (com entity + entityId + userId + companyId)
 * quanto eventos de sistema/auth (sem entity, com possivelmente userId/email
 * apenas).
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entity: params.entity ?? null,
        entityId: params.entityId ?? null,
        entityName: params.entityName ?? null,
        userId: params.userId ?? null,
        companyId: params.companyId ?? null,
        email: params.email ?? null,
        reason: params.reason ?? null,
        details: params.details ?? null,
        oldData: params.oldData != null ? JSON.stringify(params.oldData) : null,
        newData: params.newData != null ? JSON.stringify(params.newData) : null,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    })
  } catch (error) {
    console.error('[audit-logger] failed to write audit log:', error)
  }
}

/**
 * Helper para logar criação de entidade. Captura userId/companyId da sessão automaticamente.
 */
export async function logCreate(entity: string, entityId: string, entityName: string, newData: unknown) {
  try {
    const session = await getSession()
    await logAudit({
      action: 'CREATE', entity, entityId, entityName, newData,
      userId: session?.user?.id, companyId: session?.user?.companyId,
    })
  } catch (e) {
    console.error('[audit-logger] logCreate failed:', e)
  }
}

/**
 * Helper para logar atualização de entidade. Registra dados antigos e novos para diff.
 */
export async function logUpdate(entity: string, entityId: string, entityName: string, oldData: unknown, newData: unknown) {
  try {
    const session = await getSession()
    await logAudit({
      action: 'UPDATE', entity, entityId, entityName, oldData, newData,
      userId: session?.user?.id, companyId: session?.user?.companyId,
    })
  } catch (e) {
    console.error('[audit-logger] logUpdate failed:', e)
  }
}

/**
 * Helper para logar exclusão de entidade.
 */
export async function logDelete(entity: string, entityId: string, entityName: string, oldData: unknown) {
  try {
    const session = await getSession()
    await logAudit({
      action: 'DELETE', entity, entityId, entityName, oldData,
      userId: session?.user?.id, companyId: session?.user?.companyId,
    })
  } catch (e) {
    console.error('[audit-logger] logDelete failed:', e)
  }
}

/**
 * Helper genérico para ações customizadas (APPROVE, REJECT, BLOCK, etc.)
 */
export async function logAction(action: string, entity: string, entityId: string, entityName: string, details?: string) {
  try {
    const session = await getSession()
    await logAudit({
      action, entity, entityId, entityName, details,
      userId: session?.user?.id, companyId: session?.user?.companyId,
    })
  } catch (e) {
    console.error('[audit-logger] logAction failed:', e)
  }
}

export async function getAuditLogs(params: {
  userId?: string
  companyId?: string
  entity?: string
  action?: string
  limit?: number
}) {
  try {
    const where: Record<string, unknown> = {}
    if (params.userId) where.userId = params.userId
    if (params.companyId) where.companyId = params.companyId
    if (params.entity) where.entity = params.entity
    if (params.action) where.action = params.action

    return await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit || 100,
    })
  } catch (error) {
    console.error('[audit-logger] error retrieving audit logs:', error)
    return []
  }
}
