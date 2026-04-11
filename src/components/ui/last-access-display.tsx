'use client'

import { useState, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'

const TZ = 'America/Sao_Paulo'

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: 'seconds' },
  { amount: 60, unit: 'minutes' },
  { amount: 24, unit: 'hours' },
  { amount: 7, unit: 'days' },
]

const relativeFormatter = new Intl.RelativeTimeFormat('pt-BR', {
  numeric: 'auto',
  style: 'long',
})

const absoluteFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function formatRelativeTime(date: Date, now: Date): string {
  let diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000)

  // Se a diferença for maior que 7 dias, exibe data absoluta
  if (Math.abs(diffSeconds) > 7 * 24 * 60 * 60) {
    return absoluteFormatter.format(date)
  }

  for (const { amount, unit } of DIVISIONS) {
    if (Math.abs(diffSeconds) < amount) {
      return relativeFormatter.format(Math.round(diffSeconds), unit)
    }
    diffSeconds /= amount
  }

  // Fallback para data absoluta
  return absoluteFormatter.format(date)
}

interface LastAccessDisplayProps {
  /** Data/hora do último acesso */
  lastAccessAt: Date | string
  className?: string
}

export function LastAccessDisplay({ lastAccessAt, className }: LastAccessDisplayProps) {
  const accessDate = useMemo(() => {
    const d = lastAccessAt instanceof Date ? lastAccessAt : new Date(lastAccessAt)
    return isNaN(d.getTime()) ? null : d
  }, [lastAccessAt])

  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date())
    }, 60_000)

    return () => clearInterval(interval)
  }, [])

  if (!accessDate) {
    return null
  }

  const relativeText = formatRelativeTime(accessDate, now)

  return (
    <span
      className={cn('text-xs text-muted-foreground', className)}
      title={absoluteFormatter.format(accessDate)}
    >
      Último acesso: {relativeText}
    </span>
  )
}
