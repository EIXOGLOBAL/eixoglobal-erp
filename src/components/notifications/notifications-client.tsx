'use client'

import { useState, useMemo } from "react"
import { Bell, Check, CheckCheck, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import {
  markAsRead,
  markAllAsRead,
  deleteNotification,
  markNotificationsAsRead,
} from "@/app/actions/notification-actions"

const TYPE_ICONS: Record<string, string> = {
  TASK_ASSIGNED: "📋",
  TASK_COMMENT: "💬",
  TASK_DUE: "⏰",
  BULLETIN_SUBMITTED: "📄",
  BULLETIN_APPROVED: "✅",
  BULLETIN_REJECTED: "❌",
  CONTRACT_EXPIRING: "📝",
  EQUIPMENT_MAINTENANCE: "🔧",
  PURCHASE_APPROVED: "🛒",
  ANNOUNCEMENT: "📢",
  LOW_STOCK: "📦",
  VACATION_APPROVED: "🏖️",
  VACATION_REJECTED: "🚫",
}

const TYPE_LABELS: Record<string, string> = {
  TASK_ASSIGNED: "Tarefa",
  TASK_COMMENT: "Comentário",
  TASK_DUE: "Prazo",
  BULLETIN_SUBMITTED: "Boletim",
  BULLETIN_APPROVED: "Boletim Aprovado",
  BULLETIN_REJECTED: "Boletim Recusado",
  CONTRACT_EXPIRING: "Contrato",
  EQUIPMENT_MAINTENANCE: "Equipamento",
  PURCHASE_APPROVED: "Compra Aprovada",
  ANNOUNCEMENT: "Comunicado",
  LOW_STOCK: "Estoque Baixo",
  VACATION_APPROVED: "Férias Aprovadas",
  VACATION_REJECTED: "Férias Rejeitadas",
}

const TYPE_CATEGORIES: Record<string, string> = {
  TASK_ASSIGNED: "Tarefas",
  TASK_COMMENT: "Tarefas",
  TASK_DUE: "Tarefas",
  BULLETIN_SUBMITTED: "Boletins",
  BULLETIN_APPROVED: "Boletins",
  BULLETIN_REJECTED: "Boletins",
  CONTRACT_EXPIRING: "Contratos",
  EQUIPMENT_MAINTENANCE: "Equipamentos",
  PURCHASE_APPROVED: "Compras",
  ANNOUNCEMENT: "Comunicados",
  LOW_STOCK: "Estoque",
  VACATION_APPROVED: "RH",
  VACATION_REJECTED: "RH",
}

function timeAgo(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return "agora"
  if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d atrás`
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

type Notification = {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: Date
}

type FilterTab = "all" | "unread" | "Tarefas" | "Boletins" | "Contratos" | "Equipamentos" | "Compras" | "Comunicados" | "Estoque" | "RH"

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "unread", label: "Não lidas" },
  { id: "Tarefas", label: "Tarefas" },
  { id: "Boletins", label: "Boletins" },
  { id: "Contratos", label: "Contratos" },
  { id: "Equipamentos", label: "Equipamentos" },
  { id: "Compras", label: "Compras" },
  { id: "Comunicados", label: "Comunicados" },
  { id: "Estoque", label: "Estoque" },
  { id: "RH", label: "RH" },
]

const PAGE_SIZE = 20

interface NotificationsClientProps {
  initialNotifications: Notification[]
}

export function NotificationsClient({ initialNotifications }: NotificationsClientProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [activeTab, setActiveTab] = useState<FilterTab>("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)

  const unreadCount = notifications.filter(n => !n.read).length

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (activeTab === "all") return true
      if (activeTab === "unread") return !n.read
      return TYPE_CATEGORIES[n.type] === activeTab
    })
  }, [notifications, activeTab])

  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages - 1)
  const pageNotifications = filteredNotifications.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  // Reset page when filter changes
  function handleTabChange(tab: FilterTab) {
    setActiveTab(tab)
    setPage(0)
    setSelectedIds(new Set())
  }

  // Selection helpers
  const allPageSelected = pageNotifications.length > 0 && pageNotifications.every(n => selectedIds.has(n.id))
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
        pageNotifications.forEach(n => next.delete(n.id))
        return next
      })
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        pageNotifications.forEach(n => next.add(n.id))
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
  }

  async function handleBulkMarkRead() {
    const ids = Array.from(selectedIds)
    await markNotificationsAsRead(ids)
    setNotifications(prev => prev.map(n => selectedIds.has(n.id) ? { ...n, read: true } : n))
    setSelectedIds(new Set())
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds)
    // Delete each notification
    await Promise.all(ids.map(id => deleteNotification(id)))
    setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)))
    setSelectedIds(new Set())
  }

  function handleClick(notification: Notification) {
    if (!notification.read) handleMarkRead(notification.id)
    if (notification.link) {
      router.push(notification.link)
    }
  }

  const selectedUnreadCount = Array.from(selectedIds).filter(id => {
    const n = notifications.find(notif => notif.id === id)
    return n && !n.read
  }).length

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {FILTER_TABS.map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "outline"}
              size="sm"
              onClick={() => handleTabChange(tab.id)}
              className="h-8"
            >
              {tab.label}
              {tab.id === "unread" && unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          ))}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" className="h-8" onClick={handleMarkAllRead}>
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
            Marcar todas como lidas
          </Button>
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
              Limpar seleção
            </Button>
          </div>
        </div>
      )}

      {/* Notification list */}
      <div className="rounded-lg border bg-card">
        {/* Select all header */}
        {pageNotifications.length > 0 && (
          <div className="flex items-center gap-3 px-6 py-2 border-b bg-muted/30">
            <Checkbox
              checked={allPageSelected}
              onCheckedChange={toggleSelectAll}
              aria-label="Selecionar todas da página"
            />
            <span className="text-xs text-muted-foreground">
              {allPageSelected ? "Desmarcar todas" : "Selecionar todas da página"}
            </span>
          </div>
        )}

        {filteredNotifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {activeTab === "unread"
                ? "Nenhuma notificação não lida"
                : activeTab !== "all"
                  ? `Nenhuma notificação em "${activeTab}"`
                  : "Nenhuma notificação"}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              As notificações aparecerão aqui quando houver atualizações
            </p>
          </div>
        )}

        {pageNotifications.map((n, index) => (
          <div
            key={n.id}
            className={cn(
              "flex items-start gap-4 px-6 py-4 transition-colors",
              index !== 0 && "border-t",
              !n.read && "bg-blue-50/40 dark:bg-blue-950/10",
              n.link && "cursor-pointer hover:bg-muted/50",
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

            {/* Unread dot */}
            <div className="flex items-center shrink-0 pt-1">
              {!n.read ? (
                <div className="h-2 w-2 rounded-full bg-blue-500" />
              ) : (
                <div className="h-2 w-2" />
              )}
            </div>

            {/* Icon */}
            <div className="text-xl shrink-0" onClick={() => handleClick(n)}>
              {TYPE_ICONS[n.type] ?? "🔔"}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0" onClick={() => handleClick(n)}>
              <div className="flex items-start justify-between gap-4 mb-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("text-sm font-semibold", !n.read && "text-foreground")}>
                    {n.title}
                  </span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                    {TYPE_LABELS[n.type] ?? n.type}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                  {timeAgo(n.createdAt)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{n.message}</p>
            </div>

            {/* Individual actions */}
            <div
              className="flex items-center gap-1 shrink-0"
              onClick={e => e.stopPropagation()}
            >
              {!n.read && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                  title="Marcar como lida"
                  onClick={() => handleMarkRead(n.id)}
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                title="Remover notificação"
                onClick={() => handleDelete(n.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Página {currentPage + 1} de {totalPages}
            {" · "}
            {filteredNotifications.length} notificação{filteredNotifications.length !== 1 ? "ões" : ""}
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
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={currentPage >= totalPages - 1}
              onClick={() => { setPage(p => p + 1); setSelectedIds(new Set()) }}
            >
              Próxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Footer stats (when no pagination needed) */}
      {totalPages <= 1 && notifications.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {notifications.length} notificação{notifications.length !== 1 ? "ões" : ""} no total
          {unreadCount > 0 && ` · ${unreadCount} não lida${unreadCount !== 1 ? "s" : ""}`}
        </p>
      )}
    </div>
  )
}
