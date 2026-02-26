"use client"

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts"

interface EvmDataPoint {
    name: string
    BAC: number
    PV: number
    EV: number
    AC: number
}

interface EvmChartProps {
    data: EvmDataPoint[]
}

const fmtCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        notation: "compact",
        minimumFractionDigits: 0,
    }).format(v)

export function EvmChart({ data }: EvmChartProps) {
    if (data.length === 0) {
        return (
            <p className="text-sm text-muted-foreground text-center py-8">
                Sem dados para exibir.
            </p>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="name"
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                    tick={{ fontSize: 11 }}
                />
                <YAxis
                    tickFormatter={fmtCurrency}
                    tick={{ fontSize: 11 }}
                />
                <Tooltip
                    formatter={(value: number | undefined) => [value != null ? fmtCurrency(value) : "R$ 0", ""]}
                />
                <Legend verticalAlign="top" />
                <Bar dataKey="BAC" name="BAC (Orcamento)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="PV" name="PV (Planejado)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="EV" name="EV (Agregado)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="AC" name="AC (Real)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    )
}
