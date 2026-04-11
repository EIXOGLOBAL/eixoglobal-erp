'use client'

import { useState, useMemo } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MoreHorizontal, Plus, Pencil, Trash2, Search, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createAllocation, updateAllocation, deleteAllocation } from "@/app/actions/allocation-actions"
import { formatDate } from "@/lib/formatters"
import { ExportButton } from "@/components/ui/export-button"
import type { ExportColumn } from "@/lib/export-utils"
import { formatDate as fmtDateExport } from "@/lib/export-utils"

interface Employee { id: string; name: string; jobTitle: string | null }
interface Project { id: string; name: string; status: string }
interface Allocation {
    id: string
    startDate: Date | string
    endDate: Date | string | null
    employee: Employee
    project: Project
}

interface AllocationsClientProps {
    allocations: Allocation[]
    employees: Employee[]
    projects: Project[]
}

const allocationSchema = z.object({
    employeeId: z.string().uuid("Selecione um funcionário"),
    projectId: z.string().uuid("Selecione um projeto"),
    startDate: z.string().min(1, "Data de início é obrigatória"),
    endDate: z.string().optional().nullable(),
})
type AllocationForm = z.infer<typeof allocationSchema>

const fmt = (d: Date | string) => formatDate(d)

const allocationExportColumns: ExportColumn[] = [
    { key: '_employeeName', label: 'Funcionário' },
    { key: '_employeeJobTitle', label: 'Cargo' },
    { key: '_projectName', label: 'Projeto' },
    { key: '_projectStatus', label: 'Status Projeto' },
    { key: 'startDate', label: 'Início', format: (v) => v ? fmtDateExport(v as string) : '' },
    { key: 'endDate', label: 'Término', format: (v) => v ? fmtDateExport(v as string) : '' },
    { key: '_status', label: 'Situação' },
]

function mapAllocationsForExport(list: Allocation[]): Record<string, unknown>[] {
    const today = new Date()
    return list.map(a => ({
        ...a,
        _employeeName: a.employee.name,
        _employeeJobTitle: a.employee.jobTitle ?? '',
        _projectName: a.project.name,
        _projectStatus: a.project.status.replace('_', ' '),
        _status: (!a.endDate || new Date(a.endDate) >= today) ? 'Ativa' : 'Encerrada',
    }))
}

const projectStatusColors: Record<string, string> = {
    PLANNING: 'bg-amber-100 text-amber-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    ON_HOLD: 'bg-purple-100 text-purple-800',
    CANCELLED: 'bg-red-100 text-red-800',
}

export function AllocationsClient({ allocations: initial, employees, projects }: AllocationsClientProps) {
    const [allocations, setAllocations] = useState(initial)
    const [open, setOpen] = useState(false)
    const [editing, setEditing] = useState<Allocation | null>(null)
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState('')
    const [projectFilter, setProjectFilter] = useState('ALL')
    const { toast } = useToast()

    const form = useForm<AllocationForm>({
        resolver: zodResolver(allocationSchema),
        defaultValues: { employeeId: '', projectId: '', startDate: '', endDate: '' },
    })

    const filtered = useMemo(() => {
        let result = allocations
        if (search) {
            const q = search.toLowerCase()
            result = result.filter(a =>
                a.employee.name.toLowerCase().includes(q) ||
                a.project.name.toLowerCase().includes(q)
            )
        }
        if (projectFilter !== 'ALL') result = result.filter(a => a.project.id === projectFilter)
        return result
    }, [allocations, search, projectFilter])

    const openCreate = () => {
        setEditing(null)
        form.reset({ employeeId: '', projectId: '', startDate: '', endDate: '' })
        setOpen(true)
    }

    const openEdit = (a: Allocation) => {
        setEditing(a)
        form.reset({
            employeeId: a.employee.id,
            projectId: a.project.id,
            startDate: new Date(a.startDate).toISOString().split('T')[0],
            endDate: a.endDate ? new Date(a.endDate).toISOString().split('T')[0] : '',
        })
        setOpen(true)
    }

    const onSubmit = async (data: AllocationForm) => {
        setLoading(true)
        try {
            const payload = { ...data, endDate: data.endDate || null }
            if (editing) {
                const res = await updateAllocation(editing.id, payload)
                if (!res.success) throw new Error(res.error)
                setAllocations(prev => prev.map(a => a.id === editing.id ? {
                    ...a,
                    startDate: new Date(data.startDate),
                    endDate: data.endDate ? new Date(data.endDate) : null,
                    employee: employees.find(e => e.id === data.employeeId) || a.employee,
                    project: projects.find(p => p.id === data.projectId) || a.project,
                } : a))
                toast({ title: "Alocação atualizada com sucesso" })
            } else {
                const res = await createAllocation(payload)
                if (!res.success) throw new Error(res.error)
                const newAlloc = {
                    id: (res.data as any).id,
                    startDate: new Date(data.startDate),
                    endDate: data.endDate ? new Date(data.endDate) : null,
                    employee: employees.find(e => e.id === data.employeeId)!,
                    project: projects.find(p => p.id === data.projectId)!,
                }
                setAllocations(prev => [newAlloc, ...prev])
                toast({ title: "Alocação criada com sucesso" })
            }
            setOpen(false)
        } catch (err) {
            toast({ title: "Erro", description: (err as Error).message, variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Remover esta alocação?")) return
        const res = await deleteAllocation(id)
        if (res.success) {
            setAllocations(prev => prev.filter(a => a.id !== id))
            toast({ title: "Alocação removida" })
        } else {
            toast({ title: "Erro ao remover alocação", variant: "destructive" })
        }
    }

    const today = new Date()
    const isActive = (a: Allocation) => !a.endDate || new Date(a.endDate) >= today

    const uniqueProjectOptions = Array.from(
        new Map(allocations.map(a => [a.project.id, a.project])).values()
    )

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle>Todas as Alocações</CardTitle>
                    <div className="flex items-center gap-2">
                        <ExportButton
                            data={mapAllocationsForExport(filtered)}
                            columns={allocationExportColumns}
                            filename="alocacoes"
                            title="Alocações de Funcionários"
                            sheetName="Alocações"
                            size="sm"
                        />
                        <Button size="sm" onClick={openCreate}>
                            <Plus className="h-4 w-4 mr-2" />
                            Nova Alocação
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-2 sm:flex-row mt-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar funcionário ou projeto..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Select value={projectFilter} onValueChange={setProjectFilter}>
                        <SelectTrigger className="w-full sm:w-48">
                            <SelectValue placeholder="Todos os projetos" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todos os projetos</SelectItem>
                            {uniqueProjectOptions.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {(search || projectFilter !== 'ALL') && (
                        <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setProjectFilter('ALL') }}>
                            <X className="h-4 w-4 mr-1" />
                            Limpar
                        </Button>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {filtered.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        <p className="text-sm">Nenhuma alocação encontrada.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Funcionário</TableHead>
                                <TableHead>Projeto</TableHead>
                                <TableHead>Início</TableHead>
                                <TableHead>Término</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[60px]" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map(a => (
                                <TableRow key={a.id}>
                                    <TableCell>
                                        <Link href={`/rh/funcionarios/${a.employee.id}`} className="font-medium text-sm hover:underline text-blue-600">
                                            {a.employee.name}
                                        </Link>
                                        <p className="text-xs text-muted-foreground">{a.employee.jobTitle || '—'}</p>
                                    </TableCell>
                                    <TableCell>
                                        <Link href={`/projects/${a.project.id}`} className="font-medium text-sm hover:underline text-blue-600">
                                            {a.project.name}
                                        </Link>
                                        <p className="text-xs text-muted-foreground">
                                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${projectStatusColors[a.project.status] || ''}`}>
                                                {a.project.status.replace('_', ' ')}
                                            </span>
                                        </p>
                                    </TableCell>
                                    <TableCell className="text-sm">{fmt(a.startDate)}</TableCell>
                                    <TableCell className="text-sm">{a.endDate ? fmt(a.endDate) : '—'}</TableCell>
                                    <TableCell>
                                        <Badge className={isActive(a) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                                            {isActive(a) ? 'Ativa' : 'Encerrada'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => openEdit(a)}>
                                                    <Pencil className="h-4 w-4 mr-2" />
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive"
                                                    onClick={() => handleDelete(a.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Remover
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            {/* Create / Edit Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Editar Alocação' : 'Nova Alocação'}</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="employeeId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Funcionário</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione o funcionário" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {employees.map(e => (
                                                    <SelectItem key={e.id} value={e.id}>
                                                        {e.name} {e.jobTitle ? `— ${e.jobTitle}` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="projectId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Projeto</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione o projeto" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {projects.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="startDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Data de Início</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="endDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Data de Término</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} value={field.value ?? ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Salvando...' : editing ? 'Salvar' : 'Criar'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
