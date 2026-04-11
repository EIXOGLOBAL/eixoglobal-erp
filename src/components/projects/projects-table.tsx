'use client'

import { useState, useMemo } from "react"
import Link from "next/link"
import { ProjectDialog } from "./project-dialog"
import { changeProjectStatus } from "@/app/actions/project-actions"
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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { MoreHorizontal, Eye, Edit, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ExportExcelButton } from "@/components/ui/export-excel-button"
import { formatDate } from "@/lib/formatters"

interface ProjectsTableProps {
    data: any[]
    companies: { id: string; name: string }[]
    clients?: { id: string; displayName: string }[]
}

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    PLANNING: "outline",
    IN_PROGRESS: "default",
    COMPLETED: "secondary",
    CANCELLED: "destructive",
    ON_HOLD: "outline",
}

const statusLabels: Record<string, string> = {
    PLANNING: "Planejamento",
    IN_PROGRESS: "Em Andamento",
    COMPLETED: "Concluído",
    CANCELLED: "Cancelado",
    ON_HOLD: "Em Espera",
}

export function ProjectsTable({ data, companies, clients = [] }: ProjectsTableProps) {
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [editingProject, setEditingProject] = useState<any>(null)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('ALL')
    const { toast } = useToast()

    const filtered = useMemo(() => {
        return data.filter(p => {
            const matchesSearch = !search ||
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                (p.company?.name || '').toLowerCase().includes(search.toLowerCase()) ||
                (p.code || '').toLowerCase().includes(search.toLowerCase())
            const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter
            return matchesSearch && matchesStatus
        })
    }, [data, search, statusFilter])

    async function handleChangeStatus(id: string, status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED', name: string) {
        const result = await changeProjectStatus(id, status)
        if (result.success) {
            toast({ title: "Status Alterado", description: `${name} → ${statusLabels[status]}` })
            window.location.reload()
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
    }

    if (!data || data.length === 0) {
        return (
            <Card className="flex flex-col items-center justify-center p-8 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                    <Eye className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Nenhum projeto cadastrado</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Comece criando seu primeiro projeto.
                </p>
                <ProjectDialog companies={companies} clients={clients} />
            </Card>
        )
    }

    return (
        <>
            {/* Filter Bar */}
            <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[180px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="pl-9"
                        placeholder="Buscar por nome, código ou empresa..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todos os Status</SelectItem>
                        <SelectItem value="PLANNING">Planejamento</SelectItem>
                        <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                        <SelectItem value="ON_HOLD">Em Espera</SelectItem>
                        <SelectItem value="COMPLETED">Concluído</SelectItem>
                        <SelectItem value="CANCELLED">Cancelado</SelectItem>
                    </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground self-center">
                    {filtered.length} projeto(s)
                </span>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Código</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Empresa</TableHead>
                            <TableHead>Início</TableHead>
                            <TableHead>Término</TableHead>
                            <TableHead>Orçamento</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Medições</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                    Nenhum projeto encontrado com os filtros aplicados.
                                </TableCell>
                            </TableRow>
                        )}
                        {filtered.map((project) => (
                            <TableRow key={project.id}>
                                <TableCell className="font-mono text-sm text-muted-foreground">
                                    {project.code || '—'}
                                </TableCell>
                                <TableCell className="font-medium max-w-[200px]">
                                    <Link
                                        href={`/projects/${project.id}`}
                                        className="hover:underline block truncate"
                                    >
                                        {project.name}
                                    </Link>
                                </TableCell>
                                <TableCell><span className="block max-w-[160px] truncate">{project.company?.name || 'N/A'}</span></TableCell>
                                <TableCell>
                                    {formatDate(project.startDate)}
                                </TableCell>
                                <TableCell>
                                    {project.endDate
                                        ? formatDate(project.endDate)
                                        : '-'
                                    }
                                </TableCell>
                                <TableCell>
                                    {new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                    }).format(Number(project.budget || 0))}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={statusVariants[project.status]}>
                                        {statusLabels[project.status]}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <span className="text-sm text-muted-foreground">
                                        {project._count?.measurements || 0}
                                    </span>
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
                                                <Link href={`/projects/${project.id}`}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    Ver Detalhes
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => { setEditingProject(project); setEditDialogOpen(true) }}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger>Alterar Status</DropdownMenuSubTrigger>
                                                <DropdownMenuSubContent>
                                                    <DropdownMenuItem onSelect={() => handleChangeStatus(project.id, 'PLANNING', project.name)}>
                                                        Planejamento
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleChangeStatus(project.id, 'IN_PROGRESS', project.name)}>
                                                        Em Andamento
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleChangeStatus(project.id, 'ON_HOLD', project.name)}>
                                                        Em Espera
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleChangeStatus(project.id, 'COMPLETED', project.name)}>
                                                        Concluído
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleChangeStatus(project.id, 'CANCELLED', project.name)}>
                                                        Cancelado
                                                    </DropdownMenuItem>
                                                </DropdownMenuSubContent>
                                            </DropdownMenuSub>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            {editingProject && (
                <ProjectDialog
                    companies={companies}
                    clients={clients}
                    project={editingProject}
                    open={editDialogOpen}
                    onOpenChange={(v) => { setEditDialogOpen(v); if (!v) setEditingProject(null) }}
                />
            )}
        </>
    )
}
