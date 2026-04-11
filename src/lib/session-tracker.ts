import { prisma } from '@/lib/prisma'

// In-memory cache: userId -> timestamp of last DB write.
// Prevents excessive DB updates when multiple requests arrive within the throttle window.
const lastUpdateCache = new Map<string, number>()

/** Minimum interval (ms) between DB writes for the same user. */
const THROTTLE_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Updates the user's `lastAccessAt` in the database.
 * Throttled: skips the write if the last update for this user was less than 5 min ago.
 */
export async function updateLastAccess(userId: string): Promise<void> {
  const now = Date.now()
  const lastUpdate = lastUpdateCache.get(userId)

  if (lastUpdate && now - lastUpdate < THROTTLE_MS) {
    return // Still within throttle window, skip DB write
  }

  await prisma.user.update({
    where: { id: userId },
    data: { lastAccessAt: new Date(now) },
  })

  lastUpdateCache.set(userId, now)
}

/**
 * Returns the user's last access timestamp, or null if never recorded.
 */
export async function getLastAccess(userId: string): Promise<Date | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastAccessAt: true },
  })

  return user?.lastAccessAt ?? null
}
