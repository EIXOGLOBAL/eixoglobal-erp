'use client'

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Trash2, CheckCircle2, TrendingUp, TrendingDown, Search } from "lucide-react"
import { deleteFinancialRecord, markAsPaid } from "@/app/actions/financial-actions"
import { useToast } from "@/hooks/use-toast"
import { FinancialRecordDialog } from "./financial-record-dialog"
import { formatDate } from "@/lib/formatters"

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-orange-100 text-orange-800',
    PAID: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
    SCHEDULED: 'bg-blue-100 text-blue-800',
}

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pendente',
    PAID: 'Pago',
    CANCELLED: 'Cancelado',
    SCHEDULED: 'Agendado',
}

type TypeFilter = 'ALL' | 'INCOME' | 'EXPENSE'
type StatusFilter = 'ALL' | 'PENDING' | 'PAID' | 'SCHEDULED'

interface FinancialRecordsTableProps {
    records: any[]
    companyId: string
    bankAccounts: any[]
}

export function FinancialRecordsTable({ records, companyId, bankAccounts }: FinancialRecordsTableProps) {
    const { toast } = useToast()
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
    const [editingRecord, setEditingRecord] = useState<any>(null)

    async function handleMarkAsPaid(id: string, description: string) {
        const result = await markAsPaid(id)
        if (result.success) {
            toast({ title: "Marcado como Pago", description })
            window.location.reload()
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
    }

    async function handleDelete(id: string, description: string) {
        if (!confirm(`Deletar "${description}"?`)) return
        const result = await deleteFinancialRecord(id)
        if (result.success) {
            toast({ title: "Lançamento Deletado" })
            window.location.reload()
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
    }

    const filtered = useMemo(() => {
        return records.filter((record) => {
            const matchesSearch = search.trim() === '' ||
                record.description.toLowerCase().includes(search.toLowerCase())

            const matchesType = typeFilter === 'ALL' || record.type === typeFilter

            const matchesStatus = statusFilter === 'ALL' || record.status === statusFilter

            return matchesSearch && matchesType && matchesStatus
        })
    }, [records, search, typeFilter, statusFilter])

    const now = new Date()

    return (
        <div className="space-y-3">
            {/* Search and filter bar */}
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por descrição..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8"
                    />
                </div>

                {/* Type filter */}
                <div className="flex items-center gap-1 border rounded-md p-1 bg-muted/30">
                    {(['ALL', 'INCOME', 'EXPENSE'] as TypeFilter[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTypeFilter(t)}
                            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                                typeFilter === t
                                    ? 'bg-background shadow-sm text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {t === 'ALL' ? 'Todos' : t === 'INCOME' ? 'Receita' : 'Despesa'}
                        </button>
                    ))}
                </div>

                {/* Status filter */}
                <div className="flex items-center gap-1 border rounded-md p-1 bg-muted/30">
                    {(['ALL', 'PENDING', 'PAID', 'SCHEDULED'] as StatusFilter[]).map((s) => (
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

                <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto">
                    {filtered.length} lançamento{filtered.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">
                        {records.length === 0
                            ? 'Nenhum lançamento registrado ainda.'
                            : 'Nenhum lançamento encontrado com os filtros aplicados.'}
                    </p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>C. Custo</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead>Conta</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map((record) => {
                            const isOverdue = record.status === 'PENDING' && new Date(record.dueDate) < now
                            return (
                                <TableRow key={record.id} className={isOverdue ? 'bg-red-50' : ''}>
                                    <TableCell>
                                        {record.type === 'INCOME' ? (
                                            <div className="flex items-center gap-1 text-green-600">
                                                <TrendingUp className="h-4 w-4" />
                                                <span className="text-xs font-medium">Receita</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-red-600">
                                                <TrendingDown className="h-4 w-4" />
                                                <span className="text-xs font-medium">Despesa</span>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {record.description}
                                        {isOverdue && <div className="text-xs text-red-600">Vencido</div>}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {record.category || '—'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {record.costCenter
                                            ? <span title={record.costCenter.name}>{record.costCenter.code}</span>
                                            : '—'}
                                    </TableCell>
                                    <TableCell>
                                        {formatDate(record.dueDate)}
                                    </TableCell>
                                    <TableCell className={`text-right font-medium ${record.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(record.amount)}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {record.bankAccount?.name || '—'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={STATUS_COLORS[record.status]}>
                                            {STATUS_LABELS[record.status] || record.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {record.status === 'PENDING' && (
                                                    <DropdownMenuItem onClick={() => handleMarkAsPaid(record.id, record.description)}>
                                                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                                        Marcar como Pago
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem onSelect={() => setEditingRecord(record)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-red-600"
                                                    onClick={() => handleDelete(record.id, record.description)}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Deletar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            )}

            {editingRecord && (
                <FinancialRecordDialog
                    companyId={companyId}
                    record={editingRecord}
                    bankAccounts={bankAccounts}
                    open={!!editingRecord}
                    onOpenChange={(open) => { if (!open) setEditingRecord(null) }}
                />
            )}
        </div>
    )
}
