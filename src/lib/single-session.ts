/**
 * Single Session Enforcement
 *
 * Regra de negócio: cada usuário pode estar logado em apenas UM navegador por vez.
 * Se fizer login em outro navegador, a sessão anterior é invalidada.
 * Múltiplas abas no MESMO navegador compartilham o cookie e funcionam normalmente.
 *
 * Integração necessária:
 *   1. Adicionar ao model User no schema.prisma:
 *        activeSessionToken String?
 *        activeSessionAt   DateTime?
 *
 *   2. No login (auth-actions.ts), após gerar o JWT, chamar:
 *        import { onLoginSessionEnforce } from '@/lib/single-session'
 *        const sessionToken = await onLoginSessionEnforce(user.id)
 *        cookieStore.set('session-token', sessionToken, { ... mesmo config do session ... })
 *
 *   3. No logout (auth-actions.ts), chamar:
 *        import { clearActiveSession } from '@/lib/single-session'
 *        await clearActiveSession(userId)
 *        cookieStore.delete('session-token')
 */

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

// -------------------------------------------------------
// Cookie config
// -------------------------------------------------------

const SESSION_TOKEN_COOKIE = 'session-token'

/**
 * Opções de cookie compatíveis com o cookie "session" existente.
 * httpOnly + sameSite lax garante que todas as abas do mesmo navegador
 * compartilham o mesmo token.
 */
function cookieOptions(expires: Date) {
  return {
    name: SESSION_TOKEN_COOKIE,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires,
  }
}

// -------------------------------------------------------
// Core functions
// -------------------------------------------------------

/**
 * Gera um token de sessão único via crypto.randomUUID.
 */
export function generateSessionToken(): string {
  return crypto.randomUUID()
}

/**
 * Salva o token de sessão ativa no banco de dados para o usuário.
 * Qualquer token anterior é sobrescrito — isso invalida sessões em outros navegadores.
 */
export async function storeActiveSession(
  userId: string,
  sessionToken: string,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      activeSessionToken: sessionToken,
    },
  })
}

/**
 * Valida se o token fornecido é a sessão ativa do usuário.
 * Retorna true se o token confere, false caso contrário.
 */
export async function validateSession(
  userId: string,
  sessionToken: string,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeSessionToken: true },
  })

  if (!user || !user.activeSessionToken) {
    return false
  }

  return user.activeSessionToken === sessionToken
}

/**
 * Invalida todas as sessões anteriores do usuário, mantendo apenas o token atual.
 * Na prática, como armazenamos apenas 1 token por usuário, basta sobrescrever.
 * Esta função existe para clareza semântica e pode ser expandida
 * se futuramente houver uma tabela de sessões separada.
 */
export async function invalidateOtherSessions(
  userId: string,
  currentToken: string,
): Promise<void> {
  await storeActiveSession(userId, currentToken)
}

/**
 * Limpa a sessão ativa do usuário (usado no logout).
 */
export async function clearActiveSession(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      activeSessionToken: null,
    },
  })
}

// -------------------------------------------------------
// Convenience: login integration
// -------------------------------------------------------

/**
 * Deve ser chamada no fluxo de login, APÓS autenticação bem-sucedida.
 * Gera um novo token, salva no banco (invalidando sessões anteriores),
 * e seta o cookie no navegador.
 *
 * Retorna o token gerado para referência.
 *
 * @example
 *   // Em auth-actions.ts, após cookieStore.set("session", ...)
 *   const sessionToken = await onLoginSessionEnforce(user.id)
 */
export async function onLoginSessionEnforce(
  userId: string,
  expires?: Date,
): Promise<string> {
  const token = generateSessionToken()

  // Salva no banco — invalida qualquer sessão anterior
  await storeActiveSession(userId, token)

  // Seta cookie para que todas as abas do mesmo navegador compartilhem
  const cookieStore = await cookies()
  const cookieExpires = expires ?? new Date(Date.now() + 24 * 60 * 60 * 1000)
  cookieStore.set(cookieOptions(cookieExpires).name, token, cookieOptions(cookieExpires))

  return token
}

// -------------------------------------------------------
// Convenience: read token from request
// -------------------------------------------------------

/**
 * Lê o session-token do cookie atual (server-side).
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_TOKEN_COOKIE)?.value ?? null
}

/**
 * Lê o session-token de um header Cookie (para API routes com Request).
 */
export function getSessionTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${SESSION_TOKEN_COOKIE}=([^;]*)`)
  )
  return match ? decodeURIComponent(match[1]) : null
}
