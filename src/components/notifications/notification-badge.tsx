"use client"

import { useState, useEffect, useRef } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useNotifications } from "@/hooks/use-notifications"
import { useToast } from "@/hooks/use-toast"
import { NotificationCenter } from "./notification-center"

/**
 * Notification badge com icone de sino, contagem de nao lidas
 * e animacao ao receber nova notificacao.
 * Ao clicar, abre o NotificationCenter em painel lateral.
 */
export function NotificationBadge() {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [pulse, setPulse] = useState(false)
  const [bounce, setBounce] = useState(false)
  const prevLatestId = useRef<string | null>(null)

  const {
    unreadCount,
    isConnected,
    latestNotification,
  } = useNotifications()

  // Animate + toast on new notification
  useEffect(() => {
    if (
      latestNotification &&
      latestNotification.id !== prevLatestId.current
    ) {
      prevLatestId.current = latestNotification.id

      // Show toast only if panel is closed
      if (!open) {
        toast({
          title: latestNotification.title,
          description: latestNotification.message,
        })
      }

      // Pulse animation on badge
      setPulse(true)
      const pulseTimer = setTimeout(() => setPulse(false), 3000)

      // Bounce animation on bell icon
      setBounce(true)
      const bounceTimer = setTimeout(() => setBounce(false), 1000)

      return () => {
        clearTimeout(pulseTimer)
        clearTimeout(bounceTimer)
      }
    }
  }, [latestNotification, open, toast])

  // Format the badge display
  const badgeText = unreadCount > 99 ? "99+" : String(unreadCount)

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(true)}
        aria-label={
          unreadCount > 0
            ? `Notificacoes - ${unreadCount} nao lida${unreadCount !== 1 ? "s" : ""}`
            : "Notificacoes"
        }
      >
        {/* Bell icon with bounce animation */}
        <Bell
          className={cn(
            "h-5 w-5 transition-transform",
            bounce && "animate-bounce"
          )}
        />

        {/* Unread count badge */}
        {unreadCount > 0 && (
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 flex items-center justify-center",
              "h-4 min-w-4 rounded-full px-0.5",
              "bg-red-500 text-[10px] font-bold text-white leading-none",
              "pointer-events-none select-none",
              pulse && "animate-pulse"
            )}
          >
            {badgeText}
          </span>
        )}

        {/* SSE connection status indicator */}
        <span
          className={cn(
            "absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full border border-background",
            isConnected ? "bg-green-500" : "bg-gray-400"
          )}
        />
      </Button>

      {/* Notification center slide-out panel */}
      <NotificationCenter open={open} onOpenChange={setOpen} />
    </>
  )
}
