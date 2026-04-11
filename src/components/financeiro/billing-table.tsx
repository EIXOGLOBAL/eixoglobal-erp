'use client'

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    MoreHorizontal, FileText, CheckCircle2, Send, Trash2, Search, AlertTriangle,
} from "lucide-react"
import { updateBillingStatus, deleteBilling } from "@/app/actions/billing-actions"
import { useToast } from "@/hooks/use-toast"
import { formatDate, formatCurrency } from "@/lib/formatters"
import { DateRangeFilter, type DateRange } from "@/components/ui/date-range-filter"
import { ExportButton } from "@/components/ui/export-button"
import type { ExportColumn } from "@/lib/export-utils"
import { formatCurrency as fmtCurrency, formatDate as fmtDateExport } from "@/lib/export-utils"

const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    ISSUED: 'bg-blue-100 text-blue-800',
    PAID: 'bg-green-100 text-green-800',
    OVERDUE: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Rascunho',
    ISSUED: 'Emitido',
    PAID: 'Pago',
    OVERDUE: 'Vencido',
    CANCELLED: 'Cancelado',
}

type StatusFilter = 'ALL' | 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE'

const exportColumns: ExportColumn[] = [
    { key: 'number', label: 'Numero' },
    { key: 'description', label: 'Descricao' },
    { key: 'clientName', label: 'Cliente' },
    { key: 'projectName', label: 'Projeto' },
    { key: 'contractId', label: 'Contrato' },
    { key: 'bulletinNumber', label: 'Boletim' },
    { key: 'dueDate', label: 'Vencimento', format: (v) => v ? fmtDateExport(v as string) : '' },
    { key: 'value', label: 'Valor (R$)', format: (v) => fmtCurrency(v as number) },
    { key: 'statusLabel', label: 'Status' },
]

function mapBillingForExport(records: BillingRecord[]): Record<string, unknown>[] {
    return records.map(r => ({
        ...r,
        clientName: r.client?.displayName || '',
        projectName: r.project?.name || '',
        contractId: r.contract?.identifier || '',
        bulletinNumber: r.measurementBulletin?.number || '',
        statusLabel: STATUS_LABELS[r.status] || r.status,
    }))
}

interface BillingRecord {
    id: string
    number: string
    description: string | null
    value: number
    status: string
    dueDate: string | Date
    issuedDate: string | Date | null
    paidDate: string | Date | null
    paidAmount: number | null
    notes: string | null
    project: { id: string; name: string } | null
    contract: { id: string; identifier: string } | null
    client: { id: string; displayName: string } | null
    measurementBulletin: { id: string; number: string; totalValue: number } | null
    createdBy: { id: string; name: string | null } | null
    createdAt: string | Date
}

interface BillingTableProps {
    records: BillingRecord[]
}

export function BillingTable({ records }: BillingTableProps) {
    const { toast } = useToast()
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
    const [loadingId, setLoadingId] = useState<string | null>(null)

    // Advanced filters
    const [dateRange, setDateRange] = useState<DateRange>({ from: '', to: '' })
    const [filterProject, setFilterProject] = useState('ALL')
    const [filterClient, setFilterClient] = useState('ALL')

    const uniqueProjects = useMemo(() => {
        const items = new Map<string, string>()
        records.forEach(r => { if (r.project) items.set(r.project.id, r.project.name) })
        return Array.from(items.entries()).sort((a, b) => a[1].localeCompare(b[1]))
    }, [records])

    const uniqueClients = useMemo(() => {
        const items = new Map<string, string>()
        records.forEach(r => { if (r.client) items.set(r.client.id, r.client.displayName) })
        return Array.from(items.entries()).sort((a, b) => a[1].localeCompare(b[1]))
    }, [records])

    async function handleStatusChange(id: string, status: string) {
        setLoadingId(id)
        try {
            const result = await updateBillingStatus({ id, status: status as any })
            if (result.success) {
                toast({ title: "Status atualizado", description: `Faturamento ${status === 'ISSUED' ? 'emitido' : status === 'PAID' ? 'marcado como pago' : 'atualizado'}.` })
                window.location.reload()
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        } catch {
            toast({ variant: "destructive", title: "Erro", description: "Falha ao atualizar status." })
        } finally {
            setLoadingId(null)
        }
    }

    async function handleDelete(id: string, number: string) {
        if (!confirm(`Excluir faturamento "${number}"?`)) return
        setLoadingId(id)
        try {
            const result = await deleteBilling(id)
            if (result.success) {
                toast({ title: "Faturamento excluido" })
                window.location.reload()
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        } catch {
            toast({ variant: "destructive", title: "Erro", description: "Falha ao excluir." })
        } finally {
            setLoadingId(null)
        }
    }

    const filtered = useMemo(() => {
        return records.filter((r) => {
            const matchesSearch = search.trim() === '' ||
                (r.description || '').toLowerCase().includes(search.toLowerCase()) ||
                r.number.toLowerCase().includes(search.toLowerCase()) ||
                (r.client?.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
                (r.project?.name || '').toLowerCase().includes(search.toLowerCase())

            const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter

            // Date range filter (dueDate)
            if (dateRange.from) {
                const dueDate = new Date(r.dueDate).toISOString().split('T')[0]
                if (dueDate < dateRange.from) return false
            }
            if (dateRange.to) {
                const dueDate = new Date(r.dueDate).toISOString().split('T')[0]
                if (dueDate > dateRange.to) return false
            }

            // Project filter
            if (filterProject !== 'ALL') {
                if (filterProject === '__none__' && r.project !== null) return false
                if (filterProject !== '__none__' && r.project?.id !== filterProject) return false
            }

            // Client filter
            if (filterClient !== 'ALL') {
                if (filterClient === '__none__' && r.client !== null) return false
                if (filterClient !== '__none__' && r.client?.id !== filterClient) return false
            }

            return matchesSearch && matchesStatus
        })
    }, [records, search, statusFilter, dateRange, filterProject, filterClient])

    return (
        <div className="space-y-3">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por descrição, número, cliente..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8"
                    />
                </div>

                <div className="flex items-center gap-1 border rounded-md p-1 bg-muted/30">
                    {(['ALL', 'DRAFT', 'ISSUED', 'PAID', 'OVERDUE'] as StatusFilter[]).map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                                statusFilter === s
                                    ? 'bg-background shadow-sm text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {s === 'ALL' ? 'Todos' : STATUS_LABELS[s]}
                        </button>
                    ))}
                </div>

                <ExportButton
                    data={mapBillingForExport(filtered)}
                    columns={exportColumns}
                    filename="faturamento"
                    title="Relatorio de Faturamento"
                    sheetName="Faturamento"
                    size="sm"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto">
                    {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Advanced Filters */}
            <div className="flex flex-wrap items-end gap-3 p-3 border rounded-md bg-muted/10">
                <DateRangeFilter value={dateRange} onChange={setDateRange} />

                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Projeto</label>
                    <Select value={filterProject} onValueChange={setFilterProject}>
                        <SelectTrigger className="h-9 w-[180px] text-sm">
                            <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todos</SelectItem>
                            <SelectItem value="__none__">Sem projeto</SelectItem>
                            {uniqueProjects.map(([id, name]) => (
                                <SelectItem key={id} value={id}>{name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Cliente</label>
                    <Select value={filterClient} onValueChange={setFilterClient}>
                        <SelectTrigger className="h-9 w-[180px] text-sm">
                            <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todos</SelectItem>
                            <SelectItem value="__none__">Sem cliente</SelectItem>
                            {uniqueClients.map(([id, name]) => (
                                <SelectItem key={id} value={id}>{name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">
                        {records.length === 0
                            ? 'Nenhum faturamento registrado.'
                            : 'Nenhum registro encontrado com os filtros aplicados.'}
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Numero</TableHead>
                                <TableHead>Descricao</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Projeto</TableHead>
                                <TableHead>Contrato</TableHead>
                                <TableHead>Boletim</TableHead>
                                <TableHead>Vencimento</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((record) => (
                                <TableRow key={record.id} className={record.status === 'OVERDUE' ? 'bg-red-50' : ''}>
                                    <TableCell className="font-mono text-sm">{record.number}</TableCell>
                                    <TableCell className="font-medium max-w-[200px] truncate">
                                        {record.description || '---'}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {record.client?.displayName || '---'}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {record.project?.name || '---'}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {record.contract?.identifier || '---'}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {record.measurementBulletin?.number || '---'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            {record.status === 'OVERDUE' && <AlertTriangle className="h-3 w-3 text-red-500" />}
                                            <span className={record.status === 'OVERDUE' ? 'text-red-600 font-medium' : ''}>
                                                {formatDate(record.dueDate)}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {formatCurrency(record.value)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={STATUS_COLORS[record.status]}>
                                            {STATUS_LABELS[record.status] || record.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" disabled={loadingId === record.id}>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Acoes</DropdownMenuLabel>
                                                <DropdownMenuSeparator />

                                                {record.status === 'DRAFT' && (
                                                    <DropdownMenuItem onClick={() => handleStatusChange(record.id, 'ISSUED')}>
                                                        <Send className="mr-2 h-4 w-4 text-blue-600" />
                                                        Emitir
                                                    </DropdownMenuItem>
                                                )}
                                                {(record.status === 'ISSUED' || record.status === 'OVERDUE') && (
                                                    <DropdownMenuItem onClick={() => handleStatusChange(record.id, 'PAID')}>
                                                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                                        Marcar como Pago
                                                    </DropdownMenuItem>
                                                )}
                                                {(record.status === 'DRAFT' || record.status === 'ISSUED' || record.status === 'OVERDUE') && (
                                                    <DropdownMenuItem onClick={() => handleStatusChange(record.id, 'CANCELLED')}>
                                                        <FileText className="mr-2 h-4 w-4 text-gray-500" />
                                                        Cancelar
                                                    </DropdownMenuItem>
                                                )}
                                                {record.status === 'DRAFT' && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-red-600"
                                                            onClick={() => handleDelete(record.id, record.number)}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Excluir
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
