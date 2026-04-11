'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Send,
  Loader2,
  User as UserIcon,
} from 'lucide-react'
import { getApprovalHistory } from '@/app/actions/approval-workflow-actions'
import { cn } from '@/lib/utils'

type HistoryAction = 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'COMMENTED' | string

interface HistoryEntry {
  id: string
  level: number
  action: HistoryAction
  userId: string
  user: { id: string; name: string | null }
  comments: string | null
  createdAt: string | Date
}

interface ApprovalRequestData {
  id: string
  entityType: string
  entityId: string
  currentLevel: number
  status: string
  requestedBy: { id: string; name: string | null }
  history: HistoryEntry[]
  createdAt: string | Date
}

interface ApprovalHistoryProps {
  entityType: string
  entityId: string
  className?: string
  /** Maximum number of entries to display. 0 = no limit */
  maxEntries?: number
}

const actionConfig: Record<string, {
  label: string
  icon: typeof CheckCircle2
  colorClass: string
  dotClass: string
}> = {
  SUBMITTED: {
    label: 'Solicitou aprovacao',
    icon: Send,
    colorClass: 'text-blue-600 dark:text-blue-400',
    dotClass: 'bg-blue-500',
  },
  APPROVED: {
    label: 'Aprovou',
    icon: CheckCircle2,
    colorClass: 'text-green-600 dark:text-green-400',
    dotClass: 'bg-green-500',
  },
  REJECTED: {
    label: 'Rejeitou',
    icon: XCircle,
    colorClass: 'text-red-600 dark:text-red-400',
    dotClass: 'bg-red-500',
  },
  COMMENTED: {
    label: 'Comentou',
    icon: MessageSquare,
    colorClass: 'text-gray-600 dark:text-gray-400',
    dotClass: 'bg-gray-500',
  },
}

const defaultActionConfig = {
  label: 'Acao',
  icon: Clock,
  colorClass: 'text-gray-600 dark:text-gray-400',
  dotClass: 'bg-gray-400',
}

function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })
}

export function ApprovalHistory({
  entityType,
  entityId,
  className,
  maxEntries = 0,
}: ApprovalHistoryProps) {
  const [requests, setRequests] = useState<ApprovalRequestData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchHistory = useCallback(async () => {
    try {
      const result = await getApprovalHistory(entityType, entityId)
      if (result.success && result.data) {
        setRequests(result.data as unknown as ApprovalRequestData[])
      }
    } catch {
      // Silently handle errors
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando historico...</span>
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className={cn('rounded-lg border border-dashed p-6 text-center', className)}>
        <Clock className="mx-auto size-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhum historico de aprovacao encontrado.
        </p>
      </div>
    )
  }

  // Flatten all history entries from all requests, sorted by date (newest first)
  const allEntries: Array<HistoryEntry & {
    requestStatus: string
    requestCreatedAt: string | Date
    requestedByName: string | null
  }> = []

  for (const request of requests) {
    // Add the submission itself as an entry if there's no SUBMITTED history
    const hasSubmitted = request.history.some((h) => h.action === 'SUBMITTED')
    if (!hasSubmitted) {
      allEntries.push({
        id: `submission-${request.id}`,
        level: 1,
        action: 'SUBMITTED',
        userId: request.requestedBy.id,
        user: request.requestedBy,
        comments: null,
        createdAt: request.createdAt,
        requestStatus: request.status,
        requestCreatedAt: request.createdAt,
        requestedByName: request.requestedBy.name,
      })
    }

    for (const entry of request.history) {
      allEntries.push({
        ...entry,
        requestStatus: request.status,
        requestCreatedAt: request.createdAt,
        requestedByName: request.requestedBy.name,
      })
    }
  }

  // Sort newest first
  allEntries.sort((a, b) => {
    const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt
    const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt
    return dateB.getTime() - dateA.getTime()
  })

  const displayEntries = maxEntries > 0 ? allEntries.slice(0, maxEntries) : allEntries

  return (
    <div className={cn('space-y-0', className)}>
      <div className="relative">
        {displayEntries.map((entry, index) => {
          const config = actionConfig[entry.action] || defaultActionConfig
          const Icon = config.icon
          const isLast = index === displayEntries.length - 1

          return (
            <div key={entry.id} className="relative flex gap-4 pb-6">
              {/* Timeline line */}
              {!isLast && (
                <div className="absolute left-[15px] top-8 h-[calc(100%-20px)] w-px bg-border" />
              )}

              {/* Timeline dot */}
              <div className="relative flex size-8 shrink-0 items-center justify-center rounded-full border bg-background">
                <Icon className={cn('size-4', config.colorClass)} />
              </div>

              {/* Content */}
              <div className="flex-1 pt-0.5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="flex items-center gap-1 text-sm font-medium">
                    <UserIcon className="size-3 text-muted-foreground" />
                    {entry.user.name || 'Usuario'}
                  </span>
                  <span className={cn('text-sm', config.colorClass)}>
                    {config.label.toLowerCase()}
                  </span>
                  {entry.level > 0 && (
                    <span className="text-xs text-muted-foreground">
                      (nivel {entry.level})
                    </span>
                  )}
                </div>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDate(entry.createdAt)}
                </p>

                {entry.comments && (
                  <div className="mt-2 rounded-md border bg-muted/50 px-3 py-2">
                    <p className="text-sm text-foreground">{entry.comments}</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {maxEntries > 0 && allEntries.length > maxEntries && (
        <p className="text-center text-xs text-muted-foreground">
          Exibindo {maxEntries} de {allEntries.length} registros
        </p>
      )}
    </div>
  )
}

export type { ApprovalHistoryProps, ApprovalRequestData, HistoryEntry }
