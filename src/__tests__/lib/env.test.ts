import { describe, it, expect } from 'vitest'
import { getEnv } from '@/lib/env'

describe('Environment Configuration', () => {
  describe('getEnv', () => {
    it('should return a configuration object', () => {
      const env = getEnv()
      expect(env).toBeDefined()
      expect(typeof env).toBe('object')
      expect(env).not.toBeNull()
    })

    it('should return valid config with DATABASE_URL', () => {
      const env = getEnv()
      expect(env.DATABASE_URL).toBeDefined()
      expect(typeof env.DATABASE_URL).toBe('string')
      expect(env.DATABASE_URL.length).toBeGreaterThan(0)
    })

    it('should return valid config with SESSION_SECRET', () => {
      const env = getEnv()
      expect(env.SESSION_SECRET).toBeDefined()
      expect(typeof env.SESSION_SECRET).toBe('string')
      expect(env.SESSION_SECRET.length).toBeGreaterThanOrEqual(16)
    })

    it('should provide NODE_ENV with valid values', () => {
      const env = getEnv()
      expect(['development', 'production', 'test']).toContain(env.NODE_ENV)
    })

    it('should provide default NEXT_PUBLIC_APP_NAME', () => {
      const env = getEnv()
      expect(env.NEXT_PUBLIC_APP_NAME).toBe('Eixo Global ERP')
    })

    it('should handle missing optional vars gracefully', () => {
      const env = getEnv()

      // Optional properties should be either defined or undefined
      expect(env.ANTHROPIC_API_KEY === undefined || typeof env.ANTHROPIC_API_KEY === 'string').toBe(true)
      expect(env.SMTP_HOST === undefined || typeof env.SMTP_HOST === 'string').toBe(true)
      expect(env.NEXT_PUBLIC_APP_URL === undefined || typeof env.NEXT_PUBLIC_APP_URL === 'string').toBe(true)
    })

    it('should return cached config on subsequent calls', () => {
      const env1 = getEnv()
      const env2 = getEnv()
      expect(env1).toBe(env2)
    })

    it('should provide defaults for missing variables', () => {
      const env = getEnv()

      // Check that defaults are present
      expect(env.NODE_ENV).toBeDefined()
      expect(env.NEXT_PUBLIC_APP_NAME).toBeDefined()
      expect(env.NEXT_PUBLIC_APP_NAME).toBe('Eixo Global ERP')
    })

    it('should return object with proper structure', () => {
      const env = getEnv()
      const keys = Object.keys(env)
      expect(keys.length).toBeGreaterThan(0)
      expect(keys).toContain('DATABASE_URL')
      expect(keys).toContain('SESSION_SECRET')
      expect(keys).toContain('NODE_ENV')
    })
  })
})
