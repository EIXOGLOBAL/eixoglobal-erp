'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Lightbulb, RefreshCw, Sparkles, AlertTriangle, Loader2 } from 'lucide-react'
import type { PortfolioAnalysis, FinancialAnalysis, HRAnalysis } from '@/lib/ai-analytics'

interface AIInsightCardProps {
  title: string
  type: 'portfolio' | 'financial' | 'hr'
  companyId: string
}

type AnalysisResult = PortfolioAnalysis | FinancialAnalysis | HRAnalysis

export default function AIInsightCard({ title, type, companyId }: AIInsightCardProps) {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchAnalysis() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, companyId }),
      })

      const json = await res.json()

      if (!res.ok) {
        if (res.status === 503) {
          setError('Chave da API de IA nao configurada. Contate o administrador.')
        } else if (res.status === 429) {
          setError('Limite de requisicoes atingido. Tente novamente em 1 hora.')
        } else {
          setError(json.error || 'Erro ao gerar analise')
        }
        return
      }

      setResult(json.data)
    } catch {
      setError('Erro de conexao ao gerar analise')
    } finally {
      setLoading(false)
    }
  }

  function getScoreColor(score: number): string {
    if (score <= 40) return '#ef4444'
    if (score <= 70) return '#f59e0b'
    return '#22c55e'
  }

  function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
      case 'excellent':
      case 'good':
        return 'default'
      case 'attention':
        return 'secondary'
      case 'critical':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      excellent: 'Excelente',
      good: 'Bom',
      attention: 'Atencao',
      critical: 'Critico',
      improving: 'Melhorando',
      stable: 'Estavel',
      declining: 'Em queda',
    }
    return labels[status] || status
  }

  function getSeverityColor(severity: string): string {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'medium':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  // Skeleton loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center py-6">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <svg width="100" height="100" viewBox="0 0 100 100" className="animate-pulse">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Gerando analise com IA...</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
            <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // No result yet
  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              {error}
            </div>
          )}
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm text-muted-foreground text-center">
              Clique para gerar uma analise inteligente usando IA
            </p>
            <Button onClick={fetchAnalysis} disabled={loading}>
              <Sparkles className="size-4" />
              Gerar analise
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Extract common score
  const score = 'score' in result ? (result as { score: number }).score : 0
  const scoreColor = getScoreColor(score)

  // SVG circle progress
  const circumference = 2 * Math.PI * 42
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            {title}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={fetchAnalysis} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Score circle */}
        <div className="flex items-center gap-6">
          <div className="relative shrink-0">
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/20"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={scoreColor}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold" style={{ color: scoreColor }}>
                {score}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            {'status' in result && (
              <Badge variant={getStatusBadgeVariant((result as PortfolioAnalysis).status)}>
                {getStatusLabel((result as PortfolioAnalysis).status)}
              </Badge>
            )}
            {'cashflowTrend' in result && (
              <Badge variant={getStatusBadgeVariant((result as FinancialAnalysis).cashflowTrend)}>
                {getStatusLabel((result as FinancialAnalysis).cashflowTrend)}
              </Badge>
            )}
            {'headline' in result && (
              <p className="text-sm text-muted-foreground">
                {(result as PortfolioAnalysis).headline}
              </p>
            )}
          </div>
        </div>

        {/* Insights / Alerts */}
        {'insights' in result && (result as PortfolioAnalysis).insights.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Insights</h4>
            <ul className="space-y-1.5">
              {(result as PortfolioAnalysis).insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Lightbulb className="size-4 shrink-0 text-amber-500 mt-0.5" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {'alerts' in result && (result as FinancialAnalysis | HRAnalysis).alerts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Alertas</h4>
            <ul className="space-y-1.5">
              {((result as FinancialAnalysis | HRAnalysis).alerts).map((alert, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="size-4 shrink-0 text-amber-500 mt-0.5" />
                  <span>{alert}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks */}
        {'risks' in result && (result as PortfolioAnalysis).risks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Riscos</h4>
            <ul className="space-y-2">
              {(result as PortfolioAnalysis).risks.map((risk, i) => (
                <li key={i} className="p-2 rounded-md border text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{risk.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getSeverityColor(risk.severity)}`}>
                      {risk.severity === 'high' ? 'Alto' : risk.severity === 'medium' ? 'Medio' : 'Baixo'}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{risk.action}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations (financial) */}
        {'recommendations' in result && (result as FinancialAnalysis).recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recomendacoes</h4>
            <ul className="space-y-1.5">
              {(result as FinancialAnalysis).recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Lightbulb className="size-4 shrink-0 text-blue-500 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Portfolio recommendation */}
        {'recommendation' in result && (result as PortfolioAnalysis).recommendation && (
          <div className="p-3 rounded-md bg-primary/5 border text-sm">
            <p className="font-medium mb-1">Recomendacao principal</p>
            <p className="text-muted-foreground">{(result as PortfolioAnalysis).recommendation}</p>
          </div>
        )}

        {/* HR-specific metrics */}
        {'headcount' in result && (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 rounded-md border text-center">
              <p className="text-2xl font-bold">{(result as HRAnalysis).headcount}</p>
              <p className="text-xs text-muted-foreground">Funcionarios</p>
            </div>
            <div className="p-2 rounded-md border text-center">
              <p className="text-2xl font-bold">{(result as HRAnalysis).allocationRate.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Taxa de Alocacao</p>
            </div>
            <div className="p-2 rounded-md border text-center">
              <p className="text-2xl font-bold">{(result as HRAnalysis).pendingVacations}</p>
              <p className="text-xs text-muted-foreground">Ferias Pendentes</p>
            </div>
            <div className="p-2 rounded-md border text-center">
              <p className="text-2xl font-bold">{(result as HRAnalysis).upcomingTrainings}</p>
              <p className="text-xs text-muted-foreground">Treinamentos</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
