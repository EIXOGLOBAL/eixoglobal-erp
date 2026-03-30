'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface MonthlySummaryData {
    month: string
    value: number
    count: number
}

interface MonthlySummaryChartProps {
    data: MonthlySummaryData[]
}

export function MonthlySummaryChart({ data }: MonthlySummaryChartProps) {
    // Group data by month and sum values
    const chartData = data.reduce((acc: Record<string, any>, item) => {
        if (!acc[item.month]) {
            acc[item.month] = { month: item.month, value: 0, count: 0 }
        }
        acc[item.month].value += item.value
        acc[item.month].count += item.count
        return acc
    }, {})

    const sortedData = Object.values(chartData)
        .sort((a: any, b: any) => (new Date(a.month + '-01').getTime() - new Date(b.month + '-01').getTime()))
        .slice(-12) // Last 12 months

    if (sortedData.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Resumo Mensal de Medições</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-8">
                        Nenhum dado disponível para exibir
                    </p>
                </CardContent>
            </Card>
        )
    }

    const maxValue = Math.max(...sortedData.map((d: any) => d.value))
    const formattedData = sortedData.map((d: any) => ({
        ...d,
        displayValue: `R$ ${(d.value / 1000).toFixed(1)}k`,
    }))

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Resumo Mensal de Medições</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={formattedData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 12 }}
                            />
                            <YAxis
                                tick={{ fontSize: 12 }}
                                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                                formatter={(value: any) => {
                                    if (typeof value === 'number') {
                                        return [
                                            new Intl.NumberFormat('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL',
                                                minimumFractionDigits: 0,
                                            }).format(value),
                                            'Valor Medido',
                                        ]
                                    }
                                    return value
                                }}
                                labelFormatter={(label) => `Mês: ${label}`}
                            />
                            <Legend />
                            <Bar
                                dataKey="value"
                                fill="#3b82f6"
                                name="Valor Medido"
                                radius={[8, 8, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
