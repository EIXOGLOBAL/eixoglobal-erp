'use client'

import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FinancialSummaryData } from '@/app/actions/dashboard-actions'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function TrendBadge({ value, inverted = false }: { value: number; inverted?: boolean }) {
  const isPositive = inverted ? value < 0 : value > 0
  const isNeutral = value === 0

  if (isNeutral) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" /> 0%
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        isPositive ? 'text-emerald-600' : 'text-red-500',
      )}
    >
      {value > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {value > 0 ? '+' : ''}{value}%
    </span>
  )
}

// ---------------------------------------------------------------------------
// Mini Bar Chart (CSS only)
// ---------------------------------------------------------------------------

function MiniBarChart({ bars }: { bars: FinancialSummaryData['monthlyBars'] }) {
  if (!bars || bars.length === 0) return null

  const maxVal = Math.max(...bars.flatMap(b => [b.revenue, b.expense]), 1)

  return (
    <div className="flex items-end gap-1.5 h-20 mt-4">
      {bars.map((bar, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center gap-0.5">
          <div className="flex items-end gap-px w-full h-14">
            {/* Receita */}
            <div
              className="flex-1 rounded-t bg-emerald-500/80 transition-all duration-500"
              style={{ height: `${Math.max((bar.revenue / maxVal) * 100, 2)}%` }}
              title={`Receita: ${formatCurrency(bar.revenue)}`}
            />
            {/* Despesa */}
            <div
              className="flex-1 rounded-t bg-red-400/70 transition-all duration-500"
              style={{ height: `${Math.max((bar.expense / maxVal) * 100, 2)}%` }}
              title={`Despesa: ${formatCurrency(bar.expense)}`}
            />
          </div>
          <span className="text-[10px] text-muted-foreground leading-none">{bar.label}</span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

export function FinancialSummarySkeleton() {
  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-36" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
        <Skeleton className="h-20 w-full rounded" />
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface FinancialSummaryWidgetProps {
  data: FinancialSummaryData | null
  isLoading?: boolean
}

export function FinancialSummaryWidget({ data, isLoading }: FinancialSummaryWidgetProps) {
  if (isLoading || !data) return <FinancialSummarySkeleton />

  const balanceColor = data.balance >= 0 ? 'text-emerald-600' : 'text-red-500'

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          Resumo Financeiro do Mes
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* KPI Row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Receitas */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Receitas</p>
            <p className="text-lg font-bold text-emerald-600">
              {formatCurrency(data.monthRevenue)}
            </p>
            <TrendBadge value={data.revenueTrend} />
          </div>

          {/* Despesas */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Despesas</p>
            <p className="text-lg font-bold text-red-500">
              {formatCurrency(data.monthExpenses)}
            </p>
            <TrendBadge value={data.expenseTrend} inverted />
          </div>

          {/* Saldo */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Saldo</p>
            <p className={cn('text-lg font-bold', balanceColor)}>
              {formatCurrency(data.balance)}
            </p>
            <Badge variant={data.balance >= 0 ? 'default' : 'destructive'} className="text-[10px] mt-1">
              {data.balance >= 0 ? 'Positivo' : 'Negativo'}
            </Badge>
          </div>
        </div>

        {/* Mini Chart */}
        <div>
          <div className="flex items-center gap-4 mb-1">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500/80" /> Receitas
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-sm bg-red-400/70" /> Despesas
            </span>
          </div>
          <MiniBarChart bars={data.monthlyBars} />
        </div>
      </CardContent>

      <CardFooter className="border-t pt-4">
        <Link
          href="/financeiro"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Ver Detalhes
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardFooter>
    </Card>
  )
}
