'use client'

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { deleteDailyReport, submitDailyReport, approveDailyReport } from "@/app/actions/daily-report-actions"
import { Eye, Trash2, Send, CheckCircle } from "lucide-react"

const WEATHER_ICONS: Record<string, string> = {
    SUNNY: "☀️",
    CLOUDY: "⛅",
    RAINY: "🌧️",
    STORMY: "⛈️",
    WINDY: "💨",
}

const STATUS_LABELS: Record<string, string> = {
    DRAFT: "Rascunho",
    SUBMITTED: "Submetido",
    APPROVED: "Aprovado",
}

const STATUS_COLORS: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    SUBMITTED: "bg-blue-100 text-blue-800",
    APPROVED: "bg-green-100 text-green-800",
}

interface Project {
    id: string
    name: string
}

interface DailyReport {
    id: string
    date: Date
    projectId: string
    weather: string
    status: string
    createdAt: Date
    project: Project
    _count: {
        workforce: number
        activities: number
    }
}

interface DailyReportsTableProps {
    reports: DailyReport[]
    projects: Project[]
    companyId: string
}

export function DailyReportsTable({ reports, projects, companyId }: DailyReportsTableProps) {
    const { toast } = useToast()
    const [filterProject, setFilterProject] = useState<string>("all")
    const [filterMonth, setFilterMonth] = useState<string>("")

    const filtered = reports.filter(r => {
        if (filterProject !== "all" && r.projectId !== filterProject) return false
        if (filterMonth) {
            const d = new Date(r.date)
            const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            if (monthStr !== filterMonth) return false
        }
        return true
    })

    async function handleDelete(id: string) {
        if (!confirm("Confirmar exclusão do RDO?")) return
        const result = await deleteDailyReport(id)
        if (result.success) {
            toast({ title: "RDO excluído com sucesso." })
            window.location.reload()
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
    }

    async function handleSubmit(id: string) {
        const result = await submitDailyReport(id)
        if (result.success) {
            toast({ title: "RDO submetido para aprovação." })
            window.location.reload()
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
    }

    async function handleApprove(id: string) {
        const result = await approveDailyReport(id)
        if (result.success) {
            toast({ title: "RDO aprovado com sucesso." })
            window.location.reload()
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
    }

    const fmtDate = (d: Date) => new Date(d).toLocaleDateString('pt-BR')

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
                <Select value={filterProject} onValueChange={setFilterProject}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filtrar por projeto" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os projetos</SelectItem>
                        {projects.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Input
                    type="month"
                    className="w-44"
                    value={filterMonth}
                    onChange={e => setFilterMonth(e.target.value)}
                    placeholder="Filtrar por mês"
                />
                {(filterProject !== "all" || filterMonth) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setFilterProject("all"); setFilterMonth("") }}
                    >
                        Limpar filtros
                    </Button>
                )}
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Projeto</TableHead>
                        <TableHead>Clima</TableHead>
                        <TableHead className="text-center">Efetivo</TableHead>
                        <TableHead className="text-center">Atividades</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filtered.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                Nenhum RDO encontrado.
                            </TableCell>
                        </TableRow>
                    ) : (
                        filtered.map(r => (
                            <TableRow key={r.id}>
                                <TableCell className="font-medium">{fmtDate(r.date)}</TableCell>
                                <TableCell>{r.project.name}</TableCell>
                                <TableCell>{WEATHER_ICONS[r.weather]}</TableCell>
                                <TableCell className="text-center">{r._count.workforce}</TableCell>
                                <TableCell className="text-center">{r._count.activities}</TableCell>
                                <TableCell>
                                    <Badge className={STATUS_COLORS[r.status]}>
                                        {STATUS_LABELS[r.status]}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        <Link href={`/rdo/${r.id}`}>
                                            <Button variant="ghost" size="icon" title="Ver detalhes">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                        {r.status === 'DRAFT' && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Submeter para aprovação"
                                                    onClick={() => handleSubmit(r.id)}
                                                >
                                                    <Send className="h-4 w-4 text-blue-500" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Excluir"
                                                    onClick={() => handleDelete(r.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </>
                                        )}
                                        {r.status === 'SUBMITTED' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Aprovar"
                                                onClick={() => handleApprove(r.id)}
                                            >
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
