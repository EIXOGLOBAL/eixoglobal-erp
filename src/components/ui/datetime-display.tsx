'use client'

import { useCurrentTime } from '@/hooks/use-current-time'
import { cn } from '@/lib/utils'

interface DateTimeDisplayProps {
  /** Modo compacto exibe apenas a hora; modo completo exibe data + hora */
  mode?: 'compact' | 'full'
  className?: string
}

export function DateTimeDisplay({ mode = 'full', className }: DateTimeDisplayProps) {
  const { currentTime, currentDate, formattedDateTime } = useCurrentTime()

  if (mode === 'compact') {
    return (
      <span
        key={currentTime}
        className={cn(
          'text-xs text-muted-foreground tabular-nums animate-in fade-in duration-300',
          className,
        )}
      >
        {currentTime}
      </span>
    )
  }

  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span
        key={formattedDateTime}
        className="text-xs text-muted-foreground leading-tight animate-in fade-in duration-300"
      >
        {currentDate}
      </span>
      <span
        key={currentTime}
        className="text-xs font-medium text-muted-foreground tabular-nums animate-in fade-in duration-300"
      >
        {currentTime}
      </span>
    </div>
  )
}
