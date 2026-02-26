// ============================================================================
// Reconciliation Engine — Auto-reconciliation of bank statement transactions
// ============================================================================

import { prisma } from '@/lib/prisma'

export interface ReconciliationReport {
  total: number
  autoMatched: number
  suggestions: number
  divergent: number
  matchRate: number
}

export interface Suggestion {
  financialRecordId: string
  description: string
  amount: number
  date: Date
  type: string
  status: string
  confidence: number
  matchReason: string
}

// ============================================================================
// AUTO-RECONCILIATION
// ============================================================================

export async function autoReconcile(
  statementId: string,
  companyId: string
): Promise<ReconciliationReport> {
  // Fetch all transactions for this statement
  const transactions = await prisma.bankStatementTransaction.findMany({
    where: {
      statementId,
      reconciliationStatus: 'PENDING',
    },
    include: {
      statement: {
        select: { bankAccountId: true },
      },
    },
  })

  const bankAccountId = transactions[0]?.statement.bankAccountId

  if (!bankAccountId || transactions.length === 0) {
    return { total: 0, autoMatched: 0, suggestions: 0, divergent: 0, matchRate: 0 }
  }

  // Fetch all unreconciled financial records for the same bank account
  const financialRecords = await prisma.financialRecord.findMany({
    where: {
      companyId,
      bankAccountId,
      bankStatementTransaction: null, // Not already reconciled
      status: { not: 'CANCELLED' },
    },
  })

  let autoMatched = 0
  let suggestions = 0
  let divergent = 0

  // Track which financial records have been matched so we don't double-match
  const matchedRecordIds = new Set<string>()

  for (const txn of transactions) {
    const txnType = txn.type // CREDIT or DEBIT
    const expectedFinType = txnType === 'CREDIT' ? 'INCOME' : 'EXPENSE'
    const txnAmount = Math.abs(txn.amount)
    const txnDate = new Date(txn.date)

    // Filter eligible records by type
    const eligible = financialRecords.filter(
      r => r.type === expectedFinType && !matchedRecordIds.has(r.id)
    )

    let matched = false

    // Level 1: Exact Match — same amount + same date
    for (const record of eligible) {
      const recAmount = Number(record.paidAmount) > 0 ? Number(record.paidAmount) : Number(record.amount)
      const recDate = record.paidDate || record.dueDate

      if (
        Math.abs(recAmount - txnAmount) < 0.005 &&
        isSameDate(txnDate, new Date(recDate))
      ) {
        await matchTransaction(txn.id, record.id, 'AUTO_MATCHED', 'Correspondência exata: valor e data idênticos (100%)')
        matchedRecordIds.add(record.id)
        autoMatched++
        matched = true
        break
      }
    }
    if (matched) continue

    // Level 2: Value ± R$0.01 + Date ± 3 days
    for (const record of eligible) {
      const recAmount = Number(record.paidAmount) > 0 ? Number(record.paidAmount) : Number(record.amount)
      const recDate = record.paidDate || record.dueDate

      if (
        Math.abs(recAmount - txnAmount) <= 0.01 &&
        daysDiff(txnDate, new Date(recDate)) <= 3
      ) {
        const days = daysDiff(txnDate, new Date(recDate))
        await matchTransaction(
          txn.id,
          record.id,
          'AUTO_MATCHED',
          `Correspondência por valor (±R$0,01) e data (±${days} dia(s)) — confiança 90%`
        )
        matchedRecordIds.add(record.id)
        autoMatched++
        matched = true
        break
      }
    }
    if (matched) continue

    // Level 3: Value + Description similarity > 70%
    for (const record of eligible) {
      const recAmount = Number(record.paidAmount) > 0 ? Number(record.paidAmount) : Number(record.amount)

      if (Math.abs(recAmount - txnAmount) < 0.005) {
        const similarity = textSimilarity(txn.description, record.description)
        if (similarity >= 0.7) {
          await matchTransaction(
            txn.id,
            record.id,
            'AUTO_MATCHED',
            `Correspondência por valor e descrição similar (${Math.round(similarity * 100)}%) — confiança 80%`
          )
          matchedRecordIds.add(record.id)
          autoMatched++
          matched = true
          break
        }
      }
    }
    if (matched) continue

    // Level 4: Suggestion — partial match (same amount, different date >3 days)
    let hasSuggestion = false
    for (const record of eligible) {
      const recAmount = Number(record.paidAmount) > 0 ? Number(record.paidAmount) : Number(record.amount)
      const amountDiff = Math.abs(recAmount - txnAmount)

      if (amountDiff <= txnAmount * 0.05) {
        // Within 5% of amount
        const similarity = textSimilarity(txn.description, record.description)
        const confidence = calculateConfidence(txnAmount, recAmount, txnDate, record.paidDate || record.dueDate, similarity)

        if (confidence >= 30) {
          await prisma.bankStatementTransaction.update({
            where: { id: txn.id },
            data: {
              reconciliationStatus: 'PENDING',
              reconciliationNote: `Sugestão: "${record.description}" (${fmt(recAmount)}) — confiança ${Math.round(confidence)}%`,
            },
          })
          hasSuggestion = true
          suggestions++
          break
        }
      }
    }
    if (hasSuggestion) continue

    // Level 5: No match — DIVERGENT
    await prisma.bankStatementTransaction.update({
      where: { id: txn.id },
      data: {
        reconciliationStatus: 'DIVERGENT',
        reconciliationNote: 'Nenhuma correspondência encontrada no sistema',
      },
    })
    divergent++
  }

  // Update statement totals and status
  const allTxns = await prisma.bankStatementTransaction.findMany({
    where: { statementId },
  })

  const totalCredits = allTxns
    .filter(t => t.type === 'CREDIT')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const totalDebits = allTxns
    .filter(t => t.type === 'DEBIT')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const matchedCount = allTxns.filter(
    t => t.reconciliationStatus === 'MATCHED' || t.reconciliationStatus === 'AUTO_MATCHED'
  ).length
  const divergentCount = allTxns.filter(t => t.reconciliationStatus === 'DIVERGENT').length

  let statementStatus: 'PENDING' | 'RECONCILING' | 'RECONCILED' | 'DIVERGENT'
  if (matchedCount === allTxns.length) {
    statementStatus = 'RECONCILED'
  } else if (divergentCount > 0 && matchedCount === 0) {
    statementStatus = 'DIVERGENT'
  } else if (matchedCount > 0) {
    statementStatus = 'RECONCILING'
  } else {
    statementStatus = 'PENDING'
  }

  await prisma.bankStatement.update({
    where: { id: statementId },
    data: {
      totalCredits,
      totalDebits,
      status: statementStatus,
    },
  })

  const total = transactions.length
  const matchRate = total > 0 ? Math.round((autoMatched / total) * 100) : 0

  return {
    total,
    autoMatched,
    suggestions,
    divergent,
    matchRate,
  }
}

// ============================================================================
// SUGGESTIONS
// ============================================================================

export async function getSuggestions(
  transactionId: string,
  companyId: string
): Promise<Suggestion[]> {
  const txn = await prisma.bankStatementTransaction.findUnique({
    where: { id: transactionId },
    include: {
      statement: { select: { bankAccountId: true } },
    },
  })

  if (!txn) return []

  const bankAccountId = txn.statement.bankAccountId
  const txnType = txn.type
  const expectedFinType = txnType === 'CREDIT' ? 'INCOME' : 'EXPENSE'
  const txnAmount = Math.abs(txn.amount)
  const txnDate = new Date(txn.date)

  // Find potential matches — broader search
  const candidates = await prisma.financialRecord.findMany({
    where: {
      companyId,
      type: expectedFinType,
      status: { not: 'CANCELLED' },
      bankStatementTransaction: null,
      // Look within a broader amount range (±20%)
      amount: {
        gte: txnAmount * 0.8,
        lte: txnAmount * 1.2,
      },
    },
    take: 20,
    orderBy: { dueDate: 'desc' },
  })

  // Also search by same bank account with wider amount range
  const accountCandidates = await prisma.financialRecord.findMany({
    where: {
      companyId,
      bankAccountId,
      type: expectedFinType,
      status: { not: 'CANCELLED' },
      bankStatementTransaction: null,
      id: { notIn: candidates.map(c => c.id) },
    },
    take: 10,
    orderBy: { dueDate: 'desc' },
  })

  const allCandidates = [...candidates, ...accountCandidates]

  const suggestions: Suggestion[] = allCandidates.map(record => {
    const recAmount = Number(record.paidAmount) > 0 ? Number(record.paidAmount) : Number(record.amount)
    const recDate = record.paidDate || record.dueDate
    const similarity = textSimilarity(txn.description, record.description)
    const confidence = calculateConfidence(txnAmount, recAmount, txnDate, recDate, similarity)

    let matchReason = ''
    const amountDiff = Math.abs(recAmount - txnAmount)
    const dateDiff = daysDiff(txnDate, new Date(recDate))

    if (amountDiff < 0.005 && dateDiff === 0) {
      matchReason = 'Valor e data exatos'
    } else if (amountDiff <= 0.01 && dateDiff <= 3) {
      matchReason = `Valor (±R$0,01), data ±${dateDiff} dia(s)`
    } else if (amountDiff < 0.005 && similarity >= 0.5) {
      matchReason = `Valor exato, descrição ${Math.round(similarity * 100)}% similar`
    } else {
      const parts: string[] = []
      if (amountDiff / txnAmount < 0.05) parts.push('Valor próximo')
      else parts.push(`Dif. valor: ${fmt(amountDiff)}`)
      if (dateDiff <= 7) parts.push(`±${dateDiff} dia(s)`)
      if (similarity >= 0.3) parts.push(`Descrição ${Math.round(similarity * 100)}%`)
      matchReason = parts.join(', ')
    }

    return {
      financialRecordId: record.id,
      description: record.description,
      amount: recAmount,
      date: recDate,
      type: record.type,
      status: record.status,
      confidence,
      matchReason,
    }
  })

  // Sort by confidence descending
  suggestions.sort((a, b) => b.confidence - a.confidence)

  return suggestions.slice(0, 10)
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function matchTransaction(
  transactionId: string,
  financialRecordId: string,
  status: 'MATCHED' | 'AUTO_MATCHED',
  note: string
): Promise<void> {
  await prisma.bankStatementTransaction.update({
    where: { id: transactionId },
    data: {
      financialRecordId,
      reconciliationStatus: status,
      reconciliationNote: note,
    },
  })
}

function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function daysDiff(a: Date, b: Date): number {
  const msPerDay = 86400000
  const aDate = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const bDate = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.abs(Math.round((aDate.getTime() - bDate.getTime()) / msPerDay))
}

/**
 * Simple word-overlap text similarity (no external libs).
 * Returns 0..1 where 1 = identical word sets.
 */
function textSimilarity(a: string, b: string): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2)

  const wordsA = normalize(a)
  const wordsB = normalize(b)

  if (wordsA.length === 0 || wordsB.length === 0) return 0

  const setA = new Set(wordsA)
  const setB = new Set(wordsB)

  let intersection = 0
  for (const w of setA) {
    if (setB.has(w)) intersection++
  }

  const union = new Set([...setA, ...setB]).size
  return union > 0 ? intersection / union : 0
}

function calculateConfidence(
  txnAmount: number,
  recAmount: number,
  txnDate: Date,
  recDate: Date,
  textSim: number
): number {
  let score = 0

  // Amount match (max 50 points)
  const amountDiff = Math.abs(txnAmount - recAmount)
  if (amountDiff < 0.005) {
    score += 50
  } else if (amountDiff <= 0.01) {
    score += 48
  } else if (amountDiff / txnAmount < 0.01) {
    score += 40
  } else if (amountDiff / txnAmount < 0.05) {
    score += 25
  } else if (amountDiff / txnAmount < 0.1) {
    score += 10
  }

  // Date match (max 30 points)
  const days = daysDiff(txnDate, new Date(recDate))
  if (days === 0) {
    score += 30
  } else if (days <= 1) {
    score += 25
  } else if (days <= 3) {
    score += 20
  } else if (days <= 7) {
    score += 10
  } else if (days <= 15) {
    score += 5
  }

  // Text similarity (max 20 points)
  score += Math.round(textSim * 20)

  return Math.min(score, 100)
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
