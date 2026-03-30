'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
    FileText,
    Clock,
    CheckCircle2,
    XCircle,
    TrendingUp,
    DollarSign,
    Zap,
} from "lucide-react"

interface BulletinsSummaryStatsProps {
    totalBulletins: number
    draftBulletins: number
    pendingBulletins: number
    approvedBulletins: number
    rejectedBulletins: number
    billedBulletins: number
    approvedValue: number
    totalMeasuredValue: number
    executionPercentage: number
}

export function BulletinsSummaryStats({
    totalBulletins,
    draftBulletins,
    pendingBulletins,
    approvedBulletins,
    rejectedBulletins,
    billedBulletins,
    approvedValue,
    totalMeasuredValue,
    executionPercentage,
}: BulletinsSummaryStatsProps) {
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
        }).format(value)

    const formatPercentage = (value: number) =>
        `${value.toFixed(1)}%`

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Boletins */}
            <Card className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Boletins</CardTitle>
                    <FileText className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalBulletins}</div>
                    <p className="text-xs text-muted-foreground mt-2">
                        <span className="font-medium text-blue-600">{draftBulletins}</span> em rascunho
                    </p>
                </CardContent>
            </Card>

            {/* Pendentes de Aprovação */}
            <Card className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                    <Clock className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{pendingBulletins}</div>
                    <p className="text-xs text-muted-foreground mt-2">
                        Aguardando análise de aprovação
                    </p>
                </CardContent>
            </Card>

            {/* Aprovados */}
            <Card className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{approvedBulletins}</div>
                    <p className="text-xs text-muted-foreground mt-2">
                        Prontos para faturamento
                    </p>
                </CardContent>
            </Card>

            {/* Valor Aprovado */}
            <Card className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Valor Aprovado</CardTitle>
                    <DollarSign className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {formatCurrency(approvedValue)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        Total medido e aprovado
                    </p>
                </CardContent>
            </Card>

            {/* Execução Geral */}
            <Card className="overflow-hidden md:col-span-2">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">Execução Geral</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium">{formatPercentage(executionPercentage)}</span>
                            <span className="text-muted-foreground text-xs">do contrato total</span>
                        </div>
                        <Progress value={Math.min(executionPercentage, 100)} className="h-2" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {formatCurrency(approvedValue)} de medições aprovadas
                    </p>
                </CardContent>
            </Card>

            {/* Rejeitados */}
            <Card className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Rejeitados</CardTitle>
                    <XCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{rejectedBulletins}</div>
                    <p className="text-xs text-muted-foreground mt-2">
                        Devolvidos para correção
                    </p>
                </CardContent>
            </Card>

            {/* Faturados */}
            <Card className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Faturados</CardTitle>
                    <Zap className="h-4 w-4 text-indigo-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{billedBulletins}</div>
                    <p className="text-xs text-muted-foreground mt-2">
                        Medições já faturadas
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
