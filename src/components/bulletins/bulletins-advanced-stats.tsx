'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts"
import { useMemo } from "react"

interface BulletinsAdvancedStatsProps {
    bulletins: any[]
}

export function BulletinsAdvancedStats({ bulletins }: BulletinsAdvancedStatsProps) {
    const stats = useMemo(() => {
        if (!bulletins || bulletins.length === 0) {
            return null
        }

        // Status distribution
        const statusCounts = {
            DRAFT: bulletins.filter(b => b.status === 'DRAFT').length,
            PENDING_APPROVAL: bulletins.filter(b => b.status === 'PENDING_APPROVAL').length,
            APPROVED: bulletins.filter(b => b.status === 'APPROVED').length,
            REJECTED: bulletins.filter(b => b.status === 'REJECTED').length,
            BILLED: bulletins.filter(b => b.status === 'BILLED').length,
        }

        const pieData = [
            { name: 'Rascunho', value: statusCounts.DRAFT, color: '#9CA3AF' },
            { name: 'Pendente', value: statusCounts.PENDING_APPROVAL, color: '#3B82F6' },
            { name: 'Aprovado', value: statusCounts.APPROVED, color: '#10B981' },
            { name: 'Rejeitado', value: statusCounts.REJECTED, color: '#EF4444' },
            { name: 'Faturado', value: statusCounts.BILLED, color: '#8B5CF6' },
        ].filter(d => d.value > 0)

        // Monthly trend
        const monthlyData = bulletins
            .filter(b => b.status !== 'DRAFT')
            .reduce((acc, b) => {
                const month = b.referenceMonth
                const existing = acc.find(d => d.month === month)
                if (existing) {
                    existing.value += Number(b.totalValue || 0)
                    existing.count += 1
                } else {
                    acc.push({ month, value: Number(b.totalValue || 0), count: 1 })
                }
                return acc
            }, [] as Array<{ month: string; value: number; count: number }>)
            .sort((a, b) => a.month.localeCompare(b.month))
            .slice(-6) // Last 6 months

        // Average by status
        const averageValue = {
            APPROVED: bulletins
                .filter(b => b.status === 'APPROVED')
                .reduce((sum, b) => sum + Number(b.totalValue || 0), 0) / statusCounts.APPROVED || 0,
            PENDING: bulletins
                .filter(b => b.status === 'PENDING_APPROVAL')
                .reduce((sum, b) => sum + Number(b.totalValue || 0), 0) / statusCounts.PENDING_APPROVAL || 0,
        }

        return {
            pieData,
            monthlyData,
            averageValue,
            statusCounts,
        }
    }, [bulletins])

    if (!stats) {
        return null
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Status Distribution Pie Chart */}
            {stats.pieData.length > 0 && (
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-sm">Distribuição por Status</CardTitle>
                        <CardDescription>Total de boletins</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={stats.pieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, value }) => `${name} (${value})`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {stats.pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Monthly Trend */}
            {stats.monthlyData.length > 0 && (
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-sm">Valor Medido por Mês</CardTitle>
                        <CardDescription>Últimos 6 meses</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={stats.monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" fontSize={12} />
                                <YAxis fontSize={12} />
                                <Tooltip
                                    formatter={(value) =>
                                        new Intl.NumberFormat('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL',
                                        }).format(Number(value))
                                    }
                                />
                                <Bar dataKey="value" fill="#10B981" name="Valor" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Average Values */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Valor Médio</CardTitle>
                    <CardDescription>Por status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Aprovados</span>
                            <span className="font-bold text-green-600">
                                {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                    notation: 'compact',
                                }).format(stats.averageValue.APPROVED)}
                            </span>
                        </div>
                        <Progress value={Math.min((stats.averageValue.APPROVED / 10000) * 100, 100)} className="h-2" />
                    </div>
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Pendentes</span>
                            <span className="font-bold text-blue-600">
                                {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                    notation: 'compact',
                                }).format(stats.averageValue.PENDING)}
                            </span>
                        </div>
                        <Progress value={Math.min((stats.averageValue.PENDING / 10000) * 100, 100)} className="h-2" />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
