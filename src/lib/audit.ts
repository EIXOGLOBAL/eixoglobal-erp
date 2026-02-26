import { prisma } from './prisma'

interface AuditParams {
  action: string
  entity: string
  entityId?: string
  entityName?: string
  userId: string
  companyId: string
  oldData?: Record<string, unknown>
  newData?: Record<string, unknown>
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        entityName: params.entityName ?? null,
        oldData: params.oldData ? JSON.stringify(params.oldData) : null,
        newData: params.newData ? JSON.stringify(params.newData) : null,
        userId: params.userId,
        companyId: params.companyId,
      },
    })
  } catch {
    // Never let audit logging break the main operation
  }
}
