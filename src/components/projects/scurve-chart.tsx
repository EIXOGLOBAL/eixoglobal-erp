'use client'

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts'

export interface SCurveDataPoint {
    period: string
    planned: number
    actual: number | null
}

interface SCurveChartProps {
    data: SCurveDataPoint[]
    projectName: string
}

interface TooltipPayloadEntry {
    name: string
    value: number | null
    color: string
    dataKey: string
}

interface CustomTooltipProps {
    active?: boolean
    payload?: TooltipPayloadEntry[]
    label?: string
}

function SCurveTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload || payload.length === 0) return null

    return (
        <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
            <p className="font-semibold mb-1">{label}</p>
            {payload.map((entry) => {
                if (entry.value === null || entry.value === undefined) return null
                return (
                    <p key={entry.dataKey} style={{ color: entry.color }}>
                        {entry.name}: {(entry.value).toFixed(1)}%
                    </p>
                )
            })}
        </div>
    )
}

export function SCurveChart({ data, projectName }: SCurveChartProps) {
    return (
        <div aria-label={`Curva S do projeto ${projectName}`}>
            <ResponsiveContainer width="100%" height={350}>
                <AreaChart
                    data={data}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                        dataKey="period"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                    />
                    <YAxis
                        tickFormatter={(v: number) => v + '%'}
                        domain={[0, 100]}
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip content={<SCurveTooltip />} />
                    <Legend
                        wrapperStyle={{ fontSize: '13px', paddingTop: '8px' }}
                    />
                    <ReferenceLine
                        y={100}
                        stroke="#94a3b8"
                        strokeDasharray="4 4"
                        label={{ value: '100%', position: 'right', fontSize: 11, fill: '#94a3b8' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="planned"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#colorPlanned)"
                        name="Planejado"
                        dot={false}
                        activeDot={{ r: 4 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="actual"
                        stroke="#22c55e"
                        strokeWidth={2}
                        fill="url(#colorActual)"
                        name="Realizado"
                        connectNulls={false}
                        dot={false}
                        activeDot={{ r: 4 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
