import { NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimiterConfig {
  /** Time window in milliseconds */
  windowMs: number
  /** Maximum requests allowed within the window */
  maxRequests: number
  /** Optional prefix for namespacing keys in shared scenarios */
  keyPrefix?: string
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean
  /** How many requests remain in the current window */
  remaining: number
  /** When the oldest tracked request expires (window resets) */
  resetAt: Date
  /** Seconds the caller should wait before retrying (only set when blocked) */
  retryAfter?: number
}

// ---------------------------------------------------------------------------
// Internal storage – sliding window implemented via per-key timestamp arrays
// ---------------------------------------------------------------------------

/** Each key stores a sorted array of request timestamps (epoch ms). */
type TimestampLog = number[]

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_ENTRIES = 10_000

// ---------------------------------------------------------------------------
// RateLimiter class
// ---------------------------------------------------------------------------

export class RateLimiter {
  private store = new Map<string, TimestampLog>()
  private readonly windowMs: number
  private readonly maxRequests: number
  private readonly keyPrefix: string
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor(config: RateLimiterConfig) {
    this.windowMs = config.windowMs
    this.maxRequests = config.maxRequests
    this.keyPrefix = config.keyPrefix ?? ''

    // Auto-cleanup every 5 minutes
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS)

    // Allow the Node process to exit even if the timer is still running
    if (this.cleanupTimer && typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
      this.cleanupTimer.unref()
    }
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Check (and record) a request against the rate limit using a sliding
   * window algorithm.
   *
   * Each call logs the current timestamp. Only timestamps within the last
   * `windowMs` are considered — this gives a fair, continuous window rather
   * than the bursty behaviour of fixed-window counters.
   */
  check(key: string): RateLimitResult {
    const resolvedKey = this.keyPrefix ? `${this.keyPrefix}:${key}` : key
    const now = Date.now()
    const windowStart = now - this.windowMs

    // Retrieve or initialise the timestamp log
    let timestamps = this.store.get(resolvedKey)
    if (!timestamps) {
      timestamps = []
      this.store.set(resolvedKey, timestamps)
    }

    // Prune timestamps outside the current window
    // Because the array is insertion-ordered (ascending), we can find the
    // first index that is inside the window and slice from there.
    let firstValid = 0
    while (firstValid < timestamps.length && timestamps[firstValid] <= windowStart) {
      firstValid++
    }
    if (firstValid > 0) {
      timestamps.splice(0, firstValid)
    }

    // Determine the reset time — it is when the oldest request in the
    // current window will expire. If there are no requests yet, reset is
    // one full window from now.
    const resetAt = timestamps.length > 0
      ? new Date(timestamps[0] + this.windowMs)
      : new Date(now + this.windowMs)

    // Check the limit
    if (timestamps.length >= this.maxRequests) {
      const retryAfterMs = timestamps[0] + this.windowMs - now
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil(retryAfterMs / 1000),
      }
    }

    // Record this request
    timestamps.push(now)

    // Enforce the memory cap *after* insertion
    this.enforceMemoryCap()

    return {
      allowed: true,
      remaining: this.maxRequests - timestamps.length,
      resetAt,
    }
  }

  /** Remove all tracked data for a specific key. */
  reset(key: string): void {
    const resolvedKey = this.keyPrefix ? `${this.keyPrefix}:${key}` : key
    this.store.delete(resolvedKey)
  }

  /**
   * Remove entries whose entire timestamp log has expired (all timestamps
   * are older than 2x the window, as specified).
   */
  cleanup(): void {
    const now = Date.now()
    const expiryThreshold = now - this.windowMs * 2

    for (const [key, timestamps] of this.store) {
      // If the newest timestamp is older than 2x the window, evict the key
      if (timestamps.length === 0 || timestamps[timestamps.length - 1] <= expiryThreshold) {
        this.store.delete(key)
      }
    }
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /**
   * When the store exceeds MAX_ENTRIES, evict the oldest entries first.
   * "Oldest" is determined by the most recent timestamp in each log — keys
   * whose latest activity is furthest in the past are evicted first.
   */
  private enforceMemoryCap(): void {
    if (this.store.size <= MAX_ENTRIES) return

    // Build an array of [key, latestTimestamp] and sort ascending by latest
    const entries: [string, number][] = []
    for (const [key, timestamps] of this.store) {
      const latest = timestamps.length > 0 ? timestamps[timestamps.length - 1] : 0
      entries.push([key, latest])
    }
    entries.sort((a, b) => a[1] - b[1])

    // Evict oldest until we are at the cap
    const toEvict = this.store.size - MAX_ENTRIES
    for (let i = 0; i < toEvict; i++) {
      this.store.delete(entries[i][0])
    }
  }
}

// ---------------------------------------------------------------------------
// Pre-configured limiters
// ---------------------------------------------------------------------------

/** General API: 100 requests/min per IP */
export const apiLimiter = new RateLimiter({
  windowMs: 60_000,
  maxRequests: 100,
  keyPrefix: 'api',
})

/** Authentication / login: 5 requests/min per IP (brute-force protection) */
export const authLimiter = new RateLimiter({
  windowMs: 60_000,
  maxRequests: 5,
  keyPrefix: 'auth',
})

/** File uploads: 10 requests/min per user */
export const uploadLimiter = new RateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
  keyPrefix: 'upload',
})

/** AI endpoints: 30 requests/min per user (cost control) */
export const aiLimiter = new RateLimiter({
  windowMs: 60_000,
  maxRequests: 30,
  keyPrefix: 'ai',
})

/** Cron jobs: 1 request/min per endpoint */
export const cronLimiter = new RateLimiter({
  windowMs: 60_000,
  maxRequests: 1,
  keyPrefix: 'cron',
})

/** Spell-check: 60 requests/min per user (mirrors existing behaviour) */
export const spellCheckLimiter = new RateLimiter({
  windowMs: 60_000,
  maxRequests: 60,
  keyPrefix: 'spellcheck',
})

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

/**
 * Build standard rate-limit response headers from a RateLimitResult.
 *
 * Returns a plain object suitable for spreading into NextResponse headers or
 * passing to `new Headers()`.
 */
export function getRateLimitHeaders(
  result: RateLimitResult,
  maxRequests: number,
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(maxRequests),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt.getTime() / 1000)),
  }

  if (result.retryAfter !== undefined) {
    headers['Retry-After'] = String(result.retryAfter)
  }

  return headers
}

/**
 * Convenience: return a fully-formed 429 NextResponse when the rate limit
 * has been exceeded.
 *
 * Usage in a route handler:
 *
 * ```ts
 * const result = aiLimiter.check(userId)
 * if (!result.allowed) return rateLimitResponse(result)
 * ```
 */
export function rateLimitResponse(
  result: RateLimitResult,
  maxRequests?: number,
): NextResponse {
  const limit = maxRequests ?? 0
  const headers = getRateLimitHeaders(result, limit)

  return NextResponse.json(
    {
      error: 'Rate limit excedido. Tente novamente em breve.',
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers,
    },
  )
}
