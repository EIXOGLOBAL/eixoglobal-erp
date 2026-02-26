'use client'

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts'

export interface DashboardChartsProps {
    monthlyData: { month: string; receitas: number; despesas: number }[]
    projectsByStatus: { name: string; value: number; color: string }[]
}

const currencyFormatter = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(value)

interface TooltipPayloadEntry {
    name: string
    value: number
    color: string
}

interface CustomTooltipProps {
    active?: boolean
    payload?: TooltipPayloadEntry[]
    label?: string
}

function FinancialTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload || payload.length === 0) return null
    return (
        <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
            <p className="font-semibold mb-1">{label}</p>
            {payload.map((entry) => (
                <p key={entry.name} style={{ color: entry.color }}>
                    {entry.name}: {currencyFormatter(entry.value)}
                </p>
            ))}
        </div>
    )
}

interface PieTooltipPayloadEntry {
    name: string
    value: number
    payload: { color: string }
}

interface PieTooltipProps {
    active?: boolean
    payload?: PieTooltipPayloadEntry[]
}

function PieTooltip({ active, payload }: PieTooltipProps) {
    if (!active || !payload || payload.length === 0) return null
    const entry = payload[0]!
    return (
        <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
            <p className="font-semibold" style={{ color: entry.payload.color }}>
                {entry.name}
            </p>
            <p>{entry.value} projeto{entry.value !== 1 ? 's' : ''}</p>
        </div>
    )
}

const RADIAN = Math.PI / 180

interface PieLabelProps {
    cx?: number
    cy?: number
    midAngle?: number
    innerRadius?: number
    outerRadius?: number
    percent?: number
}

function renderCustomizedLabel({
    cx = 0,
    cy = 0,
    midAngle = 0,
    innerRadius = 0,
    outerRadius = 0,
    percent = 0,
}: PieLabelProps) {
    if (percent < 0.05) return null
    const radius = innerRadius + (outerRadius - innerRadius) * 0.55
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    return (
        <text
            x={x}
            y={y}
            fill="white"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={11}
            fontWeight={600}
        >
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    )
}

export function DashboardCharts({ monthlyData, projectsByStatus }: DashboardChartsProps) {
    const hasFinancialData = monthlyData.some(m => m.receitas > 0 || m.despesas > 0)
    const hasProjectData = projectsByStatus.some(p => p.value > 0)

    return (
        <div className="grid gap-4 md:grid-cols-2">
            {/* Monthly Financial Bar Chart */}
            <Card className="col-span-2 lg:col-span-1">
                <CardHeader>
                    <CardTitle>Desempenho Financeiro Mensal</CardTitle>
                    <CardDescription>
                        Receitas vs Despesas — últimos 6 meses
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {hasFinancialData ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                                data={monthlyData}
                                margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis
                                    dataKey="month"
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    tickFormatter={currencyFormatter}
                                    tick={{ fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={72}
                                />
                                <Tooltip content={<FinancialTooltip />} />
                                <Legend
                                    iconType="square"
                                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                                />
                                <Bar
                                    dataKey="receitas"
                                    name="Receitas"
                                    fill="#10b981"
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={40}
                                />
                                <Bar
                                    dataKey="despesas"
                                    name="Despesas"
                                    fill="#ef4444"
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={40}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">
                            Nenhum registro financeiro nos últimos 6 meses.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Projects by Status Donut Chart */}
            <Card className="col-span-2 lg:col-span-1">
                <CardHeader>
                    <CardTitle>Projetos por Status</CardTitle>
                    <CardDescription>
                        Distribuição atual dos projetos
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {hasProjectData ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={projectsByStatus}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={renderCustomizedLabel}
                                    outerRadius={110}
                                    innerRadius={55}
                                    dataKey="value"
                                    strokeWidth={2}
                                >
                                    {projectsByStatus.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.color}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip content={<PieTooltip />} />
                                <Legend
                                    iconType="circle"
                                    wrapperStyle={{ fontSize: 12 }}
                                    formatter={(value: string) => (
                                        <span className="text-foreground">{value}</span>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">
                            Nenhum projeto cadastrado ainda.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
