'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Eye } from "lucide-react"
import Link from "next/link"

interface BulletinQuickSummaryProps {
    bulletinId: string
    bulletinNumber: string
    status: string
    projectName: string
    contractIdentifier: string
    referenceMonth: string
    totalValue: number
    itemsCount: number
    progressPercentage?: number
    showLink?: boolean
}

const statusColors: Record<string, { bg: string; text: string }> = {
    DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700' },
    PENDING_APPROVAL: { bg: 'bg-blue-100', text: 'text-blue-700' },
    APPROVED: { bg: 'bg-green-100', text: 'text-green-700' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-700' },
    BILLED: { bg: 'bg-purple-100', text: 'text-purple-700' },
}

const statusLabels: Record<string, string> = {
    DRAFT: 'Rascunho',
    PENDING_APPROVAL: 'Pendente',
    APPROVED: 'Aprovado',
    REJECTED: 'Rejeitado',
    BILLED: 'Faturado',
}

export function BulletinQuickSummary({
    bulletinId,
    bulletinNumber,
    status,
    projectName,
    contractIdentifier,
    referenceMonth,
    totalValue,
    itemsCount,
    progressPercentage = 0,
    showLink = true,
}: BulletinQuickSummaryProps) {
    const colors = statusColors[status] || statusColors.DRAFT
    const label = statusLabels[status] || status

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 0,
        }).format(value)

    const content = (
        <Card className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 font-mono">
                            {bulletinNumber}
                        </h3>
                        <p className="text-xs text-gray-600 mt-0.5">
                            {projectName}
                        </p>
                    </div>
                    <Badge className={`text-xs ${colors.bg} ${colors.text} border-0`}>
                        {label}
                    </Badge>
                </div>

                {/* Info Row */}
                <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Contrato</span>
                        <span className="font-mono font-medium">{contractIdentifier}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Período</span>
                        <span className="font-medium">{referenceMonth}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Itens</span>
                        <span className="font-medium">{itemsCount}</span>
                    </div>
                </div>

                {/* Progress Bar (optional) */}
                {progressPercentage > 0 && (
                    <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600">Execução</span>
                            <span className="font-medium">{progressPercentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={Math.min(progressPercentage, 100)} className="h-1.5" />
                    </div>
                )}

                {/* Value */}
                <div className="pt-3 border-t">
                    <p className="text-xs text-gray-600 mb-1">Valor da Medição</p>
                    <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(totalValue)}
                    </p>
                </div>
            </CardContent>
        </Card>
    )

    if (!showLink) {
        return content
    }

    return (
        <Link href={`/measurements/${bulletinId}`} className="block hover:no-underline">
            {content}
        </Link>
    )
}
