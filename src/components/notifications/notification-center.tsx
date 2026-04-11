"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
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
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useNotifications } from "@/hooks/use-notifications"
import { formatDate } from "@/lib/formatters"

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

type TabValue = "todas" | "nao-lidas" | "sistema" | "ia"

// ── Constants ──────────────────────────────────────────────────────────────

const SYSTEM_TYPES = [
  "TASK_ASSIGNED",
  "TASK_COMMENT",
  "TASK_DUE",
  "BULLETIN_SUBMITTED",
  "BULLETIN_APPROVED",
  "BULLETIN_REJECTED",
  "CONTRACT_EXPIRING",
  "EQUIPMENT_MAINTENANCE",
  "PURCHASE_APPROVED",
  "ANNOUNCEMENT",
  "LOW_STOCK",
  "VACATION_APPROVED",
  "VACATION_REJECTED",
  "INFO",
  "SUCCESS",
  "WARNING",
  "ERROR",
]

const AI_TYPES = [
  "AI_SUGGESTION",
  "AI_ANALYSIS",
  "AI_ALERT",
  "AI_INSIGHT",
  "AI_REPORT",
]

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
  AI_SUGGESTION: "text-violet-600 bg-violet-100 dark:bg-violet-950/40",
  AI_ANALYSIS: "text-violet-600 bg-violet-100 dark:bg-violet-950/40",
  AI_ALERT: "text-violet-600 bg-violet-100 dark:bg-violet-950/40",
  AI_INSIGHT: "text-violet-600 bg-violet-100 dark:bg-violet-950/40",
  AI_REPORT: "text-violet-600 bg-violet-100 dark:bg-violet-950/40",
}

const PAGE_SIZE = 15

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const diffSeconds = Math.floor((now.getTime() - d.getTime()) / 1000)

  if (diffSeconds < 60) return "agora"
  if (diffSeconds < 3600) {
    const m = Math.floor(diffSeconds / 60)
    return `${m} min atras`
  }
  if (diffSeconds < 86400) {
    const h = Math.floor(diffSeconds / 3600)
    return `${h}h atras`
  }
  if (diffSeconds < 604800) {
    const d = Math.floor(diffSeconds / 86400)
    return `${d}d atras`
  }
  return formatDate(new Date(date))
}

function getNotificationIcon(type: string) {
  return TYPE_ICON_MAP[type] ?? Bell
}

function getNotificationColor(type: string) {
  return TYPE_COLOR_MAP[type] ?? "text-gray-600 bg-gray-100 dark:bg-gray-950/40"
}

function isAiType(type: string): boolean {
  return AI_TYPES.includes(type) || type.startsWith("AI_")
}

// ── Component ──────────────────────────────────────────────────────────────

interface NotificationCenterProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NotificationCenter({ open, onOpenChange }: NotificationCenterProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabValue>("todas")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [loadingMore, setLoadingMore] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications()

  // Reset pagination when tab changes or panel opens
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [activeTab, open])

  // Filter notifications by active tab
  const filteredNotifications = useMemo(() => {
    switch (activeTab) {
      case "nao-lidas":
        return notifications.filter((n) => !n.read)
      case "sistema":
        return notifications.filter((n) => SYSTEM_TYPES.includes(n.type))
      case "ia":
        return notifications.filter((n) => isAiType(n.type))
      default:
        return notifications
    }
  }, [notifications, activeTab])

  // Paginated slice
  const visibleNotifications = useMemo(
    () => filteredNotifications.slice(0, visibleCount),
    [filteredNotifications, visibleCount]
  )

  const hasMore = visibleCount < filteredNotifications.length

  // Tab counts
  const unreadTabCount = notifications.filter((n) => !n.read).length
  const systemTabCount = notifications.filter((n) => SYSTEM_TYPES.includes(n.type)).length
  const aiTabCount = notifications.filter((n) => isAiType(n.type)).length

  const handleLoadMore = useCallback(() => {
    setLoadingMore(true)
    // Simulate small delay for smoother UX
    setTimeout(() => {
      setVisibleCount((prev) => prev + PAGE_SIZE)
      setLoadingMore(false)
    }, 200)
  }, [])

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      if (!notification.read) {
        markAsRead(notification.id)
      }
      if (notification.link) {
        onOpenChange(false)
        router.push(notification.link)
      }
    },
    [markAsRead, onOpenChange, router]
  )

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead()
  }, [markAllAsRead])

  const handleDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      deleteNotification(id)
    },
    [deleteNotification]
  )

  const handleMarkRead = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      markAsRead(id)
    },
    [markAsRead]
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col"
        showCloseButton={false}
      >
        {/* Header */}
        <SheetHeader className="px-4 pt-4 pb-0 space-y-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-lg">Notificacoes</SheetTitle>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5 h-5">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleMarkAllAsRead}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
          <SheetDescription className="sr-only">
            Central de notificacoes do sistema
          </SheetDescription>
        </SheetHeader>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabValue)}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="px-4 pt-3 pb-2">
            <TabsList className="w-full">
              <TabsTrigger value="todas" className="flex-1 text-xs">
                Todas
              </TabsTrigger>
              <TabsTrigger value="nao-lidas" className="flex-1 text-xs">
                Nao Lidas
                {unreadTabCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-4 px-1 text-[9px]"
                  >
                    {unreadTabCount > 99 ? "99+" : unreadTabCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="sistema" className="flex-1 text-xs">
                Sistema
              </TabsTrigger>
              <TabsTrigger value="ia" className="flex-1 text-xs">
                IA
                {aiTabCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-4 px-1 text-[9px]"
                  >
                    {aiTabCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Content for all tabs shares the same rendering */}
          {(["todas", "nao-lidas", "sistema", "ia"] as TabValue[]).map(
            (tab) => (
              <TabsContent
                key={tab}
                value={tab}
                className="flex-1 mt-0 min-h-0"
              >
                <ScrollArea
                  ref={tab === activeTab ? scrollRef : undefined}
                  className="h-full max-h-[calc(100vh-12rem)]"
                >
                  {/* Empty state */}
                  {visibleNotifications.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 px-4">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                        <Bell className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {tab === "nao-lidas"
                          ? "Nenhuma notificacao nao lida"
                          : tab === "sistema"
                            ? "Nenhuma notificacao do sistema"
                            : tab === "ia"
                              ? "Nenhuma notificacao de IA"
                              : "Nenhuma notificacao"}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1 text-center">
                        Novas notificacoes aparecerao aqui automaticamente
                      </p>
                    </div>
                  )}

                  {/* Notification cards */}
                  <div className="divide-y">
                    {visibleNotifications.map((n) => {
                      const IconComponent = getNotificationIcon(n.type)
                      const colorClass = getNotificationColor(n.type)

                      return (
                        <div
                          key={n.id}
                          className={cn(
                            "flex items-start gap-3 px-4 py-3 transition-colors group",
                            !n.read && "bg-blue-50/50 dark:bg-blue-950/20",
                            n.link && "cursor-pointer hover:bg-muted/50"
                          )}
                          onClick={() => handleNotificationClick(n)}
                        >
                          {/* Type icon */}
                          <div
                            className={cn(
                              "shrink-0 h-8 w-8 rounded-full flex items-center justify-center mt-0.5",
                              colorClass
                            )}
                          >
                            <IconComponent className="h-4 w-4" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={cn(
                                  "text-sm leading-snug",
                                  !n.read
                                    ? "font-semibold text-foreground"
                                    : "font-medium text-foreground/80"
                                )}
                              >
                                {n.title}
                              </p>
                              <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                                {timeAgo(n.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
                              {n.message}
                            </p>

                            {/* Unread indicator + type badge */}
                            <div className="flex items-center gap-2 mt-1.5">
                              {!n.read && (
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                              )}
                              {isAiType(n.type) && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] h-4 px-1 gap-0.5 text-violet-600 border-violet-200 dark:border-violet-800"
                                >
                                  <Sparkles className="h-2.5 w-2.5" />
                                  IA
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!n.read && (
                              <button
                                title="Marcar como lida"
                                onClick={(e) => handleMarkRead(e, n.id)}
                                className="h-6 w-6 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-colors"
                              >
                                <Check className="h-3 w-3 text-white" />
                              </button>
                            )}
                            <button
                              title="Remover"
                              onClick={(e) => handleDelete(e, n.id)}
                              className="h-6 w-6 rounded hover:bg-destructive/20 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Load more */}
                  {hasMore && (
                    <div className="px-4 py-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs"
                        disabled={loadingMore}
                        onClick={handleLoadMore}
                      >
                        {loadingMore ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                            Carregando...
                          </>
                        ) : (
                          <>
                            Carregar mais ({filteredNotifications.length - visibleCount} restantes)
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            )
          )}
        </Tabs>

        {/* Footer */}
        <div className="border-t px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs h-7"
            onClick={() => {
              onOpenChange(false)
              router.push("/notificacoes")
            }}
          >
            Ver todas as notificacoes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
