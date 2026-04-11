import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSessionToken, validateSession } from '@/lib/single-session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/session-check
 *
 * Verifica se a sessão atual (cookie session-token) é a sessão ativa do usuário.
 * Usado pelo hook use-session-guard para polling a cada 30s.
 *
 * Responses:
 *   200 { valid: true }
 *   200 { valid: false, reason: "session_replaced" }
 *   401 { valid: false, reason: "not_authenticated" }
 */
export async function GET() {
  try {
    // 1. Verifica se o usuário está autenticado (JWT session)
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { valid: false, reason: 'not_authenticated' },
        { status: 401 },
      )
    }

    // 2. Lê o session-token do cookie
    const sessionToken = await getSessionToken()
    if (!sessionToken) {
      return NextResponse.json(
        { valid: false, reason: 'session_replaced' },
        { status: 200 },
      )
    }

    // 3. Valida contra o banco de dados
    const isValid = await validateSession(session.user.id, sessionToken)

    if (!isValid) {
      return NextResponse.json({
        valid: false,
        reason: 'session_replaced',
        message: 'Sua sessão foi encerrada pois um novo login foi detectado.',
      })
    }

    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('[session-check] error:', error)
    // Em caso de erro no banco, não invalidar a sessão do usuário.
    // Melhor retornar valid: true e logar o erro do que fazer logout indevido.
    return NextResponse.json({ valid: true })
  }
}
