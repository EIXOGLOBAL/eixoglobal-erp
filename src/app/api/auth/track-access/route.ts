import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { updateLastAccess, getLastAccess } from '@/lib/session-tracker'

export const dynamic = 'force-dynamic'

// In-memory rate limit: userId -> timestamp of last successful call.
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_MS = 5 * 60 * 1000 // 5 minutes

export async function POST() {
  const session = await getSession()
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: max 1 call per 5 min per user
  const now = Date.now()
  const lastCall = rateLimitMap.get(userId)

  if (lastCall && now - lastCall < RATE_LIMIT_MS) {
    const lastAccess = await getLastAccess(userId)
    return NextResponse.json({ lastAccess, throttled: true })
  }

  rateLimitMap.set(userId, now)

  await updateLastAccess(userId)
  const lastAccess = await getLastAccess(userId)

  return NextResponse.json({ lastAccess })
}
