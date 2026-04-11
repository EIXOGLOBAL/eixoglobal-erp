import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface PageSkeletonProps {
  /** Titulo placeholder width */
  titleWidth?: string
  /** Quantidade de KPI cards */
  cards?: number
  /** Quantidade de linhas na tabela */
  tableRows?: number
  /** Quantidade de colunas na tabela */
  tableColumns?: number
  /** Mostrar secao de tabela */
  showTable?: boolean
  /** Mostrar secao de cards KPI */
  showCards?: boolean
  /** Classes adicionais */
  className?: string
}

/**
 * Skeleton de pagina completa: titulo + descricao + KPI cards + tabela.
 * Usado como fallback de loading.tsx nas rotas do dashboard.
 */
export function PageSkeleton({
  titleWidth = 'w-48',
  cards = 4,
  tableRows = 6,
  tableColumns = 5,
  showTable = true,
  showCards = true,
  className,
}: PageSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className={cn('h-8', titleWidth)} />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* KPI cards */}
      {showCards && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: cards }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton
                  className="h-4 w-24"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
                <Skeleton
                  className="h-4 w-4 rounded"
                  style={{ animationDelay: `${i * 100 + 50}ms` }}
                />
              </CardHeader>
              <CardContent>
                <Skeleton
                  className="mb-1 h-7 w-20"
                  style={{ animationDelay: `${i * 100 + 100}ms` }}
                />
                <Skeleton
                  className="h-3 w-32"
                  style={{ animationDelay: `${i * 100 + 150}ms` }}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Table */}
      {showTable && (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-3 w-56" />
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-hidden rounded-lg border">
              {/* Table header */}
              <div className="flex items-center gap-4 border-b bg-muted/40 px-4 py-3">
                {Array.from({ length: tableColumns }).map((_, i) => (
                  <Skeleton
                    key={`th-${i}`}
                    className="h-4 flex-1"
                    style={{ maxWidth: i === 0 ? '30%' : undefined }}
                  />
                ))}
              </div>

              {/* Table rows */}
              {Array.from({ length: tableRows }).map((_, rowIdx) => (
                <div
                  key={`tr-${rowIdx}`}
                  className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0"
                >
                  {Array.from({ length: tableColumns }).map((_, colIdx) => (
                    <Skeleton
                      key={`td-${rowIdx}-${colIdx}`}
                      className="h-4 flex-1"
                      style={{
                        maxWidth: colIdx === 0 ? '30%' : undefined,
                        animationDelay: `${(rowIdx * tableColumns + colIdx) * 50}ms`,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
