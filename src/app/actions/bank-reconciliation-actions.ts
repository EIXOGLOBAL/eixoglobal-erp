'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { detectFileFormat, parseOFX, parseCSV } from '@/lib/statement-parser'
import { autoReconcile, getSuggestions } from '@/lib/reconciliation-engine'
import { toNumber } from '@/lib/formatters'

// ============================================================================
// IMPORT BANK STATEMENT
// ============================================================================

export async function importBankStatement(formData: FormData) {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Não autenticado' }

    const user = session.user as { id: string; role: string; companyId: string; canManageFinancial?: boolean }
    if (!user.companyId) return { success: false, error: 'Empresa não encontrada' }

    // Permission check
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && !user.canManageFinancial) {
      return { success: false, error: 'Sem permissão para importar extratos bancários' }
    }

    const file = formData.get('file') as File | null
    const bankAccountId = formData.get('bankAccountId') as string | null
    const bankPreset = formData.get('bankPreset') as string | null

    if (!file) return { success: false, error: 'Arquivo não fornecido' }
    if (!bankAccountId) return { success: false, error: 'Conta bancária não selecionada' }

    // Verify bank account belongs to company
    const bankAccount = await prisma.bankAccount.findFirst({
      where: { id: bankAccountId, companyId: user.companyId },
    })
    if (!bankAccount) return { success: false, error: 'Conta bancária não encontrada' }

    // Read file content
    const content = await file.text()
    if (!content.trim()) return { success: false, error: 'Arquivo vazio' }

    // Detect format and parse
    const format = detectFileFormat(content)
    let transactions
    if (format === 'OFX') {
      transactions = parseOFX(content)
    } else {
      transactions = parseCSV(content, bankPreset || undefined)
    }

    if (transactions.length === 0) {
      return { success: false, error: 'Nenhuma transação encontrada no arquivo. Verifique o formato e o banco selecionado.' }
    }

    // Determine period from transactions
    const dates = transactions.map(t => t.date)
    const firstDate = dates.reduce((a, b) => (a < b ? a : b))
    const period = `${firstDate.getFullYear()}-${String(firstDate.getMonth() + 1).padStart(2, '0')}`

    // Calculate totals
    const totalCredits = transactions
      .filter(t => t.type === 'CREDIT')
      .reduce((sum, t) => sum + t.amount, 0)
    const totalDebits = transactions
      .filter(t => t.type === 'DEBIT')
      .reduce((sum, t) => sum + t.amount, 0)

    // Create statement and transactions in a single transaction
    const statement = await prisma.bankStatement.create({
      data: {
        bankAccountId,
        period,
        totalCredits,
        totalDebits,
        status: 'PENDING',
        companyId: user.companyId,
        createdBy: user.id,
        transactions: {
          create: transactions.map(t => ({
            date: t.date,
            description: t.description,
            amount: t.amount,
            balance: t.balance ?? null,
            type: t.type,
            externalId: t.externalId ?? null,
            reconciliationStatus: 'PENDING',
          })),
        },
      },
    })

    // Run auto-reconciliation
    const report = await autoReconcile(statement.id, user.companyId)

    // Audit log
    await logAudit({
      action: 'IMPORT',
      entity: 'BankStatement',
      entityId: statement.id,
      entityName: `Extrato ${bankAccount.name} - ${period}`,
      userId: user.id,
      companyId: user.companyId,
      newData: {
        format,
        transactionCount: transactions.length,
        period,
        totalCredits,
        totalDebits,
        autoMatched: report.autoMatched,
        matchRate: report.matchRate,
      },
    })

    revalidatePath('/financeiro/conciliacao')

    return {
      success: true,
      data: {
        statementId: statement.id,
        transactionCount: transactions.length,
        report,
      },
    }
  } catch (error) {
    console.error('Erro ao importar extrato:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao importar extrato bancário',
    }
  }
}

// ============================================================================
// MANUAL RECONCILE
// ============================================================================

export async function manualReconcile(
  transactionId: string,
  financialRecordId: string,
  note?: string
) {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Não autenticado' }
    const user = session.user as { id: string; role: string; companyId: string; canManageFinancial?: boolean }
    if (!user.companyId) return { success: false, error: 'Empresa não encontrada' }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && !user.canManageFinancial) {
      return { success: false, error: 'Sem permissão' }
    }

    // Verify transaction belongs to company
    const txn = await prisma.bankStatementTransaction.findFirst({
      where: { id: transactionId },
      include: { statement: { select: { companyId: true } } },
    })
    if (!txn || txn.statement.companyId !== user.companyId) {
      return { success: false, error: 'Transação não encontrada' }
    }

    // Verify financial record belongs to company
    const record = await prisma.financialRecord.findFirst({
      where: { id: financialRecordId, companyId: user.companyId },
    })
    if (!record) return { success: false, error: 'Lançamento financeiro não encontrado' }

    // Check if financial record is already reconciled
    const existingMatch = await prisma.bankStatementTransaction.findFirst({
      where: { financialRecordId },
    })
    if (existingMatch) {
      return { success: false, error: 'Este lançamento financeiro já está conciliado com outra transação' }
    }

    await prisma.bankStatementTransaction.update({
      where: { id: transactionId },
      data: {
        financialRecordId,
        reconciliationStatus: 'MATCHED',
        reconciliationNote: note || 'Conciliação manual',
      },
    })

    // Update statement status
    await updateStatementStatus(txn.statementId)

    await logAudit({
      action: 'RECONCILE',
      entity: 'BankStatementTransaction',
      entityId: transactionId,
      entityName: txn.description,
      userId: user.id,
      companyId: user.companyId,
      newData: { financialRecordId, note },
    })

    revalidatePath('/financeiro/conciliacao')
    return { success: true }
  } catch (error) {
    console.error('Erro na conciliação manual:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro na conciliação manual',
    }
  }
}

// ============================================================================
// IGNORE TRANSACTION
// ============================================================================

export async function ignoreTransaction(transactionId: string, reason: string) {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Não autenticado' }
    const user = session.user as { id: string; role: string; companyId: string; canManageFinancial?: boolean }
    if (!user.companyId) return { success: false, error: 'Empresa não encontrada' }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && !user.canManageFinancial) {
      return { success: false, error: 'Sem permissão' }
    }

    const txn = await prisma.bankStatementTransaction.findFirst({
      where: { id: transactionId },
      include: { statement: { select: { companyId: true, id: true } } },
    })
    if (!txn || txn.statement.companyId !== user.companyId) {
      return { success: false, error: 'Transação não encontrada' }
    }

    await prisma.bankStatementTransaction.update({
      where: { id: transactionId },
      data: {
        reconciliationStatus: 'IGNORED',
        reconciliationNote: reason || 'Transação ignorada',
      },
    })

    await updateStatementStatus(txn.statement.id)

    await logAudit({
      action: 'IGNORE',
      entity: 'BankStatementTransaction',
      entityId: transactionId,
      entityName: txn.description,
      userId: user.id,
      companyId: user.companyId,
      newData: { reason },
    })

    revalidatePath('/financeiro/conciliacao')
    return { success: true }
  } catch (error) {
    console.error('Erro ao ignorar transação:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao ignorar transação',
    }
  }
}

// ============================================================================
// CREATE FINANCIAL RECORD FROM TRANSACTION
// ============================================================================

export async function createFinancialRecordFromTransaction(
  transactionId: string,
  data: {
    description: string
    category?: string
    projectId?: string
    costCenterId?: string
  }
) {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Não autenticado' }
    const user = session.user as { id: string; role: string; companyId: string; canManageFinancial?: boolean }
    if (!user.companyId) return { success: false, error: 'Empresa não encontrada' }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && !user.canManageFinancial) {
      return { success: false, error: 'Sem permissão' }
    }

    const txn = await prisma.bankStatementTransaction.findFirst({
      where: { id: transactionId },
      include: { statement: { select: { companyId: true, bankAccountId: true, id: true } } },
    })
    if (!txn || txn.statement.companyId !== user.companyId) {
      return { success: false, error: 'Transação não encontrada' }
    }

    const finType = txn.type === 'CREDIT' ? 'INCOME' : 'EXPENSE'

    // Create the financial record
    const record = await prisma.financialRecord.create({
      data: {
        description: data.description || txn.description,
        amount: Math.abs(toNumber(txn.amount)),
        type: finType,
        status: 'PAID',
        dueDate: txn.date,
        paidDate: txn.date,
        paidAmount: Math.abs(toNumber(txn.amount)),
        bankAccountId: txn.statement.bankAccountId,
        companyId: user.companyId,
        category: data.category || null,
        projectId: data.projectId || null,
        costCenterId: data.costCenterId || null,
      },
    })

    // Auto-reconcile the transaction with the new record
    await prisma.bankStatementTransaction.update({
      where: { id: transactionId },
      data: {
        financialRecordId: record.id,
        reconciliationStatus: 'MATCHED',
        reconciliationNote: 'Lançamento criado a partir da transação do extrato',
      },
    })

    await updateStatementStatus(txn.statement.id)

    await logAudit({
      action: 'CREATE_FROM_STATEMENT',
      entity: 'FinancialRecord',
      entityId: record.id,
      entityName: record.description,
      userId: user.id,
      companyId: user.companyId,
      newData: {
        transactionId,
        amount: Math.abs(toNumber(txn.amount)),
        type: finType,
      },
    })

    revalidatePath('/financeiro/conciliacao')
    revalidatePath('/financeiro')
    return { success: true, data: record }
  } catch (error) {
    console.error('Erro ao criar lançamento da transação:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar lançamento',
    }
  }
}

// ============================================================================
// GET STATEMENTS
// ============================================================================

export async function getStatements(bankAccountId?: string) {
  try {
    const session = await getSession()
    if (!session) return { success: false as const, error: 'Não autenticado' }
    const user = session.user as { id: string; companyId: string }
    if (!user.companyId) return { success: false as const, error: 'Empresa não encontrada' }

    const statements = await prisma.bankStatement.findMany({
      where: {
        companyId: user.companyId,
        ...(bankAccountId && { bankAccountId }),
      },
      include: {
        bankAccount: { select: { id: true, name: true, bankName: true } },
        _count: { select: { transactions: true } },
      },
      orderBy: { importedAt: 'desc' },
    })

    // Get reconciliation stats for each statement
    const statementsWithStats = await Promise.all(
      statements.map(async (stmt) => {
        const txns = await prisma.bankStatementTransaction.findMany({
          where: { statementId: stmt.id },
          select: { reconciliationStatus: true },
        })

        const matched = txns.filter(
          t => t.reconciliationStatus === 'MATCHED' || t.reconciliationStatus === 'AUTO_MATCHED'
        ).length
        const pending = txns.filter(t => t.reconciliationStatus === 'PENDING').length
        const divergent = txns.filter(t => t.reconciliationStatus === 'DIVERGENT').length
        const ignored = txns.filter(t => t.reconciliationStatus === 'IGNORED').length
        const total = txns.length
        const matchRate = total > 0 ? Math.round((matched / total) * 100) : 0

        return {
          ...stmt,
          totalCredits: toNumber(stmt.totalCredits),
          totalDebits: toNumber(stmt.totalDebits),
          stats: { matched, pending, divergent, ignored, total, matchRate },
        }
      })
    )

    return { success: true as const, data: statementsWithStats }
  } catch (error) {
    console.error('Erro ao buscar extratos:', error)
    return { success: false as const, error: 'Erro ao buscar extratos' }
  }
}

// ============================================================================
// GET STATEMENT TRANSACTIONS
// ============================================================================

export async function getStatementTransactions(statementId: string, filter?: string) {
  try {
    const session = await getSession()
    if (!session) return { success: false as const, error: 'Não autenticado' }
    const user = session.user as { id: string; companyId: string }
    if (!user.companyId) return { success: false as const, error: 'Empresa não encontrada' }

    // Verify statement belongs to company
    const statement = await prisma.bankStatement.findFirst({
      where: { id: statementId, companyId: user.companyId },
    })
    if (!statement) return { success: false as const, error: 'Extrato não encontrado' }

    const where: Record<string, unknown> = { statementId }
    if (filter && filter !== 'ALL') {
      if (filter === 'MATCHED') {
        where.reconciliationStatus = { in: ['MATCHED', 'AUTO_MATCHED'] }
      } else {
        where.reconciliationStatus = filter
      }
    }

    const transactions = await prisma.bankStatementTransaction.findMany({
      where: where as any,
      include: {
        financialRecord: {
          select: {
            id: true,
            description: true,
            amount: true,
            type: true,
            status: true,
            dueDate: true,
            category: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    return {
      success: true as const,
      data: transactions.map(t => ({
        ...t,
        amount: toNumber(t.amount),
        financialRecord: t.financialRecord
          ? { ...t.financialRecord, amount: toNumber(t.financialRecord.amount) }
          : null,
      })),
    }
  } catch (error) {
    console.error('Erro ao buscar transações:', error)
    return { success: false as const, error: 'Erro ao buscar transações' }
  }
}

// ============================================================================
// GET RECONCILIATION SUMMARY
// ============================================================================

export async function getReconciliationSummary(bankAccountId: string, period: string) {
  try {
    const session = await getSession()
    if (!session) return { success: false as const, error: 'Não autenticado' }
    const user = session.user as { id: string; companyId: string }
    if (!user.companyId) return { success: false as const, error: 'Empresa não encontrada' }

    const statements = await prisma.bankStatement.findMany({
      where: {
        companyId: user.companyId,
        bankAccountId,
        period,
      },
      include: {
        transactions: {
          select: {
            amount: true,
            type: true,
            reconciliationStatus: true,
          },
        },
      },
    })

    const allTxns = statements.flatMap(s => s.transactions)
    const totalCredits = allTxns
      .filter(t => t.type === 'CREDIT')
      .reduce((sum, t) => sum + Math.abs(toNumber(t.amount)), 0)
    const totalDebits = allTxns
      .filter(t => t.type === 'DEBIT')
      .reduce((sum, t) => sum + Math.abs(toNumber(t.amount)), 0)

    const matched = allTxns.filter(
      t => t.reconciliationStatus === 'MATCHED' || t.reconciliationStatus === 'AUTO_MATCHED'
    ).length
    const pending = allTxns.filter(t => t.reconciliationStatus === 'PENDING').length
    const divergent = allTxns.filter(t => t.reconciliationStatus === 'DIVERGENT').length
    const ignored = allTxns.filter(t => t.reconciliationStatus === 'IGNORED').length
    const total = allTxns.length
    const matchRate = total > 0 ? Math.round((matched / total) * 100) : 0

    return {
      success: true as const,
      data: {
        totalCredits,
        totalDebits,
        matched,
        pending,
        divergent,
        ignored,
        total,
        matchRate,
      },
    }
  } catch (error) {
    console.error('Erro ao buscar resumo de conciliação:', error)
    return { success: false as const, error: 'Erro ao buscar resumo' }
  }
}

// ============================================================================
// GET RECONCILIATION SUGGESTIONS
// ============================================================================

export async function getReconciliationSuggestions(transactionId: string) {
  try {
    const session = await getSession()
    if (!session) return { success: false as const, error: 'Não autenticado' }
    const user = session.user as { id: string; companyId: string }
    if (!user.companyId) return { success: false as const, error: 'Empresa não encontrada' }

    const suggestions = await getSuggestions(transactionId, user.companyId)

    return {
      success: true as const,
      data: suggestions.map(s => ({
        ...s,
        date: s.date.toISOString(),
      })),
    }
  } catch (error) {
    console.error('Erro ao buscar sugestões:', error)
    return { success: false as const, error: 'Erro ao buscar sugestões' }
  }
}

// ============================================================================
// PARSE PREVIEW (for import dialog)
// ============================================================================

export async function parseStatementPreview(formData: FormData) {
  try {
    const file = formData.get('file') as File | null
    const bankPreset = formData.get('bankPreset') as string | null

    if (!file) return { success: false, error: 'Arquivo não fornecido' }

    const content = await file.text()
    if (!content.trim()) return { success: false, error: 'Arquivo vazio' }

    const format = detectFileFormat(content)
    let transactions
    if (format === 'OFX') {
      transactions = parseOFX(content)
    } else {
      transactions = parseCSV(content, bankPreset || undefined)
    }

    return {
      success: true,
      data: {
        format,
        total: transactions.length,
        preview: transactions.slice(0, 5).map(t => ({
          date: t.date.toISOString(),
          description: t.description,
          amount: t.amount,
          type: t.type,
        })),
      },
    }
  } catch (error) {
    console.error('Erro ao analisar extrato:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao analisar arquivo',
    }
  }
}

// ============================================================================
// HELPER: Update statement status based on transactions
// ============================================================================

async function updateStatementStatus(statementId: string) {
  const txns = await prisma.bankStatementTransaction.findMany({
    where: { statementId },
    select: { reconciliationStatus: true },
  })

  const matched = txns.filter(
    t => t.reconciliationStatus === 'MATCHED' || t.reconciliationStatus === 'AUTO_MATCHED'
  ).length
  const ignored = txns.filter(t => t.reconciliationStatus === 'IGNORED').length
  const divergent = txns.filter(t => t.reconciliationStatus === 'DIVERGENT').length
  const total = txns.length

  let status: 'PENDING' | 'RECONCILING' | 'RECONCILED' | 'DIVERGENT'
  if (matched + ignored === total && total > 0) {
    status = 'RECONCILED'
  } else if (matched > 0 || ignored > 0) {
    status = 'RECONCILING'
  } else if (divergent > 0) {
    status = 'DIVERGENT'
  } else {
    status = 'PENDING'
  }

  await prisma.bankStatement.update({
    where: { id: statementId },
    data: { status },
  })
}
