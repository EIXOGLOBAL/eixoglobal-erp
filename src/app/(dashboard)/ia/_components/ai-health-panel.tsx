'use client'

import { useState } from 'react'
import { analyzeSystemHealth, SystemHealthAnalysis } from '@/app/actions/ai-actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Loader2, AlertTriangle, TrendingUp } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AIHealthPanelProps {
  companyId: string
}

export function AIHealthPanel({ companyId }: AIHealthPanelProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<SystemHealthAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await analyzeSystemHealth(companyId)
      if ('error' in result) {
        setError(result.error)
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: result.error,
        })
      } else {
        setAnalysis(result)
        toast({
          title: 'Sucesso',
          description: 'Análise de saúde do sistema concluída',
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao analisar saúde do sistema'
      setError(message)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: message,
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excelente':
        return 'bg-green-100 text-green-800'
      case 'bom':
        return 'bg-blue-100 text-blue-800'
      case 'atenção':
        return 'bg-yellow-100 text-yellow-800'
      case 'crítico':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excelente':
      case 'bom':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'atenção':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'crítico':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <TrendingUp className="h-5 w-5 text-blue-600" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Button onClick={handleAnalyze} disabled={loading} size="lg">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'Analisando...' : 'Analisar Saúde do Sistema'}
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-900">Erro</p>
                <p className="text-sm text-red-800 mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {analysis && (
        <div className="space-y-6">
          {/* Score Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Score de Saúde</CardTitle>
                  <CardDescription>Avaliação geral do sistema</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusIcon(analysis.status)}
                  <Badge className={getStatusColor(analysis.status)}>
                    {analysis.status.charAt(0).toUpperCase() + analysis.status.slice(1)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Pontuação</span>
                  <span className="text-2xl font-bold">{analysis.overallScore}/100</span>
                </div>
                <Progress value={analysis.overallScore} className="h-3" />
              </div>
              <p className="text-sm text-muted-foreground mt-4">{analysis.summary}</p>
            </CardContent>
          </Card>

          {/* Error Patterns */}
          {analysis.errorPatterns && analysis.errorPatterns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Padrões de Erro Detectados</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.errorPatterns.map((pattern, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <span>{pattern}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Orphaned Records */}
          {analysis.orphanedRecords && analysis.orphanedRecords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Registros Órfãos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.orphanedRecords.map((record, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-semibold text-sm">{record.type}</p>
                        <p className="text-xs text-muted-foreground">{record.description}</p>
                      </div>
                      <Badge variant="outline">{record.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data Consistency */}
          {analysis.dataConsistency && analysis.dataConsistency.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Consistência de Dados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.dataConsistency.map((check, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        {check.status ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <p className="font-semibold text-sm">{check.check}</p>
                          {check.issue && <p className="text-xs text-red-600 mt-1">{check.issue}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-base">Recomendações</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-blue-900">
                      <TrendingUp className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground text-right">
            Análise realizada em {new Date(analysis.timestamp).toLocaleString('pt-BR')}
          </p>
        </div>
      )}
    </div>
  )
}
