/**
 * Active Users Tracker — In-memory registry of currently online users
 *
 * Tracks heartbeats from authenticated users, parses user-agent info,
 * and auto-cleans stale entries (>5 min without heartbeat).
 *
 * Persists across HMR in dev (same globalThis pattern as prisma.ts / sse-notifications.ts).
 */

const STALE_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000     // 60 seconds
const MAX_ENTRIES = 1000

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActiveUser {
  userId: string
  lastSeen: Date
  ip: string
  userAgent: string
  sessionId: string | null
  currentPage: string
  browser: string
  os: string
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown'
}

interface TrackerEntry {
  lastSeen: Date
  ip: string
  userAgent: string
  sessionId: string | null
  currentPage: string
  browser: string
  os: string
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown'
}

// ---------------------------------------------------------------------------
// User-Agent parsing helpers
// ---------------------------------------------------------------------------

function parseBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return 'Edge'
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return 'Opera'
  if (/SamsungBrowser/i.test(ua)) return 'Samsung Browser'
  if (/Firefox\//i.test(ua)) return 'Firefox'
  if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return 'Chrome'
  if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return 'Safari'
  if (/Trident\//i.test(ua) || /MSIE/i.test(ua)) return 'Internet Explorer'
  return 'Unknown'
}

function parseOS(ua: string): string {
  if (/Windows NT 10/i.test(ua)) return 'Windows 10+'
  if (/Windows NT/i.test(ua)) return 'Windows'
  if (/Mac OS X/i.test(ua)) return 'macOS'
  if (/Android/i.test(ua)) return 'Android'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS'
  if (/Linux/i.test(ua)) return 'Linux'
  if (/CrOS/i.test(ua)) return 'Chrome OS'
  return 'Unknown'
}

function parseDeviceType(ua: string): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
  if (/iPad|Android(?!.*Mobile)/i.test(ua)) return 'tablet'
  if (/Mobile|iPhone|iPod|Android.*Mobile|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua)) return 'mobile'
  if (/Windows NT|Macintosh|Mac OS X|Linux(?!.*Android)|CrOS/i.test(ua)) return 'desktop'
  return 'unknown'
}

// ---------------------------------------------------------------------------
// Global singleton (survives HMR)
// ---------------------------------------------------------------------------

const globalForTracker = globalThis as unknown as {
  __activeUsersMap?: Map<string, TrackerEntry>
  __activeUsersCleanup?: ReturnType<typeof setInterval>
}

const activeUsers: Map<string, TrackerEntry> =
  globalForTracker.__activeUsersMap ?? new Map()

if (process.env.NODE_ENV !== 'production') {
  globalForTracker.__activeUsersMap = activeUsers
}

// ---------------------------------------------------------------------------
// Cleanup: remove users not seen for > STALE_THRESHOLD_MS
// ---------------------------------------------------------------------------

function runCleanup(): void {
  const now = Date.now()
  for (const [userId, entry] of activeUsers) {
    if (now - entry.lastSeen.getTime() > STALE_THRESHOLD_MS) {
      activeUsers.delete(userId)
    }
  }
}

// Start cleanup interval only once (survives HMR in dev)
if (!globalForTracker.__activeUsersCleanup) {
  globalForTracker.__activeUsersCleanup = setInterval(runCleanup, CLEANUP_INTERVAL_MS)

  // Unref in Node so the interval doesn't block process exit
  if (typeof globalForTracker.__activeUsersCleanup === 'object' && 'unref' in globalForTracker.__activeUsersCleanup) {
    globalForTracker.__activeUsersCleanup.unref()
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function registerHeartbeat(
  userId: string,
  ip: string,
  userAgent: string,
  page: string,
  sessionId?: string | null,
): void {
  // Enforce memory cap: if at limit and this is a new user, evict oldest entry
  if (activeUsers.size >= MAX_ENTRIES && !activeUsers.has(userId)) {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of activeUsers) {
      const ts = entry.lastSeen.getTime()
      if (ts < oldestTime) {
        oldestTime = ts
        oldestKey = key
      }
    }

    if (oldestKey) {
      activeUsers.delete(oldestKey)
    }
  }

  activeUsers.set(userId, {
    lastSeen: new Date(),
    ip,
    userAgent,
    sessionId: sessionId ?? null,
    currentPage: page,
    browser: parseBrowser(userAgent),
    os: parseOS(userAgent),
    deviceType: parseDeviceType(userAgent),
  })
}

export function removeUser(userId: string): void {
  activeUsers.delete(userId)
}

export function getActiveUsers(): ActiveUser[] {
  // Run cleanup before returning to guarantee freshness
  runCleanup()

  const result: ActiveUser[] = []
  for (const [userId, entry] of activeUsers) {
    result.push({ userId, ...entry })
  }
  return result
}

export function getActiveCount(): number {
  runCleanup()
  return activeUsers.size
}

export function isUserOnline(userId: string): boolean {
  const entry = activeUsers.get(userId)
  if (!entry) return false

  // Check staleness inline
  if (Date.now() - entry.lastSeen.getTime() > STALE_THRESHOLD_MS) {
    activeUsers.delete(userId)
    return false
  }

  return true
}
