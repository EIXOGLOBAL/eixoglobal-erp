'use client'

import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface Props {
    receita: number
    despesa: number
    saldo: number
}

export function RelatoriosFinanceiro({ receita, despesa, saldo }: Props) {
    const fmt = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(n)

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-muted-foreground">Receitas</span>
                </div>
                <span className="font-semibold text-green-700">{fmt(receita)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                    <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-muted-foreground">Despesas</span>
                </div>
                <span className="font-semibold text-red-600">{fmt(despesa)}</span>
            </div>
            <div className="flex items-center justify-between text-sm pt-2 border-t font-semibold">
                <div className="flex items-center gap-2">
                    <Minus className="h-3.5 w-3.5" />
                    <span>Saldo</span>
                </div>
                <span className={saldo >= 0 ? 'text-green-700' : 'text-red-600'}>{fmt(saldo)}</span>
            </div>
        </div>
    )
}
