'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import {
  PlusCircle,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  LogIn,
  ChevronDown,
  ChevronUp,
  History,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { getEntityAuditTrail } from '@/app/actions/audit-actions'
import { AuditDiffView } from '@/components/audit/audit-diff-view'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditUser {
  id: string
  name: string | null
  email: string
}

interface AuditLogEntry {
  id: string
  action: string
  entity: string | null
  entityId: string | null
  entityName: string | null
  oldData: string | null
  newData: string | null
  details: string | null
  userId: string | null
  user: AuditUser | null
  companyId: string | null
  createdAt: string | Date
}

interface EntityAuditTrailProps {
  entityType: string
  entityId: string
  /** Titulo customizado. Padrao: "Historico de Alteracoes" */
  title?: string
  /** Quantidade de registros por pagina. Padrao: 10 */
  pageSize?: number
  /** Classes CSS adicionais no Card wrapper */
  className?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: typeof PlusCircle; color: string; dot: string; badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  CREATE: {
    label: 'Criacao',
    icon: PlusCircle,
    color: 'text-green-600',
    dot: 'bg-green-500',
    badgeVariant: 'default',
  },
  UPDATE: {
    label: 'Atualizacao',
    icon: Pencil,
    color: 'text-blue-600',
    dot: 'bg-blue-500',
    badgeVariant: 'secondary',
  },
  DELETE: {
    label: 'Exclusao',
    icon: Trash2,
    color: 'text-red-600',
    dot: 'bg-red-500',
    badgeVariant: 'destructive',
  },
  APPROVE: {
    label: 'Aprovacao',
    icon: CheckCircle,
    color: 'text-green-600',
    dot: 'bg-green-500',
    badgeVariant: 'default',
  },
  REJECT: {
    label: 'Rejeicao',
    icon: XCircle,
    color: 'text-red-600',
    dot: 'bg-red-500',
    badgeVariant: 'destructive',
  },
  LOGIN: {
    label: 'Login',
    icon: LogIn,
    color: 'text-gray-500',
    dot: 'bg-gray-400',
    badgeVariant: 'outline',
  },
}

const DEFAULT_CONFIG = {
  label: 'Acao',
  icon: History,
  color: 'text-gray-500',
  dot: 'bg-gray-400',
  badgeVariant: 'outline' as const,
}

const PAGE_SIZE_DEFAULT = 10

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function TrailSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4 animate-pulse">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-muted" />
            <div className="w-0.5 flex-1 bg-muted mt-1" />
          </div>
          <div className="flex-1 space-y-2 pb-6">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Timeline item
// ---------------------------------------------------------------------------

function TrailItem({ log, isLast }: { log: AuditLogEntry; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false)

  const config = ACTION_CONFIG[log.action] ?? DEFAULT_CONFIG
  const Icon = config.icon

  const userName = log.user?.name ?? log.user?.email ?? 'Sistema'
  const initial = userName[0]?.toUpperCase() ?? '?'

  const createdAt = new Date(log.createdAt)
  const relativeTime = formatDistanceToNow(createdAt, { addSuffix: true, locale: ptBR })
  const absoluteTime = format(createdAt, "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })

  const hasDiff = log.oldData || log.newData

  return (
    <div className="flex gap-4">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-3 h-3 rounded-full border-2 border-background ring-2 shrink-0',
            config.dot
          )}
        />
        {!isLast && <div className="w-0.5 flex-1 bg-border mt-1" />}
      </div>

      {/* Content */}
      <div className={cn('flex-1', !isLast && 'pb-6')}>
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-primary/10 text-primary">
            {initial}
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{userName}</span>
              <Badge variant={config.badgeVariant} className="text-[10px] px-1.5 py-0">
                <Icon className={cn('h-3 w-3 mr-1', config.color)} />
                {config.label}
              </Badge>
            </div>

            {/* Timestamp */}
            <p className="text-xs text-muted-foreground mt-0.5" title={absoluteTime}>
              {relativeTime} &middot; {absoluteTime}
            </p>

            {/* Details (texto livre) */}
            {log.details && (
              <p className="text-sm text-muted-foreground mt-1 italic">
                {log.details}
              </p>
            )}

            {/* Expand / collapse diff */}
            {hasDiff && (
              <>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors"
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      Ocultar alteracoes
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      Ver alteracoes
                    </>
                  )}
                </button>

                {expanded && (
                  <div className="mt-2">
                    <AuditDiffView oldData={log.oldData} newData={log.newData} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function EntityAuditTrail({
  entityType,
  entityId,
  title = 'Historico de Alteracoes',
  pageSize = PAGE_SIZE_DEFAULT,
  className,
}: EntityAuditTrailProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasMore = logs.length < total

  const fetchLogs = useCallback(
    async (pageToFetch: number, append: boolean) => {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }
      setError(null)

      try {
        const result = await getEntityAuditTrail(entityType, entityId, {
          page: pageToFetch,
          pageSize,
        })

        if (result.success) {
          const newLogs = result.data.logs as unknown as AuditLogEntry[]
          setLogs((prev) => (append ? [...prev, ...newLogs] : newLogs))
          setTotal(result.data.total)
          setPage(pageToFetch)
        } else {
          setError(result.error)
        }
      } catch {
        setError('Erro ao carregar historico de auditoria.')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [entityType, entityId, pageSize]
  )

  // Carrega primeira pagina
  useEffect(() => {
    setLogs([])
    setPage(0)
    setTotal(0)
    fetchLogs(0, false)
  }, [fetchLogs])

  const handleLoadMore = () => {
    fetchLogs(page + 1, true)
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            {title}
          </CardTitle>
          {total > 0 && (
            <Badge variant="outline" className="text-xs">
              {total} {total === 1 ? 'registro' : 'registros'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4">
        {/* Loading state */}
        {loading && <TrailSkeleton />}

        {/* Error state */}
        {!loading && error && (
          <div className="text-center py-8">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs(0, false)}
              className="mt-2"
            >
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && logs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <History className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">Nenhum registro de auditoria</p>
            <p className="text-xs mt-1">
              Alteracoes nesta entidade serao registradas aqui.
            </p>
          </div>
        )}

        {/* Timeline */}
        {!loading && !error && logs.length > 0 && (
          <>
            <div className="relative">
              {logs.map((log, index) => (
                <TrailItem
                  key={log.id}
                  log={log}
                  isLast={index === logs.length - 1}
                />
              ))}
            </div>

            {/* Carregar mais */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="gap-2"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      Carregar mais ({total - logs.length} restante{total - logs.length !== 1 ? 's' : ''})
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
