'use client'

import { useState, useMemo, useCallback, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { useToast } from '@/hooks/use-toast'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  importBankStatement,
  getStatements,
  getStatementTransactions,
  getReconciliationSuggestions,
  manualReconcile,
  ignoreTransaction,
  createFinancialRecordFromTransaction,
  parseStatementPreview,
  getUnreconciledRecords,
  reconcileRecord,
} from '@/app/actions/bank-reconciliation-actions'
import {
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Loader2,
  Search,
  Eye,
  ArrowUpCircle,
  ArrowDownCircle,
  Percent,
  Ban,
  Link2,
  PlusCircle,
  ArrowLeftRight,
  LayoutPanelLeft,
} from 'lucide-react'
import { ExportButton } from '@/components/ui/export-button'
import type { ExportColumn } from '@/lib/export-utils'
import { formatCurrency as fmtCurrencyExport, formatDate as fmtDateExport } from '@/lib/export-utils'
import { DateRangeFilter, type DateRange } from '@/components/ui/date-range-filter'

// ============================================================================
// TYPES
// ============================================================================

interface BankAccount {
  id: string
  name: string
  bankName: string
  accountNumber: string
  agency: string
  balance: number
}

interface StatementStats {
  matched: number
  pending: number
  divergent: number
  ignored: number
  total: number
  matchRate: number
}

interface Statement {
  id: string
  bankAccountId: string
  bankAccount: { id: string; name: string; bankName: string }
  importedAt: string | Date
  period: string
  totalCredits: number
  totalDebits: number
  status: string
  _count: { transactions: number }
  stats: StatementStats
}

interface Transaction {
  id: string
  statementId: string
  date: string | Date
  description: string
  amount: number
  balance: number | null
  type: string
  externalId: string | null
  financialRecordId: string | null
  financialRecord: {
    id: string
    description: string
    amount: number
    type: string
    status: string
    dueDate: string | Date
    category: string | null
  } | null
  reconciliationStatus: string
  reconciliationNote: string | null
}

interface Suggestion {
  financialRecordId: string
  description: string
  amount: number
  date: string
  type: string
  status: string
  confidence: number
  matchReason: string
}

interface PreviewTransaction {
  date: string
  description: string
  amount: number
  type: string
}

interface ReconciliationClientProps {
  bankAccounts: BankAccount[]
  initialStatements: Statement[]
}

// ============================================================================
// FORMAT HELPERS
// ============================================================================

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const fmtDate = (d: string | Date) => {
  const date = new Date(d)
  return date.toLocaleDateString('pt-BR')
}

const BANK_PRESETS = [
  { value: 'itau', label: 'Itaú' },
  { value: 'bradesco', label: 'Bradesco' },
  { value: 'santander', label: 'Santander' },
  { value: 'bb', label: 'Banco do Brasil' },
  { value: 'nubank', label: 'Nubank' },
  { value: 'generico', label: 'Genérico' },
]

const STATUS_FILTERS = [
  { value: 'ALL', label: 'Todas' },
  { value: 'MATCHED', label: 'Conciliadas' },
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'DIVERGENT', label: 'Divergentes' },
  { value: 'IGNORED', label: 'Ignoradas' },
]

const reconciliationStatusLabels: Record<string, string> = {
  MATCHED: 'Conciliada',
  PENDING: 'Pendente',
  DIVERGENT: 'Divergente',
  IGNORED: 'Ignorada',
}

const reconciliationExportColumns: ExportColumn[] = [
  { key: 'date', label: 'Data', format: (v) => v ? fmtDateExport(v as string) : '' },
  { key: 'description', label: 'Descricao' },
  { key: 'typeName', label: 'Tipo' },
  { key: 'amount', label: 'Valor (R$)', format: (v) => fmtCurrencyExport(v as number) },
  { key: 'statusName', label: 'Status Conciliacao' },
  { key: 'linkedRecord', label: 'Registro Vinculado' },
]

function mapTransactionsForExport(txns: Transaction[]): Record<string, unknown>[] {
  return txns.map(t => ({
    ...t,
    typeName: t.type === 'CREDIT' ? 'Credito' : 'Debito',
    statusName: reconciliationStatusLabels[t.reconciliationStatus] || t.reconciliationStatus,
    linkedRecord: t.financialRecord?.description || '',
  }))
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ReconciliationClient({
  bankAccounts,
  initialStatements,
}: ReconciliationClientProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  // State
  const [statements, setStatements] = useState<Statement[]>(initialStatements)
  const [selectedStatement, setSelectedStatement] = useState<Statement | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  // Advanced filters
  const [txnDateRange, setTxnDateRange] = useState<DateRange>({ from: '', to: '' })

  // Import Dialog
  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importBankAccountId, setImportBankAccountId] = useState('')
  const [importBankPreset, setImportBankPreset] = useState('generico')
  const [importPreview, setImportPreview] = useState<PreviewTransaction[] | null>(null)
  const [importPreviewTotal, setImportPreviewTotal] = useState(0)
  const [importPreviewFormat, setImportPreviewFormat] = useState('')
  const [importing, setImporting] = useState(false)

  // Ignore Dialog
  const [ignoreOpen, setIgnoreOpen] = useState(false)
  const [ignoreReason, setIgnoreReason] = useState('')
  const [ignoreTxnId, setIgnoreTxnId] = useState<string | null>(null)

  // Create record Dialog
  const [createRecordOpen, setCreateRecordOpen] = useState(false)
  const [createRecordTxnId, setCreateRecordTxnId] = useState<string | null>(null)
  const [createRecordDescription, setCreateRecordDescription] = useState('')
  const [createRecordCategory, setCreateRecordCategory] = useState('')

  // Search in suggestions panel
  const [suggestionSearch, setSuggestionSearch] = useState('')

  // Side-by-side reconciliation panel
  const [sideBySideMode, setSideBySideMode] = useState(false)
  const [erpRecords, setErpRecords] = useState<{
    id: string; description: string; amount: number; type: string;
    status: string; dueDate: string | Date; paidDate: string | Date | null;
    category: string | null;
  }[]>([])
  const [erpSearch, setErpSearch] = useState('')
  const [erpLoading, setErpLoading] = useState(false)
  const [selectedBankTxn, setSelectedBankTxn] = useState<Transaction | null>(null)
  const [selectedErpRecord, setSelectedErpRecord] = useState<string | null>(null)
  const [matchingInProgress, setMatchingInProgress] = useState(false)

  // ============================================================================
  // COMPUTED STATS
  // ============================================================================

  const globalStats = {
    totalImported: statements.reduce((sum, s) => sum + s.stats.total, 0),
    totalMatched: statements.reduce((sum, s) => sum + s.stats.matched, 0),
    totalPending: statements.reduce((sum, s) => sum + s.stats.pending, 0),
    totalDivergent: statements.reduce((sum, s) => sum + s.stats.divergent, 0),
  }
  const globalMatchRate =
    globalStats.totalImported > 0
      ? Math.round((globalStats.totalMatched / globalStats.totalImported) * 100)
      : 0

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const refreshStatements = useCallback(() => {
    startTransition(async () => {
      const result = await getStatements()
      if (result.success && result.data) {
        setStatements(result.data as Statement[])
      }
    })
  }, [])

  const selectStatement = useCallback(
    (stmt: Statement) => {
      setSelectedStatement(stmt)
      setSelectedTransaction(null)
      setSuggestions([])
      startTransition(async () => {
        const result = await getStatementTransactions(stmt.id, statusFilter)
        if (result.success && result.data) {
          setTransactions(result.data as unknown as Transaction[])
        }
      })
    },
    [statusFilter]
  )

  const handleFilterChange = useCallback(
    (filter: string) => {
      setStatusFilter(filter)
      if (selectedStatement) {
        startTransition(async () => {
          const result = await getStatementTransactions(selectedStatement.id, filter)
          if (result.success && result.data) {
            setTransactions(result.data as unknown as Transaction[])
          }
        })
      }
    },
    [selectedStatement]
  )

  const handleSelectTransaction = useCallback(
    async (txn: Transaction) => {
      setSelectedTransaction(txn)
      setSuggestions([])
      setSuggestionSearch('')

      if (txn.reconciliationStatus === 'PENDING' || txn.reconciliationStatus === 'DIVERGENT') {
        setLoadingSuggestions(true)
        try {
          const result = await getReconciliationSuggestions(txn.id)
          if (result.success && result.data) {
            setSuggestions(result.data as Suggestion[])
          }
        } finally {
          setLoadingSuggestions(false)
        }
      }
    },
    []
  )

  // Import File Preview
  const handleFileChange = useCallback(
    async (file: File | null) => {
      setImportFile(file)
      setImportPreview(null)
      setImportPreviewTotal(0)

      if (file) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('bankPreset', importBankPreset)

        const result = await parseStatementPreview(formData)
        if (result.success && result.data) {
          setImportPreview(result.data.preview as PreviewTransaction[])
          setImportPreviewTotal(result.data.total)
          setImportPreviewFormat(result.data.format)
        } else {
          toast({
            variant: 'destructive',
            title: 'Erro ao analisar arquivo',
            description: result.error,
          })
        }
      }
    },
    [importBankPreset, toast]
  )

  // Re-preview when preset changes
  const handlePresetChange = useCallback(
    async (preset: string) => {
      setImportBankPreset(preset)
      if (importFile) {
        const formData = new FormData()
        formData.append('file', importFile)
        formData.append('bankPreset', preset)

        const result = await parseStatementPreview(formData)
        if (result.success && result.data) {
          setImportPreview(result.data.preview as PreviewTransaction[])
          setImportPreviewTotal(result.data.total)
          setImportPreviewFormat(result.data.format)
        }
      }
    },
    [importFile]
  )

  // Import statement
  const handleImport = useCallback(async () => {
    if (!importFile || !importBankAccountId) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Selecione um arquivo e uma conta bancária' })
      return
    }

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', importFile)
      formData.append('bankAccountId', importBankAccountId)
      formData.append('bankPreset', importBankPreset)

      const result = await importBankStatement(formData)
      if (result.success && result.data) {
        const report = result.data.report
        toast({
          title: 'Extrato importado com sucesso!',
          description: `${result.data.transactionCount} transações importadas. ${report.autoMatched} conciliadas automaticamente (${report.matchRate}%).`,
        })
        setImportOpen(false)
        setImportFile(null)
        setImportPreview(null)
        setImportBankAccountId('')
        setImportBankPreset('generico')
        refreshStatements()
      } else {
        toast({ variant: 'destructive', title: 'Erro na importação', description: result.error })
      }
    } finally {
      setImporting(false)
    }
  }, [importFile, importBankAccountId, importBankPreset, toast, refreshStatements])

  // Manual reconcile
  const handleManualReconcile = useCallback(
    async (financialRecordId: string) => {
      if (!selectedTransaction) return

      startTransition(async () => {
        const result = await manualReconcile(selectedTransaction.id, financialRecordId)
        if (result.success) {
          toast({ title: 'Conciliação realizada!', description: 'Transação conciliada com sucesso.' })
          setSelectedTransaction(null)
          setSuggestions([])
          if (selectedStatement) {
            const txnResult = await getStatementTransactions(selectedStatement.id, statusFilter)
            if (txnResult.success && txnResult.data) {
              setTransactions(txnResult.data as unknown as Transaction[])
            }
          }
          refreshStatements()
        } else {
          toast({ variant: 'destructive', title: 'Erro', description: result.error })
        }
      })
    },
    [selectedTransaction, selectedStatement, statusFilter, toast, refreshStatements]
  )

  // Ignore transaction
  const handleIgnore = useCallback(async () => {
    if (!ignoreTxnId || !ignoreReason.trim()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Informe o motivo da ignoração' })
      return
    }

    startTransition(async () => {
      const result = await ignoreTransaction(ignoreTxnId, ignoreReason)
      if (result.success) {
        toast({ title: 'Transação ignorada', description: 'A transação foi marcada como ignorada.' })
        setIgnoreOpen(false)
        setIgnoreReason('')
        setIgnoreTxnId(null)
        setSelectedTransaction(null)
        if (selectedStatement) {
          const txnResult = await getStatementTransactions(selectedStatement.id, statusFilter)
          if (txnResult.success && txnResult.data) {
            setTransactions(txnResult.data as unknown as Transaction[])
          }
        }
        refreshStatements()
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: result.error })
      }
    })
  }, [ignoreTxnId, ignoreReason, selectedStatement, statusFilter, toast, refreshStatements])

  // Create financial record from transaction
  const handleCreateRecord = useCallback(async () => {
    if (!createRecordTxnId) return

    startTransition(async () => {
      const result = await createFinancialRecordFromTransaction(createRecordTxnId, {
        description: createRecordDescription,
        category: createRecordCategory || undefined,
      })
      if (result.success) {
        toast({ title: 'Lançamento criado!', description: 'Lançamento financeiro criado e conciliado automaticamente.' })
        setCreateRecordOpen(false)
        setCreateRecordTxnId(null)
        setCreateRecordDescription('')
        setCreateRecordCategory('')
        setSelectedTransaction(null)
        if (selectedStatement) {
          const txnResult = await getStatementTransactions(selectedStatement.id, statusFilter)
          if (txnResult.success && txnResult.data) {
            setTransactions(txnResult.data as unknown as Transaction[])
          }
        }
        refreshStatements()
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: result.error })
      }
    })
  }, [createRecordTxnId, createRecordDescription, createRecordCategory, selectedStatement, statusFilter, toast, refreshStatements])

  // Load ERP records for side-by-side panel
  const loadErpRecords = useCallback(async (search?: string) => {
    setErpLoading(true)
    try {
      const result = await getUnreconciledRecords(search)
      if (result.success && result.data) {
        setErpRecords(result.data as typeof erpRecords)
      }
    } finally {
      setErpLoading(false)
    }
  }, [])

  const handleEnterSideBySide = useCallback(() => {
    setSideBySideMode(true)
    setSelectedBankTxn(null)
    setSelectedErpRecord(null)
    loadErpRecords()
  }, [loadErpRecords])

  const handleErpSearch = useCallback((search: string) => {
    setErpSearch(search)
    loadErpRecords(search || undefined)
  }, [loadErpRecords])

  const handleSideBySideMatch = useCallback(async () => {
    if (!selectedBankTxn || !selectedErpRecord) return

    setMatchingInProgress(true)
    try {
      const result = await reconcileRecord(selectedBankTxn.id, selectedErpRecord)
      if (result.success) {
        toast({
          title: 'Conciliado!',
          description: 'Transacao bancaria conciliada com lancamento financeiro.',
        })
        setSelectedBankTxn(null)
        setSelectedErpRecord(null)

        // Refresh both sides
        if (selectedStatement) {
          const txnResult = await getStatementTransactions(selectedStatement.id, 'ALL')
          if (txnResult.success && txnResult.data) {
            setTransactions(txnResult.data as unknown as Transaction[])
          }
        }
        loadErpRecords(erpSearch || undefined)
        refreshStatements()
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: result.error })
      }
    } finally {
      setMatchingInProgress(false)
    }
  }, [selectedBankTxn, selectedErpRecord, selectedStatement, erpSearch, toast, loadErpRecords, refreshStatements])

  // ============================================================================
  // STATUS BADGE
  // ============================================================================

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'AUTO_MATCHED':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Auto</Badge>
      case 'MATCHED':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Conciliada</Badge>
      case 'PENDING':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pendente</Badge>
      case 'DIVERGENT':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Divergente</Badge>
      case 'IGNORED':
        return <Badge className="bg-gray-100 text-gray-600 border-gray-200">Ignorada</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const renderStatementStatusBadge = (status: string) => {
    switch (status) {
      case 'RECONCILED':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Conciliado</Badge>
      case 'RECONCILING':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Em andamento</Badge>
      case 'DIVERGENT':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Divergente</Badge>
      case 'PENDING':
      default:
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pendente</Badge>
    }
  }

  // Filter transactions by date range (client-side)
  const filteredTransactions = useMemo(() => {
    if (!txnDateRange.from && !txnDateRange.to) return transactions
    return transactions.filter(txn => {
      const txnDate = new Date(txn.date).toISOString().split('T')[0]
      if (txnDateRange.from && txnDate < txnDateRange.from) return false
      if (txnDateRange.to && txnDate > txnDateRange.to) return false
      return true
    })
  }, [transactions, txnDateRange])

  // Filter suggestions by search
  const filteredSuggestions = suggestionSearch.trim()
    ? suggestions.filter(
        s =>
          s.description.toLowerCase().includes(suggestionSearch.toLowerCase()) ||
          fmt(s.amount).includes(suggestionSearch)
      )
    : suggestions

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-4">
      {/* Dashboard Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Importado</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats.totalImported}</div>
            <p className="text-xs text-muted-foreground">
              {statements.length} extrato(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conciliado</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{globalStats.totalMatched}</div>
            <p className="text-xs text-muted-foreground">transações conciliadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendente</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{globalStats.totalPending}</div>
            <p className="text-xs text-muted-foreground">aguardando conciliação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Divergente</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{globalStats.totalDivergent}</div>
            <p className="text-xs text-muted-foreground">sem correspondência</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa</CardTitle>
            <Percent className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{globalMatchRate}%</div>
            <Progress value={globalMatchRate} className="mt-1" />
          </CardContent>
        </Card>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={!sideBySideMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSideBySideMode(false)}
        >
          <LayoutPanelLeft className="h-4 w-4 mr-2" />
          Painel Extratos
        </Button>
        <Button
          variant={sideBySideMode ? 'default' : 'outline'}
          size="sm"
          onClick={handleEnterSideBySide}
        >
          <ArrowLeftRight className="h-4 w-4 mr-2" />
          Conciliacao Lado a Lado
        </Button>
      </div>

      {/* ================================================================== */}
      {/* SIDE-BY-SIDE RECONCILIATION PANEL                                  */}
      {/* ================================================================== */}
      {sideBySideMode && selectedStatement && (
        <div className="space-y-4">
          {/* Match action bar */}
          {selectedBankTxn && selectedErpRecord && (
            <Card className="border-primary bg-primary/5">
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Banco:</span>{' '}
                    <span className="font-medium">{selectedBankTxn.description.substring(0, 40)}</span>{' '}
                    <span className={`font-bold ${selectedBankTxn.type === 'CREDIT' ? 'text-green-700' : 'text-red-700'}`}>
                      {fmt(selectedBankTxn.amount)}
                    </span>
                  </div>
                  <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">ERP:</span>{' '}
                    <span className="font-medium">
                      {erpRecords.find(r => r.id === selectedErpRecord)?.description.substring(0, 40)}
                    </span>{' '}
                    <span className="font-bold">
                      {fmt(erpRecords.find(r => r.id === selectedErpRecord)?.amount ?? 0)}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={handleSideBySideMatch}
                  disabled={matchingInProgress}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {matchingInProgress ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Link2 className="h-4 w-4 mr-2" />
                  )}
                  Conciliar
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4 min-h-[500px]">
            {/* Left: Bank Transactions */}
            <Card className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowDownCircle className="h-5 w-5 text-blue-600" />
                  Extrato Bancario
                  <Badge variant="outline" className="ml-auto">
                    {transactions.filter(t => t.reconciliationStatus === 'PENDING' || t.reconciliationStatus === 'DIVERGENT').length} pendente(s)
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Descricao</TableHead>
                      <TableHead className="text-xs text-right">Valor</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions
                      .filter(t => t.reconciliationStatus === 'PENDING' || t.reconciliationStatus === 'DIVERGENT')
                      .map(txn => (
                        <TableRow
                          key={txn.id}
                          className={`cursor-pointer transition-colors ${
                            selectedBankTxn?.id === txn.id
                              ? 'bg-blue-50 border-l-2 border-l-blue-500'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedBankTxn(prev => prev?.id === txn.id ? null : txn)}
                        >
                          <TableCell className="text-xs">{fmtDate(txn.date)}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate" title={txn.description}>
                            {txn.description}
                          </TableCell>
                          <TableCell className={`text-xs text-right font-medium ${
                            txn.type === 'CREDIT' ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {txn.type === 'DEBIT' ? '- ' : ''}{fmt(txn.amount)}
                          </TableCell>
                          <TableCell>{renderStatusBadge(txn.reconciliationStatus)}</TableCell>
                        </TableRow>
                      ))}
                    {transactions.filter(t => t.reconciliationStatus === 'PENDING' || t.reconciliationStatus === 'DIVERGENT').length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-8">
                          Todas as transacoes ja foram conciliadas
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Right: ERP Records */}
            <Card className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                    Lancamentos ERP
                    <Badge variant="outline" className="ml-2">
                      {erpRecords.length} registro(s)
                    </Badge>
                  </CardTitle>
                </div>
                <div className="relative mt-2">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar lancamento..."
                    className="pl-8 h-9 text-sm"
                    value={erpSearch}
                    onChange={e => handleErpSearch(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto p-0">
                {erpLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Vencimento</TableHead>
                        <TableHead className="text-xs">Descricao</TableHead>
                        <TableHead className="text-xs">Tipo</TableHead>
                        <TableHead className="text-xs text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {erpRecords.map(rec => (
                        <TableRow
                          key={rec.id}
                          className={`cursor-pointer transition-colors ${
                            selectedErpRecord === rec.id
                              ? 'bg-purple-50 border-l-2 border-l-purple-500'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedErpRecord(prev => prev === rec.id ? null : rec.id)}
                        >
                          <TableCell className="text-xs">{fmtDate(rec.dueDate)}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate" title={rec.description}>
                            {rec.description}
                          </TableCell>
                          <TableCell>
                            {rec.type === 'INCOME' ? (
                              <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">Receita</Badge>
                            ) : (
                              <Badge className="bg-red-50 text-red-700 border-red-200 text-xs">Despesa</Badge>
                            )}
                          </TableCell>
                          <TableCell className={`text-xs text-right font-medium ${
                            rec.type === 'INCOME' ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {fmt(rec.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {erpRecords.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-8">
                            Nenhum lancamento nao conciliado encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Main 3-panel layout */}
      {!sideBySideMode && (
      <div className="flex gap-4 min-h-[600px]">
        {/* Left Panel — Statements list */}
        <div className="w-80 flex-shrink-0 space-y-3">
          <Button className="w-full" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar Extrato
          </Button>

          <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
            {statements.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-center text-sm text-muted-foreground">
                  Nenhum extrato importado. Clique em &quot;Importar Extrato&quot; para começar.
                </CardContent>
              </Card>
            ) : (
              statements.map(stmt => (
                <Card
                  key={stmt.id}
                  className={`cursor-pointer transition-colors hover:border-primary/50 ${
                    selectedStatement?.id === stmt.id ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => selectStatement(stmt)}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{stmt.bankAccount.name}</span>
                      {renderStatementStatusBadge(stmt.status)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Período: {stmt.period} | {stmt.stats.total} transações
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-green-600">
                        <ArrowUpCircle className="h-3 w-3 inline mr-0.5" />
                        {fmt(stmt.totalCredits)}
                      </span>
                      <span className="text-red-600">
                        <ArrowDownCircle className="h-3 w-3 inline mr-0.5" />
                        {fmt(stmt.totalDebits)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Progress value={stmt.stats.matchRate} className="flex-1 h-1.5" />
                      <span className="text-xs font-medium">{stmt.stats.matchRate}%</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Center Panel — Transactions table */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {selectedStatement
                  ? `Transações — ${selectedStatement.bankAccount.name} (${selectedStatement.period})`
                  : 'Selecione um extrato'}
              </CardTitle>
              {selectedStatement && transactions.length > 0 && (
                <ExportButton
                  data={mapTransactionsForExport(transactions)}
                  columns={reconciliationExportColumns}
                  filename="conciliacao_bancaria"
                  title="Conciliacao Bancaria"
                  sheetName="Transacoes"
                  size="sm"
                />
              )}
            </div>
            {selectedStatement && (
              <div className="flex gap-1 flex-wrap mt-2">
                {STATUS_FILTERS.map(f => (
                  <Button
                    key={f.value}
                    variant={statusFilter === f.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange(f.value)}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            {selectedStatement && (
              <div className="px-4 pt-3 pb-2 border-b">
                <DateRangeFilter value={txnDateRange} onChange={setTxnDateRange} className="flex-wrap" />
              </div>
            )}
            {!selectedStatement ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-8">
                Selecione um extrato na lista à esquerda para visualizar as transações
              </div>
            ) : isPending ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-8">
                Nenhuma transação encontrada para o filtro selecionado
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map(txn => (
                    <TableRow
                      key={txn.id}
                      className={`cursor-pointer ${
                        selectedTransaction?.id === txn.id ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => handleSelectTransaction(txn)}
                    >
                      <TableCell className="text-xs">{fmtDate(txn.date)}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs" title={txn.description}>
                        {txn.description}
                      </TableCell>
                      <TableCell>
                        {txn.type === 'CREDIT' ? (
                          <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">Crédito</Badge>
                        ) : (
                          <Badge className="bg-red-50 text-red-700 border-red-200 text-xs">Débito</Badge>
                        )}
                      </TableCell>
                      <TableCell className={`text-right font-medium text-xs ${txn.type === 'CREDIT' ? 'text-green-700' : 'text-red-700'}`}>
                        {txn.type === 'DEBIT' ? '- ' : ''}{fmt(txn.amount)}
                      </TableCell>
                      <TableCell>{renderStatusBadge(txn.reconciliationStatus)}</TableCell>
                      <TableCell>
                        {(txn.reconciliationStatus === 'PENDING') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelectTransaction(txn)
                            }}
                          >
                            <Link2 className="h-3 w-3 mr-1" />
                            Conciliar
                          </Button>
                        )}
                        {txn.reconciliationStatus === 'DIVERGENT' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={(e) => {
                              e.stopPropagation()
                              setCreateRecordTxnId(txn.id)
                              setCreateRecordDescription(txn.description)
                              setCreateRecordOpen(true)
                            }}
                          >
                            <PlusCircle className="h-3 w-3 mr-1" />
                            Criar Lançamento
                          </Button>
                        )}
                        {(txn.reconciliationStatus === 'MATCHED' || txn.reconciliationStatus === 'AUTO_MATCHED') && txn.financialRecord && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1" title={txn.financialRecord.description}>
                            <Eye className="h-3 w-3" />
                            {txn.financialRecord.description.substring(0, 20)}
                            {txn.financialRecord.description.length > 20 ? '...' : ''}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Right Panel — Suggestions / Details */}
        <div className="w-96 flex-shrink-0">
          {selectedTransaction && (selectedTransaction.reconciliationStatus === 'PENDING' || selectedTransaction.reconciliationStatus === 'DIVERGENT') ? (
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Sugestões de Conciliação</CardTitle>
                <div className="text-xs text-muted-foreground space-y-1 mt-1">
                  <div className="font-medium">{selectedTransaction.description}</div>
                  <div>
                    {selectedTransaction.type === 'CREDIT' ? 'Crédito' : 'Débito'}:{' '}
                    <span className="font-medium">{fmt(selectedTransaction.amount)}</span>{' '}
                    em {fmtDate(selectedTransaction.date)}
                  </div>
                  {selectedTransaction.reconciliationNote && (
                    <div className="text-amber-600 italic">{selectedTransaction.reconciliationNote}</div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto space-y-3 p-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar lançamento..."
                    className="pl-8 h-9 text-sm"
                    value={suggestionSearch}
                    onChange={e => setSuggestionSearch(e.target.value)}
                  />
                </div>

                {/* Suggestions list */}
                {loadingSuggestions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredSuggestions.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Nenhuma sugestão encontrada
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredSuggestions.map(sug => (
                      <div
                        key={sug.financialRecordId}
                        className="border rounded-lg p-3 space-y-2 hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs truncate" title={sug.description}>
                              {sug.description}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {fmt(sug.amount)} | {fmtDate(sug.date)}
                            </div>
                          </div>
                          <Badge
                            className={`text-xs shrink-0 ${
                              sug.confidence >= 80
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : sug.confidence >= 50
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}
                          >
                            {sug.confidence}%
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground italic">{sug.matchReason}</div>
                        <Button
                          size="sm"
                          className="w-full h-7 text-xs"
                          disabled={isPending}
                          onClick={() => handleManualReconcile(sug.financialRecordId)}
                        >
                          {isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          )}
                          Conciliar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ignore button */}
                <div className="border-t pt-3 mt-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      setIgnoreTxnId(selectedTransaction.id)
                      setIgnoreOpen(true)
                    }}
                  >
                    <Ban className="h-3 w-3 mr-1" />
                    Ignorar transação
                  </Button>
                  {selectedTransaction.reconciliationStatus === 'DIVERGENT' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs mt-2"
                      onClick={() => {
                        setCreateRecordTxnId(selectedTransaction.id)
                        setCreateRecordDescription(selectedTransaction.description)
                        setCreateRecordOpen(true)
                      }}
                    >
                      <PlusCircle className="h-3 w-3 mr-1" />
                      Criar lançamento financeiro
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : selectedTransaction && (selectedTransaction.reconciliationStatus === 'MATCHED' || selectedTransaction.reconciliationStatus === 'AUTO_MATCHED') ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Detalhes da Conciliação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Transação do Extrato</div>
                  <div className="font-medium">{selectedTransaction.description}</div>
                  <div className="text-muted-foreground text-xs">
                    {fmt(selectedTransaction.amount)} | {fmtDate(selectedTransaction.date)}
                  </div>
                </div>
                {selectedTransaction.financialRecord && (
                  <div className="border-t pt-3">
                    <div className="text-xs text-muted-foreground">Lançamento Financeiro</div>
                    <div className="font-medium">{selectedTransaction.financialRecord.description}</div>
                    <div className="text-muted-foreground text-xs">
                      {fmt(selectedTransaction.financialRecord.amount)} | {fmtDate(selectedTransaction.financialRecord.dueDate)}
                    </div>
                    {selectedTransaction.financialRecord.category && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        {selectedTransaction.financialRecord.category}
                      </Badge>
                    )}
                  </div>
                )}
                {selectedTransaction.reconciliationNote && (
                  <div className="border-t pt-3">
                    <div className="text-xs text-muted-foreground">Nota</div>
                    <div className="text-xs italic">{selectedTransaction.reconciliationNote}</div>
                  </div>
                )}
                <Badge className="mt-2">
                  {selectedTransaction.reconciliationStatus === 'AUTO_MATCHED' ? 'Conciliação Automática' : 'Conciliação Manual'}
                </Badge>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                Selecione uma transação pendente ou divergente para ver sugestões de conciliação
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      )}

      {/* Side-by-side requires a statement selected but none chosen */}
      {sideBySideMode && !selectedStatement && (
        <Card>
          <CardContent className="py-12 text-center">
            <ArrowLeftRight className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              Selecione um extrato para iniciar a conciliacao lado a lado.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {statements.map(stmt => (
                <Button
                  key={stmt.id}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    selectStatement(stmt)
                    loadErpRecords()
                  }}
                >
                  {stmt.bankAccount.name} - {stmt.period} ({stmt.stats.pending} pendente{stmt.stats.pending !== 1 ? 's' : ''})
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* IMPORT DIALOG                                                      */}
      {/* ================================================================== */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar Extrato Bancário</DialogTitle>
            <DialogDescription>
              Selecione um arquivo OFX ou CSV do seu banco para importar as transações.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* File input */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Arquivo (.ofx, .csv)</label>
              <Input
                type="file"
                accept=".ofx,.csv,.OFX,.CSV"
                onChange={e => {
                  const file = e.target.files?.[0] ?? null
                  handleFileChange(file)
                }}
              />
            </div>

            {/* Bank Account */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Conta Bancária</label>
              <Select value={importBankAccountId} onValueChange={setImportBankAccountId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} — {acc.bankName} ({acc.accountNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bank Preset */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Formato do Banco</label>
              <Select value={importBankPreset} onValueChange={handlePresetChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o banco" />
                </SelectTrigger>
                <SelectContent>
                  {BANK_PRESETS.map(bp => (
                    <SelectItem key={bp.value} value={bp.value}>
                      {bp.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            {importPreview && importPreview.length > 0 && (
              <div className="border rounded-lg p-3 bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    Pré-visualização ({importPreviewTotal} transações — {importPreviewFormat})
                  </span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Descrição</TableHead>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importPreview.map((t, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{fmtDate(t.date)}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{t.description}</TableCell>
                        <TableCell className="text-xs">
                          {t.type === 'CREDIT' ? (
                            <span className="text-green-600">Crédito</span>
                          ) : (
                            <span className="text-red-600">Débito</span>
                          )}
                        </TableCell>
                        <TableCell className={`text-xs text-right font-medium ${t.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                          {fmt(t.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {importPreviewTotal > 5 && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Mostrando 5 de {importPreviewTotal} transações
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!importFile || !importBankAccountId || importing}
              onClick={handleImport}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar e Conciliar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* IGNORE DIALOG                                                      */}
      {/* ================================================================== */}
      <Dialog open={ignoreOpen} onOpenChange={setIgnoreOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ignorar Transação</DialogTitle>
            <DialogDescription>
              Informe o motivo para ignorar esta transação na conciliação.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Motivo</label>
            <Input
              placeholder="Ex: Transferência entre contas próprias"
              value={ignoreReason}
              onChange={e => setIgnoreReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIgnoreOpen(false)
                setIgnoreReason('')
                setIgnoreTxnId(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={!ignoreReason.trim() || isPending}
              onClick={handleIgnore}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Ignorar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* CREATE RECORD DIALOG                                               */}
      {/* ================================================================== */}
      <Dialog open={createRecordOpen} onOpenChange={setCreateRecordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Lançamento Financeiro</DialogTitle>
            <DialogDescription>
              Crie um lançamento financeiro a partir desta transação do extrato. O lançamento será conciliado automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Descrição</label>
              <Input
                value={createRecordDescription}
                onChange={e => setCreateRecordDescription(e.target.value)}
                placeholder="Descrição do lançamento"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Categoria (opcional)</label>
              <Input
                value={createRecordCategory}
                onChange={e => setCreateRecordCategory(e.target.value)}
                placeholder="Ex: Serviços, Material, Aluguel"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateRecordOpen(false)
                setCreateRecordTxnId(null)
                setCreateRecordDescription('')
                setCreateRecordCategory('')
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={!createRecordDescription.trim() || isPending}
              onClick={handleCreateRecord}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PlusCircle className="h-4 w-4 mr-2" />
              )}
              Criar e Conciliar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
