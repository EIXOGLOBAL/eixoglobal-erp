'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import type { ExecutiveSummary } from '@/lib/ai-analytics'

interface AIExecutiveSummaryProps {
  companyId: string
}

export default function AIExecutiveSummary({ companyId }: AIExecutiveSummaryProps) {
  const [result, setResult] = useState<ExecutiveSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchSummary() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'executive', companyId }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Erro ao gerar relatorio executivo')
        return
      }

      setResult(json.data)
    } catch {
      setError('Erro de conexao ao gerar relatorio')
    } finally {
      setLoading(false)
    }
  }

  function getScoreGradient(score: number): string {
    if (score <= 40) return 'from-red-500 to-red-600'
    if (score <= 70) return 'from-amber-500 to-amber-600'
    return 'from-green-500 to-green-600'
  }

  function getScoreLabel(score: number): string {
    if (score <= 40) return 'Critico'
    if (score <= 70) return 'Atencao'
    return 'Saudavel'
  }

  function getTrendIcon(trend: 'up' | 'down' | 'stable') {
    switch (trend) {
      case 'up':
        return <TrendingUp className="size-4 text-green-500" />
      case 'down':
        return <TrendingDown className="size-4 text-red-500" />
      case 'stable':
        return <Minus className="size-4 text-muted-foreground" />
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            Relatorio Executivo IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="size-8 animate-spin text-primary" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Gerando relatorio executivo...</p>
              <p className="text-xs text-muted-foreground">
                Analisando portfolio, financeiro e RH simultaneamente
              </p>
            </div>
            <div className="w-full space-y-3 mt-4">
              <div className="h-16 bg-muted animate-pulse rounded-lg" />
              <div className="grid grid-cols-3 gap-3">
                <div className="h-20 bg-muted animate-pulse rounded-lg" />
                <div className="h-20 bg-muted animate-pulse rounded-lg" />
                <div className="h-20 bg-muted animate-pulse rounded-lg" />
              </div>
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
            </div>
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
            <FileText className="size-5 text-primary" />
            Relatorio Executivo IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              {error}
            </div>
          )}
          <div className="flex flex-col items-center gap-3 py-6">
            <Sparkles className="size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Gere um relatorio executivo consolidado com analise de portfolio, financeiro e RH
            </p>
            <Button onClick={fetchSummary} disabled={loading}>
              <Sparkles className="size-4" />
              Gerar relatorio executivo
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const scoreGradient = getScoreGradient(result.overallScore)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            Relatorio Executivo IA
          </span>
          <span className="text-xs text-muted-foreground font-normal">{result.date}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Overall Score Banner */}
        <div className={`rounded-lg bg-gradient-to-r ${scoreGradient} p-4 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Score Geral da Empresa</p>
              <p className="text-4xl font-bold">{result.overallScore}</p>
            </div>
            <div className="text-right">
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                {getScoreLabel(result.overallScore)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Monthly KPIs */}
        {result.monthlyKPIs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">KPIs do Mes</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {result.monthlyKPIs.map((kpi, i) => (
                <div key={i} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{kpi.label}</span>
                    {getTrendIcon(kpi.trend)}
                  </div>
                  <p className="text-lg font-semibold">{kpi.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Critical Alerts */}
        {result.criticalAlerts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-red-600 dark:text-red-400">Alertas Criticos</h4>
            <ul className="space-y-1.5">
              {result.criticalAlerts.map((alert, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm p-2 rounded-md bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300"
                >
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>{alert}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Highlights */}
        {result.highlights.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-green-600 dark:text-green-400">Destaques Positivos</h4>
            <ul className="space-y-1.5">
              {result.highlights.map((highlight, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm p-2 rounded-md bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300"
                >
                  <CheckCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Refresh button */}
        <div className="pt-2 flex justify-end">
          <Button variant="outline" size="sm" onClick={fetchSummary} disabled={loading}>
            <Sparkles className="size-4" />
            Atualizar relatorio
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
