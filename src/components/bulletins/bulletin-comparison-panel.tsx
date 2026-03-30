'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ArrowRight, DollarSign } from "lucide-react"

interface ComparisonData {
    currentBulletin: {
        value: number
        items: number
        percentage: number
    }
    accumulated: {
        value: number
        items: number
        percentage: number
    }
    balance: {
        value: number
        items: number
        percentage: number
    }
    totalContract: number
}

interface BulletinComparisonPanelProps {
    data: ComparisonData
}

export function BulletinComparisonPanel({ data }: BulletinComparisonPanelProps) {
    const columns = [
        {
            title: 'Este Boletim',
            color: 'bg-blue-50 border-blue-200',
            icon: 'text-blue-600',
            data: data.currentBulletin,
        },
        {
            title: 'Acumulado Anterior',
            color: 'bg-slate-50 border-slate-200',
            icon: 'text-slate-600',
            data: data.accumulated,
        },
        {
            title: 'Saldo Restante',
            color: 'bg-orange-50 border-orange-200',
            icon: 'text-orange-600',
            data: data.balance,
        },
    ]

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <ArrowRight className="h-5 w-5" />
                    Análise Comparativa
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                    {columns.map((column, index) => (
                        <div
                            key={column.title}
                            className={`p-4 rounded-lg border-2 ${column.color}`}
                        >
                            <h4 className="font-semibold text-sm mb-4">{column.title}</h4>

                            {/* Value */}
                            <div className="mb-4">
                                <p className="text-xs text-muted-foreground mb-1">Valor</p>
                                <p className={`text-xl font-bold ${column.icon}`}>
                                    {new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL',
                                        minimumFractionDigits: 0,
                                    }).format(column.data.value)}
                                </p>
                            </div>

                            {/* Items Count */}
                            <div className="mb-4">
                                <p className="text-xs text-muted-foreground mb-1">Itens</p>
                                <p className="text-lg font-semibold">{column.data.items}</p>
                            </div>

                            {/* Percentage Bar */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-xs text-muted-foreground">% do Total</p>
                                    <p className="text-xs font-medium">
                                        {column.data.percentage.toFixed(1)}%
                                    </p>
                                </div>
                                <Progress
                                    value={column.data.percentage}
                                    className="h-2"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Total Contract Info */}
                <div className="mt-6 pt-4 border-t flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">Valor Total do Contrato</p>
                        <p className="text-2xl font-bold text-foreground">
                            {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                                minimumFractionDigits: 0,
                            }).format(data.totalContract)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground mb-2">Medido no Total</p>
                        <p className="text-3xl font-bold">
                            {(((data.currentBulletin.value + data.accumulated.value) / data.totalContract) * 100).toFixed(1)}%
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
