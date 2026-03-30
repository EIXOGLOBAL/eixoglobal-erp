'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Percent, TrendingUp } from "lucide-react"

interface CostSummaryCardProps {
    materialsCost: number
    laborCost: number
    equipmentCost: number
    directCost: number
    bdi: number
    salePrice: number
    unit: string
}

export function CostSummaryCard({
    materialsCost,
    laborCost,
    equipmentCost,
    directCost,
    bdi,
    salePrice,
    unit,
}: CostSummaryCardProps) {
    const bdiValue = directCost * (bdi / 100)
    const margin = salePrice - directCost
    const marginPercent = salePrice > 0 ? (margin / salePrice) * 100 : 0

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value)

    return (
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50/50 to-transparent">
            <CardHeader>
                <CardTitle className="text-green-800">Resumo da Composição</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Breakdown de custos diretos */}
                    <div className="grid grid-cols-3 gap-3 pb-4 border-b">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Materiais</p>
                            <p className="text-lg font-semibold">{formatCurrency(materialsCost)}</p>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                <div
                                    className="bg-blue-500 h-1.5 rounded-full"
                                    style={{ width: `${directCost > 0 ? (materialsCost / directCost) * 100 : 0}%` }}
                                ></div>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Mão de Obra</p>
                            <p className="text-lg font-semibold">{formatCurrency(laborCost)}</p>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                <div
                                    className="bg-orange-500 h-1.5 rounded-full"
                                    style={{ width: `${directCost > 0 ? (laborCost / directCost) * 100 : 0}%` }}
                                ></div>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Equipamentos</p>
                            <p className="text-lg font-semibold">{formatCurrency(equipmentCost)}</p>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                <div
                                    className="bg-purple-500 h-1.5 rounded-full"
                                    style={{ width: `${directCost > 0 ? (equipmentCost / directCost) * 100 : 0}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Cálculos */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium">Custo Direto Total</span>
                            </div>
                            <span className="text-lg font-bold">{formatCurrency(directCost)}</span>
                        </div>

                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Percent className="h-4 w-4 text-amber-600" />
                                <span className="text-sm font-medium">
                                    Acréscimo BDI ({bdi.toFixed(2)}%)
                                </span>
                            </div>
                            <span className="text-lg font-bold text-amber-700">{formatCurrency(bdiValue)}</span>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t-2 border-green-300">
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-bold">Preço de Venda Final</span>
                            </div>
                            <span className="text-2xl font-bold text-green-700">{formatCurrency(salePrice)}</span>
                        </div>
                    </div>

                    {/* Detalhes adicionais */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t text-xs">
                        <div>
                            <p className="text-muted-foreground">Unidade</p>
                            <p className="font-semibold">{unit}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Margem Líquida</p>
                            <p className="font-semibold text-green-700">
                                {formatCurrency(margin)} ({marginPercent.toFixed(2)}%)
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
