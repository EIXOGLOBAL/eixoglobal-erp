'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export interface ActivityData {
  userId: string
  action: string
  resourceType: 'project' | 'contract' | 'employee' | 'measurement' | 'task'
  resourceId: string
  resourceName: string
  description?: string
  status: 'success' | 'pending' | 'error'
  metadata?: Record<string, any>
}

/**
 * Log an activity
 */
export async function logActivity(data: ActivityData) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Não autenticado' }
    }

    const activity = await prisma.auditLog.create({
      data: {
        action: data.action,
        entity: data.resourceType.toUpperCase(),
        entityId: data.resourceId,
        entityName: data.resourceName,
        userId: data.userId,
        companyId: session.user.companyId || '',
        newData: JSON.stringify({
          description: data.description,
          status: data.status,
          ...data.metadata,
        }),
      },
    })

    return { success: true, data: activity }
  } catch (error: any) {
    console.error('Error logging activity:', error)
    return { success: false, error: error.message || 'Erro ao registrar atividade' }
  }
}

/**
 * Get recent activities for a company
 */
export async function getRecentActivities(limit: number = 10) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return { success: false, error: 'Não autenticado', data: [] }
    }

    const companyId = (session.user as any).companyId

    const activities = await prisma.auditLog.findMany({
      where: {
        user: {
          companyId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return {
      success: true,
      data: activities.map(activity => {
        let newData = {}
        try {
          newData = activity.newData ? JSON.parse(activity.newData) : {}
        } catch (e) {
          // Ignore JSON parse errors
        }
        return {
          id: activity.id,
          userId: activity.userId,
          userName: activity.user?.name || activity.user?.email || 'Usuário desconhecido',
          action: activity.action,
          resourceType: activity.entity.toLowerCase(),
          resourceId: activity.entityId,
          resourceName: activity.entityName || 'Item',
          description: (newData as any)?.description,
          status: (newData as any)?.status || 'success',
          timestamp: activity.createdAt,
          metadata: newData,
        }
      }),
    }
  } catch (error: any) {
    console.error('Error fetching activities:', error)
    return { success: false, error: error.message || 'Erro ao buscar atividades', data: [] }
  }
}

/**
 * Get activities for a specific user
 */
export async function getUserActivities(userId: string, limit: number = 10) {
  try {
    const activities = await prisma.auditLog.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return {
      success: true,
      data: activities.map(activity => {
        let newData = {}
        try {
          newData = activity.newData ? JSON.parse(activity.newData) : {}
        } catch (e) {
          // Ignore JSON parse errors
        }
        return {
          id: activity.id,
          userId: activity.userId,
          userName: activity.user?.name || activity.user?.email || 'Usuário desconhecido',
          action: activity.action,
          resourceType: activity.entity.toLowerCase(),
          resourceId: activity.entityId,
          resourceName: activity.entityName || 'Item',
          description: (newData as any)?.description,
          status: (newData as any)?.status || 'success',
          timestamp: activity.createdAt,
          metadata: newData,
        }
      }),
    }
  } catch (error: any) {
    console.error('Error fetching user activities:', error)
    return { success: false, error: error.message || 'Erro ao buscar atividades do usuário', data: [] }
  }
}

/**
 * Get activities for a specific resource
 */
export async function getResourceActivities(
  resourceType: string,
  resourceId: string,
  limit: number = 10
) {
  try {
    const activities = await prisma.auditLog.findMany({
      where: {
        entity: resourceType.toUpperCase(),
        entityId: resourceId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return {
      success: true,
      data: activities.map(activity => {
        let newData = {}
        try {
          newData = activity.newData ? JSON.parse(activity.newData) : {}
        } catch (e) {
          // Ignore JSON parse errors
        }
        return {
          id: activity.id,
          userId: activity.userId,
          userName: activity.user?.name || activity.user?.email || 'Usuário desconhecido',
          action: activity.action,
          resourceType: activity.entity.toLowerCase(),
          resourceId: activity.entityId,
          resourceName: activity.entityName || 'Item',
          description: (newData as any)?.description,
          status: (newData as any)?.status || 'success',
          timestamp: activity.createdAt,
          metadata: newData,
        }
      }),
    }
  } catch (error: any) {
    console.error('Error fetching resource activities:', error)
    return { success: false, error: error.message || 'Erro ao buscar atividades do recurso', data: [] }
  }
}
