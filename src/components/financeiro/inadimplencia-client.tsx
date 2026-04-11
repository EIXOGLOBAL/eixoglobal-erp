'use client'

import { useState, useMemo, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  CheckCircle2,
  Loader2,
  Phone,
  Handshake,
  XCircle,
  MessageSquare,
  FileText,
} from 'lucide-react'
import { DateRangeFilter, type DateRange } from '@/components/ui/date-range-filter'
import { ExportButton } from '@/components/ui/export-button'
import type { ExportColumn } from '@/lib/export-utils'
import { formatCurrency } from '@/lib/export-utils'
import {
  markAsPaid,
  registerCollection,
  markAsNegotiated,
  markAsLoss,
} from '@/app/actions/financial-actions'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/formatters'
import { useRouter } from 'next/navigation'

// ============================================================================
// TYPES
// ============================================================================

interface OverdueRecord {
  id: string
  description: string
  amount: number
  dueDate: Date
  status: string
  category: string | null
  collectionNotes: string | null
  collectionDate: Date | null
  projectName: string | null
  agingBucket: string
  daysOverdue: number
}

interface InadimplenciaClientProps {
  records: OverdueRecord[]
}

// ============================================================================
// HELPERS
// ============================================================================

const buckets = ['1-30 dias', '31-60 dias', '61-90 dias', '+90 dias']

const bucketColor: Record<string, string> = {
  '1-30 dias': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  '31-60 dias': 'bg-orange-100 text-orange-800 border-orange-200',
  '61-90 dias': 'bg-red-100 text-red-800 border-red-200',
  '+90 dias': 'bg-red-200 text-red-900 border-red-300',
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const exportColumns: ExportColumn[] = [
  { key: 'description', label: 'Descricao' },
  { key: 'category', label: 'Categoria' },
  { key: 'projectName', label: 'Projeto' },
  { key: 'dueDate', label: 'Vencimento', format: (v) => {
    if (!v) return ''
    return new Date(v as string).toLocaleDateString('pt-BR')
  }},
  { key: 'daysOverdue', label: 'Dias em Atraso' },
  { key: 'amount', label: 'Valor (R$)', format: (v) => formatCurrency(v as number) },
  { key: 'agingBucket', label: 'Faixa de Atraso' },
  { key: 'status', label: 'Status' },
]

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function InadimplenciaClient({ records }: InadimplenciaClientProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [activeBucket, setActiveBucket] = useState<string>('todos')

  // Advanced Filters
  const [dateRange, setDateRange] = useState<DateRange>({ from: '', to: '' })
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [filterProject, setFilterProject] = useState<string>('ALL')

  const uniqueProjects = useMemo(() => {
    const names = new Set<string>()
    records.forEach(r => { if (r.projectName) names.add(r.projectName) })
    return Array.from(names).sort()
  }, [records])

  // Collection Dialog
  const [collectionOpen, setCollectionOpen] = useState(false)
  const [collectionRecord, setCollectionRecord] = useState<OverdueRecord | null>(null)
  const [collectionNotes, setCollectionNotes] = useState('')

  // Negotiate Dialog
  const [negotiateOpen, setNegotiateOpen] = useState(false)
  const [negotiateRecord, setNegotiateRecord] = useState<OverdueRecord | null>(null)
  const [negotiateAmount, setNegotiateAmount] = useState('')
  const [negotiateDueDate, setNegotiateDueDate] = useState('')
  const [negotiateNotes, setNegotiateNotes] = useState('')

  // Loss Dialog
  const [lossOpen, setLossOpen] = useState(false)
  const [lossRecord, setLossRecord] = useState<OverdueRecord | null>(null)
  const [lossReason, setLossReason] = useState('')

  // Notes View Dialog
  const [notesViewOpen, setNotesViewOpen] = useState(false)
  const [notesViewRecord, setNotesViewRecord] = useState<OverdueRecord | null>(null)

  const filtered = useMemo(() => {
    return records.filter(r => {
      // Bucket filter (existing)
      if (activeBucket !== 'todos' && r.agingBucket !== activeBucket) return false

      // Date range filter
      if (dateRange.from) {
        const dueDate = new Date(r.dueDate).toISOString().split('T')[0]
        if (dueDate < dateRange.from) return false
      }
      if (dateRange.to) {
        const dueDate = new Date(r.dueDate).toISOString().split('T')[0]
        if (dueDate > dateRange.to) return false
      }

      // Amount range filter
      const minVal = parseFloat(minAmount)
      if (!isNaN(minVal) && r.amount < minVal) return false
      const maxVal = parseFloat(maxAmount)
      if (!isNaN(maxVal) && r.amount > maxVal) return false

      // Project filter
      if (filterProject !== 'ALL') {
        if (filterProject === '__none__' && r.projectName !== null) return false
        if (filterProject !== '__none__' && r.projectName !== filterProject) return false
      }

      return true
    })
  }, [records, activeBucket, dateRange, minAmount, maxAmount, filterProject])

  const totalFiltered = filtered.reduce((acc, r) => acc + r.amount, 0)

  // ============================================================================
  // ACTIONS
  // ============================================================================

  async function handleMarkAsReceived(id: string, description: string) {
    setLoadingId(id)
    try {
      const result = await markAsPaid(id)
      if (result.success) {
        toast({ title: 'Marcado como Recebido!', description })
        router.refresh()
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: result.error })
      }
    } finally {
      setLoadingId(null)
    }
  }

  function openCollectionDialog(record: OverdueRecord) {
    setCollectionRecord(record)
    setCollectionNotes('')
    setCollectionOpen(true)
  }

  async function handleRegisterCollection() {
    if (!collectionRecord || !collectionNotes.trim()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Informe as notas da cobranca.' })
      return
    }

    startTransition(async () => {
      const result = await registerCollection(collectionRecord.id, collectionNotes)
      if (result.success) {
        toast({ title: 'Cobranca registrada!', description: collectionRecord.description })
        setCollectionOpen(false)
        router.refresh()
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: result.error })
      }
    })
  }

  function openNegotiateDialog(record: OverdueRecord) {
    setNegotiateRecord(record)
    setNegotiateAmount(record.amount.toFixed(2))
    setNegotiateDueDate('')
    setNegotiateNotes('')
    setNegotiateOpen(true)
  }

  async function handleNegotiate() {
    if (!negotiateRecord) return

    const amount = parseFloat(negotiateAmount)
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Valor negociado invalido.' })
      return
    }
    if (!negotiateDueDate) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Nova data de vencimento e obrigatoria.' })
      return
    }

    startTransition(async () => {
      const result = await markAsNegotiated(negotiateRecord.id, {
        negotiatedAmount: amount,
        negotiatedDueDate: negotiateDueDate,
        notes: negotiateNotes || undefined,
      })
      if (result.success) {
        toast({ title: 'Negociacao registrada!', description: negotiateRecord.description })
        setNegotiateOpen(false)
        router.refresh()
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: result.error })
      }
    })
  }

  function openLossDialog(record: OverdueRecord) {
    setLossRecord(record)
    setLossReason('')
    setLossOpen(true)
  }

  async function handleLoss() {
    if (!lossRecord || !lossReason.trim()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Motivo da perda e obrigatorio.' })
      return
    }

    startTransition(async () => {
      const result = await markAsLoss(lossRecord.id, lossReason)
      if (result.success) {
        toast({ title: 'Marcado como Perda', description: lossRecord.description })
        setLossOpen(false)
        router.refresh()
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: result.error })
      }
    })
  }

  function openNotesView(record: OverdueRecord) {
    setNotesViewRecord(record)
    setNotesViewOpen(true)
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-4">
      {/* Bucket Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={activeBucket === 'todos' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveBucket('todos')}
        >
          Todos ({records.length})
        </Button>
        {buckets.map(bucket => {
          const count = records.filter(r => r.agingBucket === bucket).length
          const total = records.filter(r => r.agingBucket === bucket).reduce((acc, r) => acc + r.amount, 0)
          return (
            <Button
              key={bucket}
              variant={activeBucket === bucket ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveBucket(bucket)}
              disabled={count === 0}
            >
              {bucket} ({count}) - {fmt(total)}
            </Button>
          )
        })}
        <div className="ml-auto">
          <ExportButton
            data={filtered as unknown as Record<string, unknown>[]}
            columns={exportColumns}
            filename="inadimplencia"
            title="Relatorio de Inadimplencia"
            sheetName="Inadimplencia"
            size="sm"
          />
        </div>
      </div>

      {/* Advanced Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-end gap-4">
            <DateRangeFilter value={dateRange} onChange={setDateRange} />

            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Valor Min</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="h-9 w-[120px] text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Valor Max</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="h-9 w-[120px] text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Projeto</label>
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="h-9 w-[180px] text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="__none__">Sem projeto</SelectItem>
                  {uniqueProjects.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''} — Total:{' '}
            <span className="font-bold text-red-600">{fmt(totalFiltered)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum registro vencido nessa faixa.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium">Descricao</th>
                    <th className="text-left py-2 pr-4 font-medium">Categoria</th>
                    <th className="text-left py-2 pr-4 font-medium">Projeto</th>
                    <th className="text-left py-2 pr-4 font-medium">Vencimento</th>
                    <th className="text-right py-2 pr-4 font-medium">Dias em Atraso</th>
                    <th className="text-right py-2 pr-4 font-medium">Valor</th>
                    <th className="text-center py-2 pr-4 font-medium">Faixa</th>
                    <th className="text-center py-2 font-medium">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(record => (
                    <tr key={record.id} className="hover:bg-muted/50 transition-colors">
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{record.description}</span>
                          {record.collectionNotes && (
                            <button
                              onClick={() => openNotesView(record)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Ver historico de cobranca"
                            >
                              <FileText className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {record.category ?? '—'}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {record.projectName ?? '—'}
                      </td>
                      <td className="py-2 pr-4 text-red-600">
                        {formatDate(record.dueDate)}
                      </td>
                      <td className="py-2 pr-4 text-right font-medium text-red-700">
                        {record.daysOverdue}d
                      </td>
                      <td className="py-2 pr-4 text-right font-semibold">
                        {fmt(record.amount)}
                      </td>
                      <td className="py-2 pr-4 text-center">
                        <Badge className={bucketColor[record.agingBucket] + ' text-xs border'}>
                          {record.agingBucket}
                        </Badge>
                      </td>
                      <td className="py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-green-700 hover:text-green-800 hover:bg-green-50"
                            onClick={() => handleMarkAsReceived(record.id, record.description)}
                            disabled={loadingId === record.id}
                            title="Marcar como recebido"
                          >
                            {loadingId === record.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                            onClick={() => openCollectionDialog(record)}
                            title="Registrar cobranca"
                          >
                            <Phone className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                            onClick={() => openNegotiateDialog(record)}
                            title="Negociar"
                          >
                            <Handshake className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-red-700 hover:text-red-800 hover:bg-red-50"
                            onClick={() => openLossDialog(record)}
                            title="Marcar como perda"
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold">
                    <td colSpan={5} className="py-2 pr-4 text-right text-sm">Total:</td>
                    <td className="py-2 pr-4 text-right text-red-600">{fmt(totalFiltered)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* Collection Dialog */}
      {/* ================================================================ */}
      <Dialog open={collectionOpen} onOpenChange={setCollectionOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-600" />
              Registrar Cobranca
            </DialogTitle>
            <DialogDescription>
              Registre uma tentativa de cobranca para &quot;{collectionRecord?.description}&quot;
            </DialogDescription>
          </DialogHeader>

          {collectionRecord && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-md text-sm space-y-1">
                <p><strong>Valor:</strong> {fmt(collectionRecord.amount)}</p>
                <p><strong>Vencimento:</strong> {formatDate(collectionRecord.dueDate)}</p>
                <p><strong>Dias em Atraso:</strong> {collectionRecord.daysOverdue}d</p>
              </div>

              {collectionRecord.collectionNotes && (
                <div className="bg-blue-50 p-3 rounded-md text-sm">
                  <p className="font-medium text-blue-800 mb-1">Historico anterior:</p>
                  <pre className="text-xs text-blue-700 whitespace-pre-wrap">{collectionRecord.collectionNotes}</pre>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="collection-notes">Notas da cobranca</Label>
                <Textarea
                  id="collection-notes"
                  placeholder="Ex: Ligei para o cliente, prometeu pagar em 5 dias..."
                  value={collectionNotes}
                  onChange={(e) => setCollectionNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCollectionOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleRegisterCollection} disabled={isPending || !collectionNotes.trim()}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MessageSquare className="h-4 w-4 mr-2" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* Negotiate Dialog */}
      {/* ================================================================ */}
      <Dialog open={negotiateOpen} onOpenChange={setNegotiateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Handshake className="h-5 w-5 text-amber-600" />
              Negociar Divida
            </DialogTitle>
            <DialogDescription>
              Registre uma negociacao para &quot;{negotiateRecord?.description}&quot;
            </DialogDescription>
          </DialogHeader>

          {negotiateRecord && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-md text-sm space-y-1">
                <p><strong>Valor Original:</strong> {fmt(negotiateRecord.amount)}</p>
                <p><strong>Vencimento Original:</strong> {formatDate(negotiateRecord.dueDate)}</p>
                <p><strong>Dias em Atraso:</strong> {negotiateRecord.daysOverdue}d</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="negotiate-amount">Valor Negociado (R$)</Label>
                  <Input
                    id="negotiate-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={negotiateAmount}
                    onChange={(e) => setNegotiateAmount(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="negotiate-due-date">Novo Vencimento</Label>
                  <Input
                    id="negotiate-due-date"
                    type="date"
                    value={negotiateDueDate}
                    onChange={(e) => setNegotiateDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="negotiate-notes">Observacoes (opcional)</Label>
                <Textarea
                  id="negotiate-notes"
                  placeholder="Detalhes da negociacao..."
                  value={negotiateNotes}
                  onChange={(e) => setNegotiateNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setNegotiateOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleNegotiate}
              disabled={isPending || !negotiateAmount || !negotiateDueDate}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Handshake className="h-4 w-4 mr-2" />}
              Confirmar Negociacao
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* Loss Dialog */}
      {/* ================================================================ */}
      <Dialog open={lossOpen} onOpenChange={setLossOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Marcar como Perda
            </DialogTitle>
            <DialogDescription>
              Marcar &quot;{lossRecord?.description}&quot; como perda (incobavel). Essa acao nao pode ser desfeita facilmente.
            </DialogDescription>
          </DialogHeader>

          {lossRecord && (
            <div className="space-y-4">
              <div className="bg-red-50 p-3 rounded-md text-sm space-y-1">
                <p><strong>Valor:</strong> <span className="text-red-700">{fmt(lossRecord.amount)}</span></p>
                <p><strong>Vencimento:</strong> {formatDate(lossRecord.dueDate)}</p>
                <p><strong>Dias em Atraso:</strong> {lossRecord.daysOverdue}d</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="loss-reason">Motivo da Perda *</Label>
                <Textarea
                  id="loss-reason"
                  placeholder="Ex: Cliente faliu, sem bens para execucao..."
                  value={lossReason}
                  onChange={(e) => setLossReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setLossOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleLoss}
              disabled={isPending || !lossReason.trim()}
              variant="destructive"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              Confirmar Perda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* Notes View Dialog */}
      {/* ================================================================ */}
      <Dialog open={notesViewOpen} onOpenChange={setNotesViewOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Historico de Cobranca
            </DialogTitle>
            <DialogDescription>
              {notesViewRecord?.description} - {notesViewRecord ? fmt(notesViewRecord.amount) : ''}
            </DialogDescription>
          </DialogHeader>

          {notesViewRecord?.collectionNotes ? (
            <div className="bg-muted/50 p-4 rounded-md max-h-[400px] overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                {notesViewRecord.collectionNotes}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum registro de cobranca.
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesViewOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
