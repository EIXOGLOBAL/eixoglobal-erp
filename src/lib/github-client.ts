import { logger } from '@/lib/logger'

const log = logger.child({ module: 'github-client' })

interface GitHubConfig {
  token: string
  owner: string
  repo: string
}

function getConfig(): GitHubConfig | null {
  const token = process.env.GITHUB_TOKEN
  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO

  if (!token || !owner || !repo) return null
  return { token, owner, repo }
}

async function githubFetch(path: string, options?: RequestInit) {
  const config = getConfig()
  if (!config) return null

  const res = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`GitHub API ${res.status}: ${text}`)
  }

  return res.json()
}

export async function isGitHubConfigured(): Promise<boolean> {
  return getConfig() !== null
}

export async function createIssue(params: {
  title: string
  body: string
  labels?: string[]
}): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!getConfig()) return { success: false, error: 'GitHub nao configurado' }

  try {
    const data = await githubFetch('/issues', {
      method: 'POST',
      body: JSON.stringify({
        title: params.title,
        body: params.body,
        labels: params.labels || ['bug', 'ai-detected'],
      }),
    })

    return { success: true, url: data.html_url }
  } catch (error) {
    log.error({ error }, 'Erro ao criar issue no GitHub')
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

export async function createPullRequest(params: {
  title: string
  body: string
  head: string
  base?: string
}): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!getConfig()) return { success: false, error: 'GitHub nao configurado' }

  try {
    const data = await githubFetch('/pulls', {
      method: 'POST',
      body: JSON.stringify({
        title: params.title,
        body: params.body,
        head: params.head,
        base: params.base || 'main',
      }),
    })

    return { success: true, url: data.html_url }
  } catch (error) {
    log.error({ error }, 'Erro ao criar PR no GitHub')
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

export async function checkDependencyUpdates(): Promise<{
  success: boolean
  updates?: Array<{ name: string; current: string; latest: string; type: string }>
  error?: string
}> {
  if (!getConfig()) return { success: false, error: 'GitHub nao configurado' }

  try {
    const alerts = await githubFetch('/dependabot/alerts?state=open').catch(() => [])

    const updates = (Array.isArray(alerts) ? alerts : []).map((alert: any) => ({
      name: alert.dependency?.package?.name || 'unknown',
      current: alert.security_vulnerability?.first_patched_version?.identifier || 'N/A',
      latest: alert.security_vulnerability?.vulnerable_version_range || 'N/A',
      type: alert.security_advisory?.severity || 'unknown',
    }))

    return { success: true, updates }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro' }
  }
}

export async function triggerWorkflow(workflowFileName: string): Promise<{
  success: boolean
  error?: string
}> {
  if (!getConfig()) return { success: false, error: 'GitHub nao configurado' }

  try {
    await githubFetch(`/actions/workflows/${workflowFileName}/dispatches`, {
      method: 'POST',
      body: JSON.stringify({ ref: 'main' }),
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro' }
  }
}

export async function getLatestRelease(): Promise<{
  success: boolean
  data?: { tag: string; name: string; publishedAt: string; url: string }
  error?: string
}> {
  if (!getConfig()) return { success: false, error: 'GitHub nao configurado' }

  try {
    const config = getConfig()!
    const res = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/releases/latest`, {
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github+json',
      },
    })

    if (!res.ok) return { success: false, error: 'Nenhuma release encontrada' }

    const data = await res.json()
    return {
      success: true,
      data: {
        tag: data.tag_name,
        name: data.name || data.tag_name,
        publishedAt: data.published_at || '',
        url: data.html_url,
      },
    }
  } catch {
    return { success: false, error: 'Nenhuma release encontrada' }
  }
}
