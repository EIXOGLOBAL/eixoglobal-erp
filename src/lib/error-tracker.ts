import { createIssue, isGitHubConfigured } from './github-client'

interface TrackedError {
  message: string
  stack?: string
  componentStack?: string
  url?: string
  timestamp: Date
  count: number
  lastSeen: Date
  issueUrl?: string
}

// In-memory error deduplication (per server instance)
const errorRegistry = new Map<string, TrackedError>()
const ERROR_DEDUP_WINDOW = 3600000 // 1 hour - don't report same error twice in this window

function getErrorKey(error: Error | string): string {
  const msg = typeof error === 'string' ? error : error.message
  const stack = typeof error === 'string' ? '' : error.stack?.split('\n').slice(0, 3).join('\n') || ''
  return `${msg}::${stack}`
}

export async function trackError(params: {
  error: Error | string
  context?: string
  componentStack?: string
  url?: string
  userId?: string
  companyId?: string
}): Promise<{ tracked: boolean; issueUrl?: string }> {
  const key = getErrorKey(params.error)
  const existing = errorRegistry.get(key)
  const now = new Date()

  // Deduplication: don't report same error within window
  if (existing && now.getTime() - existing.lastSeen.getTime() < ERROR_DEDUP_WINDOW) {
    existing.count++
    existing.lastSeen = now
    return { tracked: true, issueUrl: existing.issueUrl }
  }

  const errorMessage = typeof params.error === 'string' ? params.error : params.error.message
  const errorStack = typeof params.error === 'string' ? undefined : params.error.stack

  // Register the error
  const tracked: TrackedError = {
    message: errorMessage,
    stack: errorStack,
    componentStack: params.componentStack,
    url: params.url,
    timestamp: now,
    count: (existing?.count || 0) + 1,
    lastSeen: now,
  }

  // Try to create GitHub issue
  const githubConfigured = await isGitHubConfigured()
  if (githubConfigured) {
    const issueBody = `## Erro Detectado Automaticamente

**Mensagem:** ${errorMessage}
**Contexto:** ${params.context || 'N/A'}
**URL:** ${params.url || 'N/A'}
**Usuário:** ${params.userId || 'N/A'}
**Empresa:** ${params.companyId || 'N/A'}
**Primeira ocorrência:** ${now.toISOString()}
**Ocorrências totais:** ${tracked.count}

### Stack Trace
\`\`\`
${errorStack || 'N/A'}
\`\`\`

${params.componentStack ? `### Component Stack\n\`\`\`\n${params.componentStack}\n\`\`\`` : ''}

---
*Issue criada automaticamente pelo sistema de monitoramento do ERP*`

    const result = await createIssue({
      title: `[Auto] ${errorMessage.substring(0, 100)}`,
      body: issueBody,
      labels: ['bug', 'ai-detected', 'auto-report'],
    })

    if (result.success) {
      tracked.issueUrl = result.url
    }
  }

  errorRegistry.set(key, tracked)

  // Clean old entries (keep registry from growing indefinitely)
  if (errorRegistry.size > 500) {
    const oldestKey = errorRegistry.keys().next().value
    if (oldestKey) errorRegistry.delete(oldestKey)
  }

  return { tracked: true, issueUrl: tracked.issueUrl }
}

export function getErrorStats(): {
  totalTracked: number
  uniqueErrors: number
  recentErrors: Array<{ message: string; count: number; lastSeen: Date; issueUrl?: string }>
} {
  const errors = Array.from(errorRegistry.values())
    .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime())
    .slice(0, 20)
    .map(e => ({
      message: e.message,
      count: e.count,
      lastSeen: e.lastSeen,
      issueUrl: e.issueUrl,
    }))

  return {
    totalTracked: errors.reduce((sum, e) => sum + e.count, 0),
    uniqueErrors: errorRegistry.size,
    recentErrors: errors,
  }
}
