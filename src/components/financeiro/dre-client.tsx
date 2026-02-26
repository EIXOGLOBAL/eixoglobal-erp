'use client'

import { useState, useTransition, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getDREReport } from '@/app/actions/financial-report-actions'
import type { DREReport, DRELine } from '@/lib/financial-reports'
import {
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ChevronDown,
  Download,
  Percent,
  BarChart3,
  DollarSign,
} from 'lucide-react'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const fmtPct = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(v / 100)

const MONTHS = [
  { value: 'all', label: 'Ano Completo' },
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
]

function getYearOptions(): string[] {
  const current = new Date().getFullYear()
  return [String(current - 2), String(current - 1), String(current), String(current + 1)]
}

interface DREClientProps {
  initialData: DREReport
}

export function DREClient({ initialData }: DREClientProps) {
  const [report, setReport] = useState<DREReport>(initialData)
  const [year, setYear] = useState(String(initialData.year))
  const [month, setMonth] = useState(initialData.month ? String(initialData.month) : 'all')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const fetchReport = useCallback(
    (newYear: string, newMonth: string) => {
      startTransition(async () => {
        const m = newMonth && newMonth !== 'all' ? parseInt(newMonth, 10) : undefined
        const result = await getDREReport(parseInt(newYear, 10), m)
        if (result.success && result.data) {
          setReport(result.data)
        }
      })
    },
    []
  )

  function handleYearChange(val: string) {
    setYear(val)
    fetchReport(val, month)
  }

  function handleMonthChange(val: string) {
    setMonth(val)
    fetchReport(year, val)
  }

  function toggleRow(id: string) {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function getRowPrefix(line: DRELine): string {
    if (line.isResult) return '(=)'
    if (line.type === 'revenue') return line.level === 0 ? '(+)' : ''
    if (['deduction', 'cost', 'expense', 'tax'].includes(line.type)) return line.level <= 1 ? '(-)' : ''
    return ''
  }

  const yearOptions = getYearOptions()
  const { summary } = report

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">DRE</h2>
          <p className="text-muted-foreground">
            Demonstrativo de Resultado do Exerc&iacute;cio
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={year} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(y => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={month} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Ano Completo" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">EBITDA</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-2xl font-bold',
                summary.ebitda >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {fmt(summary.ebitda)}
            </div>
            <p className="text-xs text-muted-foreground">
              Lucro antes de juros, impostos, deprec. e amort.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margem EBITDA</CardTitle>
            <Percent className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-2xl font-bold',
                summary.ebitdaMargin >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {fmtPct(summary.ebitdaMargin)}
            </div>
            <p className="text-xs text-muted-foreground">EBITDA / Receita Bruta</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro L&iacute;quido</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-2xl font-bold',
                summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {fmt(summary.netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">Resultado final do per&iacute;odo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margem L&iacute;quida</CardTitle>
            {summary.netMargin >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-2xl font-bold',
                summary.netMargin >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {fmtPct(summary.netMargin)}
            </div>
            <p className="text-xs text-muted-foreground">Lucro L&iacute;quido / Receita Bruta</p>
          </CardContent>
        </Card>
      </div>

      {/* DRE Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Demonstrativo de Resultado &mdash; {year}
            {month !== 'all' ? ` / ${MONTHS.find(m => m.value === month)?.label}` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className={cn('overflow-x-auto', isPending && 'opacity-50')}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-8"></th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                    Descri&ccedil;&atilde;o
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    M&ecirc;s Atual
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    M&ecirc;s Anterior
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    Var %
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    Acum. Ano
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.lines.map(line => (
                  <DRERowComponent
                    key={line.id}
                    line={line}
                    expandedRows={expandedRows}
                    onToggle={toggleRow}
                    getPrefix={getRowPrefix}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-blue-900" />
          Linhas de resultado (=)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-green-600" />
          Receitas (+)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
          Dedu&ccedil;&otilde;es / Custos / Despesas (-)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-400" />
          Estimativas (Dedu&ccedil;&otilde;es 10%, Deprec. 2%, IR 15%)
        </div>
      </div>
    </div>
  )
}

// ─── Row Component ─────────────────────────────────────

function DRERowComponent({
  line,
  expandedRows,
  onToggle,
  getPrefix,
  indent = 0,
}: {
  line: DRELine
  expandedRows: Set<string>
  onToggle: (id: string) => void
  getPrefix: (line: DRELine) => string
  indent?: number
}) {
  const hasChildren = line.children && line.children.length > 0
  const isExpanded = expandedRows.has(line.id)
  const prefix = getPrefix(line)

  const isHighlightResult = line.isResult && (line.id === 'ebitda' || line.id === 'lucro-liquido')
  const isNormalResult = line.isResult && !isHighlightResult

  return (
    <>
      <tr
        className={cn(
          'border-b transition-colors',
          isHighlightResult && 'bg-blue-950 text-white font-bold',
          isNormalResult && 'bg-muted/40 font-semibold',
          !line.isResult && line.level === 0 && 'font-semibold bg-muted/20',
          !line.isResult && line.level >= 1 && 'text-muted-foreground',
          hasChildren && 'cursor-pointer hover:bg-accent/50'
        )}
        onClick={() => hasChildren && onToggle(line.id)}
      >
        <td className="px-4 py-3 text-xs font-mono whitespace-nowrap">
          {prefix}
        </td>
        <td
          className="px-4 py-3"
          style={{ paddingLeft: `${16 + indent * 20 + (line.level >= 1 ? 16 : 0)}px` }}
        >
          <div className="flex items-center gap-2">
            {hasChildren && (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )
            )}
            <span className={cn(line.level === 0 && 'uppercase tracking-wide text-xs')}>
              {line.label}
            </span>
          </div>
        </td>
        <td
          className={cn(
            'text-right px-4 py-3 font-mono',
            line.currentValue < 0 && !isHighlightResult && 'text-red-600',
            line.currentValue > 0 && line.type === 'revenue' && !isHighlightResult && 'text-green-700'
          )}
        >
          {line.currentValue === 0 ? (
            <span className={isHighlightResult ? 'text-white/50' : 'text-muted-foreground'}>
              &mdash;
            </span>
          ) : (
            fmt(Math.abs(line.currentValue))
          )}
        </td>
        <td
          className={cn(
            'text-right px-4 py-3 font-mono',
            line.previousValue < 0 && !isHighlightResult && 'text-red-600'
          )}
        >
          {line.previousValue === 0 ? (
            <span className={isHighlightResult ? 'text-white/50' : 'text-muted-foreground'}>
              &mdash;
            </span>
          ) : (
            fmt(Math.abs(line.previousValue))
          )}
        </td>
        <td className="text-right px-4 py-3 font-mono text-xs">
          {line.variationPercent === 0 ? (
            <span className={isHighlightResult ? 'text-white/50' : 'text-muted-foreground'}>
              &mdash;
            </span>
          ) : (
            <span
              className={cn(
                !isHighlightResult && line.variationPercent > 0 && 'text-green-600',
                !isHighlightResult && line.variationPercent < 0 && 'text-red-600'
              )}
            >
              {line.variationPercent > 0 ? '+' : ''}
              {line.variationPercent.toFixed(1)}%
            </span>
          )}
        </td>
        <td
          className={cn(
            'text-right px-4 py-3 font-mono',
            line.yearToDate < 0 && !isHighlightResult && 'text-red-600'
          )}
        >
          {line.yearToDate === 0 ? (
            <span className={isHighlightResult ? 'text-white/50' : 'text-muted-foreground'}>
              &mdash;
            </span>
          ) : (
            fmt(Math.abs(line.yearToDate))
          )}
        </td>
      </tr>
      {/* Children rows */}
      {hasChildren && isExpanded && line.children!.map(child => (
        <DRERowComponent
          key={child.id}
          line={child}
          expandedRows={expandedRows}
          onToggle={onToggle}
          getPrefix={getPrefix}
          indent={indent + 1}
        />
      ))}
    </>
  )
}
