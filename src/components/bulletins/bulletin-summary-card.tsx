'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BarChart3, Package, TrendingUp } from "lucide-react"

interface BulletinSummaryCardProps {
    totalItems: number
    totalValue: number
    contractValue?: number
    percentageExecuted?: number
}

export function BulletinSummaryCard({
    totalItems,
    totalValue,
    contractValue = 0,
    percentageExecuted = 0,
}: BulletinSummaryCardProps) {
    const percentageOfContract = contractValue > 0
        ? (totalValue / contractValue) * 100
        : 0

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Resumo do Boletim
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Total Items */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                        <Package className="h-4 w-4 text-blue-600" />
                        <span className="text-muted-foreground">Total de Itens</span>
                    </div>
                    <span className="font-semibold">{totalItems}</span>
                </div>

                {/* Total Value */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-muted-foreground">Valor Medido</span>
                    </div>
                    <span className="font-semibold text-green-700">
                        {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            minimumFractionDigits: 0,
                        }).format(totalValue)}
                    </span>
                </div>

                {/* Contract Execution Percentage */}
                {contractValue > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">% do Contrato Medido</span>
                            <span className="font-semibold">
                                {percentageOfContract.toFixed(1)}%
                            </span>
                        </div>
                        <Progress
                            value={Math.min(percentageOfContract, 100)}
                            className="h-2"
                        />
                        <p className="text-xs text-muted-foreground">
                            {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                                minimumFractionDigits: 0,
                            }).format(contractValue - totalValue)} ainda para medir
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
