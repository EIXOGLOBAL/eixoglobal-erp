'use client'

import { useState, useMemo } from "react"
import Link from "next/link"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { MoreHorizontal, Eye, Send, Trash2, Search, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { deleteBulletin, submitBulletinForApproval } from "@/app/actions/bulletin-actions"
import { ExportExcelButton } from "@/components/ui/export-excel-button"
import { StatusBadgeEnhanced } from "./status-badge-enhanced"
import { formatDate } from "@/lib/formatters"

interface BulletinsTableProps {
    data: any[]
    userId?: string
}

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    DRAFT: "outline",
    PENDING_APPROVAL: "default",
    APPROVED: "secondary",
    REJECTED: "destructive",
    BILLED: "secondary",
}

const statusLabels: Record<string, string> = {
    DRAFT: "Rascunho",
    PENDING_APPROVAL: "Aguardando Aprovação",
    APPROVED: "Aprovado",
    REJECTED: "Rejeitado",
    BILLED: "Faturado",
}

export function BulletinsTable({ data, userId = '' }: BulletinsTableProps) {
    const [loading, setLoading] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('ALL')
    const [projectFilter, setProjectFilter] = useState('ALL')
    const { toast } = useToast()

    // Projetos únicos para o filtro
    const projects = useMemo(() => {
        const seen = new Set<string>()
        const result: { id: string; name: string }[] = []
        for (const b of data) {
            if (b.project && !seen.has(b.project.id)) {
                seen.add(b.project.id)
                result.push({ id: b.project.id, name: b.project.name })
            }
        }
        return result.sort((a, b) => a.name.localeCompare(b.name))
    }, [data])

    // Filtros aplicados
    const filtered = useMemo(() => {
        return data.filter(b => {
            if (statusFilter !== 'ALL' && b.status !== statusFilter) return false
            if (projectFilter !== 'ALL' && b.project?.id !== projectFilter) return false
            if (search) {
                const q = search.toLowerCase()
                return (
                    b.number?.toLowerCase().includes(q) ||
                    b.project?.name?.toLowerCase().includes(q) ||
                    b.contract?.identifier?.toLowerCase().includes(q) ||
                    b.referenceMonth?.toLowerCase().includes(q)
                )
            }
            return true
        })
    }, [data, statusFilter, projectFilter, search])

    const hasFilters = search || statusFilter !== 'ALL' || projectFilter !== 'ALL'

    async function handleSubmitForApproval(bulletinId: string) {
        setLoading(bulletinId)
        try {
            const result = await submitBulletinForApproval(bulletinId)
            if (result.success) {
                toast({ title: "Boletim enviado para aprovação com sucesso!" })
                window.location.reload()
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        } finally {
            setLoading(null)
        }
    }

    async function handleDelete(bulletinId: string) {
        if (!confirm('Tem certeza que deseja excluir este boletim?')) return
        setLoading(bulletinId)
        try {
            const result = await deleteBulletin(bulletinId)
            if (result.success) {
                toast({ title: "Boletim excluído com sucesso!" })
                window.location.reload()
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        } finally {
            setLoading(null)
        }
    }

    if (!data || data.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                    <Eye className="h-12 w-12 text-muted-foreground mb-4 opacity-30" />
                    <h3 className="text-xl font-semibold mb-2">Nenhum boletim cadastrado</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                        Comece criando seu primeiro boletim de medição para controlar o avanço físico e financeiro.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            {/* Barra de Filtros */}
            <div className="flex flex-wrap items-center gap-3 p-4 border-b">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por número, projeto, contrato..."
                        className="pl-9"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todos os status</SelectItem>
                        <SelectItem value="DRAFT">Rascunho</SelectItem>
                        <SelectItem value="PENDING_APPROVAL">Aguardando Aprovação</SelectItem>
                        <SelectItem value="APPROVED">Aprovado</SelectItem>
                        <SelectItem value="REJECTED">Rejeitado</SelectItem>
                        <SelectItem value="BILLED">Faturado</SelectItem>
                    </SelectContent>
                </Select>

                {projects.length > 1 && (
                    <Select value={projectFilter} onValueChange={setProjectFilter}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Todos os projetos" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todos os projetos</SelectItem>
                            {projects.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {hasFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSearch(''); setStatusFilter('ALL'); setProjectFilter('ALL') }}
                    >
                        <X className="h-4 w-4 mr-1" />
                        Limpar
                    </Button>
                )}

                <span className="text-sm text-muted-foreground ml-auto">
                    {filtered.length} de {data.length} boletins
                </span>
            </div>

            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                    <Search className="h-8 w-8 mb-3 opacity-30" />
                    <p>Nenhum boletim encontrado com os filtros aplicados.</p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Número</TableHead>
                            <TableHead>Projeto</TableHead>
                            <TableHead>Contrato</TableHead>
                            <TableHead>Período</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Itens</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map((bulletin) => (
                            <TableRow key={bulletin.id}>
                                <TableCell className="font-medium">
                                    <Link href={`/measurements/${bulletin.id}`} className="hover:underline font-mono text-blue-600">
                                        {bulletin.number}
                                    </Link>
                                </TableCell>
                                <TableCell className="max-w-[150px] truncate">{bulletin.project?.name || 'N/A'}</TableCell>
                                <TableCell className="font-mono text-sm">{bulletin.contract?.identifier || 'N/A'}</TableCell>
                                <TableCell>
                                    <div className="text-sm font-medium">{bulletin.referenceMonth}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {formatDate(bulletin.periodStart)} —{' '}
                                        {formatDate(bulletin.periodEnd)}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(bulletin.totalValue || 0))}
                                </TableCell>
                                <TableCell>
                                    <StatusBadgeEnhanced status={bulletin.status} size="sm" />
                                </TableCell>
                                <TableCell>
                                    <span className="text-sm text-muted-foreground">
                                        {bulletin._count?.items || 0}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={loading === bulletin.id}>
                                                <span className="sr-only">Abrir menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem asChild>
                                                <Link href={`/measurements/${bulletin.id}`}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    Ver Detalhes
                                                </Link>
                                            </DropdownMenuItem>
                                            {bulletin.status === 'DRAFT' && (
                                                <>
                                                    <DropdownMenuItem
                                                        onClick={() => handleSubmitForApproval(bulletin.id)}
                                                        disabled={loading === bulletin.id}
                                                    >
                                                        <Send className="mr-2 h-4 w-4" />
                                                        Enviar para Aprovação
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => handleDelete(bulletin.id)}
                                                        disabled={loading === bulletin.id}
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
            )}
        </Card>
    )
}
