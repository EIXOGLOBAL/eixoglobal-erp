'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, X, Filter, ChevronDown } from "lucide-react"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface BulletinsFilterPanelProps {
    onSearchChange: (value: string) => void
    onStatusChange: (value: string) => void
    onProjectChange: (value: string) => void
    onContractChange?: (value: string) => void
    onPeriodChange?: (value: string) => void
    onReset: () => void
    hasFilters: boolean
    projects: Array<{ id: string; name: string }>
    contracts?: Array<{ id: string; identifier: string }>
    currentSearch?: string
    currentStatus?: string
    currentProject?: string
    currentContract?: string
    currentPeriod?: string
    resultCount?: number
    totalCount?: number
}

export function BulletinsFilterPanel({
    onSearchChange,
    onStatusChange,
    onProjectChange,
    onContractChange,
    onPeriodChange,
    onReset,
    hasFilters,
    projects,
    contracts = [],
    currentSearch = '',
    currentStatus = 'ALL',
    currentProject = 'ALL',
    currentContract = 'ALL',
    currentPeriod = 'ALL',
    resultCount = 0,
    totalCount = 0,
}: BulletinsFilterPanelProps) {
    const [expandedFilters, setExpandedFilters] = useState(true)

    const statuses = [
        { value: 'ALL', label: 'Todos os status' },
        { value: 'DRAFT', label: 'Rascunho' },
        { value: 'PENDING_APPROVAL', label: 'Aguardando Aprovação' },
        { value: 'APPROVED', label: 'Aprovado' },
        { value: 'REJECTED', label: 'Rejeitado' },
        { value: 'BILLED', label: 'Faturado' },
    ]

    const periods = [
        { value: 'ALL', label: 'Todos os períodos' },
        { value: 'CURRENT_MONTH', label: 'Mês atual' },
        { value: 'LAST_3_MONTHS', label: 'Últimos 3 meses' },
        { value: 'LAST_6_MONTHS', label: 'Últimos 6 meses' },
        { value: 'LAST_12_MONTHS', label: 'Últimos 12 meses' },
    ]

    const activeFilters = [
        ...(currentSearch ? [{ type: 'search', label: currentSearch, onRemove: () => onSearchChange('') }] : []),
        ...(currentStatus !== 'ALL' ? [{ type: 'status', label: statuses.find(s => s.value === currentStatus)?.label, onRemove: () => onStatusChange('ALL') }] : []),
        ...(currentProject !== 'ALL' ? [{ type: 'project', label: projects.find(p => p.id === currentProject)?.name, onRemove: () => onProjectChange('ALL') }] : []),
        ...(currentContract && currentContract !== 'ALL' ? [{ type: 'contract', label: currentContract, onRemove: () => onContractChange?.('ALL') }] : []),
        ...(currentPeriod && currentPeriod !== 'ALL' ? [{ type: 'period', label: periods.find(p => p.value === currentPeriod)?.label, onRemove: () => onPeriodChange?.('ALL') }] : []),
    ]

    return (
        <Card className="bg-gradient-to-r from-slate-50 to-slate-100">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm">Filtros de Busca</CardTitle>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {resultCount} de {totalCount}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por número, projeto, contrato ou período..."
                        className="pl-9"
                        value={currentSearch}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>

                {/* Main Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Status Filter */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-2">Status</label>
                        <Select value={currentStatus} onValueChange={onStatusChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                {statuses.map(status => (
                                    <SelectItem key={status.value} value={status.value}>
                                        {status.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Project Filter */}
                    {projects.length > 1 && (
                        <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-2">Projeto</label>
                            <Select value={currentProject} onValueChange={onProjectChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Projeto" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos os projetos</SelectItem>
                                    {projects.map(project => (
                                        <SelectItem key={project.id} value={project.id}>
                                            {project.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Contract Filter */}
                    {contracts && contracts.length > 1 && onContractChange && (
                        <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-2">Contrato</label>
                            <Select value={currentContract} onValueChange={onContractChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Contrato" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos os contratos</SelectItem>
                                    {contracts.map(contract => (
                                        <SelectItem key={contract.id} value={contract.id}>
                                            {contract.identifier}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Period Filter */}
                    {onPeriodChange && (
                        <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-2">Período</label>
                            <Select value={currentPeriod} onValueChange={onPeriodChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Período" />
                                </SelectTrigger>
                                <SelectContent>
                                    {periods.map(period => (
                                        <SelectItem key={period.value} value={period.value}>
                                            {period.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                {/* Active Filters Tags */}
                {activeFilters.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                        {activeFilters.map((filter, idx) => (
                            <Badge
                                key={idx}
                                variant="secondary"
                                className="flex items-center gap-1.5 pr-1"
                            >
                                <span className="text-xs">{filter.label}</span>
                                <button
                                    onClick={filter.onRemove}
                                    className="hover:bg-black/20 rounded p-0.5"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                        {hasFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onReset}
                                className="text-xs h-6"
                            >
                                <X className="h-3 w-3 mr-1" />
                                Limpar Tudo
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
