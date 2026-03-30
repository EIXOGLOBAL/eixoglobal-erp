import { describe, it, expect } from 'vitest'
import { getPaginationArgs, paginatedResponse } from '@/lib/pagination'

describe('Pagination', () => {
  describe('getPaginationArgs', () => {
    it('should return defaults when no params provided', () => {
      const result = getPaginationArgs()
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(25)
      expect(result.skip).toBe(0)
      expect(result.take).toBe(25)
    })

    it('should use custom page and pageSize values', () => {
      const result = getPaginationArgs({ page: 3, pageSize: 50 })
      expect(result.page).toBe(3)
      expect(result.pageSize).toBe(50)
      expect(result.skip).toBe(100) // (3-1) * 50
      expect(result.take).toBe(50)
    })

    it('should clamp page to minimum 1', () => {
      const result = getPaginationArgs({ page: 0 })
      expect(result.page).toBe(1)
      expect(result.skip).toBe(0)
    })

    it('should clamp negative page to minimum 1', () => {
      const result = getPaginationArgs({ page: -5 })
      expect(result.page).toBe(1)
      expect(result.skip).toBe(0)
    })

    it('should clamp pageSize to maximum 100', () => {
      const result = getPaginationArgs({ pageSize: 200 })
      expect(result.pageSize).toBe(100)
      expect(result.take).toBe(100)
    })

    it('should use default pageSize when 0 is provided', () => {
      const result = getPaginationArgs({ pageSize: 0 })
      expect(result.pageSize).toBe(25)
      expect(result.take).toBe(25)
    })

    it('should calculate skip correctly for pagination', () => {
      const result = getPaginationArgs({ page: 5, pageSize: 25 })
      expect(result.skip).toBe(100) // (5-1) * 25
    })
  })

  describe('paginatedResponse', () => {
    it('should return correct response structure', () => {
      const data = [{ id: 1, name: 'Item 1' }]
      const result = paginatedResponse(data, 100, 1, 25)

      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('pagination')
      expect(result.data).toEqual(data)
    })

    it('should calculate totalPages correctly', () => {
      const result = paginatedResponse([], 100, 1, 25)
      expect(result.pagination.totalPages).toBe(4) // 100 / 25 = 4
    })

    it('should calculate totalPages with remainder', () => {
      const result = paginatedResponse([], 101, 1, 25)
      expect(result.pagination.totalPages).toBe(5) // ceil(101 / 25) = 5
    })

    it('should handle single page results', () => {
      const result = paginatedResponse([], 10, 1, 25)
      expect(result.pagination.totalPages).toBe(1)
    })

    it('should include pagination metadata', () => {
      const data = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }))
      const result = paginatedResponse(data, 75, 2, 25)

      expect(result.pagination.page).toBe(2)
      expect(result.pagination.pageSize).toBe(25)
      expect(result.pagination.total).toBe(75)
      expect(result.pagination.totalPages).toBe(3)
    })

    it('should preserve data array', () => {
      const data = [
        { id: 1, value: 'a' },
        { id: 2, value: 'b' },
        { id: 3, value: 'c' }
      ]
      const result = paginatedResponse(data, 50, 1, 25)
      expect(result.data).toEqual(data)
      expect(result.data.length).toBe(3)
    })
  })
})
