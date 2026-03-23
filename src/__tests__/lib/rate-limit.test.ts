import { describe, it, expect, beforeEach } from 'vitest'
import { RateLimiter } from '@/lib/rate-limit'

describe('RateLimiter', () => {
    let limiter: RateLimiter

    beforeEach(() => {
        limiter = new RateLimiter(60000, 3) // 1 min window, 3 max attempts
    })

    it('should allow requests within limit', () => {
        const result = limiter.check('test-ip')
        expect(result.success).toBe(true)
        expect(result.remaining).toBe(2)
    })

    it('should track remaining attempts', () => {
        limiter.check('test-ip')
        limiter.check('test-ip')
        const result = limiter.check('test-ip')
        expect(result.success).toBe(true)
        expect(result.remaining).toBe(0)
    })

    it('should block after exceeding limit', () => {
        limiter.check('test-ip')
        limiter.check('test-ip')
        limiter.check('test-ip')
        const result = limiter.check('test-ip')
        expect(result.success).toBe(false)
        expect(result.remaining).toBe(0)
    })

    it('should track different keys independently', () => {
        limiter.check('ip-1')
        limiter.check('ip-1')
        limiter.check('ip-1')

        const result = limiter.check('ip-2')
        expect(result.success).toBe(true)
        expect(result.remaining).toBe(2)
    })

    it('should return resetAt timestamp', () => {
        const result = limiter.check('test-ip')
        expect(result.resetAt).toBeInstanceOf(Date)
        expect(result.resetAt.getTime()).toBeGreaterThan(Date.now())
    })
})
