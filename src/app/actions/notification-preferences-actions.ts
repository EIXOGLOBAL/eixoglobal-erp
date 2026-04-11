'use server'

import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const preferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  emailDigest: z.boolean().optional(),
})

export async function getNotificationPreferences(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      emailNotifications: true,
      emailDigest: true,
    },
  })

  if (!user) {
    return { error: 'Usuario nao encontrado' }
  }

  return {
    emailNotifications: user.emailNotifications,
    emailDigest: user.emailDigest,
  }
}

export async function updateNotificationPreferences(
  userId: string,
  preferences: { emailNotifications?: boolean; emailDigest?: boolean }
) {
  const parsed = preferencesSchema.safeParse(preferences)
  if (!parsed.success) {
    return { error: 'Dados invalidos' }
  }

  const data: Record<string, boolean> = {}
  if (parsed.data.emailNotifications !== undefined) {
    data.emailNotifications = parsed.data.emailNotifications
  }
  if (parsed.data.emailDigest !== undefined) {
    data.emailDigest = parsed.data.emailDigest
  }

  if (Object.keys(data).length === 0) {
    return { error: 'Nenhuma preferencia para atualizar' }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      emailNotifications: true,
      emailDigest: true,
    },
  })

  return {
    emailNotifications: user.emailNotifications,
    emailDigest: user.emailDigest,
  }
}
