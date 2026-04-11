'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2 } from "lucide-react"
import { markAsPaid } from "@/app/actions/financial-actions"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/formatters"

interface ExpenseRecord {
    id: string
    description: string
    category: string | null
    amount: number
    dueDate: Date
    status: string
    paidDate?: Date | null
    paidAmount?: number
    costCenter?: { id: string; code: string; name: string } | null
}

const statusLabel: Record<string, string> = {
    PENDING: 'Pendente', PAID: 'Pago', CANCELLED: 'Cancelado', SCHEDULED: 'Agendado'
}
const statusColor: Record<string, string> = {
    PENDING: 'bg-orange-100 text-orange-800',
    PAID: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-gray-100 text-gray-600',
    SCHEDULED: 'bg-blue-100 text-blue-800',
}

const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export function DespesasTable({ records }: { records: ExpenseRecord[] }) {
    const { toast } = useToast()
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const now = new Date()

    async function handleMarkAsPaid(id: string, description: string) {
        setLoadingId(id)
        try {
            const result = await markAsPaid(id)
            if (result.success) {
                toast({ title: "Marcado como Pago!", description })
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        } finally {
            setLoadingId(null)
        }
    }

    if (records.length === 0) {
        return (
            <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhuma despesa cadastrada. Acesse{' '}
                <a href="/financeiro/faturamento" className="text-blue-600 underline">Faturamento</a>
                {' '}para adicionar.
            </p>
        )
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 pr-4">Descrição</th>
                        <th className="text-left py-2 pr-4">Categoria</th>
                        <th className="text-left py-2 pr-4">C. Custo</th>
                        <th className="text-right py-2 pr-4">Valor</th>
                        <th className="text-right py-2 pr-4">Vencimento</th>
                        <th className="text-center py-2 pr-4">Status</th>
                        <th className="text-center py-2">Ação</th>
                    </tr>
                </thead>
                <tbody>
                    {records.map(r => {
                        const isOverdue = (r.status === 'PENDING' || r.status === 'SCHEDULED') &&
                            new Date(r.dueDate) < now
                        const isPending = r.status === 'PENDING' || r.status === 'SCHEDULED'
                        const isLoading = loadingId === r.id

                        return (
                            <tr key={r.id} className={`border-b last:border-0 ${isOverdue ? 'bg-red-50' : ''}`}>
                                <td className="py-2 pr-4 font-medium">{r.description}</td>
                                <td className="py-2 pr-4 text-muted-foreground">{r.category || '—'}</td>
                                <td className="py-2 pr-4 text-muted-foreground text-xs">
                                    {r.costCenter ? <span title={r.costCenter.name}>{r.costCenter.code}</span> : '—'}
                                </td>
                                <td className="py-2 pr-4 text-right font-medium text-red-700">
                                    {fmt(r.amount)}
                                </td>
                                <td className="py-2 pr-4 text-right text-muted-foreground">
                                    {formatDate(r.dueDate)}
                                    {isOverdue && <span className="ml-1 text-red-600 text-xs">⚠ vencido</span>}
                                </td>
                                <td className="py-2 pr-4 text-center">
                                    <span className={`text-xs px-2 py-1 rounded font-medium ${statusColor[r.status] || 'bg-gray-100'}`}>
                                        {statusLabel[r.status] || r.status}
                                    </span>
                                </td>
                                <td className="py-2 text-center">
                                    {isPending ? (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs text-orange-700 border-orange-300 hover:bg-orange-50"
                                            onClick={() => handleMarkAsPaid(r.id, r.description)}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                    Pagar
                                                </>
                                            )}
                                        </Button>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">—</span>
                                    )}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
