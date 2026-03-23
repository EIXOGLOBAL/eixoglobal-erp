"use client"

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts"

interface CurvaSDataPoint {
    month: string
    planejado: number
    realizado: number
}

interface CurvaSChartProps {
    data: CurvaSDataPoint[]
}

export function CurvaSChart({ data }: CurvaSChartProps) {
    if (data.length === 0) {
        return (
            <p className="text-sm text-muted-foreground text-center py-8">
                Sem dados suficientes para exibir a Curva S.
            </p>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="month"
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                    tick={{ fontSize: 11 }}
                />
                <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => v + "%"}
                    tick={{ fontSize: 11 }}
                />
                <Tooltip
                    formatter={(value) => [typeof value === 'number' ? value.toFixed(1) + "%" : "0%", ""]}
                />
                <Legend verticalAlign="top" />
                <Line
                    type="monotone"
                    dataKey="planejado"
                    name="Planejado"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    strokeDasharray="6 3"
                />
                <Line
                    type="monotone"
                    dataKey="realizado"
                    name="Realizado"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                />
            </LineChart>
        </ResponsiveContainer>
    )
}
