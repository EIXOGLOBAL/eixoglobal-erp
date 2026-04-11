'use client'

import { useState, useCallback, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { CurrencyInput } from '@/components/ui/currency-input'
import { useToast } from '@/hooks/use-toast'
import {
  Building2,
  FolderTree,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  DollarSign,
  Target,
  PiggyBank,
  ArrowUpDown,
  X,
  Receipt,
} from 'lucide-react'
import type {
  CostCenterBudgetReportItem,
  CostCenterHierarchyNode,
  BudgetStatus,
} from '@/app/actions/cost-center-budget-actions'
import {
  setCostCenterBudget,
  getRecentFinancialRecords,
} from '@/app/actions/cost-center-budget-actions'

import { formatDate } from "@/lib/formatters"
// ─── Formatters ──────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const formatPercent = (value: number) =>
  `${value.toFixed(1)}%`

// ─── Types ───────────────────────────────────────────────────────────────────

type CostCenterType = 'OPERATIONAL' | 'ADMINISTRATIVE' | 'FINANCIAL' | 'COMMERCIAL' | 'OTHER'

const typeLabels: Record<string, string> = {
  OPERATIONAL: 'Operacional',
  ADMINISTRATIVE: 'Administrativo',
  FINANCIAL: 'Financeiro',
  COMMERCIAL: 'Comercial',
  OTHER: 'Outro',
}

const typeColors: Record<string, string> = {
  OPERATIONAL: 'bg-blue-100 text-blue-800 border-blue-200',
  ADMINISTRATIVE: 'bg-purple-100 text-purple-800 border-purple-200',
  FINANCIAL: 'bg-green-100 text-green-800 border-green-200',
  COMMERCIAL: 'bg-orange-100 text-orange-800 border-orange-200',
  OTHER: 'bg-gray-100 text-gray-800 border-gray-200',
}

type FinancialRecordRow = {
  id: string
  description: string
  amount: number
  type: string
  status: string
  dueDate: string
  paidDate: string | null
}

// ─── Status helpers ──────────────────────────────────────────────────────────

function getStatusBadge(status: BudgetStatus) {
  switch (status) {
    case 'ok':
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200" variant="outline">
          <CheckCircle className="mr-1 h-3 w-3" />
          Dentro do limite
        </Badge>
      )
    case 'warning':
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200" variant="outline">
          <AlertTriangle className="mr-1 h-3 w-3" />
          Alerta
        </Badge>
      )
    case 'exceeded':
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200" variant="outline">
          <AlertTriangle className="mr-1 h-3 w-3" />
          Excedido
        </Badge>
      )
  }
}

function getProgressColor(burnRate: number): string {
  if (burnRate >= 100) return 'bg-red-500'
  if (burnRate >= 80) return 'bg-amber-500'
  return 'bg-green-500'
}

function getProgressBarStyle(burnRate: number) {
  const capped = Math.min(burnRate, 100)
  const color = burnRate >= 100 ? '#ef4444' : burnRate >= 80 ? '#f59e0b' : '#22c55e'
  return {
    width: `${capped}%`,
    backgroundColor: color,
    transition: 'width 0.5s ease-in-out',
  }
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface CostCenterBudgetClientProps {
  hierarchy: CostCenterHierarchyNode[]
  report: CostCenterBudgetReportItem[]
  year: number
  companyId: string
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CostCenterBudgetClient({
  hierarchy,
  report,
  year,
  companyId,
}: CostCenterBudgetClientProps) {
  const [selectedNode, setSelectedNode] = useState<CostCenterHierarchyNode | null>(null)
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false)
  const [budgetTarget, setBudgetTarget] = useState<{ id: string; name: string; code: string } | null>(null)
  const [records, setRecords] = useState<FinancialRecordRow[]>([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [sortField, setSortField] = useState<string>('code')
  const [sortAsc, setSortAsc] = useState(true)
  const { toast } = useToast()

  // ── KPIs ──────────────────────────────────────────────────────────────

  const totalBudgeted = report.reduce((s, r) => s + r.budgeted, 0)
  const totalRealized = report.reduce((s, r) => s + r.realized, 0)
  const totalRemaining = totalBudgeted - totalRealized
  const alertCount = report.filter((r) => r.status === 'warning' || r.status === 'exceeded').length

  // ── Select node and load records ──────────────────────────────────────

  const handleSelectNode = useCallback(async (node: CostCenterHierarchyNode) => {
    setSelectedNode(node)
    setLoadingRecords(true)
    try {
      const res = await getRecentFinancialRecords(node.id)
      if (res.success) {
        setRecords(res.data as FinancialRecordRow[])
      }
    } catch {
      // ignore
    } finally {
      setLoadingRecords(false)
    }
  }, [])

  // ── Budget dialog ─────────────────────────────────────────────────────

  function openBudgetDialog(id: string, name: string, code: string) {
    setBudgetTarget({ id, name, code })
    setBudgetDialogOpen(true)
  }

  // ── Sort table ────────────────────────────────────────────────────────

  function handleSort(field: string) {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  const sortedReport = [...report].sort((a, b) => {
    let cmp = 0
    switch (sortField) {
      case 'code':
        cmp = a.costCenter.code.localeCompare(b.costCenter.code)
        break
      case 'name':
        cmp = a.costCenter.name.localeCompare(b.costCenter.name)
        break
      case 'type':
        cmp = a.costCenter.type.localeCompare(b.costCenter.type)
        break
      case 'budgeted':
        cmp = a.budgeted - b.budgeted
        break
      case 'realized':
        cmp = a.realized - b.realized
        break
      case 'remaining':
        cmp = a.remaining - b.remaining
        break
      case 'burnRate':
        cmp = a.burnRate - b.burnRate
        break
      default:
        cmp = 0
    }
    return sortAsc ? cmp : -cmp
  })

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orcado</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudgeted)}</div>
            <p className="text-xs text-muted-foreground">Orcamento {year}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Realizado</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalRealized)}</div>
            <p className="text-xs text-muted-foreground">Despesas pagas e pendentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
            <PiggyBank className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalRemaining)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalRemaining >= 0 ? 'Disponivel' : 'Deficit'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Centros em Alerta</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${alertCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {alertCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {alertCount > 0 ? 'Acima de 80% do orcamento' : 'Todos dentro do limite'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main content with tabs */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Tree/Table view */}
        <div className="xl:col-span-2">
          <Tabs defaultValue="tree" className="space-y-4">
            <TabsList>
              <TabsTrigger value="tree" className="flex items-center gap-1.5">
                <FolderTree className="h-4 w-4" />
                Visao Hierarquica
              </TabsTrigger>
              <TabsTrigger value="table" className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                Orcamento vs Realizado
              </TabsTrigger>
            </TabsList>

            {/* Tree View */}
            <TabsContent value="tree">
              <Card>
                <CardHeader>
                  <CardTitle>Hierarquia de Centros de Custo</CardTitle>
                  <CardDescription>
                    Clique em um centro de custo para ver detalhes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {hierarchy.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum centro de custo ativo encontrado.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {hierarchy.map((node) => (
                        <TreeNode
                          key={node.id}
                          node={node}
                          depth={0}
                          selectedId={selectedNode?.id ?? null}
                          onSelect={handleSelectNode}
                          onBudget={openBudgetDialog}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Table View */}
            <TabsContent value="table">
              <Card>
                <CardHeader>
                  <CardTitle>Orcamento vs Realizado - {year}</CardTitle>
                  <CardDescription>
                    Comparativo de todos os centros de custo com orcamento definido
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sortedReport.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum centro de custo com orcamento definido para {year}.
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <SortableHeader field="code" label="Centro de Custo" currentField={sortField} asc={sortAsc} onSort={handleSort} />
                            <SortableHeader field="type" label="Tipo" currentField={sortField} asc={sortAsc} onSort={handleSort} />
                            <SortableHeader field="budgeted" label="Orcado" currentField={sortField} asc={sortAsc} onSort={handleSort} />
                            <SortableHeader field="realized" label="Realizado" currentField={sortField} asc={sortAsc} onSort={handleSort} />
                            <SortableHeader field="remaining" label="Saldo" currentField={sortField} asc={sortAsc} onSort={handleSort} />
                            <SortableHeader field="burnRate" label="%" currentField={sortField} asc={sortAsc} onSort={handleSort} />
                            <TableHead className="text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedReport.map((item) => (
                            <TableRow
                              key={item.costCenter.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => {
                                // Find node in hierarchy
                                const found = findNodeInHierarchy(hierarchy, item.costCenter.id)
                                if (found) handleSelectNode(found)
                              }}
                            >
                              <TableCell>
                                <div>
                                  <p className="font-medium">{item.costCenter.name}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{item.costCenter.code}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={typeColors[item.costCenter.type] ?? typeColors['OTHER']!}
                                  variant="outline"
                                >
                                  {typeLabels[item.costCenter.type] ?? 'Outro'}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {formatCurrency(item.budgeted)}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {formatCurrency(item.realized)}
                              </TableCell>
                              <TableCell className={`font-mono text-sm ${item.remaining >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                {formatCurrency(item.remaining)}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {formatPercent(item.burnRate)}
                              </TableCell>
                              <TableCell className="text-center">
                                {getStatusBadge(item.status)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Detail Panel */}
        <div className="xl:col-span-1">
          {selectedNode ? (
            <DetailPanel
              node={selectedNode}
              records={records}
              loadingRecords={loadingRecords}
              onBudget={() => openBudgetDialog(selectedNode.id, selectedNode.name, selectedNode.code)}
              onClose={() => setSelectedNode(null)}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <FolderTree className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">
                  Selecione um centro de custo para ver detalhes
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Budget Dialog */}
      {budgetTarget && (
        <BudgetDialog
          open={budgetDialogOpen}
          onOpenChange={setBudgetDialogOpen}
          costCenterId={budgetTarget.id}
          costCenterName={budgetTarget.name}
          costCenterCode={budgetTarget.code}
          year={year}
        />
      )}
    </div>
  )
}

// ─── TreeNode Component ──────────────────────────────────────────────────────

function TreeNode({
  node,
  depth,
  selectedId,
  onSelect,
  onBudget,
}: {
  node: CostCenterHierarchyNode
  depth: number
  selectedId: string | null
  onSelect: (node: CostCenterHierarchyNode) => void
  onBudget: (id: string, name: string, code: string) => void
}) {
  const [isOpen, setIsOpen] = useState(depth < 2)
  const hasChildren = node.children.length > 0
  const isSelected = node.id === selectedId
  const hasBudget = node.budgeted > 0

  const statusIndicator = hasBudget
    ? node.status === 'exceeded'
      ? ' [!]'
      : node.status === 'warning'
        ? ' [*]'
        : ''
    : ''

  return (
    <div>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className={`
            flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors
            ${isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'}
          `}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
          onClick={() => onSelect(node)}
        >
          {/* Expand/collapse */}
          {hasChildren ? (
            <CollapsibleTrigger asChild>
              <button
                className="p-0.5 hover:bg-muted rounded"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsOpen(!isOpen)
                }}
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
          ) : (
            <span className="w-5" />
          )}

          {/* Icon */}
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />

          {/* Name */}
          <span className="font-medium text-sm flex-1 truncate">
            {node.name}
            {statusIndicator && (
              <span className={
                node.status === 'exceeded'
                  ? 'text-red-600 ml-1'
                  : 'text-amber-600 ml-1'
              }>
                {statusIndicator}
              </span>
            )}
          </span>

          {/* Budget info */}
          {hasBudget ? (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground font-mono">
                {formatCurrency(node.realized)} / {formatCurrency(node.budgeted)}
              </span>
              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={getProgressBarStyle(node.burnRate)}
                />
              </div>
              <span className={`text-xs font-mono font-medium min-w-[45px] text-right ${
                node.burnRate >= 100
                  ? 'text-red-600'
                  : node.burnRate >= 80
                    ? 'text-amber-600'
                    : 'text-green-600'
              }`}>
                {formatPercent(node.burnRate)}
              </span>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation()
                onBudget(node.id, node.name, node.code)
              }}
            >
              <DollarSign className="h-3 w-3 mr-1" />
              Definir orcamento
            </Button>
          )}
        </div>

        {/* Children */}
        {hasChildren && (
          <CollapsibleContent>
            {node.children.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                selectedId={selectedId}
                onSelect={onSelect}
                onBudget={onBudget}
              />
            ))}
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  )
}

// ─── Detail Panel ────────────────────────────────────────────────────────────

function DetailPanel({
  node,
  records,
  loadingRecords,
  onBudget,
  onClose,
}: {
  node: CostCenterHierarchyNode
  records: FinancialRecordRow[]
  loadingRecords: boolean
  onBudget: () => void
  onClose: () => void
}) {
  const hasBudget = node.budgeted > 0

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {node.name}
              </CardTitle>
              <CardDescription className="mt-1">
                <span className="font-mono">{node.code}</span>
                <span className="mx-2">|</span>
                <Badge className={typeColors[node.type] ?? typeColors['OTHER']!} variant="outline">
                  {typeLabels[node.type] ?? 'Outro'}
                </Badge>
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Budget gauge */}
          {hasBudget ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Utilizacao do orcamento</span>
                {getStatusBadge(node.status)}
              </div>

              {/* Large progress bar */}
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={getProgressBarStyle(node.burnRate)}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Orcado</p>
                  <p className="text-sm font-mono font-medium">{formatCurrency(node.budgeted)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Realizado</p>
                  <p className="text-sm font-mono font-medium text-blue-600">
                    {formatCurrency(node.realized)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className={`text-sm font-mono font-medium ${
                    node.budgeted - node.realized >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(node.budgeted - node.realized)}
                  </p>
                </div>
              </div>

              <div className="text-center">
                <span className={`text-2xl font-bold ${
                  node.burnRate >= 100
                    ? 'text-red-600'
                    : node.burnRate >= 80
                      ? 'text-amber-600'
                      : 'text-green-600'
                }`}>
                  {formatPercent(node.burnRate)}
                </span>
                <p className="text-xs text-muted-foreground">consumido</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">
                Nenhum orcamento definido para este centro de custo.
              </p>
            </div>
          )}

          <Button onClick={onBudget} className="w-full" variant={hasBudget ? 'outline' : 'default'}>
            <DollarSign className="mr-2 h-4 w-4" />
            {hasBudget ? 'Alterar Orcamento' : 'Definir Orcamento'}
          </Button>
        </CardContent>
      </Card>

      {/* Recent records */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Lancamentos Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRecords ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Nenhum lancamento encontrado.
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/50 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-xs">{record.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(record.dueDate)}
                      <span className="mx-1">-</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          record.status === 'PAID'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : record.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}
                      >
                        {record.status === 'PAID'
                          ? 'Pago'
                          : record.status === 'PENDING'
                            ? 'Pendente'
                            : record.status === 'CANCELLED'
                              ? 'Cancelado'
                              : record.status}
                      </Badge>
                    </p>
                  </div>
                  <span className={`font-mono text-xs shrink-0 ml-2 ${
                    record.type === 'EXPENSE' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {record.type === 'EXPENSE' ? '-' : '+'}
                    {formatCurrency(record.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Budget Dialog ───────────────────────────────────────────────────────────

function BudgetDialog({
  open,
  onOpenChange,
  costCenterId,
  costCenterName,
  costCenterCode,
  year: defaultYear,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  costCenterId: string
  costCenterName: string
  costCenterCode: string
  year: number
}) {
  const [yearValue, setYearValue] = useState(defaultYear)
  const [annualAmount, setAnnualAmount] = useState(0)
  const [distributeMonthly, setDistributeMonthly] = useState(false)
  const [monthlyAmounts, setMonthlyAmounts] = useState<number[]>(Array(12).fill(0) as number[])
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]

  function handleAnnualChange(value: number) {
    setAnnualAmount(value)
    if (distributeMonthly) {
      const perMonth = Math.round((value / 12) * 100) / 100
      setMonthlyAmounts(Array(12).fill(perMonth) as number[])
    }
  }

  function handleDistributeChange(checked: boolean) {
    setDistributeMonthly(checked)
    if (checked && annualAmount > 0) {
      const perMonth = Math.round((annualAmount / 12) * 100) / 100
      setMonthlyAmounts(Array(12).fill(perMonth) as number[])
    }
  }

  function handleMonthlyChange(index: number, value: number) {
    const updated = [...monthlyAmounts]
    updated[index] = value
    setMonthlyAmounts(updated)
  }

  async function handleSave() {
    if (annualAmount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Informe um valor de orcamento maior que zero.',
      })
      return
    }

    startTransition(async () => {
      try {
        if (distributeMonthly) {
          // Save monthly budgets
          for (let i = 0; i < 12; i++) {
            const amount = monthlyAmounts[i]!
            if (amount > 0) {
              const res = await setCostCenterBudget(
                costCenterId,
                yearValue,
                amount,
                i + 1,
                notes || undefined
              )
              if (!res.success) {
                toast({
                  variant: 'destructive',
                  title: 'Erro',
                  description: res.error ?? `Erro ao salvar orcamento do mes ${i + 1}.`,
                })
                return
              }
            }
          }
        } else {
          // Save annual budget
          const res = await setCostCenterBudget(
            costCenterId,
            yearValue,
            annualAmount,
            null,
            notes || undefined
          )
          if (!res.success) {
            toast({
              variant: 'destructive',
              title: 'Erro',
              description: res.error ?? 'Erro ao salvar orcamento.',
            })
            return
          }
        }

        toast({ title: 'Orcamento salvo com sucesso!' })
        onOpenChange(false)
        // Reset form
        setAnnualAmount(0)
        setDistributeMonthly(false)
        setMonthlyAmounts(Array(12).fill(0) as number[])
        setNotes('')
      } catch {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Erro inesperado ao salvar orcamento.',
        })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Definir Orcamento
          </DialogTitle>
          <DialogDescription>
            {costCenterCode} - {costCenterName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Year */}
          <div className="space-y-2">
            <Label>Ano</Label>
            <Input
              type="number"
              value={yearValue}
              onChange={(e) => setYearValue(parseInt(e.target.value, 10) || defaultYear)}
              min={2020}
              max={2050}
            />
          </div>

          {/* Annual amount */}
          <div className="space-y-2">
            <Label>Valor Anual</Label>
            <CurrencyInput
              value={annualAmount}
              onChange={handleAnnualChange}
              placeholder="R$ 0,00"
            />
          </div>

          {/* Distribute monthly */}
          <div className="flex items-center space-x-2 rounded-lg border p-3">
            <Checkbox
              id="distribute"
              checked={distributeMonthly}
              onCheckedChange={(checked) => handleDistributeChange(checked === true)}
            />
            <Label htmlFor="distribute" className="text-sm cursor-pointer">
              Distribuir igualmente por mes
            </Label>
          </div>

          {/* Monthly breakdown */}
          {distributeMonthly && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-md p-3">
              <p className="text-xs text-muted-foreground mb-2">
                Valores mensais (ajuste individualmente se necessario):
              </p>
              <div className="grid grid-cols-2 gap-3">
                {monthNames.map((name, index) => (
                  <div key={name} className="space-y-1">
                    <Label className="text-xs">{name}</Label>
                    <CurrencyInput
                      value={monthlyAmounts[index]!}
                      onChange={(v) => handleMonthlyChange(index, v)}
                      placeholder="R$ 0,00"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Observacoes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observacoes sobre este orcamento..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? 'Salvando...' : 'Salvar Orcamento'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Sortable Header ─────────────────────────────────────────────────────────

function SortableHeader({
  field,
  label,
  currentField,
  asc,
  onSort,
}: {
  field: string
  label: string
  currentField: string
  asc: boolean
  onSort: (field: string) => void
}) {
  const isActive = currentField === field
  return (
    <TableHead>
      <button
        className="flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={() => onSort(field)}
      >
        {label}
        <ArrowUpDown className={`h-3 w-3 ${isActive ? 'text-foreground' : 'text-muted-foreground/50'}`} />
      </button>
    </TableHead>
  )
}

// ─── Helper: find node in hierarchy ──────────────────────────────────────────

function findNodeInHierarchy(
  nodes: CostCenterHierarchyNode[],
  id: string
): CostCenterHierarchyNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = findNodeInHierarchy(node.children, id)
    if (found) return found
  }
  return null
}
