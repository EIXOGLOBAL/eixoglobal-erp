'use client'

import { EVMMetrics } from '@/lib/evm'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const pct = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function indexColor(value: number, thresholdGood = 1, thresholdWarn = 0.9): string {
  if (value >= thresholdGood) return 'text-green-600'
  if (value >= thresholdWarn) return 'text-amber-500'
  return 'text-red-600'
}

function indexBgColor(value: number, thresholdGood = 1, thresholdWarn = 0.9): string {
  if (value >= thresholdGood) return 'bg-green-50 border-green-200'
  if (value >= thresholdWarn) return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
}

function currencyColor(value: number): string {
  return value >= 0 ? 'text-green-600' : 'text-red-600'
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface KPICardProps {
  title: string
  subtitle: string
  value: string
  valueClass: string
  borderClass: string
  description: string
}

function KPICard({
  title,
  subtitle,
  value,
  valueClass,
  borderClass,
  description,
}: KPICardProps) {
  return (
    <Card className={`border ${borderClass}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <CardDescription className="text-xs">{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${valueClass}`}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Progress bar component
// ---------------------------------------------------------------------------

interface ProgressBarProps {
  label: string
  value: number
  color: string
}

function ProgressBar({ label, value, color }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{pct.format(value)}%</span>
      </div>
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Automatic interpretation text
// ---------------------------------------------------------------------------

function buildInterpretation(metrics: EVMMetrics): string {
  const { spi, cpi, eac, bac } = metrics

  const scheduleStatus = spi >= 1 ? 'adiantado' : 'atrasado'
  const costStatus = cpi >= 1 ? 'abaixo' : 'acima'

  const diff = bac > 0 ? ((eac - bac) / bac) * 100 : 0
  const diffAbs = Math.abs(diff)
  const diffDirection = diff >= 0 ? 'a mais' : 'a menos'

  return (
    `O projeto está ${scheduleStatus} em prazo (SPI: ${pct.format(spi)}) e ` +
    `${costStatus} do orçamento (CPI: ${pct.format(cpi)}). ` +
    `Se continuar neste ritmo, o custo final será ${brl.format(eac)} ` +
    `(${pct.format(diffAbs)}% ${diffDirection} que o orçamento).`
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface EVMDashboardProps {
  metrics: EVMMetrics
}

export function EVMDashboard({ metrics }: EVMDashboardProps) {
  const { bac, pv, ev, ac, cpi, spi, eac, vac, sv, cv, percentComplete, percentPlanned } = metrics

  const interpretation = buildInterpretation(metrics)

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* 4 KPI Cards                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="CPI"
          subtitle="Índice de Desempenho de Custo"
          value={pct.format(cpi)}
          valueClass={indexColor(cpi)}
          borderClass={indexBgColor(cpi)}
          description={
            cpi >= 1
              ? 'Abaixo do orçamento'
              : cpi >= 0.9
              ? 'Levemente acima do orçamento'
              : 'Acima do orçamento'
          }
        />

        <KPICard
          title="SPI"
          subtitle="Índice de Desempenho de Prazo"
          value={pct.format(spi)}
          valueClass={indexColor(spi)}
          borderClass={indexBgColor(spi)}
          description={
            spi >= 1
              ? 'Adiantado ou no prazo'
              : spi >= 0.9
              ? 'Levemente atrasado'
              : 'Atrasado'
          }
        />

        <KPICard
          title="EAC"
          subtitle="Estimativa ao Término"
          value={brl.format(eac)}
          valueClass={eac <= bac ? 'text-green-600' : 'text-red-600'}
          borderClass={eac <= bac ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}
          description={`BAC: ${brl.format(bac)}`}
        />

        <KPICard
          title="VAC"
          subtitle="Variação ao Término"
          value={brl.format(vac)}
          valueClass={currencyColor(vac)}
          borderClass={vac >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}
          description={vac >= 0 ? 'Dentro do orçamento' : 'Acima do orçamento'}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Progresso Físico vs Planejado                                        */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Avanço Físico</CardTitle>
          <CardDescription>Progresso realizado vs planejado até hoje</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProgressBar
            label="Físico Realizado"
            value={percentComplete}
            color="bg-blue-500"
          />
          <ProgressBar
            label="Planejado (baseado em datas)"
            value={percentPlanned}
            color="bg-slate-400"
          />
          <div className="flex gap-6 pt-1">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Realizado: <strong>{pct.format(percentComplete)}%</strong></span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-slate-400" />
              <span className="text-muted-foreground">Planejado: <strong>{pct.format(percentPlanned)}%</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Tabela de Resumo EVM                                                 */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo EVM</CardTitle>
          <CardDescription>Indicadores de valor agregado do projeto</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Indicador</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="hidden md:table-cell">Significado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">
                  <span className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">PV</span>
                  {' '}Valor Planejado
                </TableCell>
                <TableCell className="text-right font-semibold">{brl.format(pv)}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                  O que deveria ter sido feito até hoje
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="font-medium">
                  <span className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">EV</span>
                  {' '}Valor Agregado
                </TableCell>
                <TableCell className="text-right font-semibold">{brl.format(ev)}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                  O que foi efetivamente feito
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="font-medium">
                  <span className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">AC</span>
                  {' '}Custo Real
                </TableCell>
                <TableCell className="text-right font-semibold">{brl.format(ac)}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                  O que foi gasto (boletins aprovados)
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="font-medium">
                  <span className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">CV</span>
                  {' '}Desvio de Custo
                </TableCell>
                <TableCell className={`text-right font-semibold ${currencyColor(cv)}`}>
                  {brl.format(cv)}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                  EV &minus; AC {cv >= 0 ? '(positivo = economia)' : '(negativo = estouro)'}
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="font-medium">
                  <span className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">SV</span>
                  {' '}Desvio de Prazo
                </TableCell>
                <TableCell className={`text-right font-semibold ${currencyColor(sv)}`}>
                  {brl.format(sv)}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                  EV &minus; PV {sv >= 0 ? '(positivo = adiantado)' : '(negativo = atrasado)'}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Interpretação automática                                             */}
      {/* ------------------------------------------------------------------ */}
      <Card className="border-blue-200 bg-blue-50/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-blue-800">
            Interpretacao Automatica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-900 leading-relaxed">{interpretation}</p>
        </CardContent>
      </Card>
    </div>
  )
}
