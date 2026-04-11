'use client'

import { useEffect, useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, TrendingDown, TrendingUp, Minus } from "lucide-react"
import { getBudgetVsActual, type BudgetVsActualData } from "@/app/actions/budget-actions"

const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
    }).format(value)

const formatPercent = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
        style: "decimal",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    }).format(value) + "%"

function DeviationBadge({ value, percent }: { value: number; percent: number }) {
    if (Math.abs(value) < 0.01) {
        return (
            <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                <Minus className="h-3 w-3 mr-1" />
                No alvo
            </Badge>
        )
    }
    if (value < 0) {
        return (
            <Badge className="bg-green-100 text-green-800 border-green-200">
                <TrendingDown className="h-3 w-3 mr-1" />
                {formatPercent(percent)} abaixo
            </Badge>
        )
    }
    return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
            <TrendingUp className="h-3 w-3 mr-1" />
            {formatPercent(percent)} acima
        </Badge>
    )
}

interface BudgetVsActualProps {
    budgetId: string
}

export function BudgetVsActual({ budgetId }: BudgetVsActualProps) {
    const [data, setData] = useState<BudgetVsActualData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function load() {
            setLoading(true)
            setError(null)
            try {
                const result = await getBudgetVsActual(budgetId)
                if (result.success && result.data) {
                    setData(result.data)
                } else {
                    setError(result.error ?? "Erro ao carregar dados")
                }
            } catch {
                setError("Erro inesperado ao carregar dados")
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [budgetId])

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Carregando comparativo...</span>
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <p className="text-sm text-destructive">{error}</p>
                </CardContent>
            </Card>
        )
    }

    if (!data) return null

    const hasItems = data.items.length > 0

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                    <CardTitle>Comparativo: Orcado vs Realizado</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Projeto: {data.projectName}
                    </p>
                </div>
                <DeviationBadge
                    value={data.totalDeviation}
                    percent={Math.abs(data.totalDeviationPercent)}
                />
            </CardHeader>
            <CardContent className="p-0">
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-4 px-6 pb-4">
                    <div className="rounded-md border p-3">
                        <p className="text-xs text-muted-foreground font-medium">Total Orcado</p>
                        <p className="text-lg font-bold tabular-nums text-blue-700">
                            {formatBRL(data.totalBudgeted)}
                        </p>
                    </div>
                    <div className="rounded-md border p-3">
                        <p className="text-xs text-muted-foreground font-medium">Total Realizado</p>
                        <p className="text-lg font-bold tabular-nums text-purple-700">
                            {formatBRL(data.totalActual)}
                        </p>
                    </div>
                    <div className={`rounded-md border p-3 ${
                        data.totalDeviation > 0.01
                            ? "border-red-200 bg-red-50"
                            : data.totalDeviation < -0.01
                              ? "border-green-200 bg-green-50"
                              : ""
                    }`}>
                        <p className="text-xs text-muted-foreground font-medium">Desvio Total</p>
                        <p className={`text-lg font-bold tabular-nums ${
                            data.totalDeviation > 0.01
                                ? "text-red-700"
                                : data.totalDeviation < -0.01
                                  ? "text-green-700"
                                  : ""
                        }`}>
                            {data.totalDeviation >= 0 ? "+" : ""}{formatBRL(data.totalDeviation)}
                            <span className="text-xs font-normal ml-1">
                                ({data.totalDeviationPercent >= 0 ? "+" : ""}{formatPercent(data.totalDeviationPercent)})
                            </span>
                        </p>
                    </div>
                </div>

                {/* Detail table */}
                {!hasItems ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">Nenhum item no orcamento para comparar.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-6">Item</TableHead>
                                <TableHead className="text-right">Valor Orcado</TableHead>
                                <TableHead className="text-right">Valor Realizado</TableHead>
                                <TableHead className="text-right">Desvio (R$)</TableHead>
                                <TableHead className="text-right pr-6">% Desvio</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.items.map((item) => {
                                const isOver = item.deviation > 0.01
                                const isUnder = item.deviation < -0.01

                                return (
                                    <TableRow key={item.id}>
                                        <TableCell className="pl-6">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm truncate max-w-[250px]">
                                                    {item.description}
                                                </span>
                                                {item.code && (
                                                    <span className="text-xs text-muted-foreground font-mono">
                                                        {item.code}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums text-sm">
                                            {formatBRL(item.budgeted)}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums text-sm">
                                            {formatBRL(item.actual)}
                                        </TableCell>
                                        <TableCell className={`text-right tabular-nums text-sm font-medium ${
                                            isOver ? "text-red-700" : isUnder ? "text-green-700" : ""
                                        }`}>
                                            {item.deviation >= 0 ? "+" : ""}{formatBRL(item.deviation)}
                                        </TableCell>
                                        <TableCell className={`text-right tabular-nums text-sm pr-6 font-medium ${
                                            isOver ? "text-red-700" : isUnder ? "text-green-700" : ""
                                        }`}>
                                            {item.deviationPercent >= 0 ? "+" : ""}{formatPercent(item.deviationPercent)}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                        <TableFooter>
                            <TableRow className="font-semibold">
                                <TableCell className="pl-6">
                                    Total Geral
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {formatBRL(data.totalBudgeted)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {formatBRL(data.totalActual)}
                                </TableCell>
                                <TableCell className={`text-right tabular-nums font-bold ${
                                    data.totalDeviation > 0.01 ? "text-red-700" : data.totalDeviation < -0.01 ? "text-green-700" : ""
                                }`}>
                                    {data.totalDeviation >= 0 ? "+" : ""}{formatBRL(data.totalDeviation)}
                                </TableCell>
                                <TableCell className={`text-right tabular-nums font-bold pr-6 ${
                                    data.totalDeviationPercent > 0.01 ? "text-red-700" : data.totalDeviationPercent < -0.01 ? "text-green-700" : ""
                                }`}>
                                    {data.totalDeviationPercent >= 0 ? "+" : ""}{formatPercent(data.totalDeviationPercent)}
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}
