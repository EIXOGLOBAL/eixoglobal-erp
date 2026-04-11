import { describe, it, expect, beforeEach, vi } from 'vitest'
import { logAudit, getAuditLogs } from '@/lib/audit-logger'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn()
    }
  }
}))

import { prisma } from '@/lib/prisma'

describe('Audit Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('logAudit', () => {
    it('should create audit record with all required fields', async () => {
      const createMock = vi.spyOn(prisma.auditLog, 'create')

      const params = {
        userId: 'user-123',
        companyId: 'company-456',
        action: 'CREATE',
        entity: 'Invoice',
        entityId: 'invoice-789',
        details: 'Invoice created successfully'
      }

      await logAudit(params)

      expect(createMock).toHaveBeenCalledOnce()
      const callData = createMock.mock.calls[0]![0]
      expect(callData.data.userId).toBe('user-123')
      expect(callData.data.companyId).toBe('company-456')
      expect(callData.data.action).toBe('CREATE')
      expect(callData.data.entity).toBe('Invoice')
      expect(callData.data.entityId).toBe('invoice-789')
      expect(callData.data.details).toBe('Invoice created successfully')
    })

    it('should serialize oldData as JSON', async () => {
      const createMock = vi.spyOn(prisma.auditLog, 'create')

      const oldData = { status: 'draft', amount: 1000 }
      await logAudit({
        userId: 'user-123',
        companyId: 'company-456',
        action: 'UPDATE',
        entity: 'Invoice',
        entityId: 'invoice-789',
        oldData
      })

      const callData = createMock.mock.calls[0]![0]
      expect(callData.data.oldData).toBe(JSON.stringify(oldData))
    })

    it('should serialize newData as JSON', async () => {
      const createMock = vi.spyOn(prisma.auditLog, 'create')

      const newData = { status: 'approved', amount: 1000 }
      await logAudit({
        userId: 'user-123',
        companyId: 'company-456',
        action: 'UPDATE',
        entity: 'Invoice',
        entityId: 'invoice-789',
        newData
      })

      const callData = createMock.mock.calls[0]![0]
      expect(callData.data.newData).toBe(JSON.stringify(newData))
    })

    it('should set oldData to null when not provided', async () => {
      const createMock = vi.spyOn(prisma.auditLog, 'create')

      await logAudit({
        userId: 'user-123',
        companyId: 'company-456',
        action: 'CREATE',
        entity: 'Invoice',
        entityId: 'invoice-789'
      })

      const callData = createMock.mock.calls[0]![0]
      expect(callData.data.oldData).toBeNull()
    })

    it('should set newData to null when not provided', async () => {
      const createMock = vi.spyOn(prisma.auditLog, 'create')

      await logAudit({
        userId: 'user-123',
        companyId: 'company-456',
        action: 'CREATE',
        entity: 'Invoice',
        entityId: 'invoice-789'
      })

      const callData = createMock.mock.calls[0]![0]
      expect(callData.data.newData).toBeNull()
    })

    it('should rely on schema default for createdAt (not pass timestamp)', async () => {
      const createMock = vi.spyOn(prisma.auditLog, 'create')

      await logAudit({
        userId: 'user-123',
        companyId: 'company-456',
        action: 'DELETE',
        entity: 'Invoice',
        entityId: 'invoice-789'
      })

      const callData = createMock.mock.calls[0]![0]
      // logAudit não passa createdAt — confia no @default(now()) do Prisma
      expect(callData.data.createdAt).toBeUndefined()
      expect(callData.data.action).toBe('DELETE')
    })

    it('should handle errors gracefully without throwing', async () => {
      const createMock = vi.spyOn(prisma.auditLog, 'create')
      createMock.mockRejectedValueOnce(new Error('Database error'))

      // Should not throw
      await expect(
        logAudit({
          userId: 'user-123',
          companyId: 'company-456',
          action: 'CREATE',
          entity: 'Invoice',
          entityId: 'invoice-789'
        })
      ).resolves.not.toThrow()
    })

    it('should handle complex oldData and newData structures', async () => {
      const createMock = vi.spyOn(prisma.auditLog, 'create')

      const complexData = {
        nested: { value: 123 },
        array: [1, 2, 3],
        boolean: true,
        null: null
      }

      await logAudit({
        userId: 'user-123',
        companyId: 'company-456',
        action: 'UPDATE',
        entity: 'Invoice',
        entityId: 'invoice-789',
        oldData: complexData,
        newData: complexData
      })

      const callData = createMock.mock.calls[0]![0]
      expect(JSON.parse(callData.data.oldData)).toEqual(complexData)
      expect(JSON.parse(callData.data.newData)).toEqual(complexData)
    })
  })

  describe('getAuditLogs', () => {
    it('should retrieve audit logs with default parameters', async () => {
      const mockLogs = [
        { id: '1', action: 'CREATE', entity: 'Invoice' },
        { id: '2', action: 'UPDATE', entity: 'Invoice' }
      ]
      const findManyMock = vi.spyOn(prisma.auditLog, 'findMany')
      findManyMock.mockResolvedValueOnce(mockLogs as any)

      const result = await getAuditLogs({})

      expect(findManyMock).toHaveBeenCalledOnce()
      expect(result).toEqual(mockLogs)
    })

    it('should filter by userId', async () => {
      const findManyMock = vi.spyOn(prisma.auditLog, 'findMany')
      findManyMock.mockResolvedValueOnce([])

      await getAuditLogs({ userId: 'user-123' })

      const callData = findManyMock.mock.calls[0]![0]
      expect(callData.where.userId).toBe('user-123')
    })

    it('should filter by companyId', async () => {
      const findManyMock = vi.spyOn(prisma.auditLog, 'findMany')
      findManyMock.mockResolvedValueOnce([])

      await getAuditLogs({ companyId: 'company-456' })

      const callData = findManyMock.mock.calls[0]![0]
      expect(callData.where.companyId).toBe('company-456')
    })

    it('should filter by entity', async () => {
      const findManyMock = vi.spyOn(prisma.auditLog, 'findMany')
      findManyMock.mockResolvedValueOnce([])

      await getAuditLogs({ entity: 'Invoice' })

      const callData = findManyMock.mock.calls[0]![0]
      expect(callData.where.entity).toBe('Invoice')
    })

    it('should filter by action', async () => {
      const findManyMock = vi.spyOn(prisma.auditLog, 'findMany')
      findManyMock.mockResolvedValueOnce([])

      await getAuditLogs({ action: 'UPDATE' })

      const callData = findManyMock.mock.calls[0]![0]
      expect(callData.where.action).toBe('UPDATE')
    })

    it('should apply custom limit', async () => {
      const findManyMock = vi.spyOn(prisma.auditLog, 'findMany')
      findManyMock.mockResolvedValueOnce([])

      await getAuditLogs({ limit: 50 })

      const callData = findManyMock.mock.calls[0]![0]
      expect(callData.take).toBe(50)
    })

    it('should default limit to 100', async () => {
      const findManyMock = vi.spyOn(prisma.auditLog, 'findMany')
      findManyMock.mockResolvedValueOnce([])

      await getAuditLogs({})

      const callData = findManyMock.mock.calls[0]![0]
      expect(callData.take).toBe(100)
    })

    it('should order by createdAt descending', async () => {
      const findManyMock = vi.spyOn(prisma.auditLog, 'findMany')
      findManyMock.mockResolvedValueOnce([])

      await getAuditLogs({})

      const callData = findManyMock.mock.calls[0]![0]
      expect(callData.orderBy).toEqual({ createdAt: 'desc' })
    })

    it('should combine multiple filters', async () => {
      const findManyMock = vi.spyOn(prisma.auditLog, 'findMany')
      findManyMock.mockResolvedValueOnce([])

      await getAuditLogs({
        userId: 'user-123',
        companyId: 'company-456',
        entity: 'Invoice',
        action: 'CREATE',
        limit: 25
      })

      const callData = findManyMock.mock.calls[0]![0]
      expect(callData.where.userId).toBe('user-123')
      expect(callData.where.companyId).toBe('company-456')
      expect(callData.where.entity).toBe('Invoice')
      expect(callData.where.action).toBe('CREATE')
      expect(callData.take).toBe(25)
    })

    it('should handle errors gracefully', async () => {
      const findManyMock = vi.spyOn(prisma.auditLog, 'findMany')
      findManyMock.mockRejectedValueOnce(new Error('Database error'))

      const result = await getAuditLogs({})

      expect(result).toEqual([])
    })
  })
})
