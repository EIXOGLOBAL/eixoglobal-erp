'use client'

import { useState, useMemo, useCallback } from "react"
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  ExternalLink,
  Eye,
  Info,
  AlertTriangle,
  AlertCircle,
  ClipboardList,
  MessageSquare,
  Clock,
  FileText,
  FileCheck2,
  FileX2,
  ScrollText,
  Wrench,
  ShoppingCart,
  Megaphone,
  Package,
  Palmtree,
  Ban,
  Bot,
  Sparkles,
  CheckCircle2,
  BellOff,
  Calendar,
  MailOpen,
  Inbox,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import {
  markAsRead,
  markAllAsRead,
  deleteNotification,
  markNotificationsAsRead,
} from "@/app/actions/notification-actions"
import { formatDateTime } from "@/lib/formatters"

// ── Type icon map ──────────────────────────────────────────────────────────

const TYPE_ICON_MAP: Record<string, React.ElementType> = {
  TASK_ASSIGNED: ClipboardList,
  TASK_COMMENT: MessageSquare,
  TASK_DUE: Clock,
  BULLETIN_SUBMITTED: FileText,
  BULLETIN_APPROVED: FileCheck2,
  BULLETIN_REJECTED: FileX2,
  CONTRACT_EXPIRING: ScrollText,
  EQUIPMENT_MAINTENANCE: Wrench,
  PURCHASE_APPROVED: ShoppingCart,
  ANNOUNCEMENT: Megaphone,
  LOW_STOCK: Package,
  VACATION_APPROVED: Palmtree,
  VACATION_REJECTED: Ban,
  INFO: Info,
  SUCCESS: CheckCircle2,
  WARNING: AlertTriangle,
  ERROR: AlertCircle,
  SYSTEM: Bell,
  ALERT: AlertCircle,
  AI_SUGGESTION: Sparkles,
  AI_ANALYSIS: Bot,
  AI_ALERT: Bot,
  AI_INSIGHT: Sparkles,
  AI_REPORT: Bot,
}

const TYPE_COLOR_MAP: Record<string, string> = {
  TASK_ASSIGNED: "text-blue-600 bg-blue-100 dark:bg-blue-950/40",
  TASK_COMMENT: "text-purple-600 bg-purple-100 dark:bg-purple-950/40",
  TASK_DUE: "text-orange-600 bg-orange-100 dark:bg-orange-950/40",
  BULLETIN_SUBMITTED: "text-sky-600 bg-sky-100 dark:bg-sky-950/40",
  BULLETIN_APPROVED: "text-green-600 bg-green-100 dark:bg-green-950/40",
  BULLETIN_REJECTED: "text-red-600 bg-red-100 dark:bg-red-950/40",
  CONTRACT_EXPIRING: "text-amber-600 bg-amber-100 dark:bg-amber-950/40",
  EQUIPMENT_MAINTENANCE: "text-slate-600 bg-slate-100 dark:bg-slate-950/40",
  PURCHASE_APPROVED: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40",
  ANNOUNCEMENT: "text-indigo-600 bg-indigo-100 dark:bg-indigo-950/40",
  LOW_STOCK: "text-yellow-600 bg-yellow-100 dark:bg-yellow-950/40",
  VACATION_APPROVED: "text-teal-600 bg-teal-100 dark:bg-teal-950/40",
  VACATION_REJECTED: "text-rose-600 bg-rose-100 dark:bg-rose-950/40",
  INFO: "text-blue-600 bg-blue-100 dark:bg-blue-950/40",
  SUCCESS: "text-green-600 bg-green-100 dark:bg-green-950/40",
  WARNING: "text-amber-600 bg-amber-100 dark:bg-amber-950/40",
  ERROR: "text-red-600 bg-red-100 dark:bg-red-950/40",
  SYSTEM: "text-gray-600 bg-gray-100 dark:bg-gray-950/40",
  ALERT: "text-red-600 bg-red-100 dark:bg-red-950/40",
  AI_SUGGESTION: "text-violet-600 bg-violet-100 dark:bg-violet-950/40",
  AI_ANALYSIS: "text-violet-600 bg-violet-100 dark:bg-violet-950/40",
  AI_ALERT: "text-violet-600 bg-violet-100 dark:bg-violet-950/40",
  AI_INSIGHT: "text-violet-600 bg-violet-100 dark:bg-violet-950/40",
  AI_REPORT: "text-violet-600 bg-violet-100 dark:bg-violet-950/40",
}

// Badge color for high-level types
const TYPE_BADGE_VARIANTS: Record<string, string> = {
  SYSTEM: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700",
  ALERT: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  ERROR: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  WARNING: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  INFO: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
}

const TYPE_LABELS: Record<string, string> = {
  TASK_ASSIGNED: "Tarefa",
  TASK_COMMENT: "Comentario",
  TASK_DUE: "Prazo",
  BULLETIN_SUBMITTED: "Boletim",
  BULLETIN_APPROVED: "Boletim Aprovado",
  BULLETIN_REJECTED: "Boletim Recusado",
  CONTRACT_EXPIRING: "Contrato",
  EQUIPMENT_MAINTENANCE: "Equipamento",
  PURCHASE_APPROVED: "Compra",
  ANNOUNCEMENT: "Comunicado",
  LOW_STOCK: "Estoque Baixo",
  VACATION_APPROVED: "Ferias Aprovadas",
  VACATION_REJECTED: "Ferias Rejeitadas",
  INFO: "Informacao",
  SUCCESS: "Sucesso",
  WARNING: "Aviso",
  ERROR: "Erro",
  SYSTEM: "Sistema",
  ALERT: "Alerta",
  AI_SUGGESTION: "IA",
  AI_ANALYSIS: "IA",
  AI_ALERT: "IA",
  AI_INSIGHT: "IA",
  AI_REPORT: "IA",
}

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return "agora"
  if (diff < 3600) return `${Math.floor(diff / 60)} min atras`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atras`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d atras`
  return formatDateTime(d)
}

function getDateGroup(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()

  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)

  const startOfWeek = new Date(now)
  const dayOfWeek = startOfWeek.getDay()
  const diffDays = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  startOfWeek.setDate(startOfWeek.getDate() - diffDays)
  startOfWeek.setHours(0, 0, 0, 0)

  if (d >= startOfToday) return "Hoje"
  if (d >= startOfYesterday) return "Ontem"
  if (d >= startOfWeek) return "Esta Semana"
  return "Mais Antigas"
}

function getNotificationIcon(type: string) {
  return TYPE_ICON_MAP[type] ?? Bell
}

function getNotificationColor(type: string) {
  return TYPE_COLOR_MAP[type] ?? "text-gray-600 bg-gray-100 dark:bg-gray-950/40"
}

function getTypeBadgeClass(type: string) {
  return TYPE_BADGE_VARIANTS[type] ?? "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700"
}

// ── Types ──────────────────────────────────────────────────────────────────

type Notification = {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: Date
}

type StatusFilter = "all" | "unread" | "read"
type PeriodFilter = "all" | "today" | "week" | "month"
type TypeFilter = "all" | "SYSTEM" | "ALERT" | "INFO" | "WARNING" | "ERROR"

interface NotificationStats {
  total: number
  unread: number
  today: number
  thisWeek: number
}

const PAGE_SIZE = 20

// ── Type filter matching ───────────────────────────────────────────────────

const TYPE_FILTER_GROUPS: Record<string, string[]> = {
  SYSTEM: [
    "SYSTEM", "TASK_ASSIGNED", "TASK_COMMENT", "TASK_DUE",
    "BULLETIN_SUBMITTED", "BULLETIN_APPROVED", "BULLETIN_REJECTED",
    "CONTRACT_EXPIRING", "EQUIPMENT_MAINTENANCE", "PURCHASE_APPROVED",
    "ANNOUNCEMENT", "LOW_STOCK", "VACATION_APPROVED", "VACATION_REJECTED",
    "SUCCESS", "AI_SUGGESTION", "AI_ANALYSIS", "AI_ALERT", "AI_INSIGHT", "AI_REPORT",
  ],
  ALERT: ["ALERT"],
  INFO: ["INFO"],
  WARNING: ["WARNING"],
  ERROR: ["ERROR"],
}

function matchesTypeFilter(notifType: string, filter: TypeFilter): boolean {
  if (filter === "all") return true
  const group = TYPE_FILTER_GROUPS[filter]
  return group ? group.includes(notifType) : notifType === filter
}

// ── Component ──────────────────────────────────────────────────────────────

interface NotificationsClientProps {
  initialNotifications: Notification[]
  initialStats: NotificationStats
}

export function NotificationsClient({ initialNotifications, initialStats }: NotificationsClientProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [stats, setStats] = useState<NotificationStats>(initialStats)

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)

  // Detail dialog
  const [detailNotification, setDetailNotification] = useState<Notification | null>(null)

  // Derived values
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications])

  // Recalculate stats from client state
  const liveStats = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    const startOfWeek = new Date(now)
    const dayOfWeek = startOfWeek.getDay()
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    startOfWeek.setDate(startOfWeek.getDate() - diff)
    startOfWeek.setHours(0, 0, 0, 0)

    return {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      today: notifications.filter(n => new Date(n.createdAt) >= startOfToday).length,
      thisWeek: notifications.filter(n => new Date(n.createdAt) >= startOfWeek).length,
    }
  }, [notifications])

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    const startOfWeek = new Date(now)
    const dayOfWeek = startOfWeek.getDay()
    const diffDays = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    startOfWeek.setDate(startOfWeek.getDate() - diffDays)
    startOfWeek.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    return notifications.filter(n => {
      // Status filter
      if (statusFilter === "unread" && n.read) return false
      if (statusFilter === "read" && !n.read) return false

      // Type filter
      if (!matchesTypeFilter(n.type, typeFilter)) return false

      // Period filter
      if (periodFilter !== "all") {
        const createdAt = new Date(n.createdAt)
        if (periodFilter === "today" && createdAt < startOfToday) return false
        if (periodFilter === "week" && createdAt < startOfWeek) return false
        if (periodFilter === "month" && createdAt < startOfMonth) return false
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesTitle = n.title.toLowerCase().includes(q)
        const matchesMessage = n.message.toLowerCase().includes(q)
        const matchesType = (TYPE_LABELS[n.type] ?? n.type).toLowerCase().includes(q)
        if (!matchesTitle && !matchesMessage && !matchesType) return false
      }

      return true
    })
  }, [notifications, statusFilter, periodFilter, typeFilter, searchQuery])

  // Group by date
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, Notification[]> = {}
    const order = ["Hoje", "Ontem", "Esta Semana", "Mais Antigas"]
    for (const n of filteredNotifications) {
      const group = getDateGroup(n.createdAt)
      if (!groups[group]) groups[group] = []
      groups[group]!.push(n)
    }
    return order
      .filter(g => groups[g] && groups[g]!.length > 0)
      .map(g => ({ label: g, notifications: groups[g]! }))
  }, [filteredNotifications])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages - 1)
  const paginatedNotifications = filteredNotifications.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  // Group paginated notifications
  const paginatedGroups = useMemo(() => {
    const groups: Record<string, Notification[]> = {}
    const order = ["Hoje", "Ontem", "Esta Semana", "Mais Antigas"]
    for (const n of paginatedNotifications) {
      const group = getDateGroup(n.createdAt)
      if (!groups[group]) groups[group] = []
      groups[group]!.push(n)
    }
    return order
      .filter(g => groups[g] && groups[g]!.length > 0)
      .map(g => ({ label: g, notifications: groups[g]! }))
  }, [paginatedNotifications])

  // Reset page on filter changes
  const resetPage = useCallback(() => {
    setPage(0)
    setSelectedIds(new Set())
  }, [])

  // Selection helpers
  const allPageSelected = paginatedNotifications.length > 0 && paginatedNotifications.every(n => selectedIds.has(n.id))
  const someSelected = selectedIds.size > 0

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (allPageSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        paginatedNotifications.forEach(n => next.delete(n.id))
        return next
      })
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        paginatedNotifications.forEach(n => next.add(n.id))
        return next
      })
    }
  }

  // Actions
  async function handleMarkRead(id: string) {
    await markAsRead(id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function handleMarkAllRead() {
    await markAllAsRead()
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function handleDelete(id: string) {
    await deleteNotification(id)
    setNotifications(prev => prev.filter(n => n.id !== id))
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    if (detailNotification?.id === id) setDetailNotification(null)
  }

  async function handleBulkMarkRead() {
    const ids = Array.from(selectedIds)
    await markNotificationsAsRead(ids)
    setNotifications(prev => prev.map(n => selectedIds.has(n.id) ? { ...n, read: true } : n))
    setSelectedIds(new Set())
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds)
    await Promise.all(ids.map(id => deleteNotification(id)))
    setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)))
    setSelectedIds(new Set())
  }

  function handleClick(notification: Notification) {
    if (!notification.read) handleMarkRead(notification.id)
    setDetailNotification(notification)
  }

  function handleGoToResource(notification: Notification) {
    if (notification.link) {
      router.push(notification.link)
    }
  }

  const selectedUnreadCount = Array.from(selectedIds).filter(id => {
    const n = notifications.find(notif => notif.id === id)
    return n && !n.read
  }).length

  const hasActiveFilters = statusFilter !== "all" || periodFilter !== "all" || typeFilter !== "all" || searchQuery.trim() !== ""

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
              <Inbox className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{liveStats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-950/40 flex items-center justify-center shrink-0">
              <MailOpen className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{liveStats.unread}</p>
              <p className="text-xs text-muted-foreground">Nao Lidas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-950/40 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{liveStats.today}</p>
              <p className="text-xs text-muted-foreground">Hoje</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center shrink-0">
              <Bell className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{liveStats.thisWeek}</p>
              <p className="text-xs text-muted-foreground">Esta Semana</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {/* Search */}
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar notificacoes..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); resetPage() }}
                className="pl-9 h-9"
              />
            </div>

            {/* Type filter */}
            <Select
              value={typeFilter}
              onValueChange={(v: TypeFilter) => { setTypeFilter(v); resetPage() }}
            >
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="SYSTEM">Sistema</SelectItem>
                <SelectItem value="ALERT">Alerta</SelectItem>
                <SelectItem value="INFO">Informacao</SelectItem>
                <SelectItem value="WARNING">Aviso</SelectItem>
                <SelectItem value="ERROR">Erro</SelectItem>
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select
              value={statusFilter}
              onValueChange={(v: StatusFilter) => { setStatusFilter(v); resetPage() }}
            >
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="unread">Nao Lidas</SelectItem>
                <SelectItem value="read">Lidas</SelectItem>
              </SelectContent>
            </Select>

            {/* Period filter */}
            <Select
              value={periodFilter}
              onValueChange={(v: PeriodFilter) => { setPeriodFilter(v); resetPage() }}
            >
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="month">Este Mes</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs"
                onClick={() => {
                  setStatusFilter("all")
                  setPeriodFilter("all")
                  setTypeFilter("all")
                  setSearchQuery("")
                  resetPage()
                }}
              >
                Limpar Filtros
              </Button>
            )}
          </div>

          {/* Mark all as read */}
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={handleMarkAllRead}>
              <CheckCheck className="h-4 w-4 mr-1.5" />
              Marcar Todas como Lidas
            </Button>
          )}
        </div>

        {/* Active filter summary */}
        {hasActiveFilters && (
          <p className="text-xs text-muted-foreground">
            {filteredNotifications.length} resultado{filteredNotifications.length !== 1 ? "s" : ""} encontrado{filteredNotifications.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">
            {selectedIds.size} selecionada{selectedIds.size !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {selectedUnreadCount > 0 && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleBulkMarkRead}>
                <Check className="h-3 w-3 mr-1" />
                Marcar como lidas
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={handleBulkDelete}>
              <Trash2 className="h-3 w-3 mr-1" />
              Excluir selecionadas
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>
              Limpar selecao
            </Button>
          </div>
        </div>
      )}

      {/* Notification list grouped by date */}
      <div className="space-y-4">
        {/* Empty state */}
        {filteredNotifications.length === 0 && (
          <div className="rounded-lg border bg-card">
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <BellOff className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <p className="text-base font-medium text-muted-foreground">
                {hasActiveFilters
                  ? "Nenhuma notificacao encontrada com os filtros atuais"
                  : "Nenhuma notificacao"}
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1.5 max-w-sm">
                {hasActiveFilters
                  ? "Tente ajustar os filtros ou limpar a busca para ver mais resultados"
                  : "As notificacoes aparecerao aqui quando houver atualizacoes no sistema"}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setStatusFilter("all")
                    setPeriodFilter("all")
                    setTypeFilter("all")
                    setSearchQuery("")
                    resetPage()
                  }}
                >
                  Limpar Todos os Filtros
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Grouped notifications */}
        {paginatedGroups.map(group => (
          <div key={group.label} className="space-y-0">
            {/* Group header */}
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground">{group.label}</h3>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                {group.notifications.length}
              </Badge>
              <div className="flex-1 border-t" />
            </div>

            {/* Notification cards */}
            <div className="rounded-lg border bg-card overflow-hidden">
              {/* Select all header */}
              <div className="flex items-center gap-3 px-6 py-2 border-b bg-muted/30">
                <Checkbox
                  checked={allPageSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Selecionar todas da pagina"
                />
                <span className="text-xs text-muted-foreground">
                  {allPageSelected ? "Desmarcar todas" : "Selecionar todas"}
                </span>
              </div>

              {group.notifications.map((n, index) => {
                const IconComponent = getNotificationIcon(n.type)
                const colorClass = getNotificationColor(n.type)
                const badgeClass = getTypeBadgeClass(n.type)

                return (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-4 px-6 py-4 transition-colors",
                      index !== 0 && "border-t",
                      !n.read && "bg-blue-50/40 dark:bg-blue-950/10",
                      selectedIds.has(n.id) && "bg-primary/5"
                    )}
                  >
                    {/* Checkbox */}
                    <div className="flex items-center shrink-0 pt-1" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(n.id)}
                        onCheckedChange={() => toggleSelect(n.id)}
                        aria-label={`Selecionar "${n.title}"`}
                      />
                    </div>

                    {/* Type icon */}
                    <div
                      className={cn(
                        "shrink-0 h-9 w-9 rounded-full flex items-center justify-center mt-0.5 cursor-pointer",
                        colorClass
                      )}
                      onClick={() => handleClick(n)}
                    >
                      <IconComponent className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleClick(n)}>
                      <div className="flex items-start justify-between gap-4 mb-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          {!n.read && (
                            <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                          )}
                          <span className={cn("text-sm font-semibold", !n.read ? "text-foreground" : "text-foreground/80")}>
                            {n.title}
                          </span>
                          <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5 border", badgeClass)}>
                            {TYPE_LABELS[n.type] ?? n.type}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{n.message}</p>
                    </div>

                    {/* Individual actions */}
                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={e => e.stopPropagation()}
                    >
                      {/* View detail */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Ver detalhes"
                        onClick={() => handleClick(n)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {/* Go to resource */}
                      {n.link && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                          title="Ir para o recurso"
                          onClick={() => handleGoToResource(n)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Mark as read */}
                      {!n.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-green-600"
                          title="Marcar como lida"
                          onClick={() => handleMarkRead(n.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Remover notificacao"
                        onClick={() => handleDelete(n.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Pagina {currentPage + 1} de {totalPages}
            {" -- "}
            {filteredNotifications.length} notificacao{filteredNotifications.length !== 1 ? "es" : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={currentPage === 0}
              onClick={() => { setPage(p => p - 1); setSelectedIds(new Set()) }}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i
                } else if (currentPage < 3) {
                  pageNum = i
                } else if (currentPage > totalPages - 4) {
                  pageNum = totalPages - 5 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => { setPage(pageNum); setSelectedIds(new Set()) }}
                  >
                    {pageNum + 1}
                  </Button>
                )
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={currentPage >= totalPages - 1}
              onClick={() => { setPage(p => p + 1); setSelectedIds(new Set()) }}
            >
              Proxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Footer stats */}
      {totalPages <= 1 && notifications.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {notifications.length} notificacao{notifications.length !== 1 ? "es" : ""} no total
          {unreadCount > 0 && ` -- ${unreadCount} nao lida${unreadCount !== 1 ? "s" : ""}`}
        </p>
      )}

      {/* Notification Detail Dialog */}
      <Dialog open={!!detailNotification} onOpenChange={(open) => { if (!open) setDetailNotification(null) }}>
        <DialogContent className="sm:max-w-lg">
          {detailNotification && (() => {
            const IconComponent = getNotificationIcon(detailNotification.type)
            const colorClass = getNotificationColor(detailNotification.type)
            const badgeClass = getTypeBadgeClass(detailNotification.type)

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className={cn("shrink-0 h-10 w-10 rounded-full flex items-center justify-center", colorClass)}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-left">{detailNotification.title}</DialogTitle>
                      <DialogDescription className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5 border", badgeClass)}>
                          {TYPE_LABELS[detailNotification.type] ?? detailNotification.type}
                        </Badge>
                        <span className="text-xs">
                          {formatDateTime(detailNotification.createdAt)}
                        </span>
                        {!detailNotification.read && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            Nao lida
                          </Badge>
                        )}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="py-4">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {detailNotification.message}
                  </p>
                </div>

                <DialogFooter className="flex-row gap-2 sm:justify-between">
                  <div className="flex gap-2">
                    {!detailNotification.read && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          handleMarkRead(detailNotification.id)
                          setDetailNotification({ ...detailNotification, read: true })
                        }}
                      >
                        <Check className="h-4 w-4 mr-1.5" />
                        Marcar como lida
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(detailNotification.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Excluir
                    </Button>
                  </div>
                  {detailNotification.link && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setDetailNotification(null)
                        handleGoToResource(detailNotification)
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-1.5" />
                      Ir para o recurso
                    </Button>
                  )}
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
