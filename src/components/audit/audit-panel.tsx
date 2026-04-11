'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import {
  Search,
  PlusCircle,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  LogIn,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Shield,
  Globe,
  Monitor,
  Clock,
  Info,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  getAuditLogs,
  getAuditEntities,
  getAuditUsers,
} from '@/app/actions/audit-actions'

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
  reason: string | null
  email: string | null
  ipAddress: string | null
  userAgent: string | null
  userId: string | null
  user: AuditUser | null
  companyId: string | null
  createdAt: string | Date
}

type SeverityFilter = 'HIGH' | 'MEDIUM' | 'LOW'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTION_VERBS: Record<string, string> = {
  CREATE: 'criou',
  UPDATE: 'atualizou',
  DELETE: 'excluiu',
  APPROVE: 'aprovou',
  REJECT: 'rejeitou',
  LOGIN: 'fez login',
  LOGIN_SUCCESS: 'fez login',
  LOGIN_FAILED: 'tentou fazer login',
  LOGOUT: 'fez logout',
  BLOCK: 'bloqueou',
}

const ACTION_BADGE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  CREATE: { bg: 'bg-green-100 dark:bg-green-950/40', text: 'text-green-700 dark:text-green-400', label: 'Criação' },
  UPDATE: { bg: 'bg-blue-100 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-400', label: 'Atualização' },
  DELETE: { bg: 'bg-red-100 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-400', label: 'Exclusão' },
  APPROVE: { bg: 'bg-purple-100 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-400', label: 'Aprovação' },
  REJECT: { bg: 'bg-orange-100 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-400', label: 'Rejeição' },
  LOGIN: { bg: 'bg-gray-100 dark:bg-gray-800/40', text: 'text-gray-600 dark:text-gray-400', label: 'Login' },
  LOGIN_SUCCESS: { bg: 'bg-gray-100 dark:bg-gray-800/40', text: 'text-gray-600 dark:text-gray-400', label: 'Login' },
  LOGIN_FAILED: { bg: 'bg-red-100 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-400', label: 'Login falhou' },
  LOGOUT: { bg: 'bg-gray-100 dark:bg-gray-800/40', text: 'text-gray-600 dark:text-gray-400', label: 'Logout' },
  BLOCK: { bg: 'bg-red-100 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-400', label: 'Bloqueio' },
}

const ACTION_ICON_MAP: Record<string, { icon: typeof PlusCircle; color: string; dot: string }> = {
  CREATE: { icon: PlusCircle, color: 'text-green-600', dot: 'bg-green-500' },
  UPDATE: { icon: Pencil, color: 'text-blue-600', dot: 'bg-blue-500' },
  DELETE: { icon: Trash2, color: 'text-red-600', dot: 'bg-red-500' },
  APPROVE: { icon: CheckCircle, color: 'text-purple-600', dot: 'bg-purple-500' },
  REJECT: { icon: XCircle, color: 'text-orange-600', dot: 'bg-orange-500' },
  LOGIN: { icon: LogIn, color: 'text-gray-500', dot: 'bg-gray-400' },
  LOGIN_SUCCESS: { icon: LogIn, color: 'text-gray-500', dot: 'bg-gray-400' },
  LOGIN_FAILED: { icon: XCircle, color: 'text-red-500', dot: 'bg-red-400' },
  LOGOUT: { icon: LogIn, color: 'text-gray-500', dot: 'bg-gray-400' },
  BLOCK: { icon: XCircle, color: 'text-red-600', dot: 'bg-red-500' },
}

const ENTITY_LABELS: Record<string, string> = {
  Client: 'Cliente',
  Project: 'Projeto',
  Contract: 'Contrato',
  Employee: 'Funcionário',
  Bulletin: 'Boletim',
  Measurement: 'Medição',
  Equipment: 'Equipamento',
  Supplier: 'Fornecedor',
  Contractor: 'Empreiteiro',
  CostCenter: 'Centro de Custo',
  Task: 'Tarefa',
  Schedule: 'Cronograma',
  Document: 'Documento',
  User: 'Usuário',
  Company: 'Empresa',
  Budget: 'Orçamento',
  Invoice: 'Fatura',
  Purchase: 'Compra',
  Inventory: 'Estoque',
  Training: 'Treinamento',
  SafetyIncident: 'Incidente de Segurança',
  QualityInspection: 'Inspeção de Qualidade',
  FiscalNote: 'Nota Fiscal',
  Rental: 'Locação',
  Timesheet: 'Ponto',
  Vacation: 'Férias',
}

const SEVERITY_TO_ACTIONS: Record<SeverityFilter, string[]> = {
  HIGH: ['DELETE', 'REJECT', 'BLOCK', 'LOGIN_FAILED'],
  MEDIUM: ['UPDATE', 'APPROVE'],
  LOW: ['CREATE', 'LOGIN', 'LOGIN_SUCCESS', 'LOGOUT'],
}

const PAGE_SIZE = 25

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeParseJSON(str: string | null): Record<string, unknown> | null {
  if (!str) return null
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '\u2014'
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function getEntityLabel(entity: string | null): string {
  if (!entity) return 'Sistema'
  return ENTITY_LABELS[entity] ?? entity
}

function getActionBadgeStyle(action: string) {
  return ACTION_BADGE_STYLES[action] ?? {
    bg: 'bg-gray-100 dark:bg-gray-800/40',
    text: 'text-gray-600 dark:text-gray-400',
    label: action,
  }
}

function parseUserAgent(ua: string | null): string {
  if (!ua) return ''
  // Extract browser name from UA string
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome'
  if (ua.includes('Edg')) return 'Edge'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
  return 'Navegador'
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 animate-pulse">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-muted" />
            <div className="w-0.5 flex-1 bg-muted mt-1" />
          </div>
          <div className="flex-1 space-y-2 pb-6">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="h-3 bg-muted rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ActionBadge({ action }: { action: string }) {
  const style = getActionBadgeStyle(action)
  const iconMeta = ACTION_ICON_MAP[action]
  const Icon = iconMeta?.icon

  return (
    <Badge
      variant="outline"
      className={cn(
        'border-0 gap-1 font-medium text-[11px] px-2 py-0.5',
        style.bg,
        style.text
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {style.label}
    </Badge>
  )
}

function DiffView({ oldData, newData }: { oldData: string | null; newData: string | null }) {
  const oldObj = safeParseJSON(oldData)
  const newObj = safeParseJSON(newData)

  if (!oldObj && !newObj) {
    return (
      <p className="text-sm text-muted-foreground italic py-2">
        Nenhum dado de alteração disponível.
      </p>
    )
  }

  const allKeys = Array.from(
    new Set([...Object.keys(oldObj ?? {}), ...Object.keys(newObj ?? {})])
  )

  // Filter out unchanged fields if both exist
  const changedKeys = oldObj && newObj
    ? allKeys.filter((key) => {
        const oldVal = formatFieldValue(oldObj[key])
        const newVal = formatFieldValue(newObj[key])
        return oldVal !== newVal || !(key in oldObj) || !(key in newObj)
      })
    : allKeys

  const keysToShow = changedKeys.length > 0 ? changedKeys : allKeys

  return (
    <div className="grid grid-cols-2 gap-4 mt-3">
      {/* ANTES */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Antes
        </p>
        <div className="rounded-md border text-sm divide-y">
          {oldObj ? (
            keysToShow.map((key) => {
              const oldVal = oldObj[key]
              const newVal = newObj?.[key]
              const removed = newObj !== null && !(key in (newObj ?? {}))
              const modified = newObj !== null && key in (newObj ?? {}) && formatFieldValue(oldVal) !== formatFieldValue(newVal)
              const added = !(key in oldObj)

              if (added) {
                return (
                  <div key={key} className="px-3 py-1.5 text-muted-foreground/40">
                    <span className="font-medium">{key}:</span> {'\u2014'}
                  </div>
                )
              }

              return (
                <div
                  key={key}
                  className={cn(
                    'px-3 py-1.5',
                    removed && 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 line-through',
                    modified && 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400',
                    !removed && !modified && 'text-muted-foreground'
                  )}
                >
                  <span className="font-medium">{key}:</span>{' '}
                  {formatFieldValue(oldVal)}
                </div>
              )
            })
          ) : (
            <div className="px-3 py-2 text-muted-foreground italic">Sem dados anteriores</div>
          )}
        </div>
      </div>

      {/* DEPOIS */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Depois
        </p>
        <div className="rounded-md border text-sm divide-y">
          {newObj ? (
            keysToShow.map((key) => {
              const oldVal = oldObj?.[key]
              const newVal = newObj[key]
              const added = oldObj !== null && !(key in (oldObj ?? {}))
              const modified = oldObj !== null && key in (oldObj ?? {}) && formatFieldValue(oldVal) !== formatFieldValue(newVal)
              const removed = !(key in newObj)

              if (removed) {
                return (
                  <div key={key} className="px-3 py-1.5 text-muted-foreground/40">
                    <span className="font-medium">{key}:</span> {'\u2014'}
                  </div>
                )
              }

              return (
                <div
                  key={key}
                  className={cn(
                    'px-3 py-1.5',
                    added && 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400',
                    modified && 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400',
                    !added && !modified && 'text-muted-foreground'
                  )}
                >
                  <span className="font-medium">{key}:</span>{' '}
                  {modified ? (
                    <>
                      <span className="line-through opacity-60">{formatFieldValue(oldVal)}</span>
                      {' \u2192 '}
                      {formatFieldValue(newVal)}
                    </>
                  ) : (
                    formatFieldValue(newVal)
                  )}
                </div>
              )
            })
          ) : (
            <div className="px-3 py-2 text-muted-foreground italic">Sem dados posteriores</div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetadataRow({ icon: Icon, label, value }: { icon: typeof Globe; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="h-3 w-3 shrink-0" />
      <span className="font-medium">{label}:</span>
      <span className="truncate">{value}</span>
    </div>
  )
}

function TimelineItem({ log }: { log: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false)

  const actionMeta = ACTION_ICON_MAP[log.action] ?? ACTION_ICON_MAP.LOGIN!
  const userName = log.user?.name ?? log.user?.email ?? log.email ?? 'Sistema'
  const initial = (userName ?? '?')[0]!.toUpperCase()
  const verb = ACTION_VERBS[log.action] ?? log.action.toLowerCase()
  const entityLabel = log.entityName
    ? `${getEntityLabel(log.entity)} "${log.entityName}"`
    : log.entityId
    ? `${getEntityLabel(log.entity)} #${log.entityId.slice(0, 8)}`
    : log.entity
    ? getEntityLabel(log.entity)
    : ''

  const hasDiff = log.oldData || log.newData
  const hasMetadata = log.details || log.ipAddress || log.userAgent || log.reason
  const hasExpandableContent = hasDiff || hasMetadata

  const createdAt = new Date(log.createdAt)

  return (
    <div className="flex gap-4">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-3 h-3 rounded-full border-2 border-background ring-2 shrink-0',
            actionMeta!.dot
          )}
          style={{ outlineColor: 'var(--background)' }}
        />
        <div className="w-0.5 flex-1 bg-border mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-8 -mt-0.5">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
              'bg-primary/10 text-primary'
            )}
          >
            {initial}
          </div>

          <div className="flex-1 min-w-0">
            {/* Header line */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{userName}</span>
              <ActionBadge action={log.action} />
              {entityLabel && (
                <span className="text-sm text-muted-foreground">
                  {verb}{' '}
                  <span className="font-medium text-foreground">{entityLabel}</span>
                </span>
              )}
            </div>

            {/* Details text */}
            {log.details && (
              <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                <FileText className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{log.details}</span>
              </p>
            )}

            {/* Timestamp */}
            <div className="flex items-center gap-3 mt-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(createdAt, "dd/MM/yyyy '\u00e0s' HH:mm", { locale: ptBR })}
                <span className="text-muted-foreground/60">
                  ({formatDistanceToNow(createdAt, {
                    addSuffix: true,
                    locale: ptBR,
                  })})
                </span>
              </p>
              {log.entity && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                  {getEntityLabel(log.entity)}
                </Badge>
              )}
            </div>

            {/* Expand button */}
            {hasExpandableContent && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Ocultar detalhes
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Ver detalhes
                    {hasDiff && ' e alterações'}
                  </>
                )}
              </button>
            )}

            {/* Expanded content */}
            {expanded && hasExpandableContent && (
              <div className="mt-3 space-y-3">
                {/* Metadata section */}
                {hasMetadata && (
                  <div className="rounded-md border bg-muted/30 p-3 space-y-1.5">
                    {log.reason && (
                      <MetadataRow icon={Info} label="Motivo" value={log.reason} />
                    )}
                    {log.ipAddress && (
                      <MetadataRow icon={Globe} label="IP" value={log.ipAddress} />
                    )}
                    {log.userAgent && (
                      <MetadataRow
                        icon={Monitor}
                        label="Navegador"
                        value={parseUserAgent(log.userAgent)}
                      />
                    )}
                  </div>
                )}

                {/* Diff view */}
                {hasDiff && (
                  <DiffView oldData={log.oldData} newData={log.newData} />
                )}
              </div>
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

export function AuditPanel({ companyId }: { companyId: string }) {
  // Filter state
  const [search, setSearch] = useState('')
  const [entity, setEntity] = useState('')
  const [action, setAction] = useState('')
  const [userId, setUserId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [severityFilters, setSeverityFilters] = useState<Set<SeverityFilter>>(new Set())
  const [page, setPage] = useState(0)

  // Data state
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [entities, setEntities] = useState<string[]>([])
  const [users, setUsers] = useState<{ id: string; name: string | null; email: string }[]>([])

  // Debounce ref
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search input
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 400)
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [search])

  // Load filter options
  useEffect(() => {
    async function loadOptions() {
      const [entitiesRes, usersRes] = await Promise.all([
        getAuditEntities(companyId),
        getAuditUsers(companyId),
      ])
      if (entitiesRes.success) setEntities(entitiesRes.data)
      if (usersRes.success) setUsers(usersRes.data)
    }
    loadOptions()
  }, [companyId])

  // Compute effective action filter from severity + action dropdown
  const getEffectiveActionFilter = useCallback(() => {
    if (action) return action
    if (severityFilters.size > 0) {
      return undefined
    }
    return undefined
  }, [action, severityFilters])

  // Load audit logs
  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getAuditLogs({
        companyId,
        search: debouncedSearch || undefined,
        entity: entity || undefined,
        action: getEffectiveActionFilter(),
        userId: userId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        pageSize: PAGE_SIZE,
      })

      if (result.success) {
        let filteredLogs = result.data.logs as unknown as AuditLogEntry[]
        let filteredTotal = result.data.total

        // Client-side severity filtering if no specific action selected
        if (severityFilters.size > 0 && !action) {
          const allowedActions = new Set(
            Array.from(severityFilters).flatMap((s) => SEVERITY_TO_ACTIONS[s])
          )
          filteredLogs = filteredLogs.filter((l) => allowedActions.has(l.action))
          filteredTotal = filteredLogs.length
        }

        setLogs(filteredLogs)
        setTotal(filteredTotal)
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [companyId, debouncedSearch, entity, action, userId, startDate, endDate, page, severityFilters, getEffectiveActionFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Handlers
  const toggleSeverity = (sev: SeverityFilter) => {
    setSeverityFilters((prev) => {
      const next = new Set(prev)
      if (next.has(sev)) next.delete(sev)
      else next.add(sev)
      return next
    })
    setPage(0)
  }

  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setEntity('')
    setAction('')
    setUserId('')
    setStartDate('')
    setEndDate('')
    setSeverityFilters(new Set())
    setPage(0)
  }

  const hasFilters =
    search || entity || action || userId || startDate || endDate || severityFilters.size > 0

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Count of active filters for the badge
  const activeFilterCount = [
    entity, action, userId, startDate, endDate,
  ].filter(Boolean).length + severityFilters.size + (search ? 1 : 0)

  return (
    <div className="flex gap-6">
      {/* ========== LEFT PANEL -- Filters ========== */}
      <Card className="w-72 shrink-0 h-fit sticky top-6">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Filter className="h-4 w-4" />
              Filtros
            </div>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {activeFilterCount} {activeFilterCount === 1 ? 'ativo' : 'ativos'}
              </Badge>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nas alterações..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Entity */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Entidade</label>
            <Select value={entity} onValueChange={(v) => { setEntity(v === '__all__' ? '' : v); setPage(0) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {entities.map((e) => (
                  <SelectItem key={e} value={e}>
                    {getEntityLabel(e)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Ação</label>
            <Select value={action} onValueChange={(v) => { setAction(v === '__all__' ? '' : v); setPage(0) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                <SelectItem value="CREATE">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Criação
                  </span>
                </SelectItem>
                <SelectItem value="UPDATE">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Atualização
                  </span>
                </SelectItem>
                <SelectItem value="DELETE">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Exclusão
                  </span>
                </SelectItem>
                <SelectItem value="APPROVE">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    Aprovação
                  </span>
                </SelectItem>
                <SelectItem value="REJECT">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    Rejeição
                  </span>
                </SelectItem>
                <SelectItem value="LOGIN">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    Login
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Usuário</label>
            <Select value={userId} onValueChange={(v) => { setUserId(v === '__all__' ? '' : v); setPage(0) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                        {(u.name ?? u.email)[0]?.toUpperCase()}
                      </span>
                      {u.name ?? u.email}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date range */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Período</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-muted-foreground">De</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(0) }}
                  className="text-xs"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">Até</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(0) }}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {/* Severity */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Severidade</label>
            <div className="flex gap-1.5">
              <Button
                variant={severityFilters.has('HIGH') ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleSeverity('HIGH')}
                className={cn(
                  'flex-1 text-xs h-7',
                  severityFilters.has('HIGH') &&
                    'bg-red-600 hover:bg-red-700 text-white border-red-600'
                )}
              >
                Alta
              </Button>
              <Button
                variant={severityFilters.has('MEDIUM') ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleSeverity('MEDIUM')}
                className={cn(
                  'flex-1 text-xs h-7',
                  severityFilters.has('MEDIUM') &&
                    'bg-amber-500 hover:bg-amber-600 text-white border-amber-500'
                )}
              >
                Média
              </Button>
              <Button
                variant={severityFilters.has('LOW') ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleSeverity('LOW')}
                className={cn(
                  'flex-1 text-xs h-7',
                  severityFilters.has('LOW') &&
                    'bg-green-600 hover:bg-green-700 text-white border-green-600'
                )}
              >
                Baixa
              </Button>
            </div>
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="w-full text-xs gap-1.5"
            >
              <X className="h-3 w-3" />
              Limpar filtros
            </Button>
          )}

          {/* Counter */}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground text-center">
              <span className="font-semibold text-foreground">{total}</span>{' '}
              {total === 1 ? 'registro encontrado' : 'registros encontrados'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ========== RIGHT PANEL -- Timeline ========== */}
      <div className="flex-1 min-w-0">
        {loading ? (
          <LoadingSkeleton />
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Shield className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhum registro encontrado</p>
            <p className="text-sm mt-1">
              {hasFilters
                ? 'Tente ajustar os filtros para encontrar registros.'
                : 'Os registros aparecerão conforme ações forem realizadas no sistema.'}
            </p>
          </div>
        ) : (
          <>
            {/* Timeline */}
            <div className="relative">
              {logs.map((log) => (
                <TimelineItem key={log.id} log={log} />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>

              <div className="flex items-center gap-2">
                {/* Page number buttons */}
                {totalPages <= 7 ? (
                  Array.from({ length: totalPages }).map((_, i) => (
                    <Button
                      key={i}
                      variant={page === i ? 'default' : 'ghost'}
                      size="sm"
                      className="h-8 w-8 p-0 text-xs"
                      onClick={() => setPage(i)}
                    >
                      {i + 1}
                    </Button>
                  ))
                ) : (
                  <>
                    {/* First page */}
                    <Button
                      variant={page === 0 ? 'default' : 'ghost'}
                      size="sm"
                      className="h-8 w-8 p-0 text-xs"
                      onClick={() => setPage(0)}
                    >
                      1
                    </Button>

                    {page > 2 && (
                      <span className="text-muted-foreground text-xs px-1">...</span>
                    )}

                    {/* Pages around current */}
                    {Array.from({ length: 3 }).map((_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 2, page)) - 1 + i
                      if (pageNum <= 0 || pageNum >= totalPages - 1) return null
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? 'default' : 'ghost'}
                          size="sm"
                          className="h-8 w-8 p-0 text-xs"
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum + 1}
                        </Button>
                      )
                    })}

                    {page < totalPages - 3 && (
                      <span className="text-muted-foreground text-xs px-1">...</span>
                    )}

                    {/* Last page */}
                    <Button
                      variant={page === totalPages - 1 ? 'default' : 'ghost'}
                      size="sm"
                      className="h-8 w-8 p-0 text-xs"
                      onClick={() => setPage(totalPages - 1)}
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="gap-1"
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
