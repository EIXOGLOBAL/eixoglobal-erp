'use client'

import { useState } from 'react'
import { detectAnomalies, AnomalyDetectionResult } from '@/app/actions/ai-actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2, AlertTriangle, CheckCircle2, Zap } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AnomalyDetectionPanelProps {
  companyId: string
}

export function AnomalyDetectionPanel({ companyId }: AnomalyDetectionPanelProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnomalyDetectionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDetect = async () => {
    setLoading(true)
    setError(null)
    try {
      const detectionResult = await detectAnomalies(companyId)
      if ('error' in detectionResult) {
        setError(detectionResult.error)
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: detectionResult.error,
        })
      } else {
        setResult(detectionResult)
        toast({
          title: 'Sucesso',
          description: `${detectionResult.totalFound} anomalias detectadas`,
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao detectar anomalias'
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'baixa':
        return 'bg-blue-100 text-blue-800'
      case 'média':
        return 'bg-yellow-100 text-yellow-800'
      case 'alta':
        return 'bg-orange-100 text-orange-800'
      case 'crítica':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'baixa':
        return <CheckCircle2 className="h-4 w-4 text-blue-600" />
      case 'média':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'alta':
        return <Zap className="h-4 w-4 text-orange-600" />
      case 'crítica':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <CheckCircle2 className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Button onClick={handleDetect} disabled={loading} size="lg">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'Detectando...' : 'Iniciar Detecção de Anomalias'}
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

      {result && (
        <div className="space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Resumo da Detecção</CardTitle>
                  <CardDescription>Anomalias encontradas no sistema</CardDescription>
                </div>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {result.totalFound}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {result.totalFound === 0 ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <p className="font-semibold">Nenhuma anomalia crítica detectada</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {result.totalFound} comportamento{result.totalFound !== 1 ? 's' : ''} incomum{result.totalFound !== 1 ? 's' : ''} foi{result.totalFound !== 1 ? 'ram' : ''} identificado{result.totalFound !== 1 ? 's' : ''}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Anomalies List */}
          {result.anomalies && result.anomalies.length > 0 && (
            <div className="grid gap-4">
              {result.anomalies.map((anomaly, idx) => (
                <Card key={idx}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getSeverityIcon(anomaly.severity)}
                          <h3 className="font-semibold">{anomaly.type}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{anomaly.description}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium">Entidade afetada:</span>
                          <Badge variant="secondary">{anomaly.affectedEntity}</Badge>
                          {anomaly.value && (
                            <>
                              <span className="mx-1">•</span>
                              <span className="font-medium">Valor: {anomaly.value}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge className={getSeverityColor(anomaly.severity)}>
                        {anomaly.severity.charAt(0).toUpperCase() + anomaly.severity.slice(1)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-right">
            Detecção realizada em {new Date(result.timestamp).toLocaleString('pt-BR')}
          </p>
        </div>
      )}
    </div>
  )
}
