'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, AlertCircle } from "lucide-react"

interface ContractExecutionChartProps {
    contractValue: number
    accumulatedValue: number
    currentValue: number
    remainingValue: number
    executionPercentage: number
}

export function ContractExecutionChart({
    contractValue,
    accumulatedValue,
    currentValue,
    remainingValue,
    executionPercentage,
}: ContractExecutionChartProps) {
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
        }).format(value)

    const isOverflow = executionPercentage > 100
    const progressColor = isOverflow ? 'bg-red-600' : executionPercentage >= 90 ? 'bg-orange-600' : 'bg-green-600'

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base">Execução do Contrato</CardTitle>
                        <CardDescription>Análise de avanço financeiro</CardDescription>
                    </div>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Main Progress Bar */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Progresso Total</span>
                        <span className={`text-sm font-bold ${isOverflow ? 'text-red-600' : 'text-green-600'}`}>
                            {executionPercentage.toFixed(1)}%
                        </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${progressColor} transition-all duration-300`}
                            style={{ width: `${Math.min(executionPercentage, 100)}%` }}
                        />
                    </div>
                </div>

                {/* Alert for Overflow */}
                {isOverflow && (
                    <div className="flex gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-medium text-orange-900">Atenção: Sobra de Contrato</p>
                            <p className="text-orange-700 text-xs">
                                A medição acumulada excede o valor do contrato
                            </p>
                        </div>
                    </div>
                )}

                {/* Breakdown */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Valor do Contrato</p>
                        <p className="text-lg font-bold">{formatCurrency(contractValue)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Acumulado</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(accumulatedValue)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Esta Medição</p>
                        <p className="text-lg font-bold text-blue-600">{formatCurrency(currentValue)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Saldo Restante</p>
                        <p className={`text-lg font-bold ${remainingValue >= 0 ? 'text-gray-700' : 'text-red-600'}`}>
                            {formatCurrency(Math.max(remainingValue, 0))}
                        </p>
                    </div>
                </div>

                {/* Status Indicators */}
                <div className="grid grid-cols-1 gap-2 pt-2 border-t">
                    <div className="flex justify-between items-center py-1">
                        <span className="text-sm text-muted-foreground">Taxa de Execução</span>
                        <span className="text-sm font-medium">
                            {((accumulatedValue / contractValue) * 100).toFixed(1)}%
                        </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                        <span className="text-sm text-muted-foreground">Margem Restante</span>
                        <span className={`text-sm font-medium ${remainingValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {((remainingValue / contractValue) * 100).toFixed(1)}%
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
