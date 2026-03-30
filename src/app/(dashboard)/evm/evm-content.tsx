'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Activity,
  Target,
  DollarSign,
  Clock,
  AlertCircle,
  Zap,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import type { EVMProjectData as EVMProject, EVMPortfolioSummary } from '@/app/actions/evm-actions'
import {
  generateMonthlyEVMTrends,
  generateMonthlyComparison,
} from './_components/evm-helpers'

// ============================================================================
// Types
// ============================================================================

interface EVMContentProps {
  projects: EVMProject[]
  summary: EVMPortfolioSummary | null
  companyId: string
  isManager: boolean
}

// ============================================================================
// Formatting Functions
// ============================================================================

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)

const fmtPct = (n: number) => (n * 100).toFixed(1)

// ============================================================================
// Health Status Helper
// ============================================================================

function getHealthStatus(spi: number, cpi: number): { status: 'green' | 'yellow' | 'red'; label: string } {
  if (spi >= 0.95 && cpi >= 0.95) {
    return { status: 'green', label: 'Saudável' }
  } else if (spi >= 0.85 && cpi >= 0.85) {
    return { status: 'yellow', label: 'Atenção' }
  } else {
    return { status: 'red', label: 'Crítico' }
  }
}

function getHealthColor(status: 'green' | 'yellow' | 'red'): string {
  switch (status) {
    case 'green':
      return 'bg-green-100 text-green-900 dark:bg-green-900/20 dark:text-green-400'
    case 'yellow':
      return 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-400'
    case 'red':
      return 'bg-red-100 text-red-900 dark:bg-red-900/20 dark:text-red-400'
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function EVMContent({
  projects,
  summary,
  companyId,
  isManager,
}: EVMContentProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    projects.length > 0 ? projects[0].id : null
  )

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0]

  if (projects.length === 0) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/relatorios">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Relatórios
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">
              Nenhum projeto com orçamento encontrado.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Cadastre o orçamento nos projetos para calcular os indicadores EVM.
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/projetos">Ir para Projetos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const portfolioHealth = summary
    ? getHealthStatus(summary.portfolioSPI, summary.portfolioCPI)
    : null

  const selectedHealth = selectedProject
    ? getHealthStatus(selectedProject.spi, selectedProject.cpi)
    : null

  const monthlyTrends = selectedProject ? generateMonthlyEVMTrends(selectedProject, 12) : []
  const monthlyComparison = selectedProject ? generateMonthlyComparison(selectedProject, 12) : []

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* ================================================================
          Header
          ================================================================ */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/relatorios">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Relatórios
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            Earned Value Management (EVM)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Análise de desempenho de prazo e custo dos projetos
          </p>
        </div>
      </div>

      {/* ================================================================
          Project Selector
          ================================================================ */}
      <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
        <div className="flex items-center gap-3">
          <Target className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Selecione um projeto:</span>
          <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-96">
              <SelectValue placeholder="Escolha um projeto" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ================================================================
          Portfolio Overview Cards
          ================================================================ */}
      {summary && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Visão Geral do Portfólio
            </h2>
            {portfolioHealth && (
              <Badge className={getHealthColor(portfolioHealth.status)}>
                {portfolioHealth.label}
              </Badge>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
                  <DollarSign className="h-3 w-3" />
                  VP (Valor Planejado)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {fmt(summary.totalPV)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {((summary.totalPV / summary.totalBudget) * 100).toFixed(0)}% do orçamento
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
                  <Activity className="h-3 w-3" />
                  VA (Valor Agregado)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {fmt(summary.totalEV)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.avgProgressPercent.toFixed(0)}% progresso médio
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
                  <DollarSign className="h-3 w-3" />
                  CR (Custo Real)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {fmt(summary.totalAC)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {((summary.totalAC / summary.totalBudget) * 100).toFixed(0)}% do orçamento
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  IDPr (Índice Prazo)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    summary.portfolioSPI >= 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {fmtPct(summary.portfolioSPI)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.portfolioSPI >= 1 ? 'Adiantado' : 'Atrasado'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
                  <DollarSign className="h-3 w-3" />
                  IDCu (Índice Custo)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    summary.portfolioCPI >= 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {fmtPct(summary.portfolioCPI)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.portfolioCPI >= 1 ? 'Abaixo orçamento' : 'Acima orçamento'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ================================================================
          Selected Project Details
          ================================================================ */}
      {selectedProject && (
        <>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selectedProject.name}</h2>
              {selectedHealth && (
                <Badge className={getHealthColor(selectedHealth.status)}>
                  {selectedHealth.status === 'green' && (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  )}
                  {selectedHealth.status === 'yellow' && (
                    <AlertTriangle className="h-3 w-3 mr-1" />
                  )}
                  {selectedHealth.status === 'red' && (
                    <AlertCircle className="h-3 w-3 mr-1" />
                  )}
                  {selectedHealth.label}
                </Badge>
              )}
            </div>

            {/* ================================================================
                Project KPI Cards (6 columns)
                ================================================================ */}
            <div className="grid gap-4 md:grid-cols-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                    Orçamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{fmt(selectedProject.budget)}</div>
                  <Progress value={Math.min(100, (selectedProject.ac / selectedProject.budget) * 100)} className="mt-2 h-1" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                    VP
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {fmt(selectedProject.pv)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedProject.timeProgressPercent.toFixed(0)}% tempo
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                    VA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">
                    {fmt(selectedProject.ev)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedProject.progressPercent.toFixed(0)}% progresso
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                    CR
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    {fmt(selectedProject.ac)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Realizado
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                    IDPr
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-xl font-bold ${
                      selectedProject.spi >= 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {fmtPct(selectedProject.spi)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedProject.spi >= 1 ? 'Adiantado' : 'Atrasado'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                    IDCu
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-xl font-bold ${
                      selectedProject.cpi >= 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {fmtPct(selectedProject.cpi)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedProject.cpi >= 1 ? 'Economizando' : 'Excedendo'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ================================================================
              Variance Cards
              ================================================================ */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Variações</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                    SV (Variação Prazo)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${
                      selectedProject.sv >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {selectedProject.sv >= 0 ? '+' : ''}{fmt(selectedProject.sv)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedProject.sv >= 0 ? 'Dentro do prazo' : 'Atrasado'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                    CV (Variação Custo)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${
                      selectedProject.cv >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {selectedProject.cv >= 0 ? '+' : ''}{fmt(selectedProject.cv)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedProject.cv >= 0 ? 'Dentro orçamento' : 'Acima orçamento'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                    VAC (Variação Conclusão)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${
                      selectedProject.vac >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {selectedProject.vac >= 0 ? '+' : ''}{fmt(selectedProject.vac)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedProject.vac >= 0 ? 'Economia esperada' : 'Excesso esperado'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ================================================================
              Forecast Cards
              ================================================================ */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Projeções</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                    EAC (Estimativa Final)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{fmt(selectedProject.eac)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Custo estimado ao final
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                    ETC (Estimativa Restante)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {fmt(selectedProject.etc)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Custo para completar
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                    TAC (Custo ao Término)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {fmt(selectedProject.budget)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Orçamento aprovado
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ================================================================
              Trends Chart - SPI and CPI
              ================================================================ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tendências - IDPr e IDCu (12 meses)</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyTrends.length > 1 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={monthlyTrends} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis
                      domain={[0.8, 1.2]}
                      tickFormatter={(v) => v.toFixed(2)}
                      tick={{ fontSize: 11 }}
                    />
                    <ReferenceLine y={1} stroke="var(--muted-foreground)" strokeDasharray="3 3" label="Baseline (1.0)" />
                    <Tooltip
                      formatter={(v) => (typeof v === 'number' ? v.toFixed(3) : '0')}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Line
                      type="monotone"
                      dataKey="spi"
                      name="IDPr (Prazo)"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cpi"
                      name="IDCu (Custo)"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  Dados insuficientes para gerar gráfico
                </div>
              )}
            </CardContent>
          </Card>

          {/* ================================================================
              Comparison Chart - VP vs VA vs CR
              ================================================================ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Comparativo VP vs VA vs CR (em mil R$)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyComparison.length > 1 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={monthlyComparison} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => (typeof v === 'number' ? `R$ ${v}k` : 'R$ 0')} />
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey="PV" name="VP (Planejado)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="EV" name="VA (Agregado)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="AC" name="CR (Real)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  Dados insuficientes para gerar gráfico
                </div>
              )}
            </CardContent>
          </Card>

          {/* ================================================================
              Summary Table - All Projects
              ================================================================ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumo Todos os Projetos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHead>Projeto</TableHead>
                      <TableHead className="text-right">Orçamento</TableHead>
                      <TableHead className="text-right">VP</TableHead>
                      <TableHead className="text-right">VA</TableHead>
                      <TableHead className="text-right">CR</TableHead>
                      <TableHead className="text-right">IDPr</TableHead>
                      <TableHead className="text-right">IDCu</TableHead>
                      <TableHead className="text-center">Saúde</TableHead>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {projects.map((p) => {
                      const health = getHealthStatus(p.spi, p.cpi)
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">{p.name}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{fmt(p.budget)}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-blue-600 dark:text-blue-400">
                            {fmt(p.pv)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-green-600 dark:text-green-400">
                            {fmt(p.ev)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-amber-600 dark:text-amber-400">
                            {fmt(p.ac)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono text-xs ${
                              p.spi >= 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {fmtPct(p.spi)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono text-xs ${
                              p.cpi >= 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {fmtPct(p.cpi)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={getHealthColor(health.status)} variant="secondary">
                              {health.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ================================================================
          Legend Card
          ================================================================ */}
      <Card className="bg-muted/30 border-dashed">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Legenda EVM</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 text-xs text-muted-foreground">
            <div>
              <strong className="text-foreground">VP</strong> - Valor Planejado (baseado no tempo)
            </div>
            <div>
              <strong className="text-foreground">VA</strong> - Valor Agregado (medições aprovadas)
            </div>
            <div>
              <strong className="text-foreground">CR</strong> - Custo Real (custos realizados)
            </div>
            <div>
              <strong className="text-foreground">SV</strong> - Variação Prazo (VA - VP)
            </div>
            <div>
              <strong className="text-foreground">CV</strong> - Variação Custo (VA - CR)
            </div>
            <div>
              <strong className="text-foreground">IDPr</strong> - Índice Desempenho Prazo (VA/VP)
            </div>
            <div>
              <strong className="text-foreground">IDCu</strong> - Índice Desempenho Custo (VA/CR)
            </div>
            <div>
              <strong className="text-foreground">VAC</strong> - Variação ao Término (TAC - EAC)
            </div>
            <div>
              <strong className="text-foreground">EAC</strong> - Estimativa ao Término (TAC / IDCu)
            </div>
            <div>
              <strong className="text-foreground">ETC</strong> - Estimativa para Completar (EAC - CR)
            </div>
            <div>
              <strong className="text-foreground">TAC</strong> - Custo ao Término (Orçamento Aprovado)
            </div>
            <div>
              <strong className="text-foreground">Saúde</strong> - Verde (IDPr/IDCu &gt; 0.95), Amarela (0.85-0.95), Vermelha (&lt; 0.85)
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
