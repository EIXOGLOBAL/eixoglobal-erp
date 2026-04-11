/**
 * Extrai o IP real do cliente a partir dos headers da request,
 * com prioridade otimizada para proxy Cloudflare.
 *
 * Ordem de prioridade:
 *   1. CF-Connecting-IP  — Cloudflare define com o IP real do visitante
 *   2. X-Real-IP         — Nginx / proxies reversos tradicionais
 *   3. X-Forwarded-For   — primeiro IP da cadeia (IP original do cliente)
 *   4. Fallback          — '127.0.0.1'
 *
 * Aceita tanto um objeto `Request` (middleware / route handlers) quanto
 * um `Headers` (server actions via `await headers()`).
 */
export function getClientIP(source: Request | Headers): string {
  const h = source instanceof Headers ? source : source.headers

  // 1. Cloudflare — header mais confiável quando atrás do CF
  const cfIp = h.get('cf-connecting-ip')
  if (cfIp) return cfIp.trim()

  // 2. X-Real-IP — definido por Nginx e alguns load-balancers
  const realIp = h.get('x-real-ip')
  if (realIp) return realIp.trim()

  // 3. X-Forwarded-For — pode conter cadeia "client, proxy1, proxy2"
  const forwarded = h.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }

  return '127.0.0.1'
}
