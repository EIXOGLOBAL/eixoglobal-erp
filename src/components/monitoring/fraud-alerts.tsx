'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { runFraudAnalysis } from '@/app/actions/monitoring-actions'
import {
  ShieldAlert,
  Search,
  RefreshCw,
  AlertTriangle,
  FileWarning,
  Activity,
  CheckCircle,
} from 'lucide-react'

interface FraudSummary {
  total: number
  critical: number
  high: number
  medium: number
  low: number
  byType: Record<string, number>
}

interface FraudResult {
  alerts: Array<{
    type: string
    severity: string
    entity: string
    entityId?: string
    description: string
    evidence: Record<string, unknown>
    detectedAt: Date | string
  }>
  summary: FraudSummary
}

const typeConfig: Record<string, { label: string; icon: typeof ShieldAlert; color: string }> = {
  FRAUD: { label: 'Fraude', icon: ShieldAlert, color: 'text-red-500' },
  DATA_INCONSISTENCY: { label: 'Inconsistencia de Dados', icon: FileWarning, color: 'text-orange-500' },
  UNUSUAL_ACTIVITY: { label: 'Atividade Incomum', icon: Activity, color: 'text-amber-500' },
  POLICY_VIOLATION: { label: 'Violacao de Politica', icon: AlertTriangle, color: 'text-yellow-500' },
}

const severityBadge: Record<string, string> = {
  CRITICAL: 'bg-red-500/10 text-red-500 border-red-500/20',
  HIGH: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  LOW: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
}

export function FraudAlerts() {
  const [result, setResult] = useState<FraudResult | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleRunAnalysis = async () => {
    setLoading(true)
    try {
      const res = await runFraudAnalysis()
      if (res.success && res.data) {
        setResult(res.data as unknown as FraudResult)
        toast({
          title: 'Analise concluida',
          description: `${res.data.summary.total} alertas detectados`,
        })
      } else {
        toast({ title: 'Erro', description: res.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha na analise de fraude', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Deteccao de Fraudes
            </CardTitle>
            <CardDescription>
              Analise automatizada de padroes suspeitos nos dados
            </CardDescription>
          </div>
          <Button
            onClick={handleRunAnalysis}
            disabled={loading}
            size="sm"
          >
            {loading ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Executar Analise
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!result ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ShieldAlert className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Clique em &quot;Executar Analise&quot; para verificar padroes suspeitos
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Verifica auto-aprovacoes, pontos suspeitos, outliers financeiros, estoque e mais
            </p>
          </div>
        ) : result.summary.total === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
            <p className="text-sm font-medium">Nenhuma anomalia detectada</p>
            <p className="text-xs text-muted-foreground mt-1">
              Todos os 7 checks de integridade passaram
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{result.summary.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center">
                <p className="text-2xl font-bold text-red-500">{result.summary.critical}</p>
                <p className="text-xs text-muted-foreground">Criticos</p>
              </div>
              <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3 text-center">
                <p className="text-2xl font-bold text-orange-500">{result.summary.high}</p>
                <p className="text-xs text-muted-foreground">Altos</p>
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-center">
                <p className="text-2xl font-bold text-amber-500">{result.summary.medium + result.summary.low}</p>
                <p className="text-xs text-muted-foreground">Medio/Baixo</p>
              </div>
            </div>

            {/* By type */}
            {Object.keys(result.summary.byType).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(result.summary.byType).map(([type, count]) => {
                  const config = typeConfig[type]
                  return (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {config?.label || type}: {count}
                    </Badge>
                  )
                })}
              </div>
            )}

            {/* Alert list */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {result.alerts.map((alert, idx) => {
                const config = typeConfig[alert.type] || typeConfig.FRAUD
                const Icon = config.icon
                return (
                  <div key={idx} className="flex items-start gap-3 rounded-lg border p-3">
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={severityBadge[alert.severity] || severityBadge.LOW}>
                          {alert.severity}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {config.label} - {alert.entity}
                        </span>
                      </div>
                      <p className="text-sm">{alert.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
