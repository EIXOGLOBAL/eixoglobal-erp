import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/auth'
import { securityHeaders } from '@/lib/security-headers'
import { decrypt } from '@/lib/session'
import { getClientIP } from '@/lib/get-client-ip'

// ---------------------------------------------------------------------------
// Public routes – no authentication required
// ---------------------------------------------------------------------------
const PUBLIC_PATHS = [
  '/login',
  '/api/health/ping',
  '/api/webhooks',
  '/api/version',
  '/api/admin/reset-password',
  '/api/admin/reset-users',
  '/api/admin/fix-schema',
  '/setup',
  '/register-setup',
  '/manutencao',
  '/favicon.ico',
]

const PUBLIC_PREFIXES = [
  '/api/auth/',
  '/_next/',
  '/uploads/',
]

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

// ---------------------------------------------------------------------------
// Simple in-memory rate limiter (Edge-compatible)
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 100

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()
let lastCleanup = Date.now()

function cleanupRateLimitMap() {
  const now = Date.now()
  if (now - lastCleanup < RATE_LIMIT_WINDOW_MS) return
  lastCleanup = now
  rateLimitMap.forEach((entry, key) => {
    if (entry.resetAt <= now) rateLimitMap.delete(key)
  })
}

function getRateLimit(ip: string): { allowed: boolean; limit: number; remaining: number } {
  cleanupRateLimitMap()
  const now = Date.now()
  let entry = rateLimitMap.get(ip)

  if (!entry || entry.resetAt <= now) {
    entry = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS }
    rateLimitMap.set(ip, entry)
    return { allowed: true, limit: RATE_LIMIT_MAX, remaining: RATE_LIMIT_MAX - 1 }
  }

  entry.count++
  const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count)
  return { allowed: entry.count <= RATE_LIMIT_MAX, limit: RATE_LIMIT_MAX, remaining }
}

// ---------------------------------------------------------------------------
// Security headers applied to every response
// ---------------------------------------------------------------------------
function applySecurityHeaders(response: NextResponse): void {
  response.headers.delete('x-powered-by')

  // Apply all configured security headers (includes HSTS, X-Frame-Options, etc.)
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value)
  }
}

// ---------------------------------------------------------------------------
// CORS headers for API routes (same-origin only)
// ---------------------------------------------------------------------------
function applyCorsHeaders(response: NextResponse, request: NextRequest): void {
  const origin = request.headers.get('origin')
  const requestOrigin = request.nextUrl.origin

  if (origin && origin === requestOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Max-Age', '86400')
  }
}

// ---------------------------------------------------------------------------
// Proxy handler (replaces middleware in Next.js 16)
// ---------------------------------------------------------------------------
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApiRoute = pathname.startsWith('/api/')

  // ---- CORS preflight ----
  if (isApiRoute && request.method === 'OPTIONS') {
    const preflightResponse = new NextResponse(null, { status: 204 })
    applySecurityHeaders(preflightResponse)
    applyCorsHeaders(preflightResponse, request)
    return preflightResponse
  }

  // ---- Static files ----
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)) {
    return NextResponse.next()
  }

  // ---- Public routes ----
  if (isPublicRoute(pathname)) {
    const response = NextResponse.next()
    applySecurityHeaders(response)
    return response
  }

  // ---- Auth check ----
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await decrypt(sessionCookie) : null

  if (!session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    const redirectResponse = NextResponse.redirect(loginUrl)
    applySecurityHeaders(redirectResponse)
    return redirectResponse
  }

  // ---- Refresh session ----
  let response = await updateSession(request)
  if (!response) {
    response = NextResponse.next()
  }

  // ---- Security headers ----
  applySecurityHeaders(response)

  // ---- CORS on API routes ----
  if (isApiRoute) {
    applyCorsHeaders(response, request)
  }

  // ---- Rate limiting on API routes ----
  if (isApiRoute) {
    const ip = getClientIP(request)

    const { allowed, limit, remaining } = getRateLimit(ip)
    response.headers.set('X-RateLimit-Limit', String(limit))
    response.headers.set('X-RateLimit-Remaining', String(remaining))

    if (!allowed) {
      const rateLimitedResponse = NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      )
      applySecurityHeaders(rateLimitedResponse)
      rateLimitedResponse.headers.set('X-RateLimit-Limit', String(limit))
      rateLimitedResponse.headers.set('X-RateLimit-Remaining', '0')
      rateLimitedResponse.headers.set('Retry-After', '60')
      return rateLimitedResponse
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
