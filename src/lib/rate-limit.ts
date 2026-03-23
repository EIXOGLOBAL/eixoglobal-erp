type RateLimitEntry = { count: number; resetAt: number }

export class RateLimiter {
    private store = new Map<string, RateLimitEntry>()

    constructor(
        private windowMs: number = 15 * 60 * 1000,
        private maxAttempts: number = 5
    ) {
        // Clean up expired entries every 5 minutes
        setInterval(() => this.cleanup(), 5 * 60 * 1000)
    }

    check(key: string): { success: boolean; remaining: number; resetAt: Date } {
        const now = Date.now()
        const entry = this.store.get(key)

        if (!entry || entry.resetAt < now) {
            this.store.set(key, { count: 1, resetAt: now + this.windowMs })
            return {
                success: true,
                remaining: this.maxAttempts - 1,
                resetAt: new Date(now + this.windowMs),
            }
        }

        entry.count++
        const remaining = Math.max(0, this.maxAttempts - entry.count)

        if (entry.count > this.maxAttempts) {
            return { success: false, remaining: 0, resetAt: new Date(entry.resetAt) }
        }

        return { success: true, remaining, resetAt: new Date(entry.resetAt) }
    }

    private cleanup() {
        const now = Date.now()
        for (const [key, entry] of this.store) {
            if (entry.resetAt < now) this.store.delete(key)
        }
    }
}

export const loginRateLimiter = new RateLimiter(15 * 60 * 1000, 5)
