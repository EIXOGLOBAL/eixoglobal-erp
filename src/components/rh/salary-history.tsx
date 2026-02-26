interface SalaryHistoryItem {
  id: string
  previousCost: number | null
  newCost: number
  reason: string | null
  effectiveDate: Date
}

export function SalaryHistoryCard({ history }: { history: SalaryHistoryItem[] }) {
  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma alteração salarial registrada.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {history.map((h) => {
        const pct =
          h.previousCost && h.previousCost > 0
            ? ((h.newCost - h.previousCost) / h.previousCost) * 100
            : null
        const isIncrease = !h.previousCost || h.newCost >= h.previousCost
        return (
          <div
            key={h.id}
            className="flex items-center gap-3 p-3 rounded-lg border"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                isIncrease
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {isIncrease ? '↑' : '↓'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {h.previousCost != null && (
                  <span className="text-sm text-muted-foreground line-through">
                    {fmt(h.previousCost)}/h
                  </span>
                )}
                <span className="text-sm font-semibold">{fmt(h.newCost)}/h</span>
                {pct !== null && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      isIncrease
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {isIncrease ? '+' : ''}
                    {pct.toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {h.reason && <span className="mr-2">{h.reason}</span>}
                {new Date(h.effectiveDate).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
