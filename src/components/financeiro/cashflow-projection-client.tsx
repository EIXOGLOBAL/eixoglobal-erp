'use client'

import { useState, useTransition, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getCashflowProjectionData } from '@/app/actions/financial-report-actions'
import type { CashflowProjection } from '@/lib/financial-reports'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Line,
  ComposedChart,
} from 'recharts'
import {
  Wallet,
  TrendingDown,
  Clock,
  CalendarDays,
  AlertTriangle,
} from 'lucide-react'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const fmtShort = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`
  return `R$${v.toFixed(0)}`
}

const confidenceLabel: Record<string, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
}

const confidenceColor: Record<string, string> = {
  high: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-red-100 text-red-800',
}

interface CashflowProjectionClientProps {
  initialData: CashflowProjection
  initialMonths: number
  burnRate: number
  cashRunway: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg text-sm min-w-[200px]">
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between gap-4">
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span className="font-mono font-medium" style={{ color: entry.color }}>
              {fmt(entry.value)}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export function CashflowProjectionClient({
  initialData,
  initialMonths,
  burnRate,
  cashRunway,
}: CashflowProjectionClientProps) {
  const [data, setData] = useState<CashflowProjection>(initialData)
  const [horizon, setHorizon] = useState(String(initialMonths))
  const [isPending, startTransition] = useTransition()

  const fetchData = useCallback((months: string) => {
    startTransition(async () => {
      const result = await getCashflowProjectionData(parseInt(months, 10))
      if (result.success && result.data) {
        setData(result.data)
      }
    })
  }, [])

  function handleHorizonChange(val: string) {
    setHorizon(val)
    fetchData(val)
  }

  const hasNegativeBalance = data.alerts.some(a => a.type === 'negative_balance')
  const highAlerts = data.alerts.filter(a => a.severity === 'high')

  // Chart data
  const chartData = data.months.map(m => ({
    month: m.label,
    entradas: m.projectedInflow,
    saidas: m.projectedOutflow,
    saldoAcumulado: m.cumulativeBalance,
  }))

  // Next month projected
  const nextMonthData = data.months[0]
  const projectedBalanceNextMonth = nextMonthData ? nextMonthData.cumulativeBalance : data.currentBalance

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Fluxo de Caixa</h2>
          <p className="text-muted-foreground">
            Proje&ccedil;&atilde;o de fluxo de caixa com base em dados hist&oacute;ricos e compromissos futuros
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Horizonte:</span>
          <Select value={horizon} onValueChange={handleHorizonChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Alert Banner */}
      {highAlerts.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-red-800">
                Alertas de Fluxo de Caixa
              </p>
              {highAlerts.map((alert, idx) => (
                <p key={idx} className="text-sm text-red-700">
                  {alert.message}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-2xl font-bold',
                data.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {fmt(data.currentBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Soma dos saldos banc&aacute;rios
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Burn Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{fmt(burnRate)}</div>
            <p className="text-xs text-muted-foreground">
              M&eacute;dia de despesas mensais (&uacute;lt. 6 meses)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Runway</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-2xl font-bold',
                cashRunway >= 6
                  ? 'text-green-600'
                  : cashRunway >= 3
                    ? 'text-amber-600'
                    : 'text-red-600'
              )}
            >
              {cashRunway >= 100 ? '99+' : cashRunway.toFixed(1)} meses
            </div>
            <p className="text-xs text-muted-foreground">
              Meses de caixa dispon&iacute;vel
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pr&oacute;ximo M&ecirc;s</CardTitle>
            <CalendarDays className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-2xl font-bold',
                projectedBalanceNextMonth >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {fmt(projectedBalanceNextMonth)}
            </div>
            <p className="text-xs text-muted-foreground">Saldo acumulado projetado</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Proje&ccedil;&atilde;o de Fluxo de Caixa</CardTitle>
          <CardDescription>
            Entradas, sa&iacute;das e saldo acumulado projetados para os pr&oacute;ximos {horizon} meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={cn(isPending && 'opacity-50')}>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  yAxisId="left"
                  tickFormatter={fmtShort}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={fmtShort}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <ReferenceLine
                  yAxisId="right"
                  y={data.currentBalance}
                  stroke="#64748b"
                  strokeDasharray="8 4"
                  label={{
                    value: `Saldo atual: ${fmtShort(data.currentBalance)}`,
                    position: 'insideTopRight',
                    fill: '#64748b',
                    fontSize: 11,
                  }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="entradas"
                  fill="#10b981"
                  fillOpacity={0.3}
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Entradas Projetadas"
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="saidas"
                  fill="#ef4444"
                  fillOpacity={0.3}
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Sa\u00eddas Projetadas"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="saldoAcumulado"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#3b82f6' }}
                  activeDot={{ r: 6 }}
                  name="Saldo Acumulado"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento Mensal</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className={cn('overflow-x-auto', isPending && 'opacity-50')}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                    M&ecirc;s
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    Entradas
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    Sa&iacute;das
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    Saldo Mensal
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    Saldo Acumulado
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground">
                    Confian&ccedil;a
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.months.map((m, idx) => (
                  <tr
                    key={m.month}
                    className={cn(
                      'border-b transition-colors hover:bg-accent/50',
                      m.cumulativeBalance < 0 && 'bg-red-50',
                      idx % 2 === 0 && m.cumulativeBalance >= 0 && 'bg-background',
                      idx % 2 !== 0 && m.cumulativeBalance >= 0 && 'bg-muted/20'
                    )}
                  >
                    <td className="px-4 py-3 font-medium">{m.label}</td>
                    <td className="text-right px-4 py-3 text-green-600 font-mono">
                      {fmt(m.projectedInflow)}
                    </td>
                    <td className="text-right px-4 py-3 text-red-600 font-mono">
                      {fmt(m.projectedOutflow)}
                    </td>
                    <td
                      className={cn(
                        'text-right px-4 py-3 font-mono font-bold',
                        m.projectedBalance >= 0 ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {fmt(m.projectedBalance)}
                    </td>
                    <td
                      className={cn(
                        'text-right px-4 py-3 font-mono font-bold',
                        m.cumulativeBalance >= 0 ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {fmt(m.cumulativeBalance)}
                    </td>
                    <td className="text-center px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-xs',
                          confidenceColor[m.confidence]
                        )}
                      >
                        {confidenceLabel[m.confidence]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Detail */}
      {data.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Alertas ({data.alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'rounded-md p-3 text-sm flex items-start gap-3',
                    alert.severity === 'high'
                      ? 'bg-red-50 border border-red-200 text-red-800'
                      : 'bg-amber-50 border border-amber-200 text-amber-800'
                  )}
                >
                  <AlertTriangle
                    className={cn(
                      'h-4 w-4 mt-0.5 shrink-0',
                      alert.severity === 'high' ? 'text-red-600' : 'text-amber-600'
                    )}
                  />
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
          Entradas: receitas baseadas em tend&ecirc;ncia + boletins aprovados
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
          Sa&iacute;das: folha + alugu&eacute;is + OCs pendentes + tend&ecirc;ncia
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />
          Saldo Acumulado: saldo atual + proje&ccedil;&atilde;o acumulada
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm border border-gray-400 bg-gray-200" />
          Linha tracejada: saldo atual como refer&ecirc;ncia
        </div>
      </div>
    </div>
  )
}
