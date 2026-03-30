import { prisma } from '@/lib/prisma'

export async function logAudit(params: {
  userId: string
  companyId: string
  action: string
  entity: string
  entityId: string
  details?: string
  oldData?: any
  newData?: any
}) {
  try {
    await (prisma as any).auditLog?.create({
      data: {
        userId: params.userId,
        companyId: params.companyId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details,
        oldData: params.oldData ? JSON.stringify(params.oldData) : null,
        newData: params.newData ? JSON.stringify(params.newData) : null,
        timestamp: new Date(),
      }
    })
  } catch (error) {
    console.error('Audit log error:', error)
    // Don't throw, continue execution if audit logging fails
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
    const where: any = {}
    if (params.userId) where.userId = params.userId
    if (params.companyId) where.companyId = params.companyId
    if (params.entity) where.entity = params.entity
    if (params.action) where.action = params.action

    return await (prisma as any).auditLog?.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: params.limit || 100,
    })
  } catch (error) {
    console.error('Error retrieving audit logs:', error)
    return []
  }
}
