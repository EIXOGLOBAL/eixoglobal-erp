'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'notification' })

export interface NotificationData {
  title: string
  message: string
  type: string
  userId: string
  link?: string
}

/**
 * Create a new notification
 */
export async function createNotification(data: NotificationData) {
  try {
    const notification = await prisma.notification.create({
      data: {
        title: data.title,
        message: data.message,
        type: data.type,
        userId: data.userId,
        link: data.link,
        companyId: (await getSession())?.user?.companyId || '',
        read: false,
      },
    })

    revalidatePath('/notificacoes')
    return { success: true, data: notification }
  } catch (error: any) {
    log.error({ err: error }, 'Error creating notification')
    return { success: false, error: error.message || 'Erro ao criar notificação' }
  }
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(limit: number = 10) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Não autenticado', data: [] }
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return { success: true, data: notifications }
  } catch (error: any) {
    log.error({ err: error }, 'Error fetching notifications')
    return { success: false, error: error.message || 'Erro ao buscar notificações', data: [] }
  }
}

/**
 * Get unread count for a user
 */
export async function getUnreadCount() {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Não autenticado', count: 0 }
    }

    const count = await prisma.notification.count({
      where: {
        userId: session.user.id,
        read: false,
      },
    })

    return { success: true, count }
  } catch (error: any) {
    log.error({ err: error }, 'Error counting unread notifications')
    return { success: false, error: error.message || 'Erro ao contar notificações', count: 0 }
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Não autenticado' }
    }

    const notification = await prisma.notification.updateMany({
      where: { id: notificationId, userId: session.user.id },
      data: { read: true },
    })

    revalidatePath('/notificacoes')
    return { success: true, data: notification }
  } catch (error: any) {
    log.error({ err: error }, 'Error marking notification as read')
    return { success: false, error: error.message || 'Erro ao marcar notificação como lida' }
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead() {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Não autenticado' }
    }

    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        read: false,
      },
      data: { read: true },
    })

    revalidatePath('/notificacoes')
    return { success: true }
  } catch (error: any) {
    log.error({ err: error }, 'Error marking all notifications as read')
    return { success: false, error: error.message || 'Erro ao marcar notificações como lidas' }
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Não autenticado' }
    }

    await prisma.notification.deleteMany({
      where: { id: notificationId, userId: session.user.id },
    })

    revalidatePath('/notificacoes')
    return { success: true }
  } catch (error: any) {
    log.error({ err: error }, 'Error deleting notification')
    return { success: false, error: error.message || 'Erro ao deletar notificação' }
  }
}

/**
 * Clear all notifications for a user
 */
export async function clearAllNotifications() {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Não autenticado' }
    }

    await prisma.notification.deleteMany({
      where: { userId: session.user.id },
    })

    revalidatePath('/notificacoes')
    return { success: true }
  } catch (error: any) {
    log.error({ err: error }, 'Error clearing notifications')
    return { success: false, error: error.message || 'Erro ao limpar notificações' }
  }
}

/**
 * Create bulk notifications for multiple users
 */
export async function createBulkNotifications(
  userIds: string[],
  data: Omit<NotificationData, 'userId'>
) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return { success: false, error: 'Não autenticado' }
    }

    const companyId = session.user.companyId || ''
    const notifications = await Promise.all(
      userIds.map(userId =>
        prisma.notification.create({
          data: {
            title: data.title,
            message: data.message,
            type: data.type,
            userId,
            link: data.link,
            companyId,
            read: false,
          },
        })
      )
    )

    return { success: true, data: notifications }
  } catch (error: any) {
    log.error({ err: error }, 'Error creating bulk notifications')
    return { success: false, error: error.message || 'Erro ao criar notificações em massa' }
  }
}

/**
 * Mark multiple notifications as read (batch operation)
 */
export async function markNotificationsAsRead(notificationIds: string[]) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Não autenticado' }
    }

    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId: session.user.id,
      },
      data: { read: true },
    })

    revalidatePath('/notificacoes')
    return { success: true }
  } catch (error: any) {
    log.error({ err: error }, 'Error marking notifications as read')
    return { success: false, error: error.message || 'Erro ao marcar notificações como lidas' }
  }
}

/**
 * Get notification stats (KPIs) for the current user
 */
export async function getNotificationStats() {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Não autenticado', data: null }
    }

    const userId = session.user.id
    const now = new Date()

    // Start of today (UTC)
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    // Start of this week (Monday)
    const startOfWeek = new Date(now)
    const dayOfWeek = startOfWeek.getDay()
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    startOfWeek.setDate(startOfWeek.getDate() - diff)
    startOfWeek.setHours(0, 0, 0, 0)

    const [total, unread, today, thisWeek] = await Promise.all([
      prisma.notification.count({
        where: { userId },
      }),
      prisma.notification.count({
        where: { userId, read: false },
      }),
      prisma.notification.count({
        where: { userId, createdAt: { gte: startOfToday } },
      }),
      prisma.notification.count({
        where: { userId, createdAt: { gte: startOfWeek } },
      }),
    ])

    return {
      success: true,
      data: { total, unread, today, thisWeek },
    }
  } catch (error: any) {
    log.error({ err: error }, 'Error fetching notification stats')
    return { success: false, error: error.message || 'Erro ao buscar estatísticas', data: null }
  }
}

// Backward compatibility aliases
export { getUserNotifications as getNotifications }
export { markNotificationAsRead as markAsRead }
export { markAllNotificationsAsRead as markAllAsRead }
export { clearAllNotifications as deleteNotifications }
export { createBulkNotifications as createNotificationForMany }
