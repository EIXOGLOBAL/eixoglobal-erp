import { describe, it, expect, beforeEach, vi } from 'vitest'
import { cache } from '@/lib/cache'

describe('SimpleCache', () => {
    beforeEach(() => {
        cache.clear()
    })

    it('should store and retrieve values', () => {
        cache.set('key1', { name: 'test' }, 60)
        expect(cache.get('key1')).toEqual({ name: 'test' })
    })

    it('should return null for missing keys', () => {
        expect(cache.get('missing')).toBeNull()
    })

    it('should return null for expired entries', () => {
        cache.set('expired', 'value', 0) // 0 second TTL
        // Wait a tick
        vi.advanceTimersByTime(10)
        expect(cache.get('expired')).toBeNull()
    })

    it('should invalidate specific keys', () => {
        cache.set('key1', 'value1', 60)
        cache.set('key2', 'value2', 60)
        cache.invalidate('key1')
        expect(cache.get('key1')).toBeNull()
        expect(cache.get('key2')).toBe('value2')
    })

    it('should invalidate by pattern', () => {
        cache.set('dashboard:company1', 'data1', 60)
        cache.set('dashboard:company2', 'data2', 60)
        cache.set('other:key', 'data3', 60)
        cache.invalidatePattern('dashboard')
        expect(cache.get('dashboard:company1')).toBeNull()
        expect(cache.get('dashboard:company2')).toBeNull()
        expect(cache.get('other:key')).toBe('data3')
    })

    it('should report correct size', () => {
        cache.set('a', 1, 60)
        cache.set('b', 2, 60)
        expect(cache.size).toBe(2)
    })
})
