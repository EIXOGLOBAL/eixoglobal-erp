'use client'

import { useState, useMemo } from "react"
import Link from "next/link"
import { ContractDialog } from "@/components/contracts/contract-dialog"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
    FileText,
    DollarSign,
    Clock,
    FileEdit,
    AlertTriangle,
    Search,
    TrendingUp,
    Calendar,
} from "lucide-react"

interface ContractsPageProps {
    contracts: any[]
    projects: any[]
    contractors: any[]
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

export default function ContractsPageContent({
    contracts,
    projects,
    contractors,
    companyId,
}: ContractsPageProps) {
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('ALL')
    const [projectFilter, setProjectFilter] = useState('ALL')
    const [sortBy, setSortBy] = useState('createdAt-desc')

    // Filtrar e ordenar contratos
    const filteredAndSorted = useMemo(() => {
        let filtered = contracts.filter(c => {
            const matchesSearch = !search ||
                c.identifier.toLowerCase().includes(search.toLowerCase()) ||
                c.project?.name.toLowerCase().includes(search.toLowerCase()) ||
                c.contractor?.name?.toLowerCase().includes(search.toLowerCase()) ||
                c.description?.toLowerCase().includes(search.toLowerCase())
            const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter
            const matchesProject = projectFilter === 'ALL' || c.projectId === projectFilter
            return matchesSearch && matchesStatus && matchesProject
        })

        // Ordenação
        const [sortField, sortDir] = sortBy.split('-') as [string, 'asc' | 'desc']
        const isDesc = sortDir === 'desc'

        filtered.sort((a, b) => {
            let aVal, bVal

            switch (sortField) {
                case 'identifier':
                    aVal = a.identifier
                    bVal = b.identifier
                    break
                case 'value':
                    aVal = Number(a.value || 0)
                    bVal = Number(b.value || 0)
                    break
                case 'startDate':
                    aVal = new Date(a.startDate).getTime()
                    bVal = new Date(b.startDate).getTime()
                    break
                case 'endDate':
                    aVal = a.endDate ? new Date(a.endDate).getTime() : Infinity
                    bVal = b.endDate ? new Date(b.endDate).getTime() : Infinity
                    break
                default:
                    aVal = new Date(a.createdAt).getTime()
                    bVal = new Date(b.createdAt).getTime()
            }

            if (typeof aVal === 'string') {
                return isDesc
                    ? bVal.localeCompare(aVal)
                    : aVal.localeCompare(bVal)
            }
            return isDesc ? bVal - aVal : aVal - bVal
        })

        return filtered
    }, [contracts, search, statusFilter, projectFilter, sortBy])

    // Calcular KPIs
    const activeContracts = contracts.filter(c => c.status === 'ACTIVE').length
    const totalValue = contracts
        .filter(c => c.status === 'ACTIVE')
        .reduce((acc, c) => acc + Number(c.value || 0), 0)

    const today = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(today.getDate() + 30)

    const expiringContractsList = contracts.filter(c => {
        if (!c.endDate || c.status !== 'ACTIVE') return false
        const endDate = new Date(c.endDate)
        return endDate >= today && endDate <= thirtyDaysFromNow
    })

    const totalAmendmentsValue = contracts.reduce((acc, c) => {
        return acc + (c._count?.amendments || 0)
    }, 0)

    // Métricas de execução
    const measuredTotal = filteredAndSorted.reduce((sum, c) => {
        const measured = c.bulletins
            ?.filter((b: any) => ['APPROVED', 'BILLED'].includes(b.status))
            .reduce((s: number, b: any) => s + Number(b.totalValue || 0), 0) ?? 0
        return sum + measured
    }, 0)

    const filteredTotal = filteredAndSorted.reduce((sum, c) => sum + Number(c.value || 0), 0)
    const executionPercent = filteredTotal > 0 ? (measuredTotal / filteredTotal) * 100 : 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Contratos</h1>
                    <p className="text-muted-foreground">
                        Gerencie contratos, aditivos, reajustes e medições.
                    </p>
                </div>
                <ContractDialog
                    projects={projects}
                    contractors={contractors}
                    companyId={companyId}
                />
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Contratos Ativos
                        </CardTitle>
                        <FileText className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeContracts}</div>
                        <p className="text-xs text-muted-foreground">
                            Em vigência
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Valor Total
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                                minimumFractionDigits: 0,
                            }).format(totalValue)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Ativos
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Medido
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                                minimumFractionDigits: 0,
                            }).format(measuredTotal)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Resultado de medições
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Próximos ao Vencimento
                        </CardTitle>
                        <Clock className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{expiringContractsList.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Vencem em 30 dias
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total de Aditivos
                        </CardTitle>
                        <FileEdit className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalAmendmentsValue}</div>
                        <p className="text-xs text-muted-foreground">
                            Termos registrados
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Expiring Contracts Alert */}
            {expiringContractsList.length > 0 && (
                <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-amber-800 dark:text-amber-400 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            {expiringContractsList.length} contrato(s) vencendo nos próximos 30 dias
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            {expiringContractsList.map(c => (
                                <div key={c.id} className="flex items-center justify-between text-sm">
                                    <Link href={`/contratos/${c.id}`} className="text-amber-700 hover:underline font-medium">
                                        {c.identifier} — {c.project?.name}
                                    </Link>
                                    <span className="text-amber-600 text-xs">
                                        Vence em {new Date(c.endDate!).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filtros */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Filtros e Busca</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-5">
                        <div className="col-span-2">
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Buscar por nome, número ou projeto
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="CTR-2026, Projeto A..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Status
                            </label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos</SelectItem>
                                    <SelectItem value="DRAFT">Rascunho</SelectItem>
                                    <SelectItem value="ACTIVE">Ativo</SelectItem>
                                    <SelectItem value="COMPLETED">Concluído</SelectItem>
                                    <SelectItem value="CANCELLED">Cancelado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Projeto
                            </label>
                            <Select value={projectFilter} onValueChange={setProjectFilter}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos</SelectItem>
                                    {projects.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Ordenar por
                            </label>
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="createdAt-desc">Mais recentes</SelectItem>
                                    <SelectItem value="createdAt-asc">Mais antigos</SelectItem>
                                    <SelectItem value="value-desc">Maior valor</SelectItem>
                                    <SelectItem value="value-asc">Menor valor</SelectItem>
                                    <SelectItem value="identifier-asc">Identificador (A-Z)</SelectItem>
                                    <SelectItem value="endDate-asc">Próximos a vencer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Contracts Grid */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-semibold">
                            Contratos ({filteredAndSorted.length})
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Execução: {executionPercent.toFixed(1)}% • Valor total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(filteredTotal)}
                        </p>
                    </div>
                </div>

                {filteredAndSorted.length === 0 ? (
                    <Card className="text-center py-12">
                        <p className="text-muted-foreground">
                            Nenhum contrato encontrado com os filtros aplicados.
                        </p>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredAndSorted.map((contract) => {
                            const measuredValue = contract.bulletins
                                ?.filter((b: any) => ['APPROVED', 'BILLED'].includes(b.status))
                                .reduce((sum: number, b: any) => sum + Number(b.totalValue || 0), 0) ?? 0
                            const contractValue = Number(contract.value || 0)
                            const balance = contractValue - measuredValue
                            const executionPct = contractValue > 0 ? (measuredValue / contractValue) * 100 : 0

                            return (
                                <Link key={contract.id} href={`/contratos/${contract.id}`}>
                                    <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <CardTitle className="text-base truncate">
                                                        {contract.identifier}
                                                    </CardTitle>
                                                    <p className="text-xs text-muted-foreground truncate mt-1">
                                                        {contract.project?.name}
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant={statusVariants[contract.status] || 'outline'}
                                                    className="flex-shrink-0"
                                                >
                                                    {statusLabels[contract.status]}
                                                </Badge>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="space-y-4">
                                            {/* Valores */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-blue-50 dark:bg-blue-950/30 p-2 rounded">
                                                    <p className="text-xs text-muted-foreground">Contrato</p>
                                                    <p className="text-sm font-bold text-blue-700 dark:text-blue-400">
                                                        {new Intl.NumberFormat('pt-BR', {
                                                            style: 'currency',
                                                            currency: 'BRL',
                                                            minimumFractionDigits: 0,
                                                        }).format(contractValue)}
                                                    </p>
                                                </div>
                                                <div className="bg-green-50 dark:bg-green-950/30 p-2 rounded">
                                                    <p className="text-xs text-muted-foreground">Medido</p>
                                                    <p className="text-sm font-bold text-green-700 dark:text-green-400">
                                                        {new Intl.NumberFormat('pt-BR', {
                                                            style: 'currency',
                                                            currency: 'BRL',
                                                            minimumFractionDigits: 0,
                                                        }).format(measuredValue)}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Saldo */}
                                            <div className={`bg-${balance >= 0 ? 'gray' : 'red'}-50 dark:bg-${balance >= 0 ? 'gray' : 'red'}-950/30 p-2 rounded`}>
                                                <p className="text-xs text-muted-foreground">Saldo a Medir</p>
                                                <p className={`text-sm font-bold ${balance >= 0 ? 'text-gray-700 dark:text-gray-400' : 'text-red-700 dark:text-red-400'}`}>
                                                    {new Intl.NumberFormat('pt-BR', {
                                                        style: 'currency',
                                                        currency: 'BRL',
                                                        minimumFractionDigits: 0,
                                                    }).format(Math.abs(balance))}
                                                </p>
                                            </div>

                                            {/* Execução */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">Execução</span>
                                                    <span className={`font-medium ${executionPct > 100 ? 'text-red-600' : ''}`}>
                                                        {executionPct.toFixed(1)}%
                                                    </span>
                                                </div>
                                                <Progress
                                                    value={Math.min(executionPct, 100)}
                                                    className="h-2"
                                                />
                                            </div>

                                            {/* Datas e Contagem */}
                                            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    <span>
                                                        {new Date(contract.startDate).toLocaleDateString('pt-BR')}
                                                    </span>
                                                </div>
                                                <div className="flex gap-3">
                                                    <span>
                                                        {contract._count?.items || 0} itens
                                                    </span>
                                                    <span>
                                                        {contract._count?.bulletins || 0} boletins
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
