import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getActiveUsers } from '@/lib/active-users-tracker'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/active-users
 *
 * Returns the full list of currently active (online) users with their
 * DB profile details. Restricted to ADMIN role only.
 */
export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 },
      )
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso restrito a administradores' },
        { status: 403 },
      )
    }

    // Get in-memory active users
    const activeEntries = getActiveUsers()

    if (activeEntries.length === 0) {
      return NextResponse.json({ activeUsers: [], count: 0 })
    }

    // Fetch user details from DB in a single query
    const userIds = activeEntries.map((e) => e.userId)
    const dbUsers = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        company: { select: { id: true, name: true } },
      },
    })

    // Index DB results by id for fast lookup
    const dbMap = new Map(dbUsers.map((u) => [u.id, u]))

    // Merge tracker data with DB profile
    const merged = activeEntries.map((entry) => {
      const user = dbMap.get(entry.userId)
      return {
        userId: entry.userId,
        username: user?.username ?? null,
        name: user?.name ?? null,
        email: user?.email ?? null,
        role: user?.role ?? null,
        avatarUrl: user?.avatarUrl ?? null,
        company: user?.company ?? null,
        lastSeen: entry.lastSeen,
        ip: entry.ip,
        currentPage: entry.currentPage,
        browser: entry.browser,
        os: entry.os,
        deviceType: entry.deviceType,
      }
    })

    // Sort by lastSeen descending (most recently active first)
    merged.sort(
      (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime(),
    )

    return NextResponse.json({
      activeUsers: merged,
      count: merged.length,
    })
  } catch (error) {
    console.error('[admin/active-users] error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}
