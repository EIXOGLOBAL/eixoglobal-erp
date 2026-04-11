'use client'

import Link from 'next/link'
import {
  FolderKanban,
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  FileText,
  Calculator,
  AlertTriangle,
  Package,
  Wrench,
  FileSignature,
  CalendarClock,
  ArrowRight,
  Inbox,
  ShoppingCart,
  ShieldAlert,
  CircleOff,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Line,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAnimatedCounter } from '@/hooks/use-animated-counter'
import { ExportPDFButton } from '@/components/pdf/ExportPDFButton'
import AIExecutiveSummary from '@/components/ai/AIExecutiveSummary'
import AIInsightCard from '@/components/ai/AIInsightCard'
import AIAnomalyAlert from '@/components/ai/AIAnomalyAlert'
import type { OperationalAlert } from './_components/dashboard-data'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KPIs {
  activeProjects: number
  totalProjects: number
  periodRevenue: number
  periodExpenses: number
  currentBalance: number
  allocatedEmployees: number
  totalActiveEmployees: number
  pendingBulletins: number
  pendingBudgets: number
  expiringContracts30d: number
  openPurchaseOrders: number
  openSafetyIncidents: number
  openNonConformities: number
  equipmentsInMaintenance: number
}

interface CashflowItem {
  month: string
  receitas: number
  despesas: number
  saldo: number
}

interface ProjectChartItem {
  name: string
  value: number
  color: string
}

interface TopProjectItem {
  name: string
  contractValue: number
  measuredValue: number
}

interface HRChartItem {
  month: string
  headcount: number
  allocationRate: number
}

interface RecentProject {
  id: string
  name: string
  status: string
  progress: number
  value: number
  deadline: string | null
}

interface RecentTransaction {
  id: string
  date: string
  description: string
  type: string
  amount: number
  status: string
}

interface DashboardContentProps {
  kpis: KPIs
  cashflow: CashflowItem[]
  projectsChart: ProjectChartItem[]
  topProjects: TopProjectItem[]
  hrChart: HRChartItem[]
  recentProjects: RecentProject[]
  recentTransactions: RecentTransaction[]
  alerts: OperationalAlert[]
  companyId: string
  isManager: boolean
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const fmtCompact = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)

const fmtCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR')

// ---------------------------------------------------------------------------
// Status maps
// ---------------------------------------------------------------------------

const PROJECT_STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  IN_PROGRESS: { label: 'Em Andamento', variant: 'default' },
  PLANNING: { label: 'Planejamento', variant: 'outline' },
  COMPLETED: { label: 'Concluido', variant: 'secondary' },
  ON_HOLD: { label: 'Em Espera', variant: 'outline' },
  CANCELLED: { label: 'Cancelado', variant: 'destructive' },
}

const TX_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  CANCELLED: 'Cancelado',
  SCHEDULED: 'Agendado',
}

// ---------------------------------------------------------------------------
// KPI Card sub-component
// ---------------------------------------------------------------------------

function KPICard({
  icon: Icon,
  label,
  value,
  subtitle,
  iconColor,
  href,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  subtitle: string
  iconColor: string
  href?: string
  badge?: { text: string; variant: 'default' | 'destructive' | 'secondary' }
}) {
  const content = (
    <Card className="bg-card border border-border/50 hover:shadow-lg hover:border-primary/20 transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <div className="flex items-center gap-2">
          {badge && (
            <Badge variant={badge.variant} className="text-[10px] px-1.5 py-0">
              {badge.text}
            </Badge>
          )}
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }
  return content
}

// ---------------------------------------------------------------------------
// Animated KPI wrapper
// ---------------------------------------------------------------------------

function AnimatedCurrencyKPI({
  icon,
  label,
  value,
  subtitle,
  iconColor,
  href,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  subtitle: string
  iconColor: string
  href?: string
  badge?: { text: string; variant: 'default' | 'destructive' | 'secondary' }
}) {
  const animated = useAnimatedCounter(Math.round(value), 1200)
  return (
    <KPICard
      icon={icon}
      label={label}
      value={fmtCompact(animated)}
      subtitle={subtitle}
      iconColor={iconColor}
      href={href}
      badge={badge}
    />
  )
}

function AnimatedNumberKPI({
  icon,
  label,
  value,
  subtitle,
  iconColor,
  href,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  subtitle: string
  iconColor: string
  href?: string
  badge?: { text: string; variant: 'default' | 'destructive' | 'secondary' }
}) {
  const animated = useAnimatedCounter(value, 1000)
  return (
    <KPICard
      icon={icon}
      label={label}
      value={String(animated)}
      subtitle={subtitle}
      iconColor={iconColor}
      href={href}
      badge={badge}
    />
  )
}

// ---------------------------------------------------------------------------
// Attention KPI Card (styled with severity colors)
// ---------------------------------------------------------------------------

const ATTENTION_STYLES = {
  ok: {
    border: 'border-green-200 dark:border-green-800/50',
    bg: 'bg-green-50/50 dark:bg-green-950/20',
    iconColor: 'text-green-600 dark:text-green-400',
    badgeVariant: 'secondary' as const,
    badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  },
  medium: {
    border: 'border-amber-200 dark:border-amber-800/50',
    bg: 'bg-amber-50/50 dark:bg-amber-950/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    badgeVariant: 'secondary' as const,
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  },
  high: {
    border: 'border-red-200 dark:border-red-800/50',
    bg: 'bg-red-50/50 dark:bg-red-950/20',
    iconColor: 'text-red-600 dark:text-red-400',
    badgeVariant: 'destructive' as const,
    badgeClass: '',
  },
}

function AttentionKPICard({
  icon: Icon,
  label,
  value,
  subtitle,
  href,
  severity,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  subtitle: string
  href: string
  severity: 'ok' | 'medium' | 'high'
}) {
  const animated = useAnimatedCounter(value, 1000)
  const styles = ATTENTION_STYLES[severity]

  const content = (
    <Card className={`${styles.bg} ${styles.border} border hover:shadow-lg transition-all duration-200`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <div className="flex items-center gap-2">
          {value > 0 && (
            <Badge
              variant={styles.badgeVariant}
              className={`text-[10px] px-1.5 py-0 ${styles.badgeClass}`}
            >
              {value}
            </Badge>
          )}
          <Icon className={`h-4 w-4 ${styles.iconColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${severity === 'ok' ? 'text-green-700 dark:text-green-300' : ''}`}>
          {animated}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  )

  return <Link href={href}>{content}</Link>
}

// ---------------------------------------------------------------------------
// Custom tooltips
// ---------------------------------------------------------------------------

interface TooltipPayloadEntry {
  name: string
  value: number
  color: string
  dataKey: string
}

function CashflowTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map(entry => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {fmtCurrency(entry.value)}
        </p>
      ))}
    </div>
  )
}

function BarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-semibold mb-1 truncate max-w-[200px]">{label}</p>
      {payload.map(entry => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {fmtCurrency(entry.value)}
        </p>
      ))}
    </div>
  )
}

interface PieTooltipPayloadEntry {
  name: string
  value: number
  payload: { color: string }
}

function PieTooltipComponent({
  active,
  payload,
}: {
  active?: boolean
  payload?: PieTooltipPayloadEntry[]
}) {
  if (!active || !payload?.length) return null
  const entry = payload[0]!
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-semibold" style={{ color: entry.payload.color }}>
        {entry.name}
      </p>
      <p>
        {entry.value} projeto{entry.value !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

function HRTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map(entry => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}:{' '}
          {entry.dataKey === 'allocationRate'
            ? `${entry.value}%`
            : entry.value}
        </p>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Alert icon map
// ---------------------------------------------------------------------------

const ALERT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  low_stock: Package,
  overdue_maintenance: Wrench,
  expiring_contract: FileSignature,
  pending_vacation: CalendarClock,
}

const SEVERITY_FALLBACK = {
  bg: 'bg-blue-50 dark:bg-blue-950/30',
  border: 'border-blue-200 dark:border-blue-800',
  text: 'text-blue-700 dark:text-blue-300',
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  low: SEVERITY_FALLBACK,
  medium: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
  },
  high: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-300',
  },
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DashboardContent({
  kpis,
  cashflow,
  projectsChart,
  topProjects,
  hrChart,
  recentProjects,
  recentTransactions,
  alerts,
  companyId,
  isManager,
}: DashboardContentProps) {
  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const allocationPct =
    kpis.totalActiveEmployees > 0
      ? Math.round(
          (kpis.allocatedEmployees / kpis.totalActiveEmployees) * 100,
        )
      : 0

  const projectsTotal = projectsChart.reduce((s, p) => s + p.value, 0)
  const hasCashflowData = cashflow.some(
    c => c.receitas > 0 || c.despesas > 0,
  )
  const hasProjectData = projectsChart.some(p => p.value > 0)
  const hasTopProjects = topProjects.length > 0
  const hasHRData = hrChart.some(h => h.headcount > 0)

  return (
    <div className="space-y-6">
      {/* ================================================================
          SECTION 0 -- CONTEXT BAR
          ================================================================ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground capitalize">{today}</p>
        </div>
        <ExportPDFButton
          type="executive"
          companyId={companyId}
          label="Exportar PDF"
        />
      </div>

      {/* ================================================================
          SECTION 1 -- AI EXECUTIVE SUMMARY (managers only)
          ================================================================ */}
      {isManager && (
        <section>
          <AIExecutiveSummary companyId={companyId} />
        </section>
      )}

      {/* ================================================================
          SECTION 2 -- KPI CARDS PRINCIPAIS (2 rows x 4 cols)
          ================================================================ */}
      <section className="grid grid-cols-4 gap-4 stagger-fade-in">
        {/* Row 1 - Projetos & Financeiro */}
        <AnimatedNumberKPI
          icon={FolderKanban}
          label="Projetos Ativos"
          value={kpis.activeProjects}
          subtitle={`De ${kpis.totalProjects} totais`}
          iconColor="text-blue-600"
          href="/projects"
        />
        <AnimatedCurrencyKPI
          icon={TrendingUp}
          label="Receita do Periodo"
          value={kpis.periodRevenue}
          subtitle="Mes corrente"
          iconColor="text-green-600"
          href="/financeiro/fluxo-de-caixa"
        />
        <AnimatedCurrencyKPI
          icon={TrendingDown}
          label="Despesas do Periodo"
          value={kpis.periodExpenses}
          subtitle="Mes corrente"
          iconColor="text-red-600"
          href="/financeiro/fluxo-de-caixa"
        />
        <AnimatedCurrencyKPI
          icon={Wallet}
          label="Saldo Atual"
          value={kpis.currentBalance}
          subtitle="Contas bancarias"
          iconColor={kpis.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}
          href="/financeiro/contas"
        />

        {/* Row 2 - RH, Orcamentos & Equipamentos */}
        <AnimatedNumberKPI
          icon={Users}
          label="Funcionarios Alocados"
          value={kpis.allocatedEmployees}
          subtitle={`${allocationPct}% de ${kpis.totalActiveEmployees} ativos`}
          iconColor="text-purple-600"
          href="/rh/funcionarios"
        />
        <AnimatedNumberKPI
          icon={Calculator}
          label="Orcamentos em Aprovacao"
          value={kpis.pendingBudgets}
          subtitle="Rascunhos pendentes"
          iconColor="text-indigo-600"
          href="/orcamentos"
        />
        <AnimatedNumberKPI
          icon={Wrench}
          label="Equipamentos em Manutencao"
          value={kpis.equipmentsInMaintenance}
          subtitle="Status manutencao"
          iconColor="text-yellow-600"
          href="/equipamentos"
          badge={
            kpis.equipmentsInMaintenance > 0
              ? { text: `${kpis.equipmentsInMaintenance}`, variant: 'secondary' }
              : undefined
          }
        />
        <AnimatedCurrencyKPI
          icon={Wallet}
          label="Resultado do Periodo"
          value={kpis.periodRevenue - kpis.periodExpenses}
          subtitle={kpis.periodRevenue - kpis.periodExpenses >= 0 ? 'Superavit' : 'Deficit'}
          iconColor={kpis.periodRevenue - kpis.periodExpenses >= 0 ? 'text-green-600' : 'text-red-600'}
          href="/financeiro/fluxo-de-caixa"
        />
      </section>

      {/* ================================================================
          SECTION 2.5 -- KPIs OPERACIONAIS APRIMORADOS (secao destacada)
          ================================================================ */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold tracking-tight">Painel de Atencao</h2>
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            Itens que requerem acao
          </Badge>
        </div>
        <div className="grid grid-cols-5 gap-4">
          <AttentionKPICard
            icon={FileText}
            label="Boletins Pendentes"
            value={kpis.pendingBulletins}
            subtitle="Aguardando aprovacao"
            href="/measurements"
            severity={kpis.pendingBulletins > 5 ? 'high' : kpis.pendingBulletins > 0 ? 'medium' : 'ok'}
          />
          <AttentionKPICard
            icon={ShoppingCart}
            label="Ordens de Compra"
            value={kpis.openPurchaseOrders}
            subtitle="Abertas (rascunho/pendente)"
            href="/compras"
            severity={kpis.openPurchaseOrders > 10 ? 'high' : kpis.openPurchaseOrders > 0 ? 'medium' : 'ok'}
          />
          <AttentionKPICard
            icon={ShieldAlert}
            label="Incidentes de Seguranca"
            value={kpis.openSafetyIncidents}
            subtitle="Abertos"
            href="/seguranca-trabalho"
            severity={kpis.openSafetyIncidents > 0 ? 'high' : 'ok'}
          />
          <AttentionKPICard
            icon={CircleOff}
            label="Nao Conformidades"
            value={kpis.openNonConformities}
            subtitle="Abertas"
            href="/qualidade"
            severity={kpis.openNonConformities > 0 ? 'high' : 'ok'}
          />
          <AttentionKPICard
            icon={CalendarClock}
            label="Contratos Vencendo"
            value={kpis.expiringContracts30d}
            subtitle="Proximos 30 dias"
            href="/contratos"
            severity={kpis.expiringContracts30d > 3 ? 'high' : kpis.expiringContracts30d > 0 ? 'medium' : 'ok'}
          />
        </div>
      </section>

      {/* ================================================================
          SECTION 3 -- MAIN CHARTS (Cashflow + Projects Pie)
          ================================================================ */}
      <section className="grid grid-cols-3 gap-4">
        {/* Cashflow - 2 cols */}
        <Card className="col-span-2 bg-card border border-border/50">
          <CardHeader>
            <CardTitle>Fluxo de Caixa Mensal</CardTitle>
            <CardDescription>
              Receitas, despesas e saldo acumulado - ultimos 12 meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasCashflowData ? (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart
                  data={cashflow}
                  margin={{ top: 4, right: 12, left: 12, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id="gradReceitas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradDespesas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => fmtCompact(v)}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={72}
                  />
                  <Tooltip content={<CashflowTooltip />} />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="receitas"
                    name="Receitas"
                    stroke="#10b981"
                    fill="url(#gradReceitas)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="despesas"
                    name="Despesas"
                    stroke="#ef4444"
                    fill="url(#gradDespesas)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="saldo"
                    name="Saldo"
                    stroke="#3b82f6"
                    fill="none"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Nenhum registro financeiro nos ultimos 12 meses." />
            )}
          </CardContent>
        </Card>

        {/* Projects pie - 1 col */}
        <Card className="col-span-1 bg-card border border-border/50">
          <CardHeader>
            <CardTitle>Status dos Projetos</CardTitle>
            <CardDescription>Distribuicao por status</CardDescription>
          </CardHeader>
          <CardContent>
            {hasProjectData ? (
              <div className="relative">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={projectsChart}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={95}
                      dataKey="value"
                      strokeWidth={2}
                    >
                      {projectsChart.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltipComponent />} />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: 11 }}
                      formatter={(value: string) => (
                        <span className="text-foreground">{value}</span>
                      )}
                    />
                    {/* Center label */}
                    <text
                      x="50%"
                      y="45%"
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-foreground"
                    >
                      <tspan x="50%" dy="-0.5em" fontSize={22} fontWeight={700}>
                        {projectsTotal}
                      </tspan>
                      <tspan x="50%" dy="1.4em" fontSize={11} className="fill-muted-foreground">
                        projetos
                      </tspan>
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState message="Nenhum projeto cadastrado." />
            )}
          </CardContent>
        </Card>
      </section>

      {/* ================================================================
          SECTION 4 -- SECONDARY CHARTS
          ================================================================ */}
      <section className="grid grid-cols-2 gap-4">
        {/* Top 5 Projects */}
        <Card className="bg-card border border-border/50">
          <CardHeader>
            <CardTitle>Performance Top 5 Projetos</CardTitle>
            <CardDescription>Valor contratado vs. medido</CardDescription>
          </CardHeader>
          <CardContent>
            {hasTopProjects ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={topProjects}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tickFormatter={(v: number) => fmtCompact(v)}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={130}
                  />
                  <Tooltip content={<BarTooltip />} />
                  <Legend
                    iconType="square"
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  />
                  <Bar
                    dataKey="contractValue"
                    name="Contratado"
                    fill="#3b82f6"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={20}
                  />
                  <Bar
                    dataKey="measuredValue"
                    name="Medido"
                    fill="#10b981"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Sem dados de projetos para exibir." />
            )}
          </CardContent>
        </Card>

        {/* HR Evolution */}
        <Card className="bg-card border border-border/50">
          <CardHeader>
            <CardTitle>Evolucao RH</CardTitle>
            <CardDescription>
              Headcount e taxa de alocacao - ultimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasHRData ? (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart
                  data={hrChart}
                  margin={{ top: 4, right: 12, left: 12, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v}%`}
                    domain={[0, 100]}
                  />
                  <Tooltip content={<HRTooltip />} />
                  <Legend
                    iconType="square"
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="headcount"
                    name="Headcount"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="allocationRate"
                    name="Taxa Alocacao %"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Sem dados de RH para exibir." />
            )}
          </CardContent>
        </Card>
      </section>

      {/* ================================================================
          SECTION 5 -- AI INSIGHTS (managers only)
          ================================================================ */}
      {isManager && (
        <section className="grid grid-cols-3 gap-4">
          <AIInsightCard
            title="Portfolio de Projetos"
            type="portfolio"
            companyId={companyId}
          />
          <AIInsightCard
            title="Saude Financeira"
            type="financial"
            companyId={companyId}
          />
          <AIInsightCard
            title="Recursos Humanos"
            type="hr"
            companyId={companyId}
          />
        </section>
      )}

      {/* ================================================================
          SECTION 6 -- DATA TABLES
          ================================================================ */}
      <section className="grid grid-cols-2 gap-4">
        {/* Recent Projects */}
        <Card className="bg-card border border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Projetos Recentes</CardTitle>
                <CardDescription>Ultimos projetos atualizados</CardDescription>
              </div>
              <Link
                href="/projects"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                Ver todos <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentProjects.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Prazo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentProjects.map(p => {
                    const statusInfo = PROJECT_STATUS_LABELS[p.status] ?? {
                      label: p.status,
                      variant: 'outline' as const,
                    }
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Link
                            href={`/projects/${p.id}`}
                            className="font-medium text-blue-600 hover:underline truncate block max-w-[160px]"
                          >
                            {p.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant} className="text-[10px]">
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={p.progress} className="h-1.5 w-16" />
                            <span className="text-xs text-muted-foreground">
                              {p.progress}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {fmtCompact(p.value)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {p.deadline ? fmtDate(p.deadline) : '-'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <EmptyState message="Nenhum projeto encontrado." />
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="bg-card border border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Ultimas Movimentacoes</CardTitle>
                <CardDescription>Receitas e despesas recentes</CardDescription>
              </div>
              <Link
                href="/financeiro/fluxo-de-caixa"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                Ver todas <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentTransactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descricao</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtDate(tx.date)}
                      </TableCell>
                      <TableCell className="truncate max-w-[140px] text-sm">
                        {tx.description}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={tx.type === 'INCOME' ? 'default' : 'destructive'}
                          className="text-[10px]"
                        >
                          {tx.type === 'INCOME' ? 'Receita' : 'Despesa'}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right text-sm font-medium ${
                          tx.type === 'INCOME'
                            ? 'text-green-700 dark:text-green-400'
                            : 'text-red-700 dark:text-red-400'
                        }`}
                      >
                        {tx.type === 'INCOME' ? '+' : '-'}{' '}
                        {fmtCurrency(tx.amount)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {TX_STATUS_LABELS[tx.status] ?? tx.status}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState message="Nenhuma movimentacao encontrada." />
            )}
          </CardContent>
        </Card>
      </section>

      {/* ================================================================
          SECTION 7 -- OPERATIONAL ALERTS + AI ANOMALY
          ================================================================ */}
      <section className="space-y-4">
        {/* AI Anomaly Alert (managers only) */}
        {isManager && <AIAnomalyAlert companyId={companyId} />}

        {/* Operational alerts grid */}
        {alerts.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold tracking-tight mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alertas Operacionais
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {alerts.map((alert, i) => {
                const styles = SEVERITY_STYLES[alert.severity] ?? SEVERITY_FALLBACK
                const Icon = ALERT_ICONS[alert.type] ?? AlertTriangle
                return (
                  <Link key={i} href={alert.link}>
                    <Card
                      className={`${styles.bg} ${styles.border} border hover:shadow-md transition-all duration-200 cursor-pointer`}
                    >
                      <CardContent className="flex items-start gap-3 pt-4 pb-4">
                        <Icon
                          className={`h-5 w-5 ${styles.text} mt-0.5 shrink-0`}
                        />
                        <div>
                          <p
                            className={`text-sm font-semibold ${styles.text}`}
                          >
                            {alert.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {alert.message}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state helper
// ---------------------------------------------------------------------------

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
      <Inbox className="h-8 w-8 mb-2 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
