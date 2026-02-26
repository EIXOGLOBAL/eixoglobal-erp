'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

async function getUser() {
  const session = await getSession()
  if (!session?.user) throw new Error('Não autenticado')
  return session.user as { id: string; role: string; companyId: string }
}

export async function getAuditLogs(filters: {
  companyId: string
  search?: string
  entity?: string
  action?: string
  userId?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}) {
  try {
    const user = await getUser()
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return { success: false as const, error: 'Sem permissão' }
    }

    const page = filters.page || 0
    const pageSize = filters.pageSize || 25

    const where: any = { companyId: filters.companyId }

    if (filters.entity) where.entity = filters.entity
    if (filters.action) where.action = filters.action
    if (filters.userId) where.userId = filters.userId
    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate)
      if (filters.endDate) {
        const end = new Date(filters.endDate)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }
    if (filters.search) {
      where.OR = [
        { entityName: { contains: filters.search } },
        { oldData: { contains: filters.search } },
        { newData: { contains: filters.search } },
      ]
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: page * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ])

    return { success: true as const, data: { logs, total, page, pageSize } }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Erro' }
  }
}

export async function getAuditEntities(companyId: string) {
  try {
    const user = await getUser()
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return { success: false as const, error: 'Sem permissão' }
    }

    const entities = await prisma.auditLog.findMany({
      where: { companyId },
      select: { entity: true },
      distinct: ['entity'],
    })
    return { success: true as const, data: entities.map(e => e.entity) }
  } catch (error) {
    return { success: false as const, error: 'Erro' }
  }
}

export async function getAuditUsers(companyId: string) {
  try {
    const user = await getUser()
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return { success: false as const, error: 'Sem permissão' }
    }

    const users = await prisma.user.findMany({
      where: { companyId },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    })
    return { success: true as const, data: users }
  } catch (error) {
    return { success: false as const, error: 'Erro' }
  }
}
