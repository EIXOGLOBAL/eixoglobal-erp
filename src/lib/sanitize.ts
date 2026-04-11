/**
 * Biblioteca de sanitizacao de inputs para o ERP
 * Funcoes puras, sem dependencias externas
 */

// ── Tipos ────────────────────────────────────────────────────────────────────

type SanitizationFn = (value: string) => string | null

export interface SanitizationRules {
  [field: string]: SanitizationFn | SanitizationFn[]
}

// ── Mapa de entidades HTML ───────────────────────────────────────────────────

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&#x2F;': '/',
  '&#96;': '`',
  '&apos;': "'",
  '&nbsp;': ' ',
  '&copy;': '(c)',
  '&reg;': '(R)',
  '&trade;': '(TM)',
  '&hellip;': '...',
  '&mdash;': '-',
  '&ndash;': '-',
}

// ── Sanitizacao HTML / XSS ──────────────────────────────────────────────────

/**
 * Remove TODAS as tags HTML, decodifica entidades.
 * Previne XSS removendo scripts, event handlers e protocolos perigosos.
 */
export function sanitizeHtml(input: string): string {
  if (!input) return ''

  let result = input

  // Remove tags de script com conteudo
  result = result.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')

  // Remove tags de style com conteudo
  result = result.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')

  // Remove comentarios HTML
  result = result.replace(/<!--[\s\S]*?-->/g, '')

  // Remove TODAS as tags HTML
  result = result.replace(/<\/?[^>]+(>|$)/g, '')

  // Decodifica entidades HTML numericas (decimal)
  result = result.replace(/&#(\d+);/g, (_match, code) => {
    const num = parseInt(code, 10)
    return num > 0 && num < 0x10ffff ? String.fromCodePoint(num) : ''
  })

  // Decodifica entidades HTML numericas (hex)
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_match, code) => {
    const num = parseInt(code, 16)
    return num > 0 && num < 0x10ffff ? String.fromCodePoint(num) : ''
  })

  // Decodifica entidades HTML nomeadas
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    result = result.replaceAll(entity, char)
  }

  // Remove protocolos perigosos (javascript:, data:, vbscript:)
  result = result.replace(/(?:java|vb)script\s*:/gi, '')
  result = result.replace(/data\s*:[^,]*,/gi, '')

  // Remove event handlers on*
  result = result.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
  result = result.replace(/on\w+\s*=\s*[^\s>]*/gi, '')

  // Remove expression() CSS
  result = result.replace(/expression\s*\(/gi, '')

  return result.trim()
}

// ── Sanitizacao de String ───────────────────────────────────────────────────

/**
 * Trim, normaliza espacos em branco, remove caracteres de controle.
 */
export function sanitizeString(input: string): string {
  if (!input) return ''

  let result = input

  // Remove caracteres de controle (exceto tab, newline, carriage return)
  // eslint-disable-next-line no-control-regex
  result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Remove zero-width characters e outros invisiveis Unicode
  result = result.replace(/[\u200B-\u200F\u2028-\u202F\uFEFF\u00AD]/g, '')

  // Normaliza multiplos espacos em branco para um unico espaco
  result = result.replace(/[^\S\n]+/g, ' ')

  // Normaliza multiplas quebras de linha para no maximo duas
  result = result.replace(/\n{3,}/g, '\n\n')

  return result.trim()
}

// ── Sanitizacao de Email ────────────────────────────────────────────────────

/**
 * Valida e normaliza email (lowercase, trim).
 * Retorna null se invalido.
 */
export function sanitizeEmail(input: string): string | null {
  if (!input) return null

  const email = input.trim().toLowerCase()

  if (!isValidEmail(email)) return null

  return email
}

// ── Sanitizacao de CPF ──────────────────────────────────────────────────────

/**
 * Valida CPF com digitos verificadores (modulo 11), retorna apenas digitos ou null.
 */
export function sanitizeCPF(input: string): string | null {
  if (!input) return null

  const digits = input.replace(/\D/g, '')

  if (digits.length !== 11) return null
  if (!isValidCPF(digits)) return null

  return digits
}

// ── Sanitizacao de CNPJ ─────────────────────────────────────────────────────

/**
 * Valida CNPJ com digitos verificadores (modulo 11), retorna apenas digitos ou null.
 */
export function sanitizeCNPJ(input: string): string | null {
  if (!input) return null

  const digits = input.replace(/\D/g, '')

  if (digits.length !== 14) return null
  if (!isValidCNPJ(digits)) return null

  return digits
}

// ── Sanitizacao de CEP ──────────────────────────────────────────────────────

/**
 * Valida formato CEP (8 digitos), retorna formatado (XXXXX-XXX) ou null.
 */
export function sanitizeCEP(input: string): string | null {
  if (!input) return null

  const digits = input.replace(/\D/g, '')

  if (!isValidCEP(digits)) return null

  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

// ── Sanitizacao de Telefone ─────────────────────────────────────────────────

/**
 * Valida telefone BR, retorna apenas digitos ou null.
 * Aceita formatos: (XX) XXXX-XXXX, (XX) XXXXX-XXXX, com ou sem +55.
 */
export function sanitizePhone(input: string): string | null {
  if (!input) return null

  let digits = input.replace(/\D/g, '')

  // Remove codigo do pais 55 se presente
  if (digits.length === 13 && digits.startsWith('55')) {
    digits = digits.slice(2)
  } else if (digits.length === 12 && digits.startsWith('55')) {
    digits = digits.slice(2)
  }

  if (!isValidPhone(digits)) return null

  return digits
}

// ── Sanitizacao de URL ──────────────────────────────────────────────────────

/**
 * Valida URL (deve ser https), previne protocolo javascript:.
 * Retorna null se invalida.
 */
export function sanitizeUrl(input: string): string | null {
  if (!input) return null

  const trimmed = input.trim()

  // Bloqueia protocolos perigosos antes mesmo de parsear
  const lowerInput = trimmed.toLowerCase().replace(/\s/g, '')
  if (
    lowerInput.startsWith('javascript:') ||
    lowerInput.startsWith('vbscript:') ||
    lowerInput.startsWith('data:')
  ) {
    return null
  }

  try {
    const url = new URL(trimmed)

    // Exige HTTPS
    if (url.protocol !== 'https:') return null

    // Revalida apos parsing (protecao contra bypasses via URL encoding)
    if (url.href.toLowerCase().includes('javascript:')) return null

    return url.href
  } catch {
    return null
  }
}

// ── Sanitizacao de Filename ─────────────────────────────────────────────────

/**
 * Remove caracteres de caminho (../ \), substitui caracteres especiais,
 * trunca para 255 caracteres.
 */
export function sanitizeFilename(input: string): string {
  if (!input) return 'unnamed'

  let result = input

  // Remove path traversal
  result = result.replace(/\.\.\//g, '')
  result = result.replace(/\.\.\\/g, '')
  result = result.replace(/\.\./g, '')

  // Remove barras e backslashes
  result = result.replace(/[/\\]/g, '')

  // Remove caracteres perigosos: < > : " | ? * e null bytes
  result = result.replace(/[<>:"|?*\x00]/g, '')

  // Remove espacos no inicio e final
  result = result.trim()

  // Remove pontos no inicio (arquivos ocultos em Unix)
  result = result.replace(/^\.+/, '')

  // Substitui espacos multiplos por underscore
  result = result.replace(/\s+/g, '_')

  // Trunca para 255 caracteres (limite filesystem)
  if (result.length > 255) {
    // Preserva a extensao do arquivo
    const lastDot = result.lastIndexOf('.')
    if (lastDot > 0 && lastDot > result.length - 20) {
      const ext = result.slice(lastDot)
      const name = result.slice(0, 255 - ext.length)
      result = name + ext
    } else {
      result = result.slice(0, 255)
    }
  }

  // Se ficou vazio apos sanitizacao
  if (!result || result === '.' || result === '..') {
    return 'unnamed'
  }

  return result
}

// ── Sanitizacao de Search Query ─────────────────────────────────────────────

const MAX_SEARCH_QUERY_LENGTH = 500

/**
 * Remove padroes de injecao SQL-like, limita comprimento.
 */
export function sanitizeSearchQuery(input: string): string {
  if (!input) return ''

  let result = input.trim()

  // Limita comprimento
  result = result.slice(0, MAX_SEARCH_QUERY_LENGTH)

  // Remove comentarios SQL
  result = result.replace(/\/\*[\s\S]*?\*\//g, '')
  result = result.replace(/--.*$/gm, '')

  // Remove padroes de injecao SQL comuns (case-insensitive, word boundary)
  const sqlPatterns = [
    /\b(UNION\s+(ALL\s+)?SELECT)\b/gi,
    /\b(INSERT\s+INTO)\b/gi,
    /\b(DELETE\s+FROM)\b/gi,
    /\b(DROP\s+TABLE)\b/gi,
    /\b(ALTER\s+TABLE)\b/gi,
    /\b(UPDATE\s+\w+\s+SET)\b/gi,
    /\b(CREATE\s+TABLE)\b/gi,
    /\b(EXEC(UTE)?)\s*\(/gi,
    /\b(xp_\w+)/gi,
    /\b(SLEEP\s*\()/gi,
    /\b(BENCHMARK\s*\()/gi,
    /\b(WAITFOR\s+DELAY)/gi,
    /\b(LOAD_FILE\s*\()/gi,
    /\b(INTO\s+(OUT|DUMP)FILE)\b/gi,
  ]

  for (const pattern of sqlPatterns) {
    result = result.replace(pattern, '')
  }

  // Remove ponto e virgula (terminador de statement SQL)
  result = result.replace(/;/g, '')

  // Remove caracteres de controle
  // eslint-disable-next-line no-control-regex
  result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Normaliza espacos
  result = result.replace(/\s+/g, ' ').trim()

  return result
}

// ── Escape para Prisma LIKE ─────────────────────────────────────────────────

/**
 * Escapa caracteres especiais para queries LIKE do Prisma.
 * Escapa %, _ e \ que sao wildcards em SQL LIKE.
 */
export function escapeForPrisma(input: string): string {
  if (!input) return ''

  return input
    .replace(/\\/g, '\\\\')   // escape backslash primeiro
    .replace(/%/g, '\\%')     // escape wildcard %
    .replace(/_/g, '\\_')     // escape wildcard _
}

// ── Validacao de CPF ────────────────────────────────────────────────────────

/**
 * Validacao completa de CPF com digitos verificadores (modulo 11).
 * Recebe string contendo apenas 11 digitos.
 *
 * Algoritmo:
 * 1. Rejeita sequencias com todos os digitos iguais
 * 2. Primeiro digito verificador: soma ponderada (10..2) dos 9 primeiros, modulo 11
 * 3. Segundo digito verificador: soma ponderada (11..2) dos 10 primeiros, modulo 11
 */
export function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '')

  if (digits.length !== 11) return false

  // Rejeita CPFs com todos os digitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(digits)) return false

  // Calcula primeiro digito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10) remainder = 0
  if (remainder !== parseInt(digits[9])) return false

  // Calcula segundo digito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i]) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10) remainder = 0
  if (remainder !== parseInt(digits[10])) return false

  return true
}

// ── Validacao de CNPJ ───────────────────────────────────────────────────────

/**
 * Validacao completa de CNPJ com digitos verificadores (modulo 11).
 * Recebe string contendo apenas 14 digitos.
 *
 * Algoritmo:
 * 1. Rejeita sequencias com todos os digitos iguais
 * 2. Primeiro digito: pesos [5,4,3,2,9,8,7,6,5,4,3,2] sobre os 12 primeiros
 * 3. Segundo digito: pesos [6,5,4,3,2,9,8,7,6,5,4,3,2] sobre os 13 primeiros
 * 4. Resto < 2 => verificador = 0, senao => verificador = 11 - resto
 */
export function isValidCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '')

  if (digits.length !== 14) return false

  // Rejeita CNPJs com todos os digitos iguais
  if (/^(\d)\1{13}$/.test(digits)) return false

  // Pesos para calculo do primeiro digito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * weights1[i]
  }
  let remainder = sum % 11
  const firstCheck = remainder < 2 ? 0 : 11 - remainder
  if (firstCheck !== parseInt(digits[12])) return false

  // Pesos para calculo do segundo digito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  sum = 0
  for (let i = 0; i < 13; i++) {
    sum += parseInt(digits[i]) * weights2[i]
  }
  remainder = sum % 11
  const secondCheck = remainder < 2 ? 0 : 11 - remainder
  if (secondCheck !== parseInt(digits[13])) return false

  return true
}

// ── Validacao de Email ──────────────────────────────────────────────────────

/**
 * Valida formato de email.
 * Padrao RFC 5322 simplificado para uso pratico.
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false

  // Regex robusta para email
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/

  if (!emailRegex.test(email)) return false

  // Local part nao pode ter mais de 64 caracteres
  const [localPart] = email.split('@')
  if (localPart.length > 64) return false

  // Nao permite pontos consecutivos no local part
  if (/\.{2,}/.test(localPart)) return false

  return true
}

// ── Validacao de Telefone BR ────────────────────────────────────────────────

/**
 * Valida telefone brasileiro.
 * Aceita 10 digitos (fixo) ou 11 digitos (celular com 9).
 * DDD valido: 11-99 (sem 00-10).
 */
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')

  // 10 digitos = fixo (DDD + 8 digitos)
  // 11 digitos = celular (DDD + 9 + 8 digitos)
  if (digits.length !== 10 && digits.length !== 11) return false

  // DDD deve estar entre 11 e 99
  const ddd = parseInt(digits.slice(0, 2))
  if (ddd < 11 || ddd > 99) return false

  // Se 11 digitos, o nono digito deve ser 9
  if (digits.length === 11 && digits[2] !== '9') return false

  // O primeiro digito do numero (apos DDD e possivel 9) nao pode ser 0
  const numberStart = digits.length === 11 ? 3 : 2
  if (digits[numberStart] === '0') return false

  return true
}

// ── Validacao de CEP ────────────────────────────────────────────────────────

/**
 * Valida CEP brasileiro (8 digitos).
 * Nao aceita CEPs zerados.
 */
export function isValidCEP(cep: string): boolean {
  const digits = cep.replace(/\D/g, '')

  if (digits.length !== 8) return false

  // Nao aceita CEP zerado
  if (/^0{8}$/.test(digits)) return false

  return true
}

// ── Sanitizacao de Objetos ──────────────────────────────────────────────────

/**
 * Aplica regras de sanitizacao a campos de um objeto.
 * Retorna um novo objeto com os campos sanitizados.
 *
 * @example
 * const rules: SanitizationRules = {
 *   name: sanitizeString,
 *   email: sanitizeEmail,
 *   cpf: sanitizeCPF,
 *   description: [sanitizeString, sanitizeHtml],
 * }
 * const sanitized = sanitizeObject(formData, rules)
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  rules: SanitizationRules
): T {
  const result = { ...obj }

  for (const [field, rule] of Object.entries(rules)) {
    if (!(field in result)) continue

    const value = result[field as keyof T]

    // So sanitiza strings
    if (typeof value !== 'string') continue

    if (Array.isArray(rule)) {
      // Aplica multiplas funcoes de sanitizacao em sequencia
      let sanitized: string | null = value
      for (const fn of rule) {
        if (sanitized === null) break
        sanitized = fn(sanitized)
      }
      ;(result as any)[field] = sanitized
    } else {
      ;(result as any)[field] = rule(value)
    }
  }

  return result
}
