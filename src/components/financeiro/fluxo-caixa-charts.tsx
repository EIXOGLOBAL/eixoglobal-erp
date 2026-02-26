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
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts'

interface FluxoCaixaChartData {
    month: string
    entradas: number
    saidas: number
    saldo: number
}

interface FluxoCaixaChartsProps {
    data: FluxoCaixaChartData[]
}

const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background border border-border rounded-lg p-3 shadow-lg text-sm">
                <p className="font-semibold mb-1">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} style={{ color: entry.color }}>
                        {entry.name}: {fmt(entry.value)}
                    </p>
                ))}
            </div>
        )
    }
    return null
}

export function FluxoCaixaCharts({ data }: FluxoCaixaChartsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            {/* Bar chart: Entradas vs Saidas */}
            <Card className="col-span-2 lg:col-span-1">
                <CardHeader>
                    <CardTitle>Entradas vs Saídas</CardTitle>
                    <CardDescription>
                        Comparativo mensal de receitas e despesas
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                            <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="entradas" fill="#10b981" name="Entradas" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="saidas" fill="#ef4444" name="Saídas" radius={[3, 3, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Line chart: Saldo acumulado */}
            <Card className="col-span-2 lg:col-span-1">
                <CardHeader>
                    <CardTitle>Saldo do Mês</CardTitle>
                    <CardDescription>
                        Resultado líquido mensal (entradas - saídas)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                            <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <ReferenceLine y={0} stroke="#64748b" strokeDasharray="4 4" />
                            <Line
                                type="monotone"
                                dataKey="saldo"
                                stroke="#3b82f6"
                                strokeWidth={2.5}
                                name="Saldo do Mês"
                                dot={{ r: 4, fill: '#3b82f6' }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    )
}
