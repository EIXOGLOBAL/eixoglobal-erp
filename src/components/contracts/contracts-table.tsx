'use client'

import { useState } from "react"
import Link from "next/link"
import { ContractDialog } from "./contract-dialog"
import { ContractExecutionSparkline } from "./contract-execution-sparkline"
import { ContractsExportCSV } from "./contracts-export-csv"
import { deleteContract } from "@/app/actions/contract-actions"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { MoreHorizontal, Eye, Edit, Trash2, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useMemo } from "react"

interface ContractsTableProps {
    data: any[]
    projects: { id: string; name: string }[]
    contractors: { id: string; name: string }[]
    companyId: string
}

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    DRAFT: "outline",
    ACTIVE: "default",
    COMPLETED: "secondary",
    CANCELLED: "destructive",
}

const statusLabels: Record<string, string> = {
    DRAFT: "Rascunho",
    ACTIVE: "Ativo",
    COMPLETED: "Concluído",
    CANCELLED: "Cancelado",
}

export function ContractsTable({ data, projects, contractors, companyId }: ContractsTableProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [selectedContract, setSelectedContract] = useState<any>(null)
    const [editingContract, setEditingContract] = useState<any>(null)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('ALL')
    const { toast } = useToast()

    const filtered = useMemo(() => {
        return data.filter(c => {
            const matchesSearch = !search ||
                c.identifier.toLowerCase().includes(search.toLowerCase()) ||
                c.project?.name.toLowerCase().includes(search.toLowerCase()) ||
                c.contractor?.name?.toLowerCase().includes(search.toLowerCase())
            const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter
            return matchesSearch && matchesStatus
        })
    }, [data, search, statusFilter])

    const totalValue = filtered.reduce((sum, c) => sum + Number(c.value || 0), 0)

    async function handleDelete() {
        if (!selectedContract) return

        const result = await deleteContract(selectedContract.id)

        if (result.success) {
            toast({
                title: "Contrato Excluído",
                description: "O contrato foi removido com sucesso.",
            })
            setDeleteDialogOpen(false)
            window.location.reload()
        } else {
            toast({
                variant: "destructive",
                title: "Erro ao Excluir",
                description: result.error,
            })
        }
    }

    if (!data || data.length === 0) {
        return (
            <Card className="flex flex-col items-center justify-center p-8 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                    <Eye className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Nenhum contrato cadastrado</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Comece criando seu primeiro contrato.
                </p>
                <ContractDialog
                    projects={projects}
                    contractors={contractors}
                    companyId={companyId}
                />
            </Card>
        )
    }

    return (
        <>
            {/* Filter Bar with Export */}
            <div className="flex gap-3 mb-4 flex-wrap items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="pl-9"
                        placeholder="Buscar contrato, projeto..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todos os Status</SelectItem>
                        <SelectItem value="DRAFT">Rascunho</SelectItem>
                        <SelectItem value="ACTIVE">Ativo</SelectItem>
                        <SelectItem value="COMPLETED">Concluído</SelectItem>
                        <SelectItem value="CANCELLED">Cancelado</SelectItem>
                    </SelectContent>
                </Select>
                <ContractsExportCSV contracts={filtered} />
                <span className="text-sm text-muted-foreground">
                    {filtered.length} contrato(s) •{' '}
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(totalValue)}
                </span>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Identificador</TableHead>
                            <TableHead>Projeto</TableHead>
                            <TableHead>Contratada</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Execução (%)</TableHead>
                            <TableHead className="w-[140px]">Tendência</TableHead>
                            <TableHead>Vigência</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                    Nenhum contrato encontrado com os filtros aplicados.
                                </TableCell>
                            </TableRow>
                        )}
                        {filtered.map((contract) => {
                            const contractValue = Number(contract.value || 0)
                            const totalMeasured = contract.bulletins
                                ?.filter((b: any) => ['APPROVED', 'BILLED'].includes(b.status))
                                .reduce((sum: number, b: any) => sum + Number(b.totalValue || 0), 0) ?? 0
                            const executionPercent = contractValue > 0 ? (totalMeasured / contractValue) * 100 : 0

                            return (
                            <TableRow key={contract.id}>
                                <TableCell className="font-medium">
                                    <Link
                                        href={`/contratos/${contract.id}`}
                                        className="hover:underline"
                                    >
                                        {contract.identifier}
                                    </Link>
                                </TableCell>
                                <TableCell>{contract.project?.name || 'N/A'}</TableCell>
                                <TableCell>{contract.contractor?.name || '-'}</TableCell>
                                <TableCell>
                                    {new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL',
                                        minimumFractionDigits: 0,
                                    }).format(contractValue)}
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-1">
                                        <Progress value={executionPercent} className="h-1.5" />
                                        <span className={`text-xs font-medium ${executionPercent > 100 ? 'text-red-600' : executionPercent > 80 ? 'text-orange-600' : 'text-green-600'}`}>
                                            {executionPercent.toFixed(0)}%
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="h-10">
                                        <ContractExecutionSparkline
                                            bulletins={contract.bulletins || []}
                                            height={40}
                                        />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-xs">
                                        {new Date(contract.startDate).toLocaleDateString('pt-BR')}
                                        {contract.endDate && (
                                            <>
                                                <br />
                                                {new Date(contract.endDate).toLocaleDateString('pt-BR')}
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={statusVariants[contract.status]}>
                                        {statusLabels[contract.status]}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Abrir menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem asChild>
                                                <Link href={`/contratos/${contract.id}`}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    Ver Detalhes
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => setEditingContract(contract)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Editar
                                            </DropdownMenuItem>
                                            {contract.status === 'DRAFT' && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => {
                                                            setSelectedContract(contract)
                                                            setDeleteDialogOpen(true)
                                                        }}
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
                        )
                        })}
                    </TableBody>
                </Table>
            </Card>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir o contrato <strong>{selectedContract?.identifier}</strong>?
                            Esta ação não pode ser desfeita.
                            {selectedContract?.status !== 'DRAFT' && (
                                <div className="mt-2 text-destructive">
                                    Apenas contratos em rascunho podem ser excluídos.
                                </div>
                            )}
                            {selectedContract?._count?.bulletins > 0 && (
                                <div className="mt-2 text-destructive">
                                    Este contrato possui {selectedContract._count.bulletins} boletins vinculados.
                                </div>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {editingContract && (
                <ContractDialog
                    projects={projects}
                    contractors={contractors}
                    companyId={companyId}
                    contract={editingContract}
                    open={!!editingContract}
                    onOpenChange={(open) => { if (!open) setEditingContract(null) }}
                />
            )}
        </>
    )
}
