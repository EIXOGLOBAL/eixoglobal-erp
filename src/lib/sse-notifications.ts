/**
 * SSE Notifications — In-memory connection registry
 *
 * Manages active SSE connections per userId and provides
 * notifyUser/notifyUsers for real-time push from server actions.
 */

type SSEController = ReadableStreamDefaultController<Uint8Array>

// Persist across HMR in dev (same pattern as prisma.ts)
const globalForSSE = globalThis as unknown as {
  sseConnections: Map<string, Set<SSEController>>
}

const connections: Map<string, Set<SSEController>> =
  globalForSSE.sseConnections ?? new Map()

if (process.env.NODE_ENV !== 'production') {
  globalForSSE.sseConnections = connections
}

export function addConnection(userId: string, controller: SSEController): void {
  if (!connections.has(userId)) {
    connections.set(userId, new Set())
  }
  connections.get(userId)!.add(controller)
}

export function removeConnection(userId: string, controller: SSEController): void {
  const set = connections.get(userId)
  if (set) {
    set.delete(controller)
    if (set.size === 0) connections.delete(userId)
  }
}

const encoder = new TextEncoder()

/** Push SSE event to all active connections for a given user */
export function notifyUser(userId: string, data: {
  type: string
  title: string
  message: string
  link?: string | null
  id?: string
}): void {
  const set = connections.get(userId)
  if (!set || set.size === 0) return

  const payload = encoder.encode(
    `data: ${JSON.stringify({ event: 'notification', ...data })}\n\n`
  )

  for (const controller of set) {
    try {
      controller.enqueue(payload)
    } catch {
      set.delete(controller)
    }
  }
}

/** Push SSE event to multiple users at once */
export function notifyUsers(userIds: string[], data: {
  type: string
  title: string
  message: string
  link?: string | null
}): void {
  for (const userId of userIds) {
    notifyUser(userId, data)
  }
}
