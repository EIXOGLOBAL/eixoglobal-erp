'use client'

const statusLabels: Record<string, string> = {
    DRAFT: 'Rascunho',
    PENDING_APPROVAL: 'Ag. Aprovação',
    APPROVED: 'Aprovado',
    REJECTED: 'Rejeitado',
    BILLED: 'Faturado',
}

const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-400',
    PENDING_APPROVAL: 'bg-orange-400',
    APPROVED: 'bg-green-500',
    REJECTED: 'bg-red-500',
    BILLED: 'bg-blue-500',
}

interface Props {
    stats: { status: string; count: number; value: number }[]
}

export function RelatoriosMedicoesPorStatus({ stats }: Props) {
    const fmt = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(n)

    return (
        <div className="space-y-2">
            {stats.map(s => (
                <div key={s.status} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${statusColors[s.status] || 'bg-gray-400'}`} />
                        <span className="text-muted-foreground">{statusLabels[s.status] || s.status}</span>
                    </div>
                    <div className="text-right">
                        <span className="font-medium">{s.count}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{fmt(s.value)}</span>
                    </div>
                </div>
            ))}
            {stats.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum boletim encontrado.</p>
            )}
        </div>
    )
}
