/**
 * CSRF-aware fetch wrapper for client components.
 *
 * Drop-in replacement for fetch() that automatically attaches the CSRF token
 * header to every non-GET request (POST, PUT, PATCH, DELETE, etc.).
 *
 * Usage:
 *   import { csrfFetch } from '@/lib/csrf-fetch'
 *   const res = await csrfFetch('/api/something', { method: 'POST', body: ... })
 */

const CSRF_COOKIE_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'x-csrf-token'

function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${CSRF_COOKIE_NAME}=`))
  return match ? decodeURIComponent(match.split('=')[1]) : null
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export async function csrfFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const method = (init?.method ?? 'GET').toUpperCase()

  if (SAFE_METHODS.has(method)) {
    return fetch(input, init)
  }

  const token = readCsrfCookie()

  if (!token) {
    // No CSRF cookie available — forward the request as-is so the server
    // can return its own 403 rather than silently failing here.
    return fetch(input, init)
  }

  const headers = new Headers(init?.headers)
  if (!headers.has(CSRF_HEADER_NAME)) {
    headers.set(CSRF_HEADER_NAME, token)
  }

  return fetch(input, { ...init, headers })
}
