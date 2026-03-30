/**
 * Component-related utility functions and helpers
 */

/**
 * Get color classes for status
 */
export const statusColorMap = {
  success: 'text-green-600 bg-green-50 border-green-200',
  error: 'text-red-600 bg-red-50 border-red-200',
  warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  info: 'text-blue-600 bg-blue-50 border-blue-200',
  pending: 'text-gray-600 bg-gray-50 border-gray-200',
}

/**
 * Get badge variant based on status
 */
export function getStatusVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const statusUpper = status.toUpperCase()

  if (['ACTIVE', 'COMPLETED', 'APPROVED', 'SUCCESS'].includes(statusUpper)) {
    return 'default'
  }
  if (['INACTIVE', 'PENDING', 'DRAFT'].includes(statusUpper)) {
    return 'secondary'
  }
  if (['CANCELLED', 'REJECTED', 'ERROR', 'BLOCKED'].includes(statusUpper)) {
    return 'destructive'
  }
  return 'outline'
}

/**
 * Get icon for entity type
 */
export function getEntityIcon(entityType: string): string {
  const icons: Record<string, string> = {
    project: '📁',
    contract: '📄',
    employee: '👤',
    client: '🏢',
    supplier: '🚚',
    task: '✓',
    measurement: '📏',
    payment: '💰',
    document: '📋',
    report: '📊',
  }
  return icons[entityType] || '📌'
}

/**
 * Format file type to readable string
 */
export function getFileTypeLabel(mimeType: string): string {
  const types: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'Word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
    'application/vnd.ms-excel': 'Excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'image/gif': 'GIF',
    'text/plain': 'Text',
    'text/csv': 'CSV',
  }
  return types[mimeType] || 'File'
}

/**
 * Get readable time difference
 */
export function getTimeAgo(date: Date | string): string {
  const now = new Date()
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const diffMs = now.getTime() - dateObj.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'agora mesmo'
  if (diffMins < 60) return `${diffMins}m atrás`
  if (diffHours < 24) return `${diffHours}h atrás`
  if (diffDays < 7) return `${diffDays}d atrás`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}s atrás`
  return `${Math.floor(diffDays / 30)}mo atrás`
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Generate random color for avatar
 */
export function getColorFromString(str: string): string {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-green-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-purple-500',
    'bg-pink-500',
  ]

  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

/**
 * Normalize whitespace in string
 */
export function normalizeWhitespace(str: string): string {
  return str.trim().replace(/\s+/g, ' ')
}

/**
 * Get page title from route
 */
export function getTitleFromRoute(route: string): string {
  const titles: Record<string, string> = {
    '/': 'Dashboard',
    '/projetos': 'Projetos',
    '/contratos': 'Contratos',
    '/clientes': 'Clientes',
    '/fornecedores': 'Fornecedores',
    '/rh': 'Recursos Humanos',
    '/financeiro': 'Financeiro',
    '/relatorios': 'Relatórios',
    '/configuracoes': 'Configurações',
  }

  const path = route.split('?')[0] // Remove query params

  for (const [key, value] of Object.entries(titles)) {
    if (path === key || path.startsWith(key + '/')) {
      return value
    }
  }

  // Extract from URL path
  const segments = path.split('/').filter(Boolean)
  if (segments.length === 0) return 'Dashboard'

  return segments[segments.length - 1]
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Check if value is empty
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as any
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any
  if (obj instanceof Object) {
    const clonedObj: any = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
  return obj
}
