import { describe, it, expect, beforeEach, vi } from 'vitest'
import { sefazService } from '@/lib/sefaz'

// Mock environment variables and fetch
vi.stubEnv('SEFAZ_URL', 'https://nfse.test.gov.br/ws/lotenfe.asmx')
vi.stubEnv('SEFAZ_CERTIFICATE_PATH', null)

describe('SEFAZ Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('emitirNFSe', () => {
    const validNFSeData = {
      prestador: {
        cnpj: '12345678000195',
        inscricaoMunicipal: '123456'
      },
      tomador: {
        cnpj: '98765432000100',
        razaoSocial: 'Cliente Teste Ltda'
      },
      servico: {
        codigoTributacao: '01',
        discriminacao: 'Serviço de consultoria',
        valorServicos: 1000.00,
        aliquota: 0.15
      },
      competencia: '2026-03'
    }

    it('should return simulated result when no certificate', async () => {
      const result = await sefazService.emitirNFSe(validNFSeData)

      expect(result.success).toBe(true)
      expect(result.numero).toBeDefined()
      expect(result.codigoVerificacao).toBeDefined()
      expect(result.dataEmissao).toBeDefined()
      expect(result.xml).toBeDefined()
    })

    it('should generate valid numero format in development mode', async () => {
      const result = await sefazService.emitirNFSe(validNFSeData)

      expect(result.numero).toMatch(/^SIM-\d+$/)
    })

    it('should generate verification code', async () => {
      const result = await sefazService.emitirNFSe(validNFSeData)

      expect(result.codigoVerificacao).toBeDefined()
      expect(typeof result.codigoVerificacao).toBe('string')
      expect(result.codigoVerificacao!.length).toBeGreaterThan(0)
    })

    it('should include ISO timestamp in dataEmissao', async () => {
      const result = await sefazService.emitirNFSe(validNFSeData)

      expect(result.dataEmissao).toBeDefined()
      const date = new Date(result.dataEmissao!)
      expect(date.getTime()).toBeGreaterThan(0)
    })

    it('should build valid XML structure', async () => {
      const result = await sefazService.emitirNFSe(validNFSeData)

      expect(result.xml).toBeDefined()
      expect(result.xml).toContain('<?xml version')
      expect(result.xml).toContain('EnviarLoteRpsEnvio')
      expect(result.xml).toContain('LoteRps')
      expect(result.xml).toContain('Prestador')
      expect(result.xml).toContain('Tomador')
    })

    it('should include prestador CNPJ in XML', async () => {
      const result = await sefazService.emitirNFSe(validNFSeData)

      expect(result.xml).toContain(validNFSeData.prestador.cnpj)
    })

    it('should include inscricao municipal in XML', async () => {
      const result = await sefazService.emitirNFSe(validNFSeData)

      expect(result.xml).toContain('InscricaoMunicipal')
      expect(result.xml).toContain(validNFSeData.prestador.inscricaoMunicipal!)
    })

    it('should include tomador CNPJ in XML', async () => {
      const result = await sefazService.emitirNFSe(validNFSeData)

      expect(result.xml).toContain(validNFSeData.tomador.cnpj)
    })

    it('should include tomador razao social in XML', async () => {
      const result = await sefazService.emitirNFSe(validNFSeData)

      expect(result.xml).toContain(validNFSeData.tomador.razaoSocial)
    })

    it('should include service values in XML', async () => {
      const result = await sefazService.emitirNFSe(validNFSeData)

      expect(result.xml).toContain('ValorServicos')
      expect(result.xml).toContain('1000')
    })

    it('should include aliquota in XML', async () => {
      const result = await sefazService.emitirNFSe(validNFSeData)

      expect(result.xml).toContain('Aliquota')
      expect(result.xml).toContain('0.15')
    })

    it('should include service discrimination in XML', async () => {
      const result = await sefazService.emitirNFSe(validNFSeData)

      expect(result.xml).toContain('Discriminacao')
      expect(result.xml).toContain('consultoria')
    })

    it('should include competencia in XML', async () => {
      const result = await sefazService.emitirNFSe(validNFSeData)

      expect(result.xml).toContain('Competencia')
      expect(result.xml).toContain('2026-03')
    })

    it('should handle special characters in discriminacao', async () => {
      const dataWithSpecial = {
        ...validNFSeData,
        servico: {
          ...validNFSeData.servico,
          discriminacao: 'Serviço com <, >, & caracteres'
        }
      }

      const result = await sefazService.emitirNFSe(dataWithSpecial)

      expect(result.xml).toBeDefined()
      expect(result.xml).toContain('&lt;')
      expect(result.xml).toContain('&amp;')
    })

    it('should handle CPF instead of CNPJ for tomador', async () => {
      const dataWithCPF = {
        ...validNFSeData,
        tomador: {
          cpf: '12345678900',
          razaoSocial: 'Pessoa Física'
        }
      }

      const result = await sefazService.emitirNFSe(dataWithCPF)

      expect(result.xml).toContain('Cpf')
      expect(result.xml).toContain('12345678900')
    })

    it('should generate numero with SIM- prefix', async () => {
      const result1 = await sefazService.emitirNFSe(validNFSeData)
      const result2 = await sefazService.emitirNFSe(validNFSeData)

      expect(result1.numero).toMatch(/^SIM-\d+$/)
      expect(result2.numero).toMatch(/^SIM-\d+$/)
      // Both should be valid format even if they happen to match
      expect(result1.numero).toBeDefined()
      expect(result2.numero).toBeDefined()
    })

    it('should set error to undefined in development mode', async () => {
      const result = await sefazService.emitirNFSe(validNFSeData)

      expect(result.error).toBeUndefined()
    })
  })

  describe('consultarNFSe', () => {
    it('should return simulated result when no certificate', async () => {
      const result = await sefazService.consultarNFSe('SIM-123456', 'abc123')

      expect(result.success).toBe(true)
      expect(result.numero).toBe('SIM-123456')
    })
  })

  describe('cancelarNFSe', () => {
    it('should return success when no certificate', async () => {
      const result = await sefazService.cancelarNFSe('SIM-123456', 'Cancelado por erro')

      expect(result.success).toBe(true)
    })
  })

  describe('XML escaping', () => {
    it('should escape ampersand in discriminacao', async () => {
      const data = {
        prestador: { cnpj: '12345678000195' },
        tomador: { cnpj: '98765432000100', razaoSocial: 'Teste & Cia' },
        servico: {
          codigoTributacao: '01',
          discriminacao: 'A & B',
          valorServicos: 100,
          aliquota: 0.15
        },
        competencia: '2026-03'
      }

      const result = await sefazService.emitirNFSe(data)
      expect(result.xml).toContain('A &amp; B')
    })

    it('should escape less than in discriminacao', async () => {
      const data = {
        prestador: { cnpj: '12345678000195' },
        tomador: { cnpj: '98765432000100', razaoSocial: 'Teste' },
        servico: {
          codigoTributacao: '01',
          discriminacao: 'Valor < 100',
          valorServicos: 100,
          aliquota: 0.15
        },
        competencia: '2026-03'
      }

      const result = await sefazService.emitirNFSe(data)
      expect(result.xml).toContain('Valor &lt; 100')
    })

    it('should escape greater than in discriminacao', async () => {
      const data = {
        prestador: { cnpj: '12345678000195' },
        tomador: { cnpj: '98765432000100', razaoSocial: 'Teste' },
        servico: {
          codigoTributacao: '01',
          discriminacao: 'Valor > 50',
          valorServicos: 100,
          aliquota: 0.15
        },
        competencia: '2026-03'
      }

      const result = await sefazService.emitirNFSe(data)
      expect(result.xml).toContain('Valor &gt; 50')
    })
  })
})
