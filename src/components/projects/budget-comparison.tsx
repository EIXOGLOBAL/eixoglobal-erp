interface BudgetComparisonProps {
  budget: number
  spent: number
  percentUsed: number
}

export function BudgetComparison({ budget, spent, percentUsed }: BudgetComparisonProps) {
  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  const remaining = budget - spent
  const isOverBudget = spent > budget

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
          <p className="text-xs text-muted-foreground mb-1">Orçamento</p>
          <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{fmt(budget)}</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30">
          <p className="text-xs text-muted-foreground mb-1">Realizado</p>
          <p className="text-lg font-bold text-orange-700 dark:text-orange-400">{fmt(spent)}</p>
        </div>
        <div
          className={`text-center p-3 rounded-lg ${
            isOverBudget ? 'bg-red-50 dark:bg-red-950/30' : 'bg-green-50 dark:bg-green-950/30'
          }`}
        >
          <p className="text-xs text-muted-foreground mb-1">{isOverBudget ? 'Estouro' : 'Saldo'}</p>
          <p
            className={`text-lg font-bold ${
              isOverBudget
                ? 'text-red-700 dark:text-red-400'
                : 'text-green-700 dark:text-green-400'
            }`}
          >
            {fmt(Math.abs(remaining))}
          </p>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Execução Financeira</span>
          <span className={percentUsed > 100 ? 'text-red-600 font-medium' : ''}>
            {percentUsed.toFixed(1)}%
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              percentUsed > 100
                ? 'bg-red-500'
                : percentUsed > 80
                ? 'bg-orange-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(percentUsed, 100)}%` }}
          />
        </div>
        {isOverBudget && (
          <p className="text-xs text-red-600 mt-1 font-medium">
            Projeto acima do orçamento em {(percentUsed - 100).toFixed(1)}%
          </p>
        )}
      </div>
    </div>
  )
}
