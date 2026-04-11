import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatDate } from "@/lib/formatters"

interface BulletinPrintSummaryProps {
    bulletinNumber: string
    referenceMonth: string
    projectName: string
    contractIdentifier: string
    periodStart: Date
    periodEnd: Date
    totalValue: number
    status: string
    createdByName?: string
    engineerName?: string
    totalItems: number
    accumulatedValue?: number
    contractValue?: number
}

const statusLabels: Record<string, string> = {
    DRAFT: "Rascunho",
    PENDING_APPROVAL: "Aguardando Aprovação",
    APPROVED: "Aprovado",
    REJECTED: "Rejeitado",
    BILLED: "Faturado",
}

const statusColors: Record<string, string> = {
    DRAFT: "text-gray-700",
    PENDING_APPROVAL: "text-blue-700",
    APPROVED: "text-green-700",
    REJECTED: "text-red-700",
    BILLED: "text-purple-700",
}

export function BulletinPrintSummary({
    bulletinNumber,
    referenceMonth,
    projectName,
    contractIdentifier,
    periodStart,
    periodEnd,
    totalValue,
    status,
    createdByName,
    engineerName,
    totalItems,
    accumulatedValue,
    contractValue,
}: BulletinPrintSummaryProps) {
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
        }).format(value)

    const executionPercentage = contractValue && accumulatedValue
        ? (accumulatedValue / contractValue) * 100
        : 0

    return (
        <div className="space-y-4 mb-8 print:space-y-2 print:mb-4">
            {/* Header */}
            <div className="flex justify-between items-start mb-6 print:mb-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight print:text-xl">
                        {bulletinNumber}
                    </h1>
                    <p className="text-sm text-gray-600 print:text-xs mt-1">
                        {projectName} • {contractIdentifier} • {referenceMonth}
                    </p>
                </div>
                <div className={`font-bold text-lg print:text-base ${statusColors[status]}`}>
                    {statusLabels[status]}
                </div>
            </div>

            <Separator className="print:my-2" />

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
                {/* Período */}
                <div>
                    <p className="text-xs text-gray-500 print:text-[10px] font-medium">PERÍODO</p>
                    <p className="font-semibold text-sm print:text-xs mt-1">
                        {formatDate(periodStart)} a {formatDate(periodEnd)}
                    </p>
                </div>

                {/* Total de Itens */}
                <div>
                    <p className="text-xs text-gray-500 print:text-[10px] font-medium">ITENS</p>
                    <p className="font-semibold text-sm print:text-xs mt-1">{totalItems}</p>
                </div>

                {/* Valor da Medição */}
                <div>
                    <p className="text-xs text-gray-500 print:text-[10px] font-medium">VALOR MEDIDO</p>
                    <p className="font-bold text-sm text-blue-600 print:text-xs mt-1">
                        {formatCurrency(totalValue)}
                    </p>
                </div>

                {/* Execução */}
                {contractValue && (
                    <div>
                        <p className="text-xs text-gray-500 print:text-[10px] font-medium">EXECUÇÃO</p>
                        <p className={`font-bold text-sm print:text-xs mt-1 ${executionPercentage >= 100 ? 'text-red-600' : 'text-green-600'}`}>
                            {executionPercentage.toFixed(1)}%
                        </p>
                    </div>
                )}
            </div>

            <Separator className="print:my-2" />

            {/* Responsáveis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2 text-sm print:text-xs">
                {createdByName && (
                    <div>
                        <p className="text-gray-500 font-medium">Responsável pela Medição</p>
                        <p className="font-semibold">{createdByName}</p>
                    </div>
                )}
                {engineerName && (
                    <div>
                        <p className="text-gray-500 font-medium">Aprovado por</p>
                        <p className="font-semibold">{engineerName}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
