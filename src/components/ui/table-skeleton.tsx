import { Skeleton } from '@/components/ui/skeleton'

interface TableSkeletonProps {
  rows?: number
  columns?: number
}

/**
 * Skeleton de carregamento para tabelas.
 * Renderiza um header com colunas e N linhas de placeholder animado.
 */
export function TableSkeletonReusable({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="w-full overflow-hidden rounded-lg border">
      {/* Header */}
      <div className="flex items-center gap-4 border-b bg-muted/40 px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton
            key={`h-${i}`}
            className="h-4 flex-1"
            style={{ maxWidth: i === 0 ? '30%' : undefined }}
          />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`r-${rowIdx}`}
          className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={`c-${rowIdx}-${colIdx}`}
              className="h-4 flex-1"
              style={{
                maxWidth: colIdx === 0 ? '30%' : undefined,
                animationDelay: `${(rowIdx * columns + colIdx) * 75}ms`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
