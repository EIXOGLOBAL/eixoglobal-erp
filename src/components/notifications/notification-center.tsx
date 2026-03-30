'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/export-utils'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  isRead: boolean
  createdAt: Date
  link?: string
}

interface NotificationCenterProps {
  userId: string
}

/**
 * Dropdown/popover for notification bell icon
 * Shows unread count badge and recent notifications
 * Uses SSE for real-time updates
 */
export function NotificationCenter({ userId }: NotificationCenterProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  // Setup SSE connection for real-time notifications
  useEffect(() => {
    let eventSource: EventSource | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null

    const connect = () => {
      try {
        eventSource = new EventSource(`/api/notifications/stream?userId=${userId}`)

        eventSource.onopen = () => {
          setIsConnected(true)
        }

        eventSource.onmessage = (event) => {
          try {
            const notification = JSON.parse(event.data) as Notification
            setNotifications(prev => [notification, ...prev].slice(0, 10))
            setUnreadCount(prev => prev + 1)
          } catch (error) {
            console.error('Error parsing notification:', error)
          }
        }

        eventSource.addEventListener('error', () => {
          setIsConnected(false)
          eventSource?.close()
          // Attempt to reconnect after 5 seconds
          reconnectTimeout = setTimeout(connect, 5000)
        })
      } catch (error) {
        console.error('Failed to connect to notifications:', error)
        reconnectTimeout = setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      if (eventSource) {
        eventSource.close()
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
    }
  }, [userId])

  const handleMarkAsRead = async (notificationId: string, link?: string) => {
    try {
      // Mark as read in backend
      await fetch(`/api/notifications/${notificationId}/mark-read`, {
        method: 'POST',
      })

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))

      // Navigate if link provided
      if (link) {
        router.push(link)
        setIsOpen(false)
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      })

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    const icons = {
      info: '📘',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    }
    return icons[type]
  }

  const getNotificationColor = (type: Notification['type']) => {
    const colors = {
      info: 'bg-blue-50 border-blue-200',
      success: 'bg-green-50 border-green-200',
      warning: 'bg-yellow-50 border-yellow-200',
      error: 'bg-red-50 border-red-200',
    }
    return colors[type]
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          title="Notificações (Ctrl+K para busca)"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {Math.min(unreadCount, 9)}
              {unreadCount > 9 && '+'}
            </Badge>
          )}
          {isConnected && (
            <span className="absolute bottom-1 right-1 h-2 w-2 bg-green-500 rounded-full" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-semibold text-sm">Notificações</h2>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              Marcar tudo como lido
            </Button>
          )}
        </div>

        <DropdownMenuSeparator />

        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma notificação
            </div>
          ) : (
            notifications.map(notification => (
              <div
                key={notification.id}
                className={cn(
                  'px-4 py-3 border-b cursor-pointer hover:bg-muted/50 transition-colors',
                  !notification.isRead && 'bg-blue-50/50'
                )}
                onClick={() => handleMarkAsRead(notification.id, notification.link)}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer text-center justify-center py-2">
          <a href="/notificacoes" className="text-sm font-medium text-primary">
            Ver todas as notificações
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
