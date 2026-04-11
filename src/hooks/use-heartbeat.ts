'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const HEARTBEAT_INTERVAL_MS = 30 * 1000 // 30 seconds

interface UseHeartbeatReturn {
  isConnected: boolean
  activeUsersCount: number | null
}

/**
 * Sends a heartbeat POST to /api/auth/heartbeat every 30s,
 * including the current page path. Pauses when the tab is hidden
 * and resumes immediately when the tab becomes visible again.
 *
 * Returns the connection status and active users count (for ADMINs).
 */
export function useHeartbeat(): UseHeartbeatReturn {
  const [isConnected, setIsConnected] = useState(true)
  const [activeUsersCount, setActiveUsersCount] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isVisibleRef = useRef(!document.hidden)

  const sendHeartbeat = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: window.location.pathname }),
      })

      if (res.ok) {
        const data = await res.json()
        setIsConnected(true)

        // activeUsers is only returned for ADMIN role
        if (typeof data.activeUsers === 'number') {
          setActiveUsersCount(data.activeUsers)
        }
      } else if (res.status === 401) {
        setIsConnected(false)
        stopInterval()
      }
    } catch {
      setIsConnected(false)
    }
  }, [])

  function startInterval() {
    if (intervalRef.current) return
    intervalRef.current = setInterval(() => {
      if (isVisibleRef.current) {
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

  // Pause / resume based on document visibility
  useEffect(() => {
    function handleVisibilityChange() {
      isVisibleRef.current = !document.hidden

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

  return { isConnected, activeUsersCount }
}
