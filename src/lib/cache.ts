type CacheEntry<T> = {
    data: T
    expiresAt: number
}

class SimpleCache {
    private store = new Map<string, CacheEntry<unknown>>()

    get<T>(key: string): T | null {
        const entry = this.store.get(key) as CacheEntry<T> | undefined
        if (!entry) return null
        if (entry.expiresAt < Date.now()) {
            this.store.delete(key)
            return null
        }
        return entry.data
    }

    set<T>(key: string, data: T, ttlSeconds: number = 60): void {
        this.store.set(key, {
            data,
            expiresAt: Date.now() + ttlSeconds * 1000,
        })
    }

    invalidate(key: string): void {
        this.store.delete(key)
    }

    invalidatePattern(pattern: string): void {
        for (const key of this.store.keys()) {
            if (key.includes(pattern)) {
                this.store.delete(key)
            }
        }
    }

    clear(): void {
        this.store.clear()
    }

    get size(): number {
        return this.store.size
    }
}

export const cache = new SimpleCache()
