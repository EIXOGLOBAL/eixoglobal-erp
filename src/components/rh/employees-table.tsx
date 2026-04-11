'use client'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Eye, Search } from "lucide-react"
import Link from "next/link"
import { changeEmployeeStatus } from "@/app/actions/employee-actions"
import { useToast } from "@/hooks/use-toast"
import { EmployeeDialog } from "./employee-dialog"
import { Input } from "@/components/ui/input"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useState, useMemo } from "react"
import { ExportExcelButton } from "@/components/ui/export-excel-button"

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    ON_LEAVE: 'bg-orange-100 text-orange-800',
    INACTIVE: 'bg-red-100 text-red-800',
    BLOCKED: 'bg-gray-100 text-gray-800',
}

const STATUS_LABELS: Record<string, string> = {
    ACTIVE: 'Ativo',
    ON_LEAVE: 'Afastado',
    INACTIVE: 'Inativo',
    BLOCKED: 'Bloqueado',
}

interface EmployeesTableProps {
    employees: any[]
}

export function EmployeesTable({ employees }: EmployeesTableProps) {
    const { toast } = useToast()
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('ALL')
    const [editingEmployee, setEditingEmployee] = useState<any>(null)

    const filtered = useMemo(() => {
        return employees.filter(e => {
            const matchesSearch = !search ||
                e.name.toLowerCase().includes(search.toLowerCase()) ||
                (e.jobTitle || '').toLowerCase().includes(search.toLowerCase()) ||
                (e.matricula || '').toLowerCase().includes(search.toLowerCase())
            const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter
            return matchesSearch && matchesStatus
        })
    }, [employees, search, statusFilter])

    async function handleChangeStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'ON_LEAVE', name: string) {
        const result = await changeEmployeeStatus(id, status)
        if (result.success) {
            toast({ title: "Status Alterado", description: `${name} → ${STATUS_LABELS[status]}` })
            window.location.reload()
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
    }

    if (employees.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhum funcionário cadastrado ainda.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[180px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="pl-9"
                        placeholder="Buscar por nome, cargo ou matrícula..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todos</SelectItem>
                        <SelectItem value="ACTIVE">Ativo</SelectItem>
                        <SelectItem value="ON_LEAVE">Afastado</SelectItem>
                        <SelectItem value="INACTIVE">Inativo</SelectItem>
                        <SelectItem value="BLOCKED">Bloqueado</SelectItem>
                    </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground self-center">
                    {filtered.length} funcionário(s)
                </span>
            </div>

        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[90px]">Matrícula</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Habilidades</TableHead>
                    <TableHead className="text-right">Custo/h</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Alocações</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filtered.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                Nenhum funcionário encontrado com os filtros aplicados.
                            </TableCell>
                        </TableRow>
                    )}
                {filtered.map((employee) => {
                    let skills: string[] = []
                    try {
                        skills = JSON.parse(employee.skills || '[]')
                    } catch {
                        skills = []
                    }

                    return (
                        <TableRow key={employee.id}>
                            <TableCell className="font-mono text-sm text-muted-foreground">
                                {employee.matricula || '—'}
                            </TableCell>
                            <TableCell className="font-medium max-w-[200px]">
                                <Link href={`/rh/funcionarios/${employee.id}`} className="text-blue-600 hover:underline block truncate">
                                    {employee.name}
                                </Link>
                            </TableCell>
                            <TableCell><span className="block max-w-[160px] truncate">{employee.jobTitle}</span></TableCell>
                            <TableCell className="text-muted-foreground">{employee.document || '—'}</TableCell>
                            <TableCell>
                                {skills.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {skills.slice(0, 2).map((s: string) => (
                                            <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                                        ))}
                                        {skills.length > 2 && (
                                            <Badge variant="outline" className="text-xs">+{skills.length - 2}</Badge>
                                        )}
                                    </div>
                                ) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-right">
                                {employee.costPerHour
                                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(employee.costPerHour)
                                    : <span className="text-muted-foreground">—</span>
                                }
                            </TableCell>
                            <TableCell>
                                <Badge className={STATUS_COLORS[employee.status]}>
                                    {STATUS_LABELS[employee.status] || employee.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                                {employee._count?.allocations || 0}
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
                                        <DropdownMenuItem asChild>
                                            <Link href={`/rh/funcionarios/${employee.id}`} className="flex items-center">
                                                <Eye className="mr-2 h-4 w-4" />
                                                Ver Detalhes
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setEditingEmployee(employee)}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>Alterar Status</DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem onSelect={() => handleChangeStatus(employee.id, 'ACTIVE', employee.name)}>
                                                    Ativo
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => handleChangeStatus(employee.id, 'ON_LEAVE', employee.name)}>
                                                    Afastado
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => handleChangeStatus(employee.id, 'INACTIVE', employee.name)}>
                                                    Inativo
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => handleChangeStatus(employee.id, 'BLOCKED', employee.name)}>
                                                    Bloqueado
                                                </DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        </Table>

        {editingEmployee && (
            <EmployeeDialog
                companyId={editingEmployee.companyId}
                employee={editingEmployee}
                open={!!editingEmployee}
                onOpenChange={(open) => { if (!open) setEditingEmployee(null) }}
            />
        )}
        </div>
    )
}
