'use server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import { createNotificationForMany } from './notification-actions'
import { notifyUsers } from '@/lib/sse-notifications'

const schema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  priority: z.enum(["LOW","NORMAL","HIGH","URGENT"]).default("NORMAL"),
  isPinned: z.boolean().default(false),
  expiresAt: z.string().optional().nullable(),
})

type SessionUser = { id: string; role: string; companyId: string }

async function getUser(): Promise<SessionUser> {
  const session = await getSession()
  if (!session?.user) throw new Error("Não autenticado")
  const u = session.user as { id?: string; role?: string; companyId?: string }
  if (!u.id || !u.companyId) throw new Error("Sessão inválida")
  return { id: u.id, role: u.role ?? "USER", companyId: u.companyId }
}

export async function getAnnouncements() {
  try {
    const user = await getUser()
    const now = new Date()
    const announcements = await prisma.announcement.findMany({
      where: {
        companyId: user.companyId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: { author: { select: { id: true, name: true } } },
      orderBy: [{ isPinned: "desc" }, { priority: "desc" }, { createdAt: "desc" }],
    })
    return { success: true as const, data: announcements }
  } catch (error) {
    return { success: false as const, error: String(error) }
  }
}

export async function createAnnouncement(data: z.infer<typeof schema>) {
  try {
    const user = await getUser()
    if (!["ADMIN","MANAGER"].includes(user.role)) return { success: false as const, error: "Sem permissão" }
    const v = schema.parse(data)
    const ann = await prisma.announcement.create({
      data: {
        ...v,
        expiresAt: v.expiresAt ? new Date(v.expiresAt) : null,
        companyId: user.companyId,
        authorId: user.id,
      },
    })

    // Notify all company users (except the author)
    const allUsers = await prisma.user.findMany({
      where: { companyId: user.companyId, id: { not: user.id } },
      select: { id: true },
    })
    const userIds = allUsers.map(u => u.id)
    const notifData = {
      type: 'ANNOUNCEMENT',
      title: 'Novo comunicado',
      message: v.title,
      link: '/comunicados',
    }
    await createNotificationForMany({ userIds, companyId: user.companyId, ...notifData })
    notifyUsers(userIds, notifData)

    revalidatePath("/comunicados")
    return { success: true as const, data: ann }
  } catch (error) {
    return { success: false as const, error: String(error) }
  }
}

export async function updateAnnouncement(id: string, data: z.infer<typeof schema>) {
  try {
    const user = await getUser()
    if (!["ADMIN","MANAGER"].includes(user.role)) return { success: false as const, error: "Sem permissão" }
    const v = schema.parse(data)
    const ann = await prisma.announcement.update({
      where: { id },
      data: {
        title: v.title,
        content: v.content,
        priority: v.priority,
        isPinned: v.isPinned,
        expiresAt: v.expiresAt ? new Date(v.expiresAt) : null,
      },
    })
    revalidatePath("/comunicados")
    return { success: true as const, data: ann }
  } catch (error) {
    return { success: false as const, error: String(error) }
  }
}

export async function deleteAnnouncement(id: string) {
  try {
    const user = await getUser()
    if (!["ADMIN","MANAGER"].includes(user.role)) return { success: false as const, error: "Sem permissão" }
    await prisma.announcement.deleteMany({ where: { id, companyId: user.companyId } })
    revalidatePath("/comunicados")
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: String(error) }
  }
}