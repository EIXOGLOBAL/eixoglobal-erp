import React from 'react'
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from '@react-pdf/renderer'
import { formatDate, formatDateTime } from '@/lib/formatters'

// ────────────────────────────────────────────────────────
// Paleta de Cores
// ────────────────────────────────────────────────────────
const COLORS = {
  primary: '#2563EB',
  secondary: '#1E40AF',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#E5E7EB',
  success: '#16A34A',
  danger: '#DC2626',
  white: '#FFFFFF',
  lightBg: '#F9FAFB',
  lightBlue: '#EFF6FF',
}

// ────────────────────────────────────────────────────────
// Helpers de Formatação
// ────────────────────────────────────────────────────────
export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}


// ────────────────────────────────────────────────────────
// Estilos base
// ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Página
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: COLORS.text,
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 40,
  },

  // Capa
  coverPage: {
    fontFamily: 'Helvetica',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 60,
    paddingVertical: 80,
  },
  coverLogo: {
    fontSize: 36,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  coverSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 60,
  },
  coverTitle: {
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.secondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  coverReportSubtitle: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 40,
  },
  coverDivider: {
    width: 80,
    height: 3,
    backgroundColor: COLORS.primary,
    marginBottom: 40,
  },
  coverInfoBox: {
    backgroundColor: COLORS.lightBg,
    borderRadius: 6,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  coverInfoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  coverInfoLabel: {
    fontSize: 9,
    color: COLORS.muted,
    width: 100,
    fontFamily: 'Helvetica-Bold',
  },
  coverInfoValue: {
    fontSize: 9,
    color: COLORS.text,
    flex: 1,
  },

  // Rodapé
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: COLORS.muted,
  },

  // SectionTitle
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.secondary,
    marginBottom: 12,
    marginTop: 8,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },

  // KPI Grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  kpiBox: {
    width: '48%',
    backgroundColor: COLORS.lightBg,
    borderRadius: 6,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  kpiLabel: {
    fontSize: 8,
    color: COLORS.muted,
    marginBottom: 4,
    textTransform: 'uppercase' as any,
    fontFamily: 'Helvetica-Bold',
  },
  kpiValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  kpiTrend: {
    fontSize: 8,
    color: COLORS.muted,
  },
  kpiTrendPositive: {
    color: COLORS.success,
  },
  kpiTrendNegative: {
    color: COLORS.danger,
  },

  // DataTable
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondary,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    textTransform: 'uppercase' as any,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableRowAlt: {
    backgroundColor: COLORS.lightBg,
  },
  tableCell: {
    fontSize: 9,
    color: COLORS.text,
  },

  // HighlightBox
  highlightBox: {
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  highlightTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  highlightText: {
    fontSize: 9,
  },
})

// ────────────────────────────────────────────────────────
// Componentes Utilitários
// ────────────────────────────────────────────────────────

interface SectionTitleProps {
  children: React.ReactNode
}

export function SectionTitle({ children }: SectionTitleProps) {
  return <Text style={styles.sectionTitle}>{children}</Text>
}

// ────────────────────────────────────────────────────────
// KPIGrid
// ────────────────────────────────────────────────────────

export interface KPIItem {
  label: string
  value: string
  trend?: string
  trendDirection?: 'positive' | 'negative' | 'neutral'
  color?: string
}

interface KPIGridProps {
  items: KPIItem[]
}

export function KPIGrid({ items }: KPIGridProps) {
  return (
    <View style={styles.kpiGrid}>
      {items.map((item, index) => (
        <View
          key={index}
          style={[
            styles.kpiBox,
            item.color ? { borderLeftColor: item.color } : {},
          ]}
        >
          <Text style={styles.kpiLabel}>{item.label}</Text>
          <Text style={styles.kpiValue}>{item.value}</Text>
          {item.trend && (
            <Text
              style={[
                styles.kpiTrend,
                ...(item.trendDirection === 'positive' ? [styles.kpiTrendPositive] : []),
                ...(item.trendDirection === 'negative' ? [styles.kpiTrendNegative] : []),
              ]}
            >
              {item.trend}
            </Text>
          )}
        </View>
      ))}
    </View>
  )
}

// ────────────────────────────────────────────────────────
// DataTable
// ────────────────────────────────────────────────────────

interface DataTableColumn {
  header: string
  width: string
  align?: 'left' | 'center' | 'right'
}

interface DataTableProps {
  columns: DataTableColumn[]
  rows: string[][]
}

export function DataTable({ columns, rows }: DataTableProps) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader} fixed>
        {columns.map((col, i) => (
          <Text
            key={i}
            style={[
              styles.tableHeaderCell,
              { width: col.width, textAlign: col.align || 'left' },
            ]}
          >
            {col.header}
          </Text>
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={[
            styles.tableRow,
            rowIndex % 2 === 1 ? styles.tableRowAlt : {},
          ]}
          wrap={false}
        >
          {row.map((cell, cellIndex) => (
            <Text
              key={cellIndex}
              style={[
                styles.tableCell,
                {
                  width: columns[cellIndex]?.width || 'auto',
                  textAlign: columns[cellIndex]?.align || 'left',
                },
              ]}
            >
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  )
}

// ────────────────────────────────────────────────────────
// HighlightBox
// ────────────────────────────────────────────────────────

interface HighlightBoxProps {
  title?: string
  children: React.ReactNode
  variant?: 'info' | 'success' | 'danger' | 'warning'
}

export function HighlightBox({ title, children, variant = 'info' }: HighlightBoxProps) {
  const variantStyles: Record<string, { bg: string; border: string; text: string }> = {
    info: { bg: COLORS.lightBlue, border: COLORS.primary, text: COLORS.secondary },
    success: { bg: '#F0FDF4', border: COLORS.success, text: COLORS.success },
    danger: { bg: '#FEF2F2', border: COLORS.danger, text: COLORS.danger },
    warning: { bg: '#FFFBEB', border: '#D97706', text: '#92400E' },
  }

  const v = variantStyles[variant]!

  return (
    <View
      style={[
        styles.highlightBox,
        {
          backgroundColor: v.bg,
          borderLeftWidth: 4,
          borderLeftColor: v.border,
        },
      ]}
    >
      {title && (
        <Text style={[styles.highlightTitle, { color: v.text }]}>{title}</Text>
      )}
      <Text style={[styles.highlightText, { color: COLORS.text }]}>
        {children}
      </Text>
    </View>
  )
}

// ────────────────────────────────────────────────────────
// ReportDocument — wrapper principal
// ────────────────────────────────────────────────────────

interface ReportDocumentProps {
  title: string
  subtitle?: string
  period?: { start: Date; end: Date }
  userName: string
  children?: React.ReactNode
}

export function ReportDocument({
  title,
  subtitle,
  period,
  userName,
  children,
}: ReportDocumentProps) {
  const now = new Date()

  return (
    <Document>
      {/* ─── Capa ─── */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverLogo}>EIXO GLOBAL</Text>
        <Text style={styles.coverSubtitle}>Sistema de Gestão Empresarial</Text>

        <Text style={styles.coverTitle}>{title}</Text>
        {subtitle && (
          <Text style={styles.coverReportSubtitle}>{subtitle}</Text>
        )}

        <View style={styles.coverDivider} />

        <View style={styles.coverInfoBox}>
          {period && (
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverInfoLabel}>Periodo:</Text>
              <Text style={styles.coverInfoValue}>
                {formatDate(period.start)} a {formatDate(period.end)}
              </Text>
            </View>
          )}
          <View style={styles.coverInfoRow}>
            <Text style={styles.coverInfoLabel}>Gerado em:</Text>
            <Text style={styles.coverInfoValue}>{formatDateTime(now)}</Text>
          </View>
          <View style={styles.coverInfoRow}>
            <Text style={styles.coverInfoLabel}>Gerado por:</Text>
            <Text style={styles.coverInfoValue}>{userName}</Text>
          </View>
        </View>

        {/* Footer da capa */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Gerado pelo ERP Eixo Global
          </Text>
          <Text style={styles.footerText}>{formatDateTime(now)}</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Pagina ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>

      {/* ─── Conteudo ─── */}
      <Page size="A4" style={styles.page} wrap>
        <View fixed>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              paddingBottom: 8,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontFamily: 'Helvetica-Bold',
                color: COLORS.primary,
              }}
            >
              EIXO GLOBAL
            </Text>
            <Text style={{ fontSize: 8, color: COLORS.muted }}>{title}</Text>
          </View>
        </View>

        {children}

        {/* Footer das paginas de conteudo */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Gerado pelo ERP Eixo Global
          </Text>
          <Text style={styles.footerText}>{formatDateTime(now)}</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Pagina ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  )
}

// ────────────────────────────────────────────────────────
// ExecutiveReportContent
// ────────────────────────────────────────────────────────

export interface ExecutiveKPIs {
  totalRevenue: number
  totalExpenses: number
  balance: number
  activeProjects: number
  totalContracts: number
  totalEmployees: number
  approvedMeasurements: number
  pendingPayments: number
}

export interface ProjectSummary {
  name: string
  status: string
  budget: number
  progress: number
}

export interface FinancialSummaryItem {
  month: string
  income: number
  expense: number
  balance: number
}

interface ExecutiveReportContentProps {
  kpis: ExecutiveKPIs
  projects: ProjectSummary[]
  financialSummary: FinancialSummaryItem[]
}

const statusLabels: Record<string, string> = {
  PLANNING: 'Planejamento',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluido',
  ON_HOLD: 'Pausado',
  CANCELLED: 'Cancelado',
}

export function ExecutiveReportContent({
  kpis,
  projects,
  financialSummary,
}: ExecutiveReportContentProps) {
  const kpiItems: KPIItem[] = [
    {
      label: 'Receita Total',
      value: formatCurrency(kpis.totalRevenue),
      trendDirection: 'positive',
      color: COLORS.success,
    },
    {
      label: 'Despesas Totais',
      value: formatCurrency(kpis.totalExpenses),
      trendDirection: 'negative',
      color: COLORS.danger,
    },
    {
      label: 'Saldo',
      value: formatCurrency(kpis.balance),
      trendDirection: kpis.balance >= 0 ? 'positive' : 'negative',
      color: kpis.balance >= 0 ? COLORS.success : COLORS.danger,
    },
    {
      label: 'Projetos Ativos',
      value: String(kpis.activeProjects),
      color: COLORS.primary,
    },
    {
      label: 'Contratos',
      value: String(kpis.totalContracts),
      color: COLORS.secondary,
    },
    {
      label: 'Colaboradores',
      value: String(kpis.totalEmployees),
      color: '#7C3AED',
    },
    {
      label: 'Medições Aprovadas',
      value: String(kpis.approvedMeasurements),
      color: COLORS.success,
    },
    {
      label: 'Pagamentos Pendentes',
      value: String(kpis.pendingPayments),
      trend: kpis.pendingPayments > 0 ? 'Requer atenção' : '',
      trendDirection: kpis.pendingPayments > 0 ? 'negative' : 'neutral',
      color: kpis.pendingPayments > 0 ? COLORS.danger : COLORS.muted,
    },
  ]

  const projectColumns = [
    { header: 'Projeto', width: '35%' },
    { header: 'Status', width: '20%' },
    { header: 'Orçamento', width: '25%', align: 'right' as const },
    { header: 'Progresso', width: '20%', align: 'right' as const },
  ]

  const projectRows = projects.map((p) => [
    p.name,
    statusLabels[p.status] || p.status,
    formatCurrency(p.budget),
    `${p.progress.toFixed(0)}%`,
  ])

  const financialColumns = [
    { header: 'Mês', width: '25%' },
    { header: 'Receitas', width: '25%', align: 'right' as const },
    { header: 'Despesas', width: '25%', align: 'right' as const },
    { header: 'Saldo', width: '25%', align: 'right' as const },
  ]

  const financialRows = financialSummary.map((f) => [
    f.month,
    formatCurrency(f.income),
    formatCurrency(f.expense),
    formatCurrency(f.balance),
  ])

  return (
    <View>
      <SectionTitle>Indicadores Gerais (KPIs)</SectionTitle>
      <KPIGrid items={kpiItems} />

      {kpis.balance < 0 && (
        <HighlightBox title="Alerta Financeiro" variant="danger">
          O saldo do período está negativo. Revise as despesas e receitas previstas.
        </HighlightBox>
      )}

      <SectionTitle>Projetos</SectionTitle>
      {projects.length > 0 ? (
        <DataTable columns={projectColumns} rows={projectRows} />
      ) : (
        <Text style={{ fontSize: 9, color: COLORS.muted, marginBottom: 12 }}>
          Nenhum projeto encontrado no período.
        </Text>
      )}

      <SectionTitle>Resumo Financeiro Mensal</SectionTitle>
      {financialSummary.length > 0 ? (
        <DataTable columns={financialColumns} rows={financialRows} />
      ) : (
        <Text style={{ fontSize: 9, color: COLORS.muted, marginBottom: 12 }}>
          Nenhum registro financeiro no período.
        </Text>
      )}
    </View>
  )
}

// ────────────────────────────────────────────────────────
// ProjectReportContent
// ────────────────────────────────────────────────────────

export interface ProjectDetail {
  name: string
  code?: string
  description?: string
  location?: string
  status: string
  startDate: string
  endDate?: string
  budget: number
  clientName?: string
}

export interface ContractSummary {
  identifier: string
  description?: string
  value: number
  status: string
  startDate: string
  endDate?: string
}

export interface MeasurementSummary {
  date: string
  description?: string
  quantity: number
  unit: string
  status: string
  employeeName?: string
}

interface ProjectReportContentProps {
  project: ProjectDetail
  contracts: ContractSummary[]
  measurements: MeasurementSummary[]
}

const contractStatusLabels: Record<string, string> = {
  ACTIVE: 'Ativo',
  COMPLETED: 'Concluido',
  CANCELLED: 'Cancelado',
  DRAFT: 'Rascunho',
}

const measurementStatusLabels: Record<string, string> = {
  DRAFT: 'Rascunho',
  SUBMITTED: 'Submetida',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
  BILLED: 'Faturada',
  PAID: 'Paga',
}

export function ProjectReportContent({
  project,
  contracts,
  measurements,
}: ProjectReportContentProps) {
  return (
    <View>
      <SectionTitle>Dados do Projeto</SectionTitle>
      <View style={{ marginBottom: 16 }}>
        <HighlightBox variant="info">
          {`Projeto: ${project.name}${project.code ? ` (${project.code})` : ''}\n` +
            `Status: ${statusLabels[project.status] || project.status}\n` +
            `Inicio: ${project.startDate}${project.endDate ? ` | Termino: ${project.endDate}` : ''}\n` +
            `Orcamento: ${formatCurrency(project.budget)}\n` +
            (project.location ? `Local: ${project.location}\n` : '') +
            (project.clientName ? `Cliente: ${project.clientName}` : '')}
        </HighlightBox>
        {project.description && (
          <Text style={{ fontSize: 9, color: COLORS.text, marginTop: 6 }}>
            {project.description}
          </Text>
        )}
      </View>

      <SectionTitle>Contratos ({contracts.length})</SectionTitle>
      {contracts.length > 0 ? (
        <DataTable
          columns={[
            { header: 'Identificador', width: '25%' },
            { header: 'Descricao', width: '25%' },
            { header: 'Valor', width: '20%', align: 'right' },
            { header: 'Status', width: '15%' },
            { header: 'Inicio', width: '15%' },
          ]}
          rows={contracts.map((c) => [
            c.identifier,
            c.description || '-',
            formatCurrency(c.value),
            contractStatusLabels[c.status] || c.status,
            c.startDate,
          ])}
        />
      ) : (
        <Text style={{ fontSize: 9, color: COLORS.muted, marginBottom: 12 }}>
          Nenhum contrato vinculado a este projeto.
        </Text>
      )}

      <SectionTitle>Medições ({measurements.length})</SectionTitle>
      {measurements.length > 0 ? (
        <DataTable
          columns={[
            { header: 'Data', width: '15%' },
            { header: 'Descricao', width: '30%' },
            { header: 'Qtd', width: '12%', align: 'right' },
            { header: 'Un', width: '8%' },
            { header: 'Status', width: '15%' },
            { header: 'Funcionario', width: '20%' },
          ]}
          rows={measurements.map((m) => [
            m.date,
            m.description || '-',
            m.quantity.toLocaleString('pt-BR'),
            m.unit,
            measurementStatusLabels[m.status] || m.status,
            m.employeeName || '-',
          ])}
        />
      ) : (
        <Text style={{ fontSize: 9, color: COLORS.muted, marginBottom: 12 }}>
          Nenhuma medicao registrada para este projeto.
        </Text>
      )}
    </View>
  )
}

// ────────────────────────────────────────────────────────
// FinancialReportContent
// ────────────────────────────────────────────────────────

export interface FinancialRecordItem {
  date: string
  description: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  amount: number
  status: string
  category?: string
}

export interface FinancialReportSummary {
  totalIncome: number
  totalExpense: number
  balance: number
  paidCount: number
  pendingCount: number
  monthlyBreakdown: FinancialSummaryItem[]
}

interface FinancialReportContentProps {
  records: FinancialRecordItem[]
  summary: FinancialReportSummary
}

const transactionTypeLabels: Record<string, string> = {
  INCOME: 'Receita',
  EXPENSE: 'Despesa',
  TRANSFER: 'Transferencia',
}

const transactionStatusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  CANCELLED: 'Cancelado',
  SCHEDULED: 'Agendado',
}

export function FinancialReportContent({
  records,
  summary,
}: FinancialReportContentProps) {
  const kpiItems: KPIItem[] = [
    {
      label: 'Total de Receitas',
      value: formatCurrency(summary.totalIncome),
      color: COLORS.success,
    },
    {
      label: 'Total de Despesas',
      value: formatCurrency(summary.totalExpense),
      color: COLORS.danger,
    },
    {
      label: 'Saldo do Periodo',
      value: formatCurrency(summary.balance),
      trendDirection: summary.balance >= 0 ? 'positive' : 'negative',
      color: summary.balance >= 0 ? COLORS.success : COLORS.danger,
    },
    {
      label: 'Lancamentos Pagos',
      value: String(summary.paidCount),
      color: COLORS.primary,
    },
    {
      label: 'Lancamentos Pendentes',
      value: String(summary.pendingCount),
      trend: summary.pendingCount > 0 ? 'Requer atencao' : '',
      trendDirection: summary.pendingCount > 0 ? 'negative' : 'neutral',
      color: summary.pendingCount > 0 ? COLORS.danger : COLORS.muted,
    },
  ]

  return (
    <View>
      <SectionTitle>Resumo Financeiro</SectionTitle>
      <KPIGrid items={kpiItems} />

      {summary.balance < 0 && (
        <HighlightBox title="Atencao" variant="danger">
          O saldo do período está negativo em {formatCurrency(Math.abs(summary.balance))}.
        </HighlightBox>
      )}

      <SectionTitle>Detalhamento Mensal</SectionTitle>
      {summary.monthlyBreakdown.length > 0 ? (
        <DataTable
          columns={[
            { header: 'Mês', width: '25%' },
            { header: 'Receitas', width: '25%', align: 'right' },
            { header: 'Despesas', width: '25%', align: 'right' },
            { header: 'Saldo', width: '25%', align: 'right' },
          ]}
          rows={summary.monthlyBreakdown.map((m) => [
            m.month,
            formatCurrency(m.income),
            formatCurrency(m.expense),
            formatCurrency(m.balance),
          ])}
        />
      ) : (
        <Text style={{ fontSize: 9, color: COLORS.muted, marginBottom: 12 }}>
          Sem dados mensais para exibir.
        </Text>
      )}

      <SectionTitle>Lancamentos ({records.length})</SectionTitle>
      {records.length > 0 ? (
        <DataTable
          columns={[
            { header: 'Data', width: '12%' },
            { header: 'Descricao', width: '30%' },
            { header: 'Tipo', width: '13%' },
            { header: 'Valor', width: '18%', align: 'right' },
            { header: 'Status', width: '12%' },
            { header: 'Categoria', width: '15%' },
          ]}
          rows={records.map((r) => [
            r.date,
            r.description,
            transactionTypeLabels[r.type] || r.type,
            formatCurrency(r.amount),
            transactionStatusLabels[r.status] || r.status,
            r.category || '-',
          ])}
        />
      ) : (
        <Text style={{ fontSize: 9, color: COLORS.muted, marginBottom: 12 }}>
          Nenhum lançamento financeiro no período.
        </Text>
      )}
    </View>
  )
}

// ────────────────────────────────────────────────────────
// HRReportContent
// ────────────────────────────────────────────────────────

export interface EmployeeSummaryItem {
  name: string
  jobTitle: string
  department?: string
  status: string
  admissionDate?: string
}

export interface AllocationSummaryItem {
  employeeName: string
  projectName: string
  startDate: string
  endDate?: string
}

export interface VacationSummaryItem {
  employeeName: string
  type: string
  startDate: string
  endDate: string
  days: number
  status: string
}

interface HRReportContentProps {
  employees: EmployeeSummaryItem[]
  allocations: AllocationSummaryItem[]
  vacations: VacationSummaryItem[]
}

const employeeStatusLabels: Record<string, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  ON_LEAVE: 'Afastado',
  BLOCKED: 'Bloqueado',
}

const leaveTypeLabels: Record<string, string> = {
  VACATION: 'Ferias',
  SICK_LEAVE: 'Licenca Medica',
  MATERNITY: 'Licenca Maternidade',
  PATERNITY: 'Licenca Paternidade',
  BEREAVEMENT: 'Luto',
  PERSONAL: 'Pessoal',
  ACCIDENT: 'Acidente de Trabalho',
  OTHER: 'Outro',
}

const leaveStatusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  CANCELLED: 'Cancelado',
}

export function HRReportContent({
  employees,
  allocations,
  vacations,
}: HRReportContentProps) {
  const activeCount = employees.filter((e) => e.status === 'ACTIVE').length
  const inactiveCount = employees.filter((e) => e.status !== 'ACTIVE').length

  const kpiItems: KPIItem[] = [
    {
      label: 'Total de Colaboradores',
      value: String(employees.length),
      color: COLORS.primary,
    },
    {
      label: 'Ativos',
      value: String(activeCount),
      color: COLORS.success,
    },
    {
      label: 'Inativos / Afastados',
      value: String(inactiveCount),
      color: COLORS.danger,
    },
    {
      label: 'Alocações Ativas',
      value: String(allocations.length),
      color: '#7C3AED',
    },
    {
      label: 'Ferias / Afastamentos',
      value: String(vacations.length),
      color: '#D97706',
    },
  ]

  return (
    <View>
      <SectionTitle>Indicadores de RH</SectionTitle>
      <KPIGrid items={kpiItems} />

      <SectionTitle>Colaboradores ({employees.length})</SectionTitle>
      {employees.length > 0 ? (
        <DataTable
          columns={[
            { header: 'Nome', width: '30%' },
            { header: 'Cargo', width: '22%' },
            { header: 'Depto', width: '18%' },
            { header: 'Status', width: '15%' },
            { header: 'Admissao', width: '15%' },
          ]}
          rows={employees.map((e) => [
            e.name,
            e.jobTitle,
            e.department || '-',
            employeeStatusLabels[e.status] || e.status,
            e.admissionDate || '-',
          ])}
        />
      ) : (
        <Text style={{ fontSize: 9, color: COLORS.muted, marginBottom: 12 }}>
          Nenhum colaborador cadastrado.
        </Text>
      )}

      <SectionTitle>Alocações em Projetos ({allocations.length})</SectionTitle>
      {allocations.length > 0 ? (
        <DataTable
          columns={[
            { header: 'Colaborador', width: '30%' },
            { header: 'Projeto', width: '35%' },
            { header: 'Inicio', width: '17%' },
            { header: 'Fim', width: '18%' },
          ]}
          rows={allocations.map((a) => [
            a.employeeName,
            a.projectName,
            a.startDate,
            a.endDate || 'Em aberto',
          ])}
        />
      ) : (
        <Text style={{ fontSize: 9, color: COLORS.muted, marginBottom: 12 }}>
          Nenhuma alocação encontrada no período.
        </Text>
      )}

      <SectionTitle>
        Ferias e Afastamentos ({vacations.length})
      </SectionTitle>
      {vacations.length > 0 ? (
        <DataTable
          columns={[
            { header: 'Colaborador', width: '25%' },
            { header: 'Tipo', width: '20%' },
            { header: 'Inicio', width: '14%' },
            { header: 'Fim', width: '14%' },
            { header: 'Dias', width: '10%', align: 'right' },
            { header: 'Status', width: '17%' },
          ]}
          rows={vacations.map((v) => [
            v.employeeName,
            leaveTypeLabels[v.type] || v.type,
            v.startDate,
            v.endDate,
            String(v.days),
            leaveStatusLabels[v.status] || v.status,
          ])}
        />
      ) : (
        <Text style={{ fontSize: 9, color: COLORS.muted, marginBottom: 12 }}>
          Nenhum registro de férias ou afastamento no período.
        </Text>
      )}
    </View>
  )
}
