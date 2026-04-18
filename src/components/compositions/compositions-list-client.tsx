'use client'

import { useState, useMemo } from "react"
import { Filter, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { CompositionsTable } from "./compositions-table"

interface CompositionsListClientProps {
    compositions: any[]
    projects: any[]
}

export function CompositionsListClient({
    compositions,
    projects,
}: CompositionsListClientProps) {
    const [search, setSearch] = useState('')
    const [unitFilter, setUnitFilter] = useState('')
    const [projectFilter, setProjectFilter] = useState('')

    // Obter unidades únicas
    const uniqueUnits = useMemo(() => {
        const units = new Set(compositions.map(c => c.unit))
        return Array.from(units).sort()
    }, [compositions])

    // Filtrar composições
    const filteredCompositions = useMemo(() => {
        let filtered = compositions

        // Filtro por busca
        if (search) {
            filtered = filtered.filter(c =>
                c.code.toLowerCase().includes(search.toLowerCase()) ||
                c.description.toLowerCase().includes(search.toLowerCase())
            )
        }

        // Filtro por unidade
        if (unitFilter) {
            filtered = filtered.filter(c => c.unit === unitFilter)
        }

        // Filtro por projeto
        if (projectFilter) {
            if (projectFilter === 'global') {
                filtered = filtered.filter(c => !c.projectId)
            } else {
                filtered = filtered.filter(c => c.projectId === projectFilter)
            }
        }

        return filtered
    }, [compositions, search, unitFilter, projectFilter])

    // Calcular KPIs filtrados
    const filteredKpis = useMemo(() => {
        const totalCost = filteredCompositions.reduce((sum, c) => sum + Number(c.salePrice || 0), 0)
        const averageCost = filteredCompositions.length > 0 ? totalCost / filteredCompositions.length : 0

        return {
            count: filteredCompositions.length,
            totalCost,
            averageCost,
        }
    }, [filteredCompositions])

    // Limpar filtros
    const hasFilters = search || unitFilter || projectFilter
    const handleClearFilters = () => {
        setSearch('')
        setUnitFilter('')
        setProjectFilter('')
    }

    return (
        <div className="space-y-4">
            {/* Filtros */}
            <div className="space-y-4">
                <div className="flex gap-3 flex-wrap">
                    <Input
                        placeholder="Buscar por código ou descrição..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="max-w-md"
                    />

                    <Select value={unitFilter} onValueChange={setUnitFilter}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filtrar por unidade" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">Todas as unidades</SelectItem>
                            {uniqueUnits.map(unit => (
                                <SelectItem key={unit} value={unit}>
                                    {unit}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={projectFilter} onValueChange={setProjectFilter}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filtrar por projeto" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">Todos os projetos</SelectItem>
                            <SelectItem value="global">Globais</SelectItem>
                            {projects.map(project => (
                                <SelectItem key={project.id} value={project.id}>
                                    {project.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {hasFilters && (
                        <Button
 variant="outline"
 size="icon" aria-label="Limpar filtros" 
 onClick={handleClearFilters}
 title="Limpar filtros"
>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* Indicador de filtros ativos */}
                {hasFilters && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Filter className="h-4 w-4" />
                        <span>
                            {filteredKpis.count} composição(ões) encontrada(s)
                            {unitFilter && ` • Unidade: ${unitFilter}`}
                            {projectFilter && ` • Projeto: ${projectFilter === 'global' ? 'Global' : projects.find(p => p.id === projectFilter)?.name}`}
                        </span>
                    </div>
                )}

                {/* KPIs Filtrados */}
                {hasFilters && (
                    <div className="grid gap-3 md:grid-cols-3 pt-2 border-t">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Total Filtrado</p>
                            <p className="text-lg font-semibold">{filteredKpis.count}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Soma de Preços</p>
                            <p className="text-lg font-semibold">
                                {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                }).format(filteredKpis.totalCost)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Preço Médio</p>
                            <p className="text-lg font-semibold">
                                {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                }).format(filteredKpis.averageCost)}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabela */}
            <div className="pt-4">
                <CompositionsTable compositions={filteredCompositions} />
            </div>
        </div>
    )
}
