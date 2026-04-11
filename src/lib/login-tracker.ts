// Rastreamento de eventos de login para o ERP Eixo Global
// Usa o modelo AuditLog do Prisma como armazenamento persistente

import { prisma } from '@/lib/prisma'
import { parseUserAgent, type ParsedUserAgent } from '@/lib/user-agent-parser'
import { maskIP, isPrivateIP } from '@/lib/ip-utils'

// ============================================================================
// TIPOS
// ============================================================================

export type LoginEvent = {
  id: string
  userId: string | null
  ip: string
  ipMasked: string
  userAgent: string | null
  parsedUA: ParsedUserAgent
  success: boolean
  action: string
  reason: string | null
  createdAt: Date
}

export type LoginHistoryResult = {
  events: LoginEvent[]
  total: number
}

// ============================================================================
// REGISTRO DE EVENTOS
// ============================================================================

/**
 * Registra uma tentativa de login (sucesso ou falha).
 * Os dados são gravados no AuditLog com action LOGIN_SUCCESS ou LOGIN_FAILED.
 *
 * @param userId - ID do usuário (null se o usuário não foi encontrado)
 * @param ip - Endereço IP do cliente
 * @param userAgent - String User-Agent do navegador
 * @param success - Se a autenticação foi bem-sucedida
 * @param reason - Razão da falha (opcional, ex: "invalid_password", "account_blocked")
 */
export async function recordLogin(
  userId: string | null,
  ip: string,
  userAgent: string | null,
  success: boolean,
  reason?: string
): Promise<void> {
  try {
    const parsed = parseUserAgent(userAgent)

    await prisma.auditLog.create({
      data: {
        action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
        entity: 'Session',
        entityName: success ? 'Login bem-sucedido' : 'Tentativa de login',
        userId: userId ?? null,
        ipAddress: ip,
        userAgent: userAgent ?? null,
        reason: reason ?? null,
        details: JSON.stringify({
          browser: parsed.browser,
          version: parsed.version,
          os: parsed.os,
          device: parsed.device,
          isPrivateIP: isPrivateIP(ip),
        }),
      },
    })
  } catch (error) {
    console.error('[login-tracker] Falha ao registrar login:', error)
  }
}

/**
 * Registra um evento de logout.
 */
export async function recordLogout(userId: string): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: 'LOGOUT',
        entity: 'Session',
        entityName: 'Logout',
        userId,
      },
    })
  } catch (error) {
    console.error('[login-tracker] Falha ao registrar logout:', error)
  }
}

// ============================================================================
// CONSULTAS
// ============================================================================

/**
 * Retorna o histórico de login de um usuário, ordenado do mais recente ao mais antigo.
 *
 * @param userId - ID do usuário
 * @param limit - Número máximo de registros (padrão: 50)
 *
 * @example
 * const history = await getLoginHistory(userId, 20)
 * history.events.forEach(e => console.log(e.ip, e.parsedUA.browser, e.success))
 */
export async function getLoginHistory(
  userId: string,
  limit: number = 50
): Promise<LoginHistoryResult> {
  try {
    const where = {
      userId,
      action: { in: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT'] },
    }

    const [records, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 200),
      }),
      prisma.auditLog.count({ where }),
    ])

    const events: LoginEvent[] = records.map((r) => ({
      id: r.id,
      userId: r.userId,
      ip: r.ipAddress ?? '',
      ipMasked: maskIP(r.ipAddress ?? ''),
      userAgent: r.userAgent,
      parsedUA: parseUserAgent(r.userAgent),
      success: r.action === 'LOGIN_SUCCESS',
      action: r.action,
      reason: r.reason,
      createdAt: r.createdAt,
    }))

    return { events, total }
  } catch (error) {
    console.error('[login-tracker] Falha ao buscar histórico:', error)
    return { events: [], total: 0 }
  }
}

/**
 * Conta o número de tentativas de login falhadas de um IP
 * nos últimos N minutos. Útil para detecção de brute-force.
 *
 * @param ip - Endereço IP para verificar
 * @param minutes - Janela de tempo em minutos (padrão: 30)
 *
 * @example
 * const fails = await getFailedAttempts('203.0.113.45', 15)
 * if (fails >= 5) { // bloquear IP }
 */
export async function getFailedAttempts(
  ip: string,
  minutes: number = 30
): Promise<number> {
  try {
    const since = new Date(Date.now() - minutes * 60 * 1000)

    return await prisma.auditLog.count({
      where: {
        action: 'LOGIN_FAILED',
        ipAddress: ip,
        createdAt: { gte: since },
      },
    })
  } catch (error) {
    console.error('[login-tracker] Falha ao contar tentativas:', error)
    return 0
  }
}

/**
 * Detecta se um login está vindo de um IP novo/desconhecido para o usuário.
 * Compara o IP atual com os IPs usados em logins anteriores bem-sucedidos.
 *
 * Retorna um objeto com:
 * - `isNew`: true se o IP nunca foi usado pelo usuário
 * - `knownIPs`: lista de IPs conhecidos (mascarados para segurança)
 * - `lastLoginFromIP`: data do último login deste IP (null se novo)
 * - `totalUniqueIPs`: quantidade de IPs distintos já usados
 *
 * @example
 * const result = await detectSuspiciousLogin(userId, '203.0.113.45')
 * if (result.isNew) {
 *   // Enviar notificação de segurança ao usuário
 * }
 */
export async function detectSuspiciousLogin(
  userId: string,
  ip: string
): Promise<{
  isNew: boolean
  knownIPs: string[]
  lastLoginFromIP: Date | null
  totalUniqueIPs: number
}> {
  try {
    // Buscar todos os logins bem-sucedidos do usuário (últimos 90 dias)
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

    const successfulLogins = await prisma.auditLog.findMany({
      where: {
        userId,
        action: 'LOGIN_SUCCESS',
        createdAt: { gte: since },
        ipAddress: { not: null },
      },
      select: {
        ipAddress: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Extrair IPs únicos
    const ipSet = new Set<string>()
    let lastLoginFromIP: Date | null = null

    for (const login of successfulLogins) {
      if (login.ipAddress) {
        ipSet.add(login.ipAddress)

        if (login.ipAddress === ip && !lastLoginFromIP) {
          lastLoginFromIP = login.createdAt
        }
      }
    }

    const isNew = !ipSet.has(ip)
    const knownIPs = Array.from(ipSet).map(maskIP)

    return {
      isNew,
      knownIPs,
      lastLoginFromIP,
      totalUniqueIPs: ipSet.size,
    }
  } catch (error) {
    console.error('[login-tracker] Falha na detecção de IP suspeito:', error)
    // Em caso de erro, assume que é novo (mais seguro)
    return {
      isNew: true,
      knownIPs: [],
      lastLoginFromIP: null,
      totalUniqueIPs: 0,
    }
  }
}
