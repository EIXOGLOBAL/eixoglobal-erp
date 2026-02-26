'use client'

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts'

interface ComparativoChartData {
    name: string
    orcamento: number
    medido: number
}

interface ComparativoClientProps {
    data: ComparativoChartData[]
}

const fmt = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(n)

export function ComparativoChart({ data }: ComparativoClientProps) {
    if (data.length === 0) {
        return <p className="text-sm text-muted-foreground py-8 text-center">Nenhum projeto para comparar.</p>
    }

    return (
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 60)}>
            <BarChart
                layout="vertical"
                data={data}
                margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    type="number"
                    tickFormatter={(v) => fmt(v)}
                    tick={{ fontSize: 11 }}
                />
                <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 11 }}
                />
                <Tooltip formatter={(v: number | undefined) => v != null ? fmt(v) : "-"} />
                <Legend />
                <Bar dataKey="orcamento" name="Orcamento" fill="#6366f1" radius={[0, 4, 4, 0]} />
                <Bar dataKey="medido" name="Medido (Aprovado)" fill="#22c55e" radius={[0, 4, 4, 0]} />
            </BarChart>
        </ResponsiveContainer>
    )
}
