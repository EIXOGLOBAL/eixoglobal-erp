import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface CardSkeletonProps {
  /** Quantidade de cards skeleton a renderizar */
  count?: number
  /** Layout: grid ou lista */
  layout?: 'grid' | 'list'
  /** Classes adicionais para o container */
  className?: string
}

/**
 * Skeleton de carregamento para cards.
 * Suporta layout em grid (padrão) ou lista vertical.
 */
export function CardSkeletonGroup({ count = 4, layout = 'grid', className }: CardSkeletonProps) {
  return (
    <div
      className={cn(
        layout === 'grid'
          ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          : 'flex flex-col gap-4',
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeletonItem key={i} index={i} layout={layout} />
      ))}
    </div>
  )
}

function CardSkeletonItem({ index, layout }: { index: number; layout: 'grid' | 'list' }) {
  return (
    <Card
      className={cn(
        'overflow-hidden',
        layout === 'list' && 'flex flex-row items-center',
      )}
    >
      <CardHeader
        className={cn(
          'flex flex-row items-center justify-between space-y-0 pb-2',
          layout === 'list' && 'w-48 shrink-0',
        )}
      >
        <Skeleton
          className="h-4 w-24"
          style={{ animationDelay: `${index * 100}ms` }}
        />
        <Skeleton
          className="h-4 w-4 rounded-full"
          style={{ animationDelay: `${index * 100 + 50}ms` }}
        />
      </CardHeader>
      <CardContent className={cn(layout === 'list' && 'flex-1')}>
        <Skeleton
          className="mb-2 h-7 w-20"
          style={{ animationDelay: `${index * 100 + 100}ms` }}
        />
        <Skeleton
          className="h-3 w-32"
          style={{ animationDelay: `${index * 100 + 150}ms` }}
        />
        {layout === 'list' && (
          <Skeleton
            className="mt-2 h-3 w-48"
            style={{ animationDelay: `${index * 100 + 200}ms` }}
          />
        )}
      </CardContent>
    </Card>
  )
}
