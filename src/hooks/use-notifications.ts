'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  markAsRead as serverMarkAsRead,
  markAllAsRead as serverMarkAllAsRead,
  deleteNotification as serverDeleteNotification,
  getNotifications,
  getUnreadCount,
} from '@/app/actions/notification-actions'

type Notification = {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: Date
}

type SSEEvent = {
  event: string
  count?: number
  notifications?: Notification[]
  type?: string
  title?: string
  message?: string
  link?: string | null
  id?: string
}

export interface UseNotificationsReturn {
  unreadCount: number
  notifications: Notification[]
  isConnected: boolean
  latestNotification: Notification | null
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [latestNotification, setLatestNotification] = useState<Notification | null>(null)

  const retryDelay = useRef(1000)
  const retryTimerId = useRef<ReturnType<typeof setTimeout> | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const isHidden = useRef(false)
  const connectRef = useRef<() => void>(() => {})

  // Load initial data via server actions
  useEffect(() => {
    async function loadInitial() {
      const [notifResult, countResult] = await Promise.all([
        getNotifications(20),
        getUnreadCount(),
      ])
      if (notifResult.success) setNotifications(notifResult.data as Notification[])
      if (countResult.success) setUnreadCount(countResult.data)
    }
    loadInitial()
  }, [])

  // SSE connection — define connect inside effect to satisfy React Compiler
  useEffect(() => {
    function connect() {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      const es = new EventSource('/api/notifications/stream')
      eventSourceRef.current = es

      es.onopen = () => {
        setIsConnected(true)
        retryDelay.current = 1000
      }

      es.onmessage = (event) => {
        try {
          const data: SSEEvent = JSON.parse(event.data)

          if (data.event === 'connected') return

          if (data.event === 'update' && data.notifications) {
            setNotifications(prev => {
              const existingIds = new Set(prev.map(n => n.id))
              const newOnes = data.notifications!.filter(n => !existingIds.has(n.id))
              if (newOnes.length === 0) return prev
              return [...newOnes, ...prev].slice(0, 50)
            })
            if (typeof data.count === 'number') {
              setUnreadCount(data.count)
            }
            if (data.notifications.length > 0) {
              setLatestNotification(data.notifications[0]!)
            }
          }

          if (data.event === 'notification') {
            const newNotif: Notification = {
              id: data.id ?? crypto.randomUUID(),
              type: data.type!,
              title: data.title!,
              message: data.message!,
              link: data.link ?? null,
              read: false,
              createdAt: new Date(),
            }
            setNotifications(prev => [newNotif, ...prev].slice(0, 50))
            setUnreadCount(prev => prev + 1)
            setLatestNotification(newNotif)
          }
        } catch {
          // Ignore parse errors
        }
      }

      es.onerror = () => {
        setIsConnected(false)
        es.close()
        eventSourceRef.current = null

        if (!isHidden.current) {
          retryTimerId.current = setTimeout(() => {
            connectRef.current()
          }, retryDelay.current)
          retryDelay.current = Math.min(retryDelay.current * 2, 30_000)
        }
      }
    }

    // Store in ref for visibility handler and reconnection
    connectRef.current = connect

    // Initial connection
    connect()

    return () => {
      eventSourceRef.current?.close()
      eventSourceRef.current = null
      if (retryTimerId.current) {
        clearTimeout(retryTimerId.current)
      }
    }
  }, [])

  // Visibility change: pause when hidden, reconnect when visible
  useEffect(() => {
    function handleVisibility() {
      isHidden.current = document.hidden

      if (!document.hidden && !eventSourceRef.current) {
        retryDelay.current = 1000
        connectRef.current()
      }

      if (document.hidden && eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
        setIsConnected(false)
        if (retryTimerId.current) {
          clearTimeout(retryTimerId.current)
          retryTimerId.current = null
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // Optimistic mark as read
  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
    await serverMarkAsRead(id)
  }, [])

  // Optimistic mark all as read
  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
    await serverMarkAllAsRead()
  }, [])

  // Delete notification
  const deleteNotification = useCallback(async (id: string) => {
    setNotifications(prev => {
      const target = prev.find(n => n.id === id)
      if (target && !target.read) {
        setUnreadCount(c => Math.max(0, c - 1))
      }
      return prev.filter(n => n.id !== id)
    })
    await serverDeleteNotification(id)
  }, [])

  return {
    unreadCount,
    notifications,
    isConnected,
    latestNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  }
}
