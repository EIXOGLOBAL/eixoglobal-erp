'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { HardDrive } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StorageSummary {
  disk: {
    percentUsed: number
    usedFormatted: string
    totalFormatted: string
    availableFormatted: string
  }
  database: { sizeFormatted: string }
  uploads: { sizeFormatted: string; fileCount: number }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CACHE_KEY = '__storage_badge_cache'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

function readCache(): StorageSummary | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY)
      return null
    }
    return data as StorageSummary
  } catch {
    return null
  }
}

function writeCache(data: StorageSummary) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch {
    // sessionStorage may be unavailable
  }
}

function badgeStyle(percent: number) {
  if (percent >= 85) return { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' }
  if (percent >= 70) return { bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' }
  return { bg: 'bg-green-500/10 border-green-500/30', text: 'text-green-600 dark:text-green-400', dot: 'bg-green-500' }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StorageBadge({ className }: { className?: string }) {
  const [data, setData] = useState<StorageSummary | null>(null)
  const fetched = useRef(false)

  const fetchData = useCallback(async () => {
    // Check cache first
    const cached = readCache()
    if (cached) {
      setData(cached)
      return
    }

    try {
      const res = await fetch('/api/system/storage', { cache: 'no-store' })
      if (!res.ok) return
      const json = await res.json()
      const summary: StorageSummary = {
        disk: {
          percentUsed: json.disk.percentUsed,
          usedFormatted: json.disk.usedFormatted,
          totalFormatted: json.disk.totalFormatted,
          availableFormatted: json.disk.availableFormatted,
        },
        database: { sizeFormatted: json.database.sizeFormatted },
        uploads: { sizeFormatted: json.uploads.sizeFormatted, fileCount: json.uploads.fileCount },
      }
      writeCache(summary)
      setData(summary)
    } catch {
      // silently fail — badge is non-critical
    }
  }, [])

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
    fetchData()
  }, [fetchData])

  if (!data) return null

  const style = badgeStyle(data.disk.percentUsed)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80',
              style.bg,
              style.text,
              className,
            )}
          >
            <HardDrive className="h-3 w-3" />
            <span>{data.disk.percentUsed}% usado</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1 text-xs">
            <p className="font-semibold">Armazenamento do Servidor</p>
            <div className="space-y-0.5">
              <p>Disco: {data.disk.usedFormatted} / {data.disk.totalFormatted}</p>
              <p>Banco de Dados: {data.database.sizeFormatted}</p>
              <p>Arquivos: {data.uploads.sizeFormatted} ({data.uploads.fileCount} arquivos)</p>
            </div>
            {/* Mini bar */}
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mt-1">
              <div
                className={cn('h-full rounded-full', style.dot)}
                style={{ width: `${Math.min(data.disk.percentUsed, 100)}%` }}
              />
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
