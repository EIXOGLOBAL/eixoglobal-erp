// Parser simples de User-Agent — sem dependências externas
// Detecta navegador, versão, SO e tipo de dispositivo

export type ParsedUserAgent = {
  browser: string
  version: string
  os: string
  device: 'Desktop' | 'Mobile' | 'Tablet' | 'Desconhecido'
}

// ============================================================================
// PADRÕES DE NAVEGADORES (ordem importa: Edge antes de Chrome, Chrome antes de Safari)
// ============================================================================

const BROWSER_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'Edge', regex: /Edg(?:e|A|iOS)?\/(\d+[\d.]*)/ },
  { name: 'Opera', regex: /(?:OPR|Opera)\/(\d+[\d.]*)/ },
  { name: 'Samsung Internet', regex: /SamsungBrowser\/(\d+[\d.]*)/ },
  { name: 'Firefox', regex: /Firefox\/(\d+[\d.]*)/ },
  { name: 'Chrome', regex: /Chrome\/(\d+[\d.]*)/ },
  { name: 'Safari', regex: /Version\/(\d+[\d.]*).*Safari/ },
  { name: 'Internet Explorer', regex: /(?:MSIE |rv:)(\d+[\d.]*)/ },
]

// ============================================================================
// PADRÕES DE SISTEMA OPERACIONAL
// ============================================================================

const OS_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'iOS', regex: /(?:iPhone|iPad|iPod).*OS (\d+[_\d]*)/ },
  { name: 'Android', regex: /Android (\d+[\d.]*)/ },
  { name: 'Windows', regex: /Windows NT (\d+\.\d+)/ },
  { name: 'macOS', regex: /Mac OS X (\d+[_.\d]*)/ },
  { name: 'Linux', regex: /Linux/ },
  { name: 'Chrome OS', regex: /CrOS/ },
]

// Mapeamento amigável de versões Windows NT
const WINDOWS_VERSION_MAP: Record<string, string> = {
  '10.0': '10/11',
  '6.3': '8.1',
  '6.2': '8',
  '6.1': '7',
  '6.0': 'Vista',
  '5.1': 'XP',
}

// ============================================================================
// PARSER PRINCIPAL
// ============================================================================

/**
 * Analisa uma string User-Agent e retorna informações estruturadas.
 * Retorna "Desconhecido" para valores que não puderem ser identificados.
 *
 * @example
 * parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0')
 * // { browser: 'Chrome', version: '120.0', os: 'Windows 10/11', device: 'Desktop' }
 */
export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  if (!ua || typeof ua !== 'string') {
    return {
      browser: 'Desconhecido',
      version: '',
      os: 'Desconhecido',
      device: 'Desconhecido',
    }
  }

  return {
    browser: detectBrowser(ua),
    version: detectVersion(ua),
    os: detectOS(ua),
    device: detectDevice(ua),
  }
}

// ============================================================================
// DETECÇÃO INDIVIDUAL
// ============================================================================

function detectBrowser(ua: string): string {
  for (const { name, regex } of BROWSER_PATTERNS) {
    if (regex.test(ua)) return name
  }

  // Bots e crawlers
  if (/bot|crawl|spider|curl|wget|python|go-http/i.test(ua)) {
    return 'Bot'
  }

  return 'Desconhecido'
}

function detectVersion(ua: string): string {
  for (const { regex } of BROWSER_PATTERNS) {
    const match = ua.match(regex)
    if (match?.[1]) return match[1]
  }
  return ''
}

function detectOS(ua: string): string {
  for (const { name, regex } of OS_PATTERNS) {
    const match = ua.match(regex)
    if (match) {
      if (name === 'Windows' && match[1]) {
        const friendly = WINDOWS_VERSION_MAP[match[1]]
        return friendly ? `Windows ${friendly}` : `Windows`
      }
      if (name === 'macOS' && match[1]) {
        const version = match[1].replace(/_/g, '.')
        return `macOS ${version}`
      }
      if (name === 'iOS' && match[1]) {
        const version = match[1].replace(/_/g, '.')
        return `iOS ${version}`
      }
      if (name === 'Android' && match[1]) {
        return `Android ${match[1]}`
      }
      return name
    }
  }

  return 'Desconhecido'
}

function detectDevice(ua: string): ParsedUserAgent['device'] {
  // Tablets primeiro (antes de mobile, pois iPads tambem podem ter "Mobile")
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) {
    return 'Tablet'
  }

  // Mobile
  if (/iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry|Opera Mini|IEMobile/i.test(ua)) {
    return 'Mobile'
  }

  // Se tem um UA valido com padrao de desktop
  if (/Windows NT|Macintosh|X11|CrOS/i.test(ua)) {
    return 'Desktop'
  }

  return 'Desconhecido'
}
