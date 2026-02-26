import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addConnection, removeConnection } from '@/lib/sse-notifications'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  // 1. Authenticate
  const session = await getSession()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }
  const userId = session.user.id as string

  let lastChecked = new Date()
  const encoder = new TextEncoder()

  // 2. Create SSE stream
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      addConnection(userId, controller)

      // Send initial connected event
      try {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ event: 'connected' })}\n\n`)
        )
      } catch { /* closed */ }

      // Heartbeat every 25s to keep connection alive
      const heartbeatId = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          clearInterval(heartbeatId)
        }
      }, 25_000)

      // Poll DB every 3s for new notifications
      const pollId = setInterval(async () => {
        try {
          const newNotifications = await prisma.notification.findMany({
            where: {
              userId,
              createdAt: { gt: lastChecked },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          })

          const unreadCount = await prisma.notification.count({
            where: { userId, read: false },
          })

          lastChecked = new Date()

          if (newNotifications.length > 0) {
            const payload = JSON.stringify({
              event: 'update',
              count: unreadCount,
              notifications: newNotifications,
            })
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
          }
        } catch {
          // DB query failed; skip this poll cycle
        }
      }, 3_000)

      // Cleanup on client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatId)
        clearInterval(pollId)
        removeConnection(userId, controller)
        try { controller.close() } catch { /* already closed */ }
      })
    },

    cancel() {
      // Stream cancelled — cleanup already handled by abort
    },
  })

  // 3. Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
