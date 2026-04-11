// Utilitários de IP para o ERP — extração, validação e mascaramento

// ============================================================================
// EXTRAÇÃO DE IP DO CLIENT
// ============================================================================

// Re-export da função centralizada com prioridade Cloudflare
export { getClientIP } from './get-client-ip'

// ============================================================================
// VALIDAÇÃO DE IP PRIVADO
// ============================================================================

/**
 * Verifica se um IP é privado (RFC 1918) ou loopback.
 * Suporta IPv4 e IPv6 loopback.
 *
 * @example
 * isPrivateIP('192.168.1.1')  // true
 * isPrivateIP('8.8.8.8')      // false
 * isPrivateIP('::1')           // true
 */
export function isPrivateIP(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false

  const trimmed = ip.trim()

  // IPv6 loopback
  if (trimmed === '::1') return true

  // IPv4 loopback
  if (trimmed === '127.0.0.1' || trimmed.startsWith('127.')) return true

  // Extrair octetos para IPv4
  const parts = trimmed.split('.')
  if (parts.length !== 4) return false

  const octets = parts.map(Number)
  if (octets.some((o) => isNaN(o) || o < 0 || o > 255)) return false

  const [a, b] = octets

  // 10.0.0.0/8 — Classe A privada
  if (a === 10) return true

  // 172.16.0.0/12 — Classe B privada
  if (a === 172 && b >= 16 && b <= 31) return true

  // 192.168.0.0/16 — Classe C privada
  if (a === 192 && b === 168) return true

  // 169.254.0.0/16 — Link-local
  if (a === 169 && b === 254) return true

  return false
}

// ============================================================================
// MASCARAMENTO DE IP PARA EXIBIÇÃO
// ============================================================================

/**
 * Mascara parcialmente um IP para exibição segura.
 * IPv4: mantém os 2 primeiros octetos  — "203.0.xxx.xxx"
 * IPv6: mantém o primeiro grupo          — "2001:xxxx:xxxx:..."
 * Loopback retorna sem máscara.
 *
 * @example
 * maskIP('203.0.113.45')         // "203.0.xxx.xxx"
 * maskIP('2001:db8::1')          // "2001:xxxx:xxxx:xxxx"
 * maskIP('127.0.0.1')            // "127.0.0.1"
 */
export function maskIP(ip: string): string {
  if (!ip || typeof ip !== 'string') return 'Desconhecido'

  const trimmed = ip.trim()

  // Não mascara loopback — informação não sensível
  if (trimmed === '127.0.0.1' || trimmed === '::1') return trimmed

  // IPv4
  if (trimmed.includes('.')) {
    const parts = trimmed.split('.')
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`
    }
    return trimmed
  }

  // IPv6
  if (trimmed.includes(':')) {
    const firstGroup = trimmed.split(':')[0]
    return `${firstGroup}:xxxx:xxxx:xxxx`
  }

  return 'Desconhecido'
}
