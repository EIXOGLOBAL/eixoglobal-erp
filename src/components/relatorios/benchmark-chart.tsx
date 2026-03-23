"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ChartDataPoint {
    name: string
    orcado: number
    realizado: number
}

interface BenchmarkChartProps {
    data: ChartDataPoint[]
}

export function BenchmarkChart({ data }: BenchmarkChartProps) {
    if (data.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-8">Sem dados para exibir.</p>
    }
    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => "R$" + new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(v)} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => typeof value === 'number' ? ["R$ " + new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2 }).format(value) + "/m²", ""] : ["-", ""]} />
                <Legend verticalAlign="top" />
                <Bar dataKey="orcado" name="Orçado/m²" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="realizado" name="Realizado/m²" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    )
}
