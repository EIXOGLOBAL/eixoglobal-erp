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
