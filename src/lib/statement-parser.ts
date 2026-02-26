// ============================================================================
// Statement Parser — OFX and CSV bank statement file parsing
// ============================================================================

export interface ParsedTransaction {
  date: Date
  description: string
  amount: number
  type: 'CREDIT' | 'DEBIT'
  externalId?: string
  balance?: number
}

export interface CSVMapping {
  dateColumn: number
  descriptionColumn: number
  amountColumn?: number
  creditColumn?: number
  debitColumn?: number
  separator: string
  dateFormat: string // 'DD/MM/YYYY' or 'YYYY-MM-DD'
  skipLines: number
}

// ============================================================================
// FORMAT DETECTION
// ============================================================================

export function detectFileFormat(content: string): 'OFX' | 'CSV' {
  const trimmed = content.trim()
  if (
    trimmed.startsWith('OFXHEADER') ||
    trimmed.includes('<OFX>') ||
    trimmed.includes('<OFX ') ||
    trimmed.includes('<ofx>')
  ) {
    return 'OFX'
  }
  return 'CSV'
}

// ============================================================================
// OFX PARSER
// ============================================================================

export function parseOFX(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []

  // Extract all <STMTTRN>...</STMTTRN> blocks
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  let match: RegExpExecArray | null

  while ((match = stmtTrnRegex.exec(content)) !== null) {
    const block = match[1]!

    const dtPosted = extractOFXTag(block, 'DTPOSTED')
    const trnAmt = extractOFXTag(block, 'TRNAMT')
    const name = extractOFXTag(block, 'NAME')
    const memo = extractOFXTag(block, 'MEMO')
    const fitId = extractOFXTag(block, 'FITID')
    const trnType = extractOFXTag(block, 'TRNTYPE')
    const balAmt = extractOFXTag(block, 'BALAMT')

    if (!dtPosted || !trnAmt) continue

    const date = parseOFXDate(dtPosted)
    if (!date) continue

    const amount = parseFloat(trnAmt.replace(',', '.'))
    if (isNaN(amount)) continue

    const description = (name || memo || 'Sem descrição').trim()

    // Determine type: positive = CREDIT, negative = DEBIT
    // Also consider TRNTYPE: CREDIT, DEBIT, DEP (deposit), etc.
    let type: 'CREDIT' | 'DEBIT'
    if (trnType) {
      const upperType = trnType.toUpperCase().trim()
      if (upperType === 'DEBIT' || upperType === 'CHECK' || upperType === 'PAYMENT' || upperType === 'FEE' || upperType === 'SRVCHG') {
        type = 'DEBIT'
      } else if (upperType === 'CREDIT' || upperType === 'DEP' || upperType === 'DIRECTDEP' || upperType === 'INT') {
        type = 'CREDIT'
      } else {
        type = amount >= 0 ? 'CREDIT' : 'DEBIT'
      }
    } else {
      type = amount >= 0 ? 'CREDIT' : 'DEBIT'
    }

    const balance = balAmt ? parseFloat(balAmt.replace(',', '.')) : undefined

    transactions.push({
      date,
      description,
      amount: Math.abs(amount),
      type,
      externalId: fitId || undefined,
      balance: isNaN(balance as number) ? undefined : balance,
    })
  }

  return transactions
}

function extractOFXTag(block: string, tag: string): string | null {
  // OFX can be in two formats:
  // 1. <TAG>value (no closing tag, SGML style)
  // 2. <TAG>value</TAG> (XML style)
  const xmlRegex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i')
  const xmlMatch = xmlRegex.exec(block)
  if (xmlMatch) return xmlMatch[1]!.trim()

  const sgmlRegex = new RegExp(`<${tag}>([^\\n<]+)`, 'i')
  const sgmlMatch = sgmlRegex.exec(block)
  if (sgmlMatch) return sgmlMatch[1]!.trim()

  return null
}

function parseOFXDate(dateStr: string): Date | null {
  // Format: YYYYMMDDHHMMSS or YYYYMMDD or YYYYMMDDHHMMSS[timezone]
  const cleaned = dateStr.replace(/\[.*\]/, '').trim()

  if (cleaned.length >= 8) {
    const year = parseInt(cleaned.substring(0, 4))
    const month = parseInt(cleaned.substring(4, 6)) - 1 // 0-based
    const day = parseInt(cleaned.substring(6, 8))
    let hour = 0, minute = 0, second = 0

    if (cleaned.length >= 14) {
      hour = parseInt(cleaned.substring(8, 10))
      minute = parseInt(cleaned.substring(10, 12))
      second = parseInt(cleaned.substring(12, 14))
    }

    const date = new Date(year, month, day, hour, minute, second)
    if (!isNaN(date.getTime())) return date
  }

  return null
}

// ============================================================================
// CSV PARSER
// ============================================================================

interface BankPresetConfig {
  mapping: CSVMapping
  headerPattern?: RegExp
}

const BANK_PRESETS: Record<string, BankPresetConfig> = {
  itau: {
    mapping: {
      dateColumn: 0,
      descriptionColumn: 1,
      amountColumn: 2,
      separator: ';',
      dateFormat: 'DD/MM/YYYY',
      skipLines: 1,
    },
    headerPattern: /data/i,
  },
  bradesco: {
    mapping: {
      dateColumn: 0,
      descriptionColumn: 1,
      creditColumn: 2,
      debitColumn: 3,
      separator: ';',
      dateFormat: 'DD/MM/YYYY',
      skipLines: 1,
    },
  },
  santander: {
    mapping: {
      dateColumn: 0,
      descriptionColumn: 1,
      amountColumn: 2,
      separator: ';',
      dateFormat: 'DD/MM/YYYY',
      skipLines: 1,
    },
  },
  bb: {
    mapping: {
      dateColumn: 0,
      descriptionColumn: 2,
      amountColumn: 3,
      separator: ';',
      dateFormat: 'DD/MM/YYYY',
      skipLines: 1,
    },
  },
  nubank: {
    mapping: {
      dateColumn: 0,
      descriptionColumn: 1,
      amountColumn: 2,
      separator: ',',
      dateFormat: 'YYYY-MM-DD',
      skipLines: 1,
    },
  },
}

export function parseCSV(content: string, bankPreset?: string): ParsedTransaction[] {
  const lines = content
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0)

  if (lines.length < 2) return []

  let mapping: CSVMapping

  if (bankPreset && bankPreset !== 'generico' && BANK_PRESETS[bankPreset]) {
    mapping = BANK_PRESETS[bankPreset]!.mapping
  } else {
    // Auto-detect
    mapping = autoDetectCSVMapping(lines)
  }

  const transactions: ParsedTransaction[] = []
  const dataLines = lines.slice(mapping.skipLines)

  for (const line of dataLines) {
    const columns = splitCSVLine(line, mapping.separator)
    if (columns.length < 2) continue

    // Parse date
    const dateStr = columns[mapping.dateColumn]
    if (!dateStr) continue
    const date = parseCSVDate(dateStr.trim(), mapping.dateFormat)
    if (!date) continue

    // Parse description
    const description = (columns[mapping.descriptionColumn] || '').trim().replace(/^"|"$/g, '')
    if (!description) continue

    // Parse amount
    let amount: number
    let type: 'CREDIT' | 'DEBIT'

    if (mapping.creditColumn !== undefined && mapping.debitColumn !== undefined) {
      // Separate credit/debit columns
      const creditStr = columns[mapping.creditColumn] || ''
      const debitStr = columns[mapping.debitColumn] || ''
      const creditVal = parseBRNumber(creditStr)
      const debitVal = parseBRNumber(debitStr)

      if (creditVal && creditVal > 0) {
        amount = creditVal
        type = 'CREDIT'
      } else if (debitVal && debitVal > 0) {
        amount = debitVal
        type = 'DEBIT'
      } else if (debitVal && debitVal < 0) {
        amount = Math.abs(debitVal)
        type = 'DEBIT'
      } else {
        continue
      }
    } else if (mapping.amountColumn !== undefined) {
      // Single amount column
      const amountStr = columns[mapping.amountColumn] || ''
      const parsed = parseBRNumber(amountStr)
      if (parsed === null || parsed === 0) continue

      amount = Math.abs(parsed)
      type = parsed >= 0 ? 'CREDIT' : 'DEBIT'
    } else {
      continue
    }

    transactions.push({
      date,
      description,
      amount,
      type,
    })
  }

  return transactions
}

function autoDetectCSVMapping(lines: string[]): CSVMapping {
  const firstLine = lines[0] || ''

  // Detect separator
  const semicolonCount = (firstLine.match(/;/g) || []).length
  const commaCount = (firstLine.match(/,/g) || []).length
  const separator = semicolonCount > commaCount ? ';' : ','

  // Detect date format from first data line
  const headerCols = splitCSVLine(firstLine, separator)
  const dataLine = lines[1] || ''
  const dataCols = splitCSVLine(dataLine, separator)

  let dateColumn = 0
  let dateFormat = 'DD/MM/YYYY'
  let descriptionColumn = 1
  let amountColumn = 2

  // Try to find date column
  for (let i = 0; i < dataCols.length; i++) {
    const col = (dataCols[i] || '').trim()
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(col)) {
      dateColumn = i
      dateFormat = 'DD/MM/YYYY'
      break
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(col)) {
      dateColumn = i
      dateFormat = 'YYYY-MM-DD'
      break
    }
  }

  // Try to find description column (longest text that is not a number)
  let maxTextLen = 0
  for (let i = 0; i < dataCols.length; i++) {
    if (i === dateColumn) continue
    const col = (dataCols[i] || '').trim()
    if (col.length > maxTextLen && !isNumericLike(col)) {
      maxTextLen = col.length
      descriptionColumn = i
    }
  }

  // Try to find amount column (first numeric column that is not date/description)
  for (let i = 0; i < dataCols.length; i++) {
    if (i === dateColumn || i === descriptionColumn) continue
    const col = (dataCols[i] || '').trim()
    if (isNumericLike(col)) {
      amountColumn = i
      break
    }
  }

  // Check if header hints at separate credit/debit columns
  const headerLower = headerCols.map(h => (h || '').toLowerCase().trim())
  const creditIdx = headerLower.findIndex(h => h.includes('créd') || h.includes('credit') || h.includes('entrada'))
  const debitIdx = headerLower.findIndex(h => h.includes('déb') || h.includes('debit') || h.includes('saída') || h.includes('saida'))

  if (creditIdx >= 0 && debitIdx >= 0) {
    return {
      dateColumn,
      descriptionColumn,
      creditColumn: creditIdx,
      debitColumn: debitIdx,
      separator,
      dateFormat,
      skipLines: 1,
    }
  }

  return {
    dateColumn,
    descriptionColumn,
    amountColumn,
    separator,
    dateFormat,
    skipLines: 1,
  }
}

function splitCSVLine(line: string, separator: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]!
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === separator && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

function parseCSVDate(dateStr: string, format: string): Date | null {
  const cleaned = dateStr.replace(/^"|"$/g, '').trim()

  if (format === 'DD/MM/YYYY') {
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(cleaned)
    if (match) {
      const day = parseInt(match[1]!)
      const month = parseInt(match[2]!) - 1
      const year = parseInt(match[3]!)
      const date = new Date(year, month, day)
      if (!isNaN(date.getTime())) return date
    }
  } else if (format === 'YYYY-MM-DD') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(cleaned)
    if (match) {
      const year = parseInt(match[1]!)
      const month = parseInt(match[2]!) - 1
      const day = parseInt(match[3]!)
      const date = new Date(year, month, day)
      if (!isNaN(date.getTime())) return date
    }
  }

  // Fallback: try Date constructor
  const fallback = new Date(cleaned)
  if (!isNaN(fallback.getTime())) return fallback

  return null
}

/**
 * Parse Brazilian number format: "1.234,56" → 1234.56
 * Also handles: "-1.234,56", "1234.56", "-1234,56"
 */
function parseBRNumber(str: string): number | null {
  const cleaned = str.replace(/^"|"$/g, '').trim()
  if (!cleaned) return null

  // Remove currency symbols and spaces
  let normalized = cleaned.replace(/R\$\s?/g, '').replace(/\s/g, '')

  // Detect BR format: has comma as decimal separator
  if (normalized.includes(',')) {
    // "1.234,56" → "1234.56"
    normalized = normalized.replace(/\./g, '').replace(',', '.')
  }

  const num = parseFloat(normalized)
  return isNaN(num) ? null : num
}

function isNumericLike(str: string): boolean {
  const cleaned = str.replace(/^"|"$/g, '').trim()
  if (!cleaned) return false
  // Check if it looks like a number (possibly BR format)
  return /^-?[\d.,R$\s]+$/.test(cleaned) && /\d/.test(cleaned)
}
