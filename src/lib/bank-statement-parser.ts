// ============================================================================
// Bank Statement Parser — Extended support for OFX, CNAB 240, and CSV
// ============================================================================

export interface BankTransaction {
  date: Date
  description: string
  amount: number
  type: 'CREDIT' | 'DEBIT'
  fitId?: string  // OFX unique ID
  checkNumber?: string
  memo?: string
}

// ============================================================================
// FORMAT DETECTION
// ============================================================================

export function detectBankFormat(content: string): 'OFX' | 'CNAB240' | 'CSV' | 'UNKNOWN' {
  const trimmed = content.trim()

  // OFX detection
  if (trimmed.startsWith('OFXHEADER') || trimmed.includes('<OFX>') || trimmed.includes('<ofx>')) {
    return 'OFX'
  }

  // CNAB 240 detection - fixed width, 240 chars per line
  const lines = trimmed.split('\n')
  if (lines.length > 0 && lines[0]?.length === 240) {
    return 'CNAB240'
  }

  // CSV detection
  if (trimmed.includes(',') || trimmed.includes(';')) {
    return 'CSV'
  }

  return 'UNKNOWN'
}

// ============================================================================
// OFX PARSER
// ============================================================================

export function parseOFX(content: string): BankTransaction[] {
  const transactions: BankTransaction[] = []

  // Split by STMTTRN blocks
  const trxBlocks = content.split(/<STMTTRN>/i).slice(1)

  for (const block of trxBlocks) {
    const endIdx = block.indexOf('</STMTTRN>')
    if (endIdx === -1) continue

    const trxBlock = block.substring(0, endIdx)

    const getField = (name: string): string | null => {
      const regex = new RegExp(`<${name}\\s*>([^<\\n]+)`, 'i')
      const match = regex.exec(trxBlock)
      return match?.[1]?.trim() || null
    }

    const trnType = getField('TRNTYPE')
    const dateStr = getField('DTPOSTED')
    const amountStr = getField('TRNAMT')
    const fitId = getField('FITID')
    const memo = getField('MEMO')
    const name = getField('NAME')
    const checkNum = getField('CHECKNUM')

    if (!dateStr || !amountStr) continue

    // Parse OFX date format: YYYYMMDDHHMMSS
    const year = parseInt(dateStr.substring(0, 4))
    const month = parseInt(dateStr.substring(4, 6)) - 1
    const day = parseInt(dateStr.substring(6, 8))

    if (isNaN(year) || isNaN(month) || isNaN(day)) continue

    const amount = parseFloat(amountStr.replace(',', '.'))
    if (isNaN(amount)) continue

    const description = (name || memo || 'Sem descrição').trim()

    // Determine type based on TRNTYPE or amount sign
    let type: 'CREDIT' | 'DEBIT' = 'CREDIT'
    if (trnType) {
      const upperType = trnType.toUpperCase().trim()
      if (['DEBIT', 'CHECK', 'PAYMENT', 'FEE', 'SRVCHG'].includes(upperType)) {
        type = 'DEBIT'
      } else if (['CREDIT', 'DEP', 'DIRECTDEP', 'INT'].includes(upperType)) {
        type = 'CREDIT'
      } else {
        type = amount >= 0 ? 'CREDIT' : 'DEBIT'
      }
    } else {
      type = amount >= 0 ? 'CREDIT' : 'DEBIT'
    }

    transactions.push({
      date: new Date(year, month, day),
      description,
      amount: Math.abs(amount),
      type,
      fitId: fitId || undefined,
      checkNumber: checkNum || undefined,
      memo: memo || undefined
    })
  }

  return transactions
}

// ============================================================================
// CNAB 240 PARSER
// ============================================================================

export function parseCNAB240(content: string): BankTransaction[] {
  const transactions: BankTransaction[] = []
  const lines = content.split('\n')

  for (const line of lines) {
    if (line.length < 240) continue

    const recordType = line.substring(7, 8)
    const segmentType = line.substring(13, 14)

    // Type 3, Segment E = extrato (statement line)
    if (recordType === '3' && segmentType === 'E') {
      const dateStr = line.substring(142, 150) // DDMMAAAA format
      const day = parseInt(dateStr.substring(0, 2))
      const month = parseInt(dateStr.substring(2, 4)) - 1
      const year = parseInt(dateStr.substring(4, 8))

      if (isNaN(day) || isNaN(month) || isNaN(year)) continue

      // Parse amount (12 digits, 2 decimals)
      const amountStr = line.substring(152, 170).trim()
      const amount = parseInt(amountStr) / 100

      // Debit/Credit indicator: 'C' = credit, 'D' = debit
      const debitCredit = line.substring(150, 151)
      const description = line.substring(17, 57).trim()

      if (!description) continue

      transactions.push({
        date: new Date(year, month, day),
        description,
        amount: Math.abs(amount),
        type: debitCredit === 'C' ? 'CREDIT' : 'DEBIT'
      })
    }
  }

  return transactions
}

// ============================================================================
// CSV PARSER (reuse from statement-parser)
// ============================================================================

export function parseCSVBankStatement(
  content: string,
  options?: {
    separator?: string
    dateFormat?: string
    skipLines?: number
    dateColumn?: number
    descriptionColumn?: number
    amountColumn?: number
    creditColumn?: number
    debitColumn?: number
  }
): BankTransaction[] {
  const lines = content
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0)

  if (lines.length < 2) return []

  const separator = options?.separator ?? ';'
  const dateFormat = options?.dateFormat ?? 'DD/MM/YYYY'
  const skipLines = options?.skipLines ?? 1
  const dateColumn = options?.dateColumn ?? 0
  const descriptionColumn = options?.descriptionColumn ?? 1
  const amountColumn = options?.amountColumn ?? 2

  const transactions: BankTransaction[] = []
  const dataLines = lines.slice(skipLines)

  for (const line of dataLines) {
    const columns = splitCSVLine(line, separator)
    if (columns.length < 2) continue

    // Parse date
    const dateStr = columns[dateColumn]
    if (!dateStr) continue
    const date = parseCSVDate(dateStr.trim(), dateFormat)
    if (!date) continue

    // Parse description
    const description = (columns[descriptionColumn] || '').trim().replace(/^"|"$/g, '')
    if (!description) continue

    // Parse amount
    let amount: number
    let type: 'CREDIT' | 'DEBIT'

    if (options?.creditColumn !== undefined && options?.debitColumn !== undefined) {
      // Separate credit/debit columns
      const creditStr = columns[options.creditColumn] || ''
      const debitStr = columns[options.debitColumn] || ''
      const creditVal = parseBRNumber(creditStr)
      const debitVal = parseBRNumber(debitStr)

      if (creditVal && creditVal > 0) {
        amount = creditVal
        type = 'CREDIT'
      } else if (debitVal && debitVal > 0) {
        amount = debitVal
        type = 'DEBIT'
      } else {
        continue
      }
    } else {
      // Single amount column
      const amountStr = columns[amountColumn] || ''
      const parsed = parseBRNumber(amountStr)
      if (parsed === null || parsed === 0) continue

      amount = Math.abs(parsed)
      type = parsed >= 0 ? 'CREDIT' : 'DEBIT'
    }

    transactions.push({
      date,
      description,
      amount,
      type
    })
  }

  return transactions
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

function parseBRNumber(str: string): number | null {
  const cleaned = str.replace(/^"|"$/g, '').trim()
  if (!cleaned) return null

  let normalized = cleaned.replace(/R\$\s?/g, '').replace(/\s/g, '')

  // Detect BR format: has comma as decimal separator
  if (normalized.includes(',')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.')
  }

  const num = parseFloat(normalized)
  return isNaN(num) ? null : num
}
