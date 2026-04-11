import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { registerHeartbeat, getActiveCount } from '@/lib/active-users-tracker'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/heartbeat
 *
 * Registers a heartbeat for the authenticated user, tracking their
 * online status and current page. Called every 30s by the client hook.
 *
 * Body: { page?: string }
 * Response: { online: true, activeUsers?: number } (activeUsers only for ADMINs)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { online: false, reason: 'not_authenticated' },
        { status: 401 },
      )
    }

    const { id: userId, role } = session.user

    // Extract metadata from request
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'
    const userAgent = request.headers.get('user-agent') ?? ''

    // Parse body for current page
    let page = '/'
    try {
      const body = await request.json()
      if (body?.page && typeof body.page === 'string') {
        page = body.page
      }
    } catch {
      // Body may be empty or invalid; default to '/'
    }

    // Register heartbeat
    registerHeartbeat(userId, ip, userAgent, page)

    // Build response — active user count only for ADMINs
    const response: { online: true; activeUsers?: number } = { online: true }

    if (role === 'ADMIN') {
      response.activeUsers = getActiveCount()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[heartbeat] error:', error)
    return NextResponse.json(
      { online: false, reason: 'internal_error' },
      { status: 500 },
    )
  }
}
