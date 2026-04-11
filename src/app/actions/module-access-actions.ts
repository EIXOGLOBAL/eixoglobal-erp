'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { logAction } from '@/lib/audit-logger'
import { MODULES } from '@/lib/module-permissions'
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'module-access' })

export async function getUserModuleAccess(userId: string) {
  const session = await getSession()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { success: false as const, error: 'Não autorizado' }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      role: true,
      ...Object.fromEntries(MODULES.map(m => [m.permissionField, true])),
    },
  })

  if (!user) return { success: false as const, error: 'Usuário não encontrado' }
  return { success: true as const, data: user }
}

export async function updateUserModuleAccess(
  userId: string,
  modules: Record<string, boolean>
) {
  const session = await getSession()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { success: false as const, error: 'Não autorizado' }
  }

  try {
    // Only allow updating valid module fields
    const validFields = MODULES.map(m => m.permissionField)
    const updateData: Record<string, boolean> = {}

    for (const [key, value] of Object.entries(modules)) {
      if (validFields.includes(key)) {
        updateData[key] = value
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    })

    await logAction(
      'UPDATE_MODULE_ACCESS',
      'User',
      userId,
      user.name || 'N/A',
      `Módulos atualizados: ${Object.entries(updateData).filter(([, v]) => v).map(([k]) => k).join(', ') || 'nenhum'}`
    )

    revalidatePath('/users')
    revalidatePath('/configuracoes')
    return { success: true as const, data: user }
  } catch (error) {
    log.error({ err: error }, 'Erro ao atualizar acesso aos módulos')
    return { success: false as const, error: 'Erro ao atualizar acesso' }
  }
}

export async function setAllModuleAccess(userId: string, enabled: boolean) {
  const session = await getSession()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { success: false as const, error: 'Não autorizado' }
  }

  try {
    const updateData: Record<string, boolean> = {}
    for (const mod of MODULES) {
      updateData[mod.permissionField] = enabled
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    })

    await logAction(
      'UPDATE_MODULE_ACCESS',
      'User',
      userId,
      user.name || 'N/A',
      enabled ? 'Acesso total concedido' : 'Todos os módulos removidos'
    )

    revalidatePath('/users')
    return { success: true as const, data: user }
  } catch (error) {
    log.error({ err: error }, 'Erro ao atualizar acesso aos módulos')
    return { success: false as const, error: 'Erro ao atualizar acesso' }
  }
}
