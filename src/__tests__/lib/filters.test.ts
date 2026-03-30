import { describe, it, expect } from 'vitest'
import { buildWhereClause } from '@/lib/filters'

describe('Filters', () => {
  describe('buildWhereClause', () => {
    it('should return empty object when filters are empty', () => {
      const result = buildWhereClause({})
      expect(result).toEqual({})
    })

    it('should return empty object when no search fields provided', () => {
      const result = buildWhereClause({ search: 'test' })
      expect(result).toEqual({})
    })

    it('should create OR clause with search and fields', () => {
      const result = buildWhereClause(
        { search: 'invoice' },
        ['number', 'description']
      )

      expect(result.OR).toBeDefined()
      expect(result.OR).toHaveLength(2)
      expect(result.OR[0]).toEqual({
        number: { contains: 'invoice', mode: 'insensitive' }
      })
      expect(result.OR[1]).toEqual({
        description: { contains: 'invoice', mode: 'insensitive' }
      })
    })

    it('should handle status as string', () => {
      const result = buildWhereClause({ status: 'active' })
      expect(result.status).toBe('active')
    })

    it('should handle status as array with IN filter', () => {
      const result = buildWhereClause({ status: ['active', 'pending'] })
      expect(result.status).toEqual({ in: ['active', 'pending'] })
    })

    it('should create date range with dateFrom', () => {
      const date = '2026-01-01'
      const result = buildWhereClause({ dateFrom: date })

      expect(result.createdAt).toBeDefined()
      expect(result.createdAt.gte).toEqual(new Date(date))
    })

    it('should create date range with dateTo', () => {
      const date = '2026-12-31'
      const result = buildWhereClause({ dateTo: date })

      expect(result.createdAt).toBeDefined()
      expect(result.createdAt.lte).toEqual(new Date(date))
    })

    it('should create complete date range with both dates', () => {
      const dateFrom = '2026-01-01'
      const dateTo = '2026-12-31'
      const result = buildWhereClause({ dateFrom, dateTo })

      expect(result.createdAt.gte).toEqual(new Date(dateFrom))
      expect(result.createdAt.lte).toEqual(new Date(dateTo))
    })

    it('should combine all filters', () => {
      const result = buildWhereClause(
        {
          search: 'test',
          status: ['active', 'pending'],
          dateFrom: '2026-01-01',
          dateTo: '2026-12-31'
        },
        ['name', 'description']
      )

      expect(result.OR).toBeDefined()
      expect(result.status).toEqual({ in: ['active', 'pending'] })
      expect(result.createdAt.gte).toEqual(new Date('2026-01-01'))
      expect(result.createdAt.lte).toEqual(new Date('2026-12-31'))
    })

    it('should create OR clause with multiple search fields', () => {
      const result = buildWhereClause(
        { search: 'payment' },
        ['description', 'notes', 'reference']
      )

      expect(result.OR).toHaveLength(3)
      expect(result.OR[0]).toEqual({
        description: { contains: 'payment', mode: 'insensitive' }
      })
      expect(result.OR[1]).toEqual({
        notes: { contains: 'payment', mode: 'insensitive' }
      })
      expect(result.OR[2]).toEqual({
        reference: { contains: 'payment', mode: 'insensitive' }
      })
    })

    it('should handle single status value in array', () => {
      const result = buildWhereClause({ status: ['archived'] })
      expect(result.status).toEqual({ in: ['archived'] })
    })

    it('should preserve search case insensitivity', () => {
      const result = buildWhereClause(
        { search: 'IMPORTANT' },
        ['title']
      )

      expect(result.OR[0].title.mode).toBe('insensitive')
      expect(result.OR[0].title.contains).toBe('IMPORTANT')
    })
  })
})
