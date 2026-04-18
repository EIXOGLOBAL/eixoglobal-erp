'use client'

import { useState, useEffect, useRef } from "react"
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useNotifications } from "@/hooks/use-notifications"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/formatters"

// Icon map for notification types
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

function timeAgo(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return "agora"
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return formatDate(d)
}

export function NotificationBell() {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [pulse, setPulse] = useState(false)
  const prevLatestId = useRef<string | null>(null)

  const {
    notifications,
    unreadCount,
    isConnected,
    latestNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications()

  // Toast + pulse on new notification (only if dropdown is closed)
  useEffect(() => {
    if (
      latestNotification &&
      latestNotification.id !== prevLatestId.current
    ) {
      prevLatestId.current = latestNotification.id

      if (!open) {
        toast({
          title: latestNotification.title,
          description: latestNotification.message,
        })
      }

      // Pulse animation for 3 seconds
      setPulse(true)
      const timer = setTimeout(() => setPulse(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [latestNotification, open, toast])

  function handleClick(notification: { id: string; read: boolean; link: string | null }) {
    if (!notification.read) markAsRead(notification.id)
    if (notification.link) {
      setOpen(false)
      router.push(notification.link)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="h-5 w-5" />

          {/* Unread count badge */}
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-red-500 text-[10px] text-white font-bold flex items-center justify-center px-0.5",
                pulse && "animate-pulse"
              )}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}

          {/* Connection indicator */}
          <span
            className={cn(
              "absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full border border-background",
              isConnected ? "bg-green-500" : "bg-gray-400"
            )}
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm">
            Notificações{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={markAllAsRead}>
              <CheckCheck className="h-3 w-3 mr-1" /> Marcar todas
            </Button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 && (
            <div className="text-center py-8">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
            </div>
          )}
          {notifications.map(n => (
            <div
              key={n.id}
              className={cn(
                "flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors",
                !n.read && "bg-blue-50/50 dark:bg-blue-950/20",
                n.link && "cursor-pointer"
              )}
              onClick={() => handleClick(n)}
            >
              {/* Type icon */}
              <div className="text-lg shrink-0 mt-0.5">{TYPE_ICONS[n.type] ?? "🔔"}</div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <p className={cn("text-xs font-semibold leading-snug", !n.read && "text-foreground")}>
                    {n.title}
                  </p>
                  <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">{n.message}</p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                {!n.read && (
                  <button
                    title="Marcar como lida"
                    onClick={() => markAsRead(n.id)}
                    className="h-5 w-5 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center"
                  >
                    <Check className="h-2.5 w-2.5 text-white" />
                  </button>
                )}
                <button
                  title="Remover"
                  onClick={() => deleteNotification(n.id)}
                  className="h-5 w-5 rounded hover:bg-destructive/20 flex items-center justify-center text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs h-7"
              onClick={() => { setOpen(false); router.push("/notificacoes") }}
            >
              Ver todas as notificações
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
