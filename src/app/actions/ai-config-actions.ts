'use server'

import { prisma } from '@/lib/prisma'
import { assertAuthenticated, assertRole } from '@/lib/auth-helpers'
import { logAction } from '@/lib/audit-logger'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'ai-config' })

// ============================================================================
// Tipos
// ============================================================================

export type AIUserSetting = {
  id: string
  name: string | null
  username: string
  role: string
  aiAccessLevel: string | null
  isActive: boolean
}

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Lista todos os usuarios com seu nivel de acesso a IA.
 * Somente ADMIN pode acessar.
 */
export async function getAIUserSettings(): Promise<{ success: boolean; data?: AIUserSetting[]; error?: string }> {
  try {
    const session = await assertAuthenticated()
    await assertRole(session, 'ADMIN')

    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        aiAccessLevel: true,
        isActive: true,
      },
    })

    await logAction('VIEW', 'AIConfig', 'ai-settings', 'Configuracoes de IA', 'Listou configuracoes de IA dos usuarios')

    return {
      success: true,
      data: users.map((u) => ({
        ...u,
        aiAccessLevel: u.aiAccessLevel ?? null,
      })),
    }
  } catch (error) {
    log.error({ err: error }, '[ai-config] Erro ao listar configuracoes')
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

/**
 * Atualiza o nivel de acesso a IA de um usuario.
 * Somente ADMIN pode executar.
 */
export async function updateUserAIAccess(
  userId: string,
  level: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await assertAuthenticated()
    await assertRole(session, 'ADMIN')

    // Validar o nivel
    const validLevels = ['FULL', 'STANDARD', 'BASIC', 'NONE']
    const newLevel = level === 'AUTO' ? null : level

    if (newLevel !== null && !validLevels.includes(newLevel)) {
      return { success: false, error: `Nivel invalido: ${level}` }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, username: true, aiAccessLevel: true },
    })

    if (!user) {
      return { success: false, error: 'Usuario nao encontrado' }
    }

    const oldLevel = user.aiAccessLevel ?? 'AUTO'

    await prisma.user.update({
      where: { id: userId },
      data: { aiAccessLevel: newLevel as any },
    })

    await logAction(
      'UPDATE_AI_ACCESS',
      'User',
      userId,
      user.name || user.username,
      `Nivel de IA alterado de ${oldLevel} para ${newLevel ?? 'AUTO'}`
    )

    revalidatePath('/configuracoes/ia')

    return { success: true }
  } catch (error) {
    log.error({ err: error }, '[ai-config] Erro ao atualizar acesso IA')
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}
