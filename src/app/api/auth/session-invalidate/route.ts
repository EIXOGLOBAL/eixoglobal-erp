import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { clearActiveSession } from '@/lib/single-session'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/session-invalidate
 *
 * Endpoint ADMIN-only para forçar logout de um usuário.
 * Invalida a sessão ativa do usuário especificado.
 *
 * Body: { userId: string }
 *
 * Uso: incidentes de segurança, bloqueio de contas, etc.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verifica se o chamador é ADMIN
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado.' },
        { status: 401 },
      )
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem forçar logout.' },
        { status: 403 },
      )
    }

    // 2. Lê o userId do body
    const body = await request.json().catch(() => null)
    const targetUserId = body?.userId

    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json(
        { error: 'Parâmetro userId é obrigatório.' },
        { status: 400 },
      )
    }

    // 3. Verifica se o usuário-alvo existe
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true, activeSessionToken: true },
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado.' },
        { status: 404 },
      )
    }

    // 4. Verifica se há sessão ativa para invalidar
    if (!targetUser.activeSessionToken) {
      return NextResponse.json({
        success: true,
        message: `Usuário ${targetUser.username} não possui sessão ativa.`,
        alreadyInactive: true,
      })
    }

    // 5. Invalida a sessão
    await clearActiveSession(targetUserId)

    return NextResponse.json({
      success: true,
      message: `Sessão do usuário ${targetUser.username} foi invalidada com sucesso.`,
    })
  } catch (error) {
    console.error('[session-invalidate] error:', error)
    return NextResponse.json(
      { error: 'Erro interno ao invalidar sessão.' },
      { status: 500 },
    )
  }
}
