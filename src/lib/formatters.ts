/**
 * Converte Decimal/string/number para number de forma segura
 * Trata null, undefined e NaN retornando 0
 */
export function toNumber(value: any): number {
  if (value === null || value === undefined) return 0
  const num = Number(value)
  return isNaN(num) ? 0 : num
}

/**
 * Formata valor monetário em BRL
 */
export function formatCurrency(value: any): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(toNumber(value))
}

/**
 * Formata percentual
 */
export function formatPercent(value: any, decimals = 2): string {
  return `${toNumber(value).toFixed(decimals)}%`
}

/**
 * Formata número com casas decimais
 */
export function formatDecimal(value: any, decimals = 2): string {
  return toNumber(value).toFixed(decimals)
}

export function formatCNPJ(value: string) {
    return value
        .replace(/\D/g, '')
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .slice(0, 18);
}

export function stripCNPJ(value: string) {
    return value.replace(/\D/g, '');
}

// ── Datas (timezone America/Sao_Paulo, UTC-3) ─────────────────────────────────
const TZ = 'America/Sao_Paulo'

function toDate(value: Date | string | number | null | undefined): Date | null {
    if (value == null) return null
    const d = value instanceof Date ? value : new Date(value)
    return isNaN(d.getTime()) ? null : d
}

/** Formata data dd/mm/yyyy no fuso America/Sao_Paulo */
export function formatDate(value: Date | string | number | null | undefined): string {
    const d = toDate(value)
    if (!d) return '—'
    return d.toLocaleDateString('pt-BR', { timeZone: TZ })
}

/** Formata data+hora dd/mm/yyyy HH:mm no fuso America/Sao_Paulo */
export function formatDateTime(value: Date | string | number | null | undefined): string {
    const d = toDate(value)
    if (!d) return '—'
    return d.toLocaleString('pt-BR', {
        timeZone: TZ,
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })
}

/** Formata hora HH:mm */
export function formatTime(value: Date | string | number | null | undefined): string {
    const d = toDate(value)
    if (!d) return '—'
    return d.toLocaleTimeString('pt-BR', {
        timeZone: TZ, hour: '2-digit', minute: '2-digit',
    })
}

/**
 * Converte string "yyyy-mm-dd" (input type=date) em Date "à meia-noite local SP",
 * evitando off-by-one quando o servidor está em UTC.
 */
export function parseDateLocal(value: string): Date {
    const [y, m, d] = value.split('-').map(Number)
    // Meia-noite UTC-3 em UTC = 03:00 UTC
    return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 3, 0, 0))
}

