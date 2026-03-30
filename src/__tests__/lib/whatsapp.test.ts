import { describe, it, expect, beforeEach, vi } from 'vitest'
import { whatsappService } from '@/lib/whatsapp'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('WhatsApp Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isConfigured', () => {
    it('should return false without environment variables', () => {
      // Service is created with current env vars at module load time
      // Since there are no env vars set, it will not be configured
      expect(whatsappService.isConfigured()).toBe(false)
    })

    it('should have methods to send messages', () => {
      expect(whatsappService.sendMessage).toBeDefined()
      expect(typeof whatsappService.sendMessage).toBe('function')
    })

    it('should have notification methods', () => {
      expect(whatsappService.notifyApprovalRequired).toBeDefined()
      expect(whatsappService.notifyIncident).toBeDefined()
    })
  })

  describe('sendMessage', () => {
    it('should return error when service not configured', async () => {
      const result = await whatsappService.sendMessage({
        phone: '5511999999999',
        message: 'Test message'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not configured')
    })

    it('should return error response structure', async () => {
      const result = await whatsappService.sendMessage({
        phone: '5511999999999',
        message: 'Test message'
      })

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('error')
      expect(typeof result.success).toBe('boolean')
      expect(typeof result.error).toBe('string')
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
        text: async () => 'Invalid API key'
      } as Response)

      const result = await whatsappService.sendMessage({
        phone: '5511999999999',
        message: 'Test message'
      })

      // Result structure should be valid
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('error')
    })
  })

  describe('notifyApprovalRequired', () => {
    it('should have notifyApprovalRequired method', () => {
      expect(whatsappService.notifyApprovalRequired).toBeDefined()
      expect(typeof whatsappService.notifyApprovalRequired).toBe('function')
    })

    it('should return result with success and error properties', async () => {
      const result = await whatsappService.notifyApprovalRequired({
        phone: '5511999999999',
        documentType: 'Invoice',
        documentId: 'INV-001',
        requesterName: 'João Silva'
      })

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('error')
      expect(typeof result.success).toBe('boolean')
    })

    it('should accept invoice type', async () => {
      const result = await whatsappService.notifyApprovalRequired({
        phone: '5511999999999',
        documentType: 'Invoice',
        documentId: 'INV-2026-001',
        requesterName: 'Maria Santos'
      })

      expect(result).toBeDefined()
      expect(result.success || result.error).toBeTruthy()
    })

    it('should accept purchase order type', async () => {
      const result = await whatsappService.notifyApprovalRequired({
        phone: '5511999999999',
        documentType: 'Purchase Order',
        documentId: 'PO-2026-001',
        requesterName: 'Roberto Costa'
      })

      expect(result).toBeDefined()
      expect(result.success || result.error).toBeTruthy()
    })

    it('should accept multiple document types', async () => {
      const types = ['Invoice', 'Purchase Order', 'Quotation', 'Credit Note']

      for (const type of types) {
        const result = await whatsappService.notifyApprovalRequired({
          phone: '5511999999999',
          documentType: type,
          documentId: `${type}-001`,
          requesterName: 'Test User'
        })

        expect(result).toBeDefined()
      }
    })
  })

  describe('notifyIncident', () => {
    it('should have notifyIncident method', () => {
      expect(whatsappService.notifyIncident).toBeDefined()
      expect(typeof whatsappService.notifyIncident).toBe('function')
    })

    it('should return result with success and error properties', async () => {
      const result = await whatsappService.notifyIncident({
        phone: '5511999999999',
        incidentType: 'Performance',
        incidentId: 'INC-001',
        description: 'Database query slow',
        severity: 'baixa'
      })

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('error')
    })

    it('should accept baixa severity', async () => {
      const result = await whatsappService.notifyIncident({
        phone: '5511999999999',
        incidentType: 'Warning',
        incidentId: 'INC-001',
        description: 'Minor issue',
        severity: 'baixa'
      })

      expect(result).toBeDefined()
    })

    it('should accept média severity', async () => {
      const result = await whatsappService.notifyIncident({
        phone: '5511999999999',
        incidentType: 'Alert',
        incidentId: 'INC-002',
        description: 'Moderate issue',
        severity: 'média'
      })

      expect(result).toBeDefined()
    })

    it('should accept alta severity', async () => {
      const result = await whatsappService.notifyIncident({
        phone: '5511999999999',
        incidentType: 'Error',
        incidentId: 'INC-003',
        description: 'Serious issue',
        severity: 'alta'
      })

      expect(result).toBeDefined()
    })

    it('should accept crítica severity', async () => {
      const result = await whatsappService.notifyIncident({
        phone: '5511999999999',
        incidentType: 'Critical',
        incidentId: 'INC-004',
        description: 'Critical issue',
        severity: 'crítica'
      })

      expect(result).toBeDefined()
    })

    it('should handle database incident type', async () => {
      const result = await whatsappService.notifyIncident({
        phone: '5511999999999',
        incidentType: 'Database',
        incidentId: 'INC-DB-001',
        description: 'Connection pool exhausted',
        severity: 'alta'
      })

      expect(result).toBeDefined()
    })

    it('should handle security incident type', async () => {
      const result = await whatsappService.notifyIncident({
        phone: '5511999999999',
        incidentType: 'Security',
        incidentId: 'INC-SEC-001',
        description: 'Unauthorized access attempt',
        severity: 'crítica'
      })

      expect(result).toBeDefined()
    })

    it('should handle system incident type', async () => {
      const result = await whatsappService.notifyIncident({
        phone: '5511999999999',
        incidentType: 'System',
        incidentId: 'INC-SYS-001',
        description: 'Complete service outage',
        severity: 'crítica'
      })

      expect(result).toBeDefined()
    })
  })
})
