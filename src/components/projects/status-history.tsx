import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/formatters"

const STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planejamento",
  IN_PROGRESS: "Em Andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  ON_HOLD: "Em Espera",
}

const STATUS_COLORS: Record<string, string> = {
  PLANNING: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  ON_HOLD: "bg-amber-100 text-amber-700",
}

interface StatusHistoryItem {
  id: string
  oldStatus: string | null
  newStatus: string
  changedBy: string
  note: string | null
  createdAt: Date
}

export function StatusHistory({ history }: { history: StatusHistoryItem[] }) {
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma alteração de status registrada.</p>
  }
  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
      <div className="space-y-4">
        {history.map((item) => (
          <div key={item.id} className="flex gap-4 relative">
            <div className="w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center shrink-0 z-10">
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                {item.oldStatus && (
                  <>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.oldStatus] ?? 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABELS[item.oldStatus] ?? item.oldStatus}
                    </span>
                    <span className="text-muted-foreground">→</span>
                  </>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.newStatus] ?? 'bg-gray-100 text-gray-700'}`}>
                  {STATUS_LABELS[item.newStatus] ?? item.newStatus}
                </span>
              </div>
              {item.note && <p className="text-xs text-muted-foreground mt-1">{item.note}</p>}
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(item.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
