'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getSystemHealthLogs } from '@/app/actions/monitoring-actions'
import { Activity, RefreshCw } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

type Period = '24h' | '7d' | '30d'

interface HealthLogEntry {
  id: string
  timestamp: string
  metric: string
  value: number
  status: string
  details?: Record<string, unknown>
}

const statusColors: Record<string, string> = {
  OK: '#22c55e',
  WARNING: '#f59e0b',
  CRITICAL: '#ef4444',
}

const metricLabels: Record<string, string> = {
  DB_RESPONSE: 'Banco de Dados',
  MEMORY_USAGE: 'Memoria',
  API_LATENCY: 'Latencia API',
  ERROR_RATE: 'Taxa de Erro',
  AI_ANALYSIS: 'Analise IA',
}

export function HealthChart() {
  const [period, setPeriod] = useState<Period>('24h')
  const [logs, setLogs] = useState<HealthLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const result = await getSystemHealthLogs({ period })
      if (result.success && result.data) {
        setLogs(result.data as HealthLogEntry[])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [period])

  // Group logs by metric for summary
  const metricSummary = logs.reduce<Record<string, { total: number; ok: number; warning: number; critical: number; avgValue: number }>>((acc, log) => {
    if (!acc[log.metric]) {
      acc[log.metric] = { total: 0, ok: 0, warning: 0, critical: 0, avgValue: 0 }
    }
    acc[log.metric].total++
    if (log.status === 'OK') acc[log.metric].ok++
    else if (log.status === 'WARNING') acc[log.metric].warning++
    else if (log.status === 'CRITICAL') acc[log.metric].critical++
    acc[log.metric].avgValue += log.value
    return acc
  }, {})

  // Calculate averages
  Object.values(metricSummary).forEach((m) => {
    if (m.total > 0) m.avgValue = Math.round((m.avgValue / m.total) * 100) / 100
  })

  // Prepare chart data: aggregate by time bucket
  const chartData = (() => {
    if (logs.length === 0) return []

    const sorted = [...logs].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    const bucketSize = period === '24h' ? 3600000 : period === '7d' ? 6 * 3600000 : 24 * 3600000
    const buckets = new Map<number, { ok: number; warning: number; critical: number }>()

    for (const log of sorted) {
      const ts = Math.floor(new Date(log.timestamp).getTime() / bucketSize) * bucketSize
      if (!buckets.has(ts)) buckets.set(ts, { ok: 0, warning: 0, critical: 0 })
      const bucket = buckets.get(ts)!
      if (log.status === 'OK') bucket.ok++
      else if (log.status === 'WARNING') bucket.warning++
      else bucket.critical++
    }

    return Array.from(buckets.entries()).map(([ts, counts]) => {
      const date = new Date(ts)
      const label = period === '24h'
        ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

      const total = counts.ok + counts.warning + counts.critical
      const score = total > 0
        ? Math.round(((counts.ok * 100 + counts.warning * 50) / (total * 100)) * 100)
        : 100

      return { label, ...counts, score, total }
    })
  })()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Historico de Saude
            </CardTitle>
            <CardDescription>
              Metricas do sistema ao longo do tempo
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {(['24h', '7d', '30d'] as Period[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p)}
                className="h-7 text-xs"
              >
                {p}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchLogs}
              disabled={loading}
              className="h-7 w-7"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {loading ? 'Carregando...' : 'Nenhum log de saude encontrado para o periodo selecionado'}
            </p>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6">
              {Object.entries(metricSummary).map(([metric, data]) => (
                <div key={metric} className="rounded-lg border p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    {metricLabels[metric] || metric}
                  </p>
                  <p className="text-lg font-bold mt-1">
                    {data.avgValue}
                    {metric === 'MEMORY_USAGE' ? '%' : metric === 'DB_RESPONSE' || metric === 'API_LATENCY' ? 'ms' : ''}
                  </p>
                  <div className="flex gap-1 mt-1">
                    {data.ok > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 bg-green-500/10 text-green-600 border-green-500/20">
                        {data.ok} OK
                      </Badge>
                    )}
                    {data.warning > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-500/10 text-amber-600 border-amber-500/20">
                        {data.warning} WARN
                      </Badge>
                    )}
                    {data.critical > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 bg-red-500/10 text-red-600 border-red-500/20">
                        {data.critical} CRIT
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bar chart */}
            {chartData.length > 0 && (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      className="fill-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      className="fill-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number, name: string) => {
                        const labels: Record<string, string> = { ok: 'OK', warning: 'Atencao', critical: 'Critico' }
                        return [value, labels[name] || name]
                      }}
                    />
                    <Bar dataKey="ok" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="warning" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="critical" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
