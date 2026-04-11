/**
 * Headers de segurança aplicados a todas as respostas.
 * Compatíveis com Cloudflare proxy (não conflitam com headers que o CF injeta).
 */
export const securityHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  // HSTS — instruir navegadores a sempre usar HTTPS.
  // 2 anos (63 072 000s), incluir subdomínios, habilitar preload list.
  // Cloudflare respeita e não sobrescreve quando definido pela origem.
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
}
