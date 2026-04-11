'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { resolveAnomaly } from '@/app/actions/monitoring-actions'
import { CheckCircle, XCircle, AlertTriangle, ShieldAlert } from 'lucide-react'

const severityConfig: Record<string, { color: string; icon: any }> = {
  CRITICAL: { color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: ShieldAlert },
  HIGH: { color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: AlertTriangle },
  MEDIUM: { color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: AlertTriangle },
  LOW: { color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: AlertTriangle },
}

const typeLabels: Record<string, string> = {
  FRAUD: 'Fraude',
  DATA_INCONSISTENCY: 'Inconsistencia',
  UNUSUAL_ACTIVITY: 'Atividade Incomum',
  POLICY_VIOLATION: 'Violacao de Politica',
  SYSTEM_ERROR: 'Erro do Sistema',
}

export function AnomalyList({ anomalies }: { anomalies: any[] }) {
  const [resolving, setResolving] = useState<string | null>(null)
  const { toast } = useToast()

  const handleResolve = async (id: string, falsePositive: boolean) => {
    setResolving(id)
    try {
      const result = await resolveAnomaly(id, falsePositive)
      if (result.success) {
        toast({
          title: falsePositive ? 'Marcado como falso positivo' : 'Anomalia resolvida',
        })
        window.location.reload()
      } else {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      }
    } finally {
      setResolving(null)
    }
  }

  if (anomalies.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
          <p className="text-lg font-medium">Nenhuma anomalia detectada</p>
          <p className="text-sm text-muted-foreground">O sistema esta operando normalmente</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {anomalies.map((anomaly: any) => {
        const config = severityConfig[anomaly.severity] || severityConfig.LOW
        const Icon = config.icon

        return (
          <Card key={anomaly.id}>
            <CardContent className="flex items-start gap-4 p-4">
              <Icon className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={config.color}>
                    {anomaly.severity}
                  </Badge>
                  <Badge variant="secondary">
                    {typeLabels[anomaly.type] || anomaly.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {anomaly.entity}
                  </span>
                </div>
                <p className="text-sm">{anomaly.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Detectado em {new Date(anomaly.detectedAt).toLocaleString('pt-BR')}
                </p>
              </div>

              <div className="flex gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolve(anomaly.id, false)}
                  disabled={resolving === anomaly.id}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Resolver
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleResolve(anomaly.id, true)}
                  disabled={resolving === anomaly.id}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Falso +
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
