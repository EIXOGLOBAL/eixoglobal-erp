/**
 * AI Code Analyzer — Analisa stack traces e sugere correcoes.
 *
 * Fluxo:
 * 1. Recebe stack trace do error-tracker
 * 2. Envia para IA com contexto do codigo
 * 3. IA sugere correcao
 * 4. Sistema cria issue no GitHub com a sugestao
 * 5. Notifica ADMIN com link da issue
 *
 * IMPORTANTE: Nunca faz merge automaticamente - ADMIN faz review manual.
 */

import { aiComplete } from '@/lib/ai/client'
import { createIssue, isGitHubConfigured } from '@/lib/github-client'

// ============================================================================
// Types
// ============================================================================

export interface CodeAnalysisRequest {
  errorMessage: string
  stackTrace?: string
  componentStack?: string
  url?: string
  context?: string
  userId?: string
}

export interface CodeAnalysisSuggestion {
  summary: string
  rootCause: string
  suggestedFix: string
  affectedFiles: string[]
  severity: 'low' | 'medium' | 'high' | 'critical'
  confidence: 'low' | 'medium' | 'high'
}

export interface CodeAnalysisResult {
  success: boolean
  suggestion?: CodeAnalysisSuggestion
  issueUrl?: string
  error?: string
}

// ============================================================================
// Analysis cache (avoid re-analyzing same error)
// ============================================================================

const analysisCache = new Map<string, { result: CodeAnalysisResult; timestamp: number }>()
const CACHE_TTL = 3600000 // 1 hour

function getCacheKey(req: CodeAnalysisRequest): string {
  return `${req.errorMessage}::${(req.stackTrace || '').split('\n').slice(0, 3).join('\n')}`
}

function getCached(key: string): CodeAnalysisResult | null {
  const entry = analysisCache.get(key)
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.result
  }
  if (entry) analysisCache.delete(key)
  return null
}

// ============================================================================
// Main analysis function
// ============================================================================

/**
 * Analisa um erro usando IA e sugere correcao.
 * Opcionalmente cria issue no GitHub com a analise.
 */
export async function analyzeError(
  request: CodeAnalysisRequest,
  options?: { createGitHubIssue?: boolean }
): Promise<CodeAnalysisResult> {
  const cacheKey = getCacheKey(request)
  const cached = getCached(cacheKey)
  if (cached) return cached

  try {
    const prompt = buildAnalysisPrompt(request)

    const result = await aiComplete(prompt, {
      systemPrompt: ANALYZER_SYSTEM_PROMPT,
      maxOutputTokens: 2000,
      temperature: 0.2,
      timeout: 45_000,
    })

    const suggestion = parseAnalysisResponse(result.content)
    if (!suggestion) {
      return { success: false, error: 'Nao foi possivel analisar o erro' }
    }

    let issueUrl: string | undefined

    // Create GitHub issue if requested and configured
    if (options?.createGitHubIssue !== false) {
      const githubConfigured = await isGitHubConfigured()
      if (githubConfigured) {
        const issueResult = await createIssue({
          title: `[AI Analysis] ${request.errorMessage.substring(0, 80)}`,
          body: buildIssueBody(request, suggestion),
          labels: ['bug', 'ai-analyzed', suggestion.severity === 'critical' ? 'priority:critical' : 'priority:normal'],
        })
        if (issueResult.success) {
          issueUrl = issueResult.url
        }
      }
    }

    const analysisResult: CodeAnalysisResult = {
      success: true,
      suggestion,
      issueUrl,
    }

    // Cache the result
    analysisCache.set(cacheKey, { result: analysisResult, timestamp: Date.now() })

    // Keep cache size manageable
    if (analysisCache.size > 200) {
      const oldestKey = analysisCache.keys().next().value
      if (oldestKey) analysisCache.delete(oldestKey)
    }

    return analysisResult
  } catch (error) {
    console.error('[AI Code Analyzer] Erro:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro na analise de codigo',
    }
  }
}

// ============================================================================
// Prompt builders
// ============================================================================

const ANALYZER_SYSTEM_PROMPT = `Voce e um engenheiro de software senior especializado em Next.js 16, React 19, TypeScript, Prisma e TailwindCSS.

Sua tarefa e analisar erros de aplicacao e sugerir correcoes. O projeto e um ERP de engenharia civil (Eixo Global ERP) que usa:
- Next.js 16 App Router com Server Components e Server Actions
- React 19 com Suspense e Error Boundaries
- Prisma 7.5 com PostgreSQL 17
- TailwindCSS 4 + shadcn/ui
- Vercel AI SDK v6 para integracao com IA
- TypeScript 5.8 strict mode

Analise o erro e retorne SEMPRE um JSON valido com esta estrutura exata:
{
  "summary": "resumo curto do problema",
  "rootCause": "causa raiz detalhada",
  "suggestedFix": "correcao sugerida com codigo",
  "affectedFiles": ["caminho/arquivo.ts"],
  "severity": "low|medium|high|critical",
  "confidence": "low|medium|high"
}

Regras:
- Seja especifico e pratico
- Inclua trechos de codigo na correcao quando possivel
- Identifique o arquivo e funcao afetada pelo stack trace
- Nao invente arquivos que nao existem no stack trace
- Se nao tiver certeza, indique confidence: "low"`

function buildAnalysisPrompt(request: CodeAnalysisRequest): string {
  const parts = [
    `## Erro Detectado\n**Mensagem:** ${request.errorMessage}`,
  ]

  if (request.stackTrace) {
    parts.push(`\n### Stack Trace\n\`\`\`\n${request.stackTrace}\n\`\`\``)
  }

  if (request.componentStack) {
    parts.push(`\n### Component Stack\n\`\`\`\n${request.componentStack}\n\`\`\``)
  }

  if (request.url) {
    parts.push(`\n**URL:** ${request.url}`)
  }

  if (request.context) {
    parts.push(`\n### Contexto Adicional\n${request.context}`)
  }

  parts.push('\nAnalise o erro e retorne o JSON com a sugestao de correcao.')

  return parts.join('\n')
}

// ============================================================================
// Response parser
// ============================================================================

function parseAnalysisResponse(raw: string): CodeAnalysisSuggestion | null {
  try {
    // Strip markdown fences if present
    const cleaned = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim()

    const parsed = JSON.parse(cleaned)

    // Validate required fields
    if (!parsed.summary || !parsed.rootCause || !parsed.suggestedFix) {
      return null
    }

    return {
      summary: String(parsed.summary),
      rootCause: String(parsed.rootCause),
      suggestedFix: String(parsed.suggestedFix),
      affectedFiles: Array.isArray(parsed.affectedFiles) ? parsed.affectedFiles.map(String) : [],
      severity: ['low', 'medium', 'high', 'critical'].includes(parsed.severity) ? parsed.severity : 'medium',
      confidence: ['low', 'medium', 'high'].includes(parsed.confidence) ? parsed.confidence : 'medium',
    }
  } catch {
    return null
  }
}

// ============================================================================
// GitHub issue body builder
// ============================================================================

function buildIssueBody(request: CodeAnalysisRequest, suggestion: CodeAnalysisSuggestion): string {
  return `## Analise Automatica de Erro

**Severidade:** ${suggestion.severity.toUpperCase()}
**Confianca:** ${suggestion.confidence.toUpperCase()}

### Resumo
${suggestion.summary}

### Causa Raiz
${suggestion.rootCause}

### Correcao Sugerida
${suggestion.suggestedFix}

### Arquivos Afetados
${suggestion.affectedFiles.length > 0 ? suggestion.affectedFiles.map(f => `- \`${f}\``).join('\n') : 'Nao identificados'}

---

### Erro Original
**Mensagem:** \`${request.errorMessage}\`
**URL:** ${request.url || 'N/A'}

${request.stackTrace ? `### Stack Trace\n\`\`\`\n${request.stackTrace.substring(0, 2000)}\n\`\`\`` : ''}

---
*Analise gerada automaticamente pelo AI Code Analyzer do ERP Eixo Global*
*IMPORTANTE: Revise a sugestao antes de aplicar qualquer correcao.*`
}
