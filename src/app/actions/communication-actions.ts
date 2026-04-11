'use server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import { createNotificationForMany } from './notification-actions'
import { notifyUsers } from '@/lib/sse-notifications'
import { logCreate, logUpdate, logDelete } from '@/lib/audit-logger'

const schema = z.object({
  title: z.string().min(1, 'Titulo obrigatorio'),
  content: z.string().min(1, 'Conteudo obrigatorio'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  isPinned: z.boolean().default(false),
  targetAudience: z.string().default('ALL'),
  expiresAt: z.string().optional().nullable(),
})

type SessionUser = { id: string; role: string; companyId: string }

async function getUser(): Promise<SessionUser> {
  const session = await getSession()
  if (!session?.user) throw new Error('Nao autenticado')
  const u = session.user as { id?: string; role?: string; companyId?: string }
  if (!u.id || !u.companyId) throw new Error('Sessao invalida')
  return { id: u.id, role: u.role ?? 'USER', companyId: u.companyId }
}

export async function getCommunications() {
  try {
    const user = await getUser()
    const communications = await prisma.announcement.findMany({
      where: { companyId: user.companyId },
      include: {
        author: { select: { id: true, name: true } },
        reads: { select: { userId: true, readAt: true } },
        _count: { select: { reads: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    })
    return { success: true as const, data: communications }
  } catch (error) {
    return { success: false as const, error: String(error) }
  }
}

export async function getCommunicationById(id: string) {
  try {
    const user = await getUser()
    const comm = await prisma.announcement.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true } },
        reads: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { readAt: 'desc' },
        },
        _count: { select: { reads: true } },
      },
    })
    if (!comm || comm.companyId !== user.companyId) {
      return { success: false as const, error: 'Comunicado nao encontrado' }
    }
    return { success: true as const, data: comm }
  } catch (error) {
    return { success: false as const, error: String(error) }
  }
}

export async function createCommunication(data: z.infer<typeof schema>) {
  try {
    const user = await getUser()
    if (!['ADMIN', 'MANAGER'].includes(user.role))
      return { success: false as const, error: 'Sem permissao' }

    const v = schema.parse(data)
    const comm = await prisma.announcement.create({
      data: {
        title: v.title,
        content: v.content,
        priority: v.priority,
        isPinned: v.isPinned,
        targetAudience: v.targetAudience,
        expiresAt: v.expiresAt ? new Date(v.expiresAt) : null,
        companyId: user.companyId,
        authorId: user.id,
      },
    })

    await logCreate('Announcement', comm.id, comm.title, v)

    // Notify target users
    const whereClause: Record<string, unknown> = {
      companyId: user.companyId,
      id: { not: user.id },
    }
    if (v.targetAudience !== 'ALL') {
      whereClause.role = v.targetAudience
    }
    const targetUsers = await prisma.user.findMany({
      where: whereClause,
      select: { id: true },
    })
    const userIds = targetUsers.map((u) => u.id)
    if (userIds.length > 0) {
      const notifData = {
        type: 'ANNOUNCEMENT',
        title: 'Novo comunicado',
        message: v.title,
        link: '/comunicados',
      }
      await createNotificationForMany(userIds, notifData)
      notifyUsers(userIds, notifData)
    }

    revalidatePath('/comunicados')
    return { success: true as const, data: comm }
  } catch (error) {
    return { success: false as const, error: String(error) }
  }
}

export async function updateCommunication(
  id: string,
  data: z.infer<typeof schema>
) {
  try {
    const user = await getUser()
    if (!['ADMIN', 'MANAGER'].includes(user.role))
      return { success: false as const, error: 'Sem permissao' }

    const v = schema.parse(data)
    const oldComm = await prisma.announcement.findUnique({ where: { id } })
    if (!oldComm || oldComm.companyId !== user.companyId) {
      return { success: false as const, error: 'Comunicado nao encontrado' }
    }

    const comm = await prisma.announcement.update({
      where: { id },
      data: {
        title: v.title,
        content: v.content,
        priority: v.priority,
        isPinned: v.isPinned,
        targetAudience: v.targetAudience,
        expiresAt: v.expiresAt ? new Date(v.expiresAt) : null,
      },
    })

    await logUpdate('Announcement', id, comm.title, oldComm, comm)
    revalidatePath('/comunicados')
    return { success: true as const, data: comm }
  } catch (error) {
    return { success: false as const, error: String(error) }
  }
}

export async function deleteCommunication(id: string) {
  try {
    const user = await getUser()
    if (!['ADMIN', 'MANAGER'].includes(user.role))
      return { success: false as const, error: 'Sem permissao' }

    const oldComm = await prisma.announcement.findUnique({ where: { id } })
    if (!oldComm || oldComm.companyId !== user.companyId) {
      return { success: false as const, error: 'Comunicado nao encontrado' }
    }

    await prisma.announcement.delete({ where: { id } })
    await logDelete('Announcement', id, oldComm.title, oldComm)

    revalidatePath('/comunicados')
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: String(error) }
  }
}

export async function markAsRead(announcementId: string) {
  try {
    const user = await getUser()

    // Verify it belongs to user's company
    const comm = await prisma.announcement.findUnique({
      where: { id: announcementId },
      select: { companyId: true },
    })
    if (!comm || comm.companyId !== user.companyId) {
      return { success: false as const, error: 'Comunicado nao encontrado' }
    }

    await prisma.announcementRead.upsert({
      where: {
        announcementId_userId: {
          announcementId,
          userId: user.id,
        },
      },
      create: {
        announcementId,
        userId: user.id,
      },
      update: {},
    })

    revalidatePath('/comunicados')
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: String(error) }
  }
}

export async function getCommunicationStats() {
  try {
    const user = await getUser()
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [total, active, urgent, thisMonth, totalUsers] = await Promise.all([
      prisma.announcement.count({
        where: { companyId: user.companyId },
      }),
      prisma.announcement.count({
        where: {
          companyId: user.companyId,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      prisma.announcement.count({
        where: {
          companyId: user.companyId,
          priority: 'URGENT',
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      prisma.announcement.count({
        where: {
          companyId: user.companyId,
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.user.count({
        where: { companyId: user.companyId, isActive: true },
      }),
    ])

    return {
      success: true as const,
      data: { total, active, urgent, thisMonth, totalUsers },
    }
  } catch (error) {
    return { success: false as const, error: String(error) }
  }
}
