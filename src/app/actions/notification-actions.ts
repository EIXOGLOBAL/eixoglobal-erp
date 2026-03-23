'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"

async function getUser() {
  const session = await getSession()
  if (!session?.user) throw new Error("Não autenticado")
  return session.user as { id: string; role: string; companyId: string }
}

export async function getNotifications(limit = 50) {
  try {
    const user = await getUser()
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
    return { success: true as const, data: notifications }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Erro" }
  }
}

export async function getUnreadCount() {
  try {
    const user = await getUser()
    const count = await prisma.notification.count({
      where: { userId: user.id, read: false },
    })
    return { success: true as const, data: count }
  } catch (error) {
    return { success: false as const, error: "Erro" }
  }
}

export async function markAsRead(notificationId: string) {
  try {
    const user = await getUser()
    await prisma.notification.updateMany({
      where: { id: notificationId, userId: user.id },
      data: { read: true },
    })
    revalidatePath("/")
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Erro" }
  }
}

export async function markAllAsRead() {
  try {
    const user = await getUser()
    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    })
    revalidatePath("/")
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Erro" }
  }
}

export async function deleteNotification(notificationId: string) {
  try {
    const user = await getUser()
    await prisma.notification.deleteMany({
      where: { id: notificationId, userId: user.id },
    })
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Erro" }
  }
}

// Internal function to create notifications — called by other server actions
export async function createNotification(data: {
  userId: string
  companyId: string
  type: string
  title: string
  message: string
  link?: string
}) {
  try {
    await prisma.notification.create({
      data: {
        userId: data.userId,
        companyId: data.companyId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link ?? null,
      },
    })
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Erro" }
  }
}

// Bulk delete — delete multiple notifications at once
export async function deleteNotifications(ids: string[]) {
  try {
    if (ids.length === 0) return { success: true as const }
    const user = await getUser()
    await prisma.notification.deleteMany({
      where: { id: { in: ids }, userId: user.id },
    })
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Erro" }
  }
}

// Bulk mark as read
export async function markNotificationsAsRead(ids: string[]) {
  try {
    if (ids.length === 0) return { success: true as const }
    const user = await getUser()
    await prisma.notification.updateMany({
      where: { id: { in: ids }, userId: user.id },
      data: { read: true },
    })
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Erro" }
  }
}

// Bulk create — notify multiple users at once
export async function createNotificationForMany(data: {
  userIds: string[]
  companyId: string
  type: string
  title: string
  message: string
  link?: string
}) {
  try {
    if (data.userIds.length === 0) return { success: true as const }
    await prisma.notification.createMany({
      data: data.userIds.map(userId => ({
        userId,
        companyId: data.companyId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link ?? null,
      })),
    })
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Erro" }
  }
}

export async function updateNotification(notificationId: string, data: { read?: boolean; title?: string; message?: string }) {
  try {
    const user = await getUser()
    const notification = await prisma.notification.updateMany({
      where: { id: notificationId, userId: user.id },
      data: {
        ...(data.read !== undefined && { read: data.read }),
      },
    })
    revalidatePath("/")
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Erro" }
  }
}
