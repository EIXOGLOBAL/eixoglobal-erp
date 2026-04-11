'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

const CSRF_COOKIE_NAME = 'csrf-token'

function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${CSRF_COOKIE_NAME}=`))
  return match ? decodeURIComponent(match.split('=')[1]) : null
}

interface UseCsrfReturn {
  csrfToken: string | null
  csrfHeaders: Record<string, string>
}

/**
 * Client-side hook that reads the CSRF token from the cookie and provides
 * a ready-to-spread headers object for fetch() calls.
 *
 * Usage:
 *   const { csrfHeaders } = useCsrf()
 *   await fetch('/api/something', { method: 'POST', headers: { ...csrfHeaders } })
 */
export function useCsrf(): UseCsrfReturn {
  const [csrfToken, setCsrfToken] = useState<string | null>(() => readCsrfCookie())

  const refresh = useCallback(() => {
    const token = readCsrfCookie()
    setCsrfToken((prev) => (prev !== token ? token : prev))
  }, [])

  // Re-read cookie on mount and whenever the tab regains focus (covers
  // token rotation without needing a polling interval).
  useEffect(() => {
    refresh()

    function handleFocus() {
      refresh()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refresh])

  const csrfHeaders = useMemo<Record<string, string>>(() => {
    if (!csrfToken) return {}
    return { 'x-csrf-token': csrfToken }
  }, [csrfToken])

  return { csrfToken, csrfHeaders }
}
