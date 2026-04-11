'use client'

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { CheckCircle2, Loader2 } from "lucide-react"
import { markAsPaid } from "@/app/actions/financial-actions"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/formatters"
import { DateRangeFilter, type DateRange } from "@/components/ui/date-range-filter"
import { ExportButton } from "@/components/ui/export-button"
import type { ExportColumn } from "@/lib/export-utils"
import { formatCurrency as fmtCurrencyExport, formatDate as fmtDateExport } from "@/lib/export-utils"

interface ReceivableRecord {
    id: string
    description: string
    category: string | null
    amount: number
    dueDate: Date
    status: string
    paidDate?: Date | null
    paidAmount?: number
}

const statusLabel: Record<string, string> = {
    PENDING: 'Pendente', PAID: 'Recebido', CANCELLED: 'Cancelado', SCHEDULED: 'Agendado'
}
const statusColor: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-gray-100 text-gray-600',
    SCHEDULED: 'bg-blue-100 text-blue-800',
}

const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const recebiveisExportColumns: ExportColumn[] = [
    { key: 'description', label: 'Descricao' },
    { key: 'category', label: 'Categoria' },
    { key: 'amount', label: 'Valor (R$)', format: (v) => fmtCurrencyExport(v as number) },
    { key: 'dueDate', label: 'Vencimento', format: (v) => v ? fmtDateExport(v as string) : '' },
    { key: 'statusName', label: 'Status' },
]

function mapRecebiveisForExport(list: ReceivableRecord[]): Record<string, unknown>[] {
    return list.map(r => ({
        ...r,
        statusName: statusLabel[r.status] || r.status,
    }))
}

export function ReceiveisTable({ records }: { records: ReceivableRecord[] }) {
    const { toast } = useToast()
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const now = new Date()

    // Advanced filters
    const [dateRange, setDateRange] = useState<DateRange>({ from: '', to: '' })
    const [filterCategory, setFilterCategory] = useState('ALL')
    const [filterStatus, setFilterStatus] = useState('ALL')

    const uniqueCategories = useMemo(() => {
        const cats = new Set<string>()
        records.forEach(r => { if (r.category) cats.add(r.category) })
        return Array.from(cats).sort()
    }, [records])

    const filtered = useMemo(() => {
        return records.filter(r => {
            // Date range filter
            if (dateRange.from) {
                const dueDate = new Date(r.dueDate).toISOString().split('T')[0]
                if (dueDate < dateRange.from) return false
            }
            if (dateRange.to) {
                const dueDate = new Date(r.dueDate).toISOString().split('T')[0]
                if (dueDate > dateRange.to) return false
            }
            // Category filter
            if (filterCategory !== 'ALL') {
                if (filterCategory === '__none__' && r.category !== null) return false
                if (filterCategory !== '__none__' && r.category !== filterCategory) return false
            }
            // Status filter
            if (filterStatus !== 'ALL' && r.status !== filterStatus) return false
            return true
        })
    }, [records, dateRange, filterCategory, filterStatus])

    async function handleMarkAsPaid(id: string, description: string) {
        setLoadingId(id)
        try {
            const result = await markAsPaid(id)
            if (result.success) {
                toast({ title: "Marcado como Recebido!", description })
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        } finally {
            setLoadingId(null)
        }
    }

    if (records.length === 0) {
        return (
            <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhuma receita cadastrada. Acesse{' '}
                <a href="/financeiro/faturamento" className="text-blue-600 underline">Faturamento</a>
                {' '}para adicionar.
            </p>
        )
    }

    return (
        <div className="space-y-3">
            {/* Advanced Filters */}
            <div className="flex flex-wrap items-end gap-3 p-3 border rounded-md bg-muted/10">
                <DateRangeFilter value={dateRange} onChange={setDateRange} />

                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="h-9 w-[160px] text-sm">
                            <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todas</SelectItem>
                            <SelectItem value="__none__">Sem categoria</SelectItem>
                            {uniqueCategories.map(c => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Status</label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="h-9 w-[140px] text-sm">
                            <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todos</SelectItem>
                            <SelectItem value="PENDING">Pendente</SelectItem>
                            <SelectItem value="PAID">Recebido</SelectItem>
                            <SelectItem value="SCHEDULED">Agendado</SelectItem>
                            <SelectItem value="CANCELLED">Cancelado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <span className="text-xs text-muted-foreground ml-auto self-end pb-2">
                    {filtered.length} de {records.length} registro{records.length !== 1 ? 's' : ''}
                </span>
            </div>

            <div className="flex justify-end">
                <ExportButton
                    data={mapRecebiveisForExport(filtered)}
                    columns={recebiveisExportColumns}
                    filename="recebiveis"
                    title="Recebiveis"
                    sheetName="Recebiveis"
                    size="sm"
                />
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 pr-4">Descrição</th>
                        <th className="text-left py-2 pr-4">Categoria</th>
                        <th className="text-right py-2 pr-4">Valor</th>
                        <th className="text-right py-2 pr-4">Vencimento</th>
                        <th className="text-center py-2 pr-4">Status</th>
                        <th className="text-center py-2">Ação</th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.map(r => {
                        const isOverdue = (r.status === 'PENDING' || r.status === 'SCHEDULED') &&
                            new Date(r.dueDate) < now
                        const isPending = r.status === 'PENDING' || r.status === 'SCHEDULED'
                        const isLoading = loadingId === r.id

                        return (
                            <tr key={r.id} className={`border-b last:border-0 ${isOverdue ? 'bg-red-50' : ''}`}>
                                <td className="py-2 pr-4 font-medium">{r.description}</td>
                                <td className="py-2 pr-4 text-muted-foreground">{r.category || '—'}</td>
                                <td className="py-2 pr-4 text-right font-medium text-green-700">
                                    {fmt(r.amount)}
                                </td>
                                <td className="py-2 pr-4 text-right text-muted-foreground">
                                    {formatDate(r.dueDate)}
                                    {isOverdue && <span className="ml-1 text-red-600 text-xs">⚠ vencido</span>}
                                </td>
                                <td className="py-2 pr-4 text-center">
                                    <span className={`text-xs px-2 py-1 rounded font-medium ${statusColor[r.status] || 'bg-gray-100'}`}>
                                        {statusLabel[r.status] || r.status}
                                    </span>
                                </td>
                                <td className="py-2 text-center">
                                    {isPending ? (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                                            onClick={() => handleMarkAsPaid(r.id, r.description)}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                    Receber
                                                </>
                                            )}
                                        </Button>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">—</span>
                                    )}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
        </div>
    )
}
