'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

interface UseSessionHeartbeatReturn {
  lastAccess: Date | null
  isOnline: boolean
}

export function useSessionHeartbeat(): UseSessionHeartbeatReturn {
  const [lastAccess, setLastAccess] = useState<Date | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isVisible = useRef(!document.hidden)

  const sendHeartbeat = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/track-access', { method: 'POST' })

      if (res.ok) {
        const data = await res.json()
        if (data.lastAccess) {
          setLastAccess(new Date(data.lastAccess))
        }
        setIsOnline(true)
      } else if (res.status === 401) {
        // Session expired - user is no longer authenticated
        setIsOnline(false)
        stopInterval()
      }
    } catch {
      setIsOnline(false)
    }
  }, [])

  function startInterval() {
    if (intervalRef.current) return
    intervalRef.current = setInterval(() => {
      if (isVisible.current) {
        sendHeartbeat()
      }
    }, HEARTBEAT_INTERVAL_MS)
  }

  function stopInterval() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  // Initial heartbeat + interval setup
  useEffect(() => {
    sendHeartbeat()
    startInterval()

    return () => {
      stopInterval()
    }
  }, [sendHeartbeat])

  // Pause/resume based on document visibility
  useEffect(() => {
    function handleVisibilityChange() {
      isVisible.current = !document.hidden

      if (!document.hidden) {
        // Tab became visible: send heartbeat immediately and restart interval
        sendHeartbeat()
        startInterval()
      } else {
        // Tab hidden: stop interval to save resources
        stopInterval()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [sendHeartbeat])

  return { lastAccess, isOnline }
}
