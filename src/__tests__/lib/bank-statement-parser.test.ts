import { describe, it, expect } from 'vitest'
import { parseOFX, detectFileFormat, parseCSV } from '@/lib/statement-parser'

describe('Bank Statement Parser', () => {
  describe('detectFileFormat', () => {
    it('should detect OFX format by OFXHEADER', () => {
      const content = 'OFXHEADER:100\n<OFX>'
      expect(detectFileFormat(content)).toBe('OFX')
    })

    it('should detect OFX format by <OFX> tag', () => {
      const content = '<OFX>\n<BANKMSGSRSV1>'
      expect(detectFileFormat(content)).toBe('OFX')
    })

    it('should detect OFX format by <OFX with attributes', () => {
      const content = '<OFX version="1.0">'
      expect(detectFileFormat(content)).toBe('OFX')
    })

    it('should detect OFX format case-insensitive', () => {
      const content = '<ofx>'
      expect(detectFileFormat(content)).toBe('OFX')
    })

    it('should return CSV for non-OFX content', () => {
      const content = 'Date,Description,Amount\n2026-01-01,Payment,-100.00'
      expect(detectFileFormat(content)).toBe('CSV')
    })

    it('should handle whitespace in OFX detection', () => {
      const content = '  \n  OFXHEADER:100\n  '
      expect(detectFileFormat(content)).toBe('OFX')
    })
  })

  describe('parseOFX', () => {
    const sampleOFX = `OFXHEADER:100
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260315120000
<TRNAMT>-1500.00
<FITID>2026031501
<MEMO>PAGAMENTO FORNECEDOR
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260320120000
<TRNAMT>25000.00
<FITID>2026032001
<MEMO>RECEBIMENTO MEDICAO
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`

    it('should extract transactions from OFX content', () => {
      const transactions = parseOFX(sampleOFX)
      expect(transactions).toHaveLength(2)
    })

    it('should handle DEBIT transactions correctly', () => {
      const transactions = parseOFX(sampleOFX)
      const debitTx = transactions.find(tx => tx.type === 'DEBIT')

      expect(debitTx).toBeDefined()
      expect(debitTx!.type).toBe('DEBIT')
      expect(debitTx!.amount).toBe(1500)
    })

    it('should handle CREDIT transactions correctly', () => {
      const transactions = parseOFX(sampleOFX)
      const creditTx = transactions.find(tx => tx.type === 'CREDIT')

      expect(creditTx).toBeDefined()
      expect(creditTx!.type).toBe('CREDIT')
      expect(creditTx!.amount).toBe(25000)
    })

    it('should parse dates correctly', () => {
      const transactions = parseOFX(sampleOFX)

      expect(transactions[0]!.date).toBeInstanceOf(Date)
      expect(transactions[0]!.date.getFullYear()).toBe(2026)
      expect(transactions[0]!.date.getMonth()).toBe(2) // March (0-indexed)
      expect(transactions[0]!.date.getDate()).toBe(15)
    })

    it('should extract transaction IDs', () => {
      const transactions = parseOFX(sampleOFX)

      expect(transactions[0]!.externalId).toBe('2026031501')
      expect(transactions[1]!.externalId).toBe('2026032001')
    })

    it('should extract memo as description', () => {
      const transactions = parseOFX(sampleOFX)

      expect(transactions[0]!.description).toContain('PAGAMENTO FORNECEDOR')
      expect(transactions[1]!.description).toContain('RECEBIMENTO MEDICAO')
    })

    it('should return empty array for empty OFX', () => {
      const transactions = parseOFX('<OFX></OFX>')
      expect(transactions).toEqual([])
    })

    it('should handle OFX with balance information', () => {
      const ofxWithBalance = `<OFX>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260320120000
<TRNAMT>1000.00
<FITID>123
<MEMO>Payment
<BALAMT>5000.00
</STMTTRN>
</OFX>`

      const transactions = parseOFX(ofxWithBalance)
      expect(transactions[0]!.balance).toBe(5000)
    })

    it('should handle Brazilian decimal format in amounts', () => {
      const brazilianOFX = `<OFX>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260320120000
<TRNAMT>1500,50
<FITID>123
<MEMO>Payment
</STMTTRN>
</OFX>`

      const transactions = parseOFX(brazilianOFX)
      expect(transactions[0]!.amount).toBe(1500.5)
    })

    it('should skip transactions with missing required fields', () => {
      const incompleteOFX = `<OFX>
<STMTTRN>
<TRNTYPE>CREDIT
<MEMO>Missing date and amount
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260320120000
<TRNAMT>1000.00
<FITID>456
<MEMO>Valid transaction
</STMTTRN>
</OFX>`

      const transactions = parseOFX(incompleteOFX)
      expect(transactions).toHaveLength(1)
      expect(transactions[0]!.externalId).toBe('456')
    })

    it('should use default description when memo is missing', () => {
      const noMemoOFX = `<OFX>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260320120000
<TRNAMT>1000.00
<FITID>789
</STMTTRN>
</OFX>`

      const transactions = parseOFX(noMemoOFX)
      expect(transactions[0]!.description).toBe('Sem descrição')
    })

    it('should determine type by TRNTYPE field', () => {
      const typeOFX = `<OFX>
<STMTTRN>
<TRNTYPE>DEP
<DTPOSTED>20260320120000
<TRNAMT>500.00
<FITID>111
</STMTTRN>
<STMTTRN>
<TRNTYPE>CHECK
<DTPOSTED>20260320120000
<TRNAMT>-200.00
<FITID>222
</STMTTRN>
</OFX>`

      const transactions = parseOFX(typeOFX)
      expect(transactions[0]!.type).toBe('CREDIT') // DEP = deposit
      expect(transactions[1]!.type).toBe('DEBIT')   // CHECK = debit
    })

    it('should use amount sign as fallback for type determination', () => {
      const noTypeOFX = `<OFX>
<STMTTRN>
<DTPOSTED>20260320120000
<TRNAMT>1000.00
<FITID>333
<MEMO>Positive amount
</STMTTRN>
<STMTTRN>
<DTPOSTED>20260320120000
<TRNAMT>-500.00
<FITID>444
<MEMO>Negative amount
</STMTTRN>
</OFX>`

      const transactions = parseOFX(noTypeOFX)
      expect(transactions[0]!.type).toBe('CREDIT')
      expect(transactions[1]!.type).toBe('DEBIT')
    })

    it('should always store amount as positive', () => {
      const transactions = parseOFX(sampleOFX)

      expect(transactions.every(tx => tx.amount > 0)).toBe(true)
    })
  })

  describe('parseCSV', () => {
    it('should parse basic CSV content', () => {
      const csv = `Data,Descrição,Valor
2026-01-15,Pagamento,-1000.00
2026-01-20,Depósito,5000.00`

      const transactions = parseCSV(csv)
      expect(transactions.length).toBeGreaterThan(0)
    })

    it('should auto-detect column positions', () => {
      const csv = `Data,Descrição,Valor
2026-01-15,Pagamento,-1000.00
2026-01-20,Depósito,5000.00`

      const transactions = parseCSV(csv)
      expect(transactions[0]!.description).toContain('Pagamento')
      expect(transactions[1]!.description).toContain('Depósito')
    })

    it('should handle Brazilian date format', () => {
      const csv = `Data;Descrição;Valor
15/01/2026;Pagamento;-1000.00
20/01/2026;Depósito;5000.00`

      const transactions = parseCSV(csv)
      expect(transactions[0]!.date.getDate()).toBe(15)
      expect(transactions[1]!.date.getDate()).toBe(20)
    })

    it('should return empty array for invalid CSV', () => {
      const csv = ''
      const transactions = parseCSV(csv)
      expect(transactions).toEqual([])
    })

    it('should skip lines with missing required fields', () => {
      const csv = `Data,Descrição,Valor
2026-01-15,Pagamento,-1000.00
,Missing Date,500.00
2026-01-20,Depósito,5000.00`

      const transactions = parseCSV(csv)
      expect(transactions).toHaveLength(2)
    })
  })
})
