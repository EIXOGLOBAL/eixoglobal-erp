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

async function getOctokit() {
  const config = getConfig()
  if (!config) return null

  try {
    // @ts-expect-error -- @octokit/rest is optional; installed only when GitHub integration is enabled
    const { Octokit } = await import('@octokit/rest')
    return new Octokit({ auth: config.token })
  } catch {
    console.warn('GitHub integration not available: @octokit/rest not installed')
    return null
  }
}

export async function isGitHubConfigured(): Promise<boolean> {
  return getConfig() !== null
}

export async function createIssue(params: {
  title: string
  body: string
  labels?: string[]
}): Promise<{ success: boolean; url?: string; error?: string }> {
  const config = getConfig()
  const octokit = await getOctokit()
  if (!config || !octokit) return { success: false, error: 'GitHub não configurado' }

  try {
    const response = await octokit.issues.create({
      owner: config.owner,
      repo: config.repo,
      title: params.title,
      body: params.body,
      labels: params.labels || ['bug', 'ai-detected'],
    })

    return { success: true, url: response.data.html_url }
  } catch (error) {
    console.error('Erro ao criar issue no GitHub:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

export async function createPullRequest(params: {
  title: string
  body: string
  head: string
  base?: string
}): Promise<{ success: boolean; url?: string; error?: string }> {
  const config = getConfig()
  const octokit = await getOctokit()
  if (!config || !octokit) return { success: false, error: 'GitHub não configurado' }

  try {
    const response = await octokit.pulls.create({
      owner: config.owner,
      repo: config.repo,
      title: params.title,
      body: params.body,
      head: params.head,
      base: params.base || 'main',
    })

    return { success: true, url: response.data.html_url }
  } catch (error) {
    console.error('Erro ao criar PR no GitHub:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

export async function checkDependencyUpdates(): Promise<{
  success: boolean
  updates?: Array<{ name: string; current: string; latest: string; type: string }>
  error?: string
}> {
  const config = getConfig()
  const octokit = await getOctokit()
  if (!config || !octokit) return { success: false, error: 'GitHub não configurado' }

  try {
    // Get Dependabot alerts if available
    const { data: alerts } = await octokit.rest.dependabot.listAlertsForRepo({
      owner: config.owner,
      repo: config.repo,
      state: 'open',
    }).catch(() => ({ data: [] }))

    const updates = (alerts as any[]).map((alert: any) => ({
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
  const config = getConfig()
  const octokit = await getOctokit()
  if (!config || !octokit) return { success: false, error: 'GitHub não configurado' }

  try {
    await octokit.actions.createWorkflowDispatch({
      owner: config.owner,
      repo: config.repo,
      workflow_id: workflowFileName,
      ref: 'main',
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
  const config = getConfig()
  const octokit = await getOctokit()
  if (!config || !octokit) return { success: false, error: 'GitHub não configurado' }

  try {
    const { data } = await octokit.repos.getLatestRelease({
      owner: config.owner,
      repo: config.repo,
    })

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
