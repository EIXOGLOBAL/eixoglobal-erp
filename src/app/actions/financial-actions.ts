'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"
import { assertAuthenticated, assertCompanyAccess } from "@/lib/auth-helpers"
import { getPaginationArgs, paginatedResponse, type PaginationParams } from "@/lib/pagination"
import { buildWhereClause, type FilterParams } from "@/lib/filters"
import { logCreate, logUpdate, logDelete, logAction } from '@/lib/audit-logger'
import { logger } from '@/lib/logger'
import { whatsappService } from '@/lib/whatsapp'
import { collectionNotice } from '@/lib/whatsapp-templates'

const log = logger.child({ module: 'financial' })

// ============================================================================
// AUDIT LOGGING HELPER
// ============================================================================

async function logAuditAction(
    userId: string,
    companyId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    details?: Record<string, any>
) {
    try {
        await prisma.auditLog.create({
            data: {
                action,
                entity: resourceType,
                entityId: resourceId,
                userId,
                companyId,
                newData: details ? JSON.stringify(details) : null,
            }
        })
    } catch (error) {
        log.error({ err: error }, "Failed to log audit")
        // Don't throw - audit logging failure shouldn't break the operation
    }
}

// ============================================================================
// SCHEMAS
// ============================================================================

const financialRecordSchema = z.object({
    description: z.string().min(3, "Descrição é obrigatória"),
    amount: z.number().min(0.01, "Valor deve ser maior que zero"),
    type: z.enum(['INCOME', 'EXPENSE']),
    status: z.enum(['PENDING', 'PAID', 'CANCELLED', 'SCHEDULED']).optional(),
    dueDate: z.string(),
    paidDate: z.string().optional().nullable(),
    paidAmount: z.number().min(0).optional(),
    bankAccountId: z.string().uuid().optional().nullable(),
    category: z.string().optional().nullable(),
    companyId: z.string().uuid(),
    projectId: z.string().uuid().optional().nullable(),
    costCenterId: z.string().uuid().optional().nullable(),
})

const bankAccountSchema = z.object({
    name: z.string().min(2, "Nome é obrigatório"),
    bankName: z.string().min(2, "Banco é obrigatório"),
    accountNumber: z.string().min(1, "Número da conta é obrigatório"),
    agency: z.string().min(1, "Agência é obrigatória"),
    balance: z.number().optional(),
    currency: z.string().optional().default("BRL"),
    companyId: z.string().uuid(),
})

// ============================================================================
// LANÇAMENTOS FINANCEIROS
// ============================================================================

export async function createFinancialRecord(data: z.infer<typeof financialRecordSchema>) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }
        if (!session.user.companyId) return { success: false, error: "Sem empresa vinculada" }

        // Check financial permission
        if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER' && !session.user.canManageFinancial) {
            return { success: false, error: "Sem permissão para criar registro financeiro" }
        }

        const _parsed = financialRecordSchema.safeParse(data)
        if (!_parsed.success) return { success: false, error: _parsed.error.issues[0]?.message ?? 'Dados inválidos' }
        const validated = _parsed.data

        const record = await prisma.financialRecord.create({
            data: {
                description: validated.description,
                amount: validated.amount,
                type: validated.type,
                status: validated.status || 'PENDING',
                dueDate: new Date(validated.dueDate),
                paidDate: validated.paidDate ? new Date(validated.paidDate) : null,
                paidAmount: validated.paidAmount || 0,
                bankAccountId: validated.bankAccountId || null,
                category: validated.category || null,
                companyId: session.user.companyId,
                projectId: validated.projectId || null,
                costCenterId: validated.costCenterId || null,
            }
        })

        await logCreate('FinancialRecord', record.id, record.description || 'N/A', validated)

        revalidatePath('/financeiro')
        revalidatePath('/financeiro/faturamento')
        revalidatePath('/financeiro/recebiveis')
        revalidatePath('/financeiro/despesas')
        return { success: true, data: record }
    } catch (error) {
        log.error({ err: error }, "Erro ao criar lançamento")
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar lançamento"
        }
    }
}

export async function updateFinancialRecord(id: string, data: z.infer<typeof financialRecordSchema>) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Check financial permission
        if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER' && !session.user.canManageFinancial) {
            return { success: false, error: "Sem permissão para editar registro financeiro" }
        }

        // Verify company access
        const oldRecord = await prisma.financialRecord.findUnique({
            where: { id },
        })
        if (!oldRecord || oldRecord.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const _parsed = financialRecordSchema.safeParse(data)

        if (!_parsed.success) return { success: false, error: _parsed.error.issues[0]?.message ?? 'Dados inválidos' }

        const validated = _parsed.data

        const updated = await prisma.financialRecord.update({
            where: { id },
            data: {
                description: validated.description,
                amount: validated.amount,
                type: validated.type,
                status: validated.status || 'PENDING',
                dueDate: new Date(validated.dueDate),
                paidDate: validated.paidDate ? new Date(validated.paidDate) : null,
                paidAmount: validated.paidAmount || 0,
                bankAccountId: validated.bankAccountId || null,
                category: validated.category || null,
                projectId: validated.projectId || null,
                costCenterId: validated.costCenterId || null,
            }
        })

        await logUpdate('FinancialRecord', id, updated.description || 'N/A', oldRecord, updated)

        revalidatePath('/financeiro')
        revalidatePath('/financeiro/faturamento')
        revalidatePath('/financeiro/recebiveis')
        revalidatePath('/financeiro/despesas')
        return { success: true, data: updated }
    } catch (error) {
        log.error({ err: error }, "Erro ao atualizar lançamento")
        return { success: false, error: "Erro ao atualizar lançamento" }
    }
}

export async function markAsPaid(id: string, paidAmount?: number) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        const record = await prisma.financialRecord.findUnique({ where: { id } })
        if (!record) return { success: false, error: "Lançamento não encontrado" }

        // Verify company access
        if (record.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const finalPaidAmount = paidAmount || Number(record.amount)

        // Update record and bank account balance atomically
        const updated = await prisma.$transaction(async (tx) => {
            const updated = await tx.financialRecord.update({
                where: { id },
                data: {
                    status: 'PAID',
                    paidDate: new Date(),
                    paidAmount: finalPaidAmount,
                }
            })

            // Update bank balance if bankAccountId is set
            if (record.bankAccountId) {
                await tx.bankAccount.update({
                    where: { id: record.bankAccountId },
                    data: {
                        balance: {
                            increment: finalPaidAmount
                        }
                    }
                })
            }

            return updated
        })

        await logAction('MARK_AS_PAID', 'FinancialRecord', id, record.description || 'N/A', `Paid amount: ${finalPaidAmount}`)

        revalidatePath('/financeiro')
        revalidatePath('/financeiro/faturamento')
        revalidatePath('/financeiro/recebiveis')
        revalidatePath('/financeiro/despesas')
        revalidatePath('/financeiro/inadimplencia')
        return { success: true, data: updated }
    } catch (error) {
        log.error({ err: error }, "Erro ao marcar como pago")
        return { success: false, error: "Erro ao marcar como pago" }
    }
}

export async function deleteFinancialRecord(id: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Check delete permission
        if (session.user.role !== "ADMIN" && !session.user.canDelete) {
            return { success: false, error: "Sem permissão para excluir" }
        }

        const record = await prisma.financialRecord.findUnique({
            where: { id },
        })
        if (!record || record.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        await prisma.financialRecord.delete({ where: { id } })

        await logDelete('FinancialRecord', id, record.description || 'N/A', record)

        revalidatePath('/financeiro')
        revalidatePath('/financeiro/faturamento')
        revalidatePath('/financeiro/recebiveis')
        revalidatePath('/financeiro/despesas')
        return { success: true }
    } catch (error) {
        log.error({ err: error }, "Erro ao deletar lançamento")
        return { success: false, error: "Erro ao deletar lançamento" }
    }
}

export async function getFinancialRecords(params?: {
    companyId?: string
    type?: 'INCOME' | 'EXPENSE'
    status?: string
    pagination?: PaginationParams
    filters?: FilterParams
}) {
    try {
        const session = await getSession()
        if (!session?.user) return { success: true, data: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } }

        const { skip, take, page, pageSize } = getPaginationArgs(params?.pagination)
        const filterWhere = buildWhereClause(params?.filters || {}, ['description'])
        const where = {
            companyId: (session.user as any).companyId,
            ...(params?.type && { type: params.type }),
            ...(params?.status && { status: params.status as any }),
            ...filterWhere
        }

        const [records, total] = await Promise.all([
            prisma.financialRecord.findMany({
                where,
                skip,
                take,
                include: {
                    bankAccount: {
                        select: { id: true, name: true }
                    },
                    costCenter: {
                        select: { id: true, code: true, name: true }
                    },
                    project: {
                        select: { id: true, name: true }
                    }
                },
                orderBy: { dueDate: 'desc' },
            }),
            prisma.financialRecord.count({ where })
        ])

        const mapped = records.map(r => ({
            ...r,
            amount: Number(r.amount),
            paidAmount: Number(r.paidAmount),
        }))

        return { success: true, data: mapped, pagination: paginatedResponse(mapped, total, page, pageSize).pagination }
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar lançamentos")
        return { success: false, error: "Erro ao buscar lançamentos", data: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } }
    }
}

export async function getFinancialSummary(_companyId?: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }
        if (!session.user.companyId) return { success: false, error: "Sem empresa vinculada" }

        const companyId = session.user.companyId
        const now = new Date()

        // Use aggregate queries instead of fetching all records into memory
        const [paidIncome, paidExpense, pendingIncomeAgg, pendingExpenseAgg, overdueCount] = await Promise.all([
            prisma.financialRecord.aggregate({
                where: { companyId, type: 'INCOME', status: 'PAID' },
                _sum: { paidAmount: true, amount: true },
            }),
            prisma.financialRecord.aggregate({
                where: { companyId, type: 'EXPENSE', status: 'PAID' },
                _sum: { paidAmount: true, amount: true },
            }),
            prisma.financialRecord.aggregate({
                where: { companyId, type: 'INCOME', status: 'PENDING' },
                _sum: { amount: true },
            }),
            prisma.financialRecord.aggregate({
                where: { companyId, type: 'EXPENSE', status: 'PENDING' },
                _sum: { amount: true },
            }),
            prisma.financialRecord.count({
                where: { companyId, status: 'PENDING', dueDate: { lt: now } },
            }),
        ])

        const totalIncome = Number(paidIncome._sum.paidAmount || paidIncome._sum.amount || 0)
        const totalExpense = Number(paidExpense._sum.paidAmount || paidExpense._sum.amount || 0)
        const pendingIncome = Number(pendingIncomeAgg._sum.amount || 0)
        const pendingExpense = Number(pendingExpenseAgg._sum.amount || 0)

        return {
            success: true,
            data: {
                totalIncome,
                totalExpense,
                balance: totalIncome - totalExpense,
                pendingIncome,
                pendingExpense,
                overdueRecords: overdueCount,
            }
        }
    } catch (error) {
        log.error({ err: error }, "Erro ao calcular resumo")
        return { success: false, error: "Erro ao calcular resumo financeiro" }
    }
}

// ============================================================================
// CONTAS BANCÁRIAS
// ============================================================================

export async function createBankAccount(data: z.infer<typeof bankAccountSchema>) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }
        if (!session.user.companyId) return { success: false, error: "Sem empresa vinculada" }

        // Check financial permission
        if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER' && !session.user.canManageFinancial) {
            return { success: false, error: "Sem permissão para criar conta bancária" }
        }

        const _parsed = bankAccountSchema.safeParse(data)
        if (!_parsed.success) return { success: false, error: _parsed.error.issues[0]?.message ?? 'Dados inválidos' }
        const validated = _parsed.data

        const account = await prisma.bankAccount.create({
            data: {
                name: validated.name,
                bankName: validated.bankName,
                accountNumber: validated.accountNumber,
                agency: validated.agency,
                balance: validated.balance || 0,
                currency: validated.currency || 'BRL',
                companyId: session.user.companyId,
            }
        })

        await logCreate('BankAccount', account.id, account.name, validated)

        revalidatePath('/financeiro')
        return { success: true, data: account }
    } catch (error) {
        log.error({ err: error }, "Erro ao criar conta bancária")
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar conta bancária"
        }
    }
}

export async function updateBankAccount(id: string, data: z.infer<typeof bankAccountSchema>) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Check financial permission
        if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER' && !session.user.canManageFinancial) {
            return { success: false, error: "Sem permissão para editar conta bancária" }
        }

        // Verify company access
        const oldAccount = await prisma.bankAccount.findUnique({
            where: { id },
        })
        if (!oldAccount || oldAccount.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const _parsed = bankAccountSchema.safeParse(data)

        if (!_parsed.success) return { success: false, error: _parsed.error.issues[0]?.message ?? 'Dados inválidos' }

        const validated = _parsed.data

        const updated = await prisma.bankAccount.update({
            where: { id },
            data: {
                name: validated.name,
                bankName: validated.bankName,
                accountNumber: validated.accountNumber,
                agency: validated.agency,
                balance: validated.balance || 0,
                currency: validated.currency || 'BRL',
            }
        })

        await logUpdate('BankAccount', id, updated.name, oldAccount, updated)

        revalidatePath('/financeiro')
        return { success: true, data: updated }
    } catch (error) {
        log.error({ err: error }, "Erro ao atualizar conta bancária")
        return { success: false, error: "Erro ao atualizar conta bancária" }
    }
}

export async function deleteBankAccount(id: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Check delete permission
        if (session.user.role !== "ADMIN" && !session.user.canDelete) {
            return { success: false, error: "Sem permissão para excluir" }
        }

        const account = await prisma.bankAccount.findUnique({
            where: { id },
        })
        if (!account || account.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        await prisma.bankAccount.delete({ where: { id } })

        await logDelete('BankAccount', id, account.name, account)

        revalidatePath('/financeiro')
        return { success: true }
    } catch (error) {
        log.error({ err: error }, "Erro ao deletar conta bancária")
        return { success: false, error: "Erro ao deletar conta bancária" }
    }
}

export async function getBankAccounts(_companyId?: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return []
        if (!session.user.companyId) return []

        const accounts = await prisma.bankAccount.findMany({
            where: { companyId: session.user.companyId },
            include: {
                _count: { select: { transactions: true } }
            },
            orderBy: { name: 'asc' }
        })

        return accounts.map(a => ({
            ...a,
            balance: Number(a.balance),
        }))
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar contas bancárias")
        return []
    }
}

export async function getFinancialRecordById(id: string) {
    try {
        const session = await assertAuthenticated()

        const record = await prisma.financialRecord.findUnique({
            where: { id },
            include: {
                bankAccount: { select: { id: true, name: true, bankName: true } },
                costCenter: { select: { id: true, code: true, name: true } },
                project: { select: { id: true, name: true } },
                fiscalNote: { select: { id: true, number: true, type: true, value: true } },
            },
        })
        if (!record) return { success: false, error: "Lançamento não encontrado" }

        if (record.companyId) {
            await assertCompanyAccess(session, record.companyId)
        }

        return {
            success: true,
            data: { ...record, amount: Number(record.amount), paidAmount: Number(record.paidAmount) },
        }
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar lançamento")
        return { success: false, error: "Erro ao buscar lançamento" }
    }
}

export async function getBankAccountById(id: string) {
    try {
        const session = await assertAuthenticated()

        const account = await prisma.bankAccount.findUnique({
            where: { id },
            include: {
                _count: { select: { transactions: true, statements: true } },
            },
        })
        if (!account) return { success: false, error: "Conta bancária não encontrada" }

        if (account.companyId) {
            await assertCompanyAccess(session, account.companyId)
        }

        return { success: true, data: { ...account, balance: Number(account.balance) } }
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar conta bancária")
        return { success: false, error: "Erro ao buscar conta bancária" }
    }
}

// ============================================================================
// PAGAMENTOS E RECEBÍVEIS
// ============================================================================

export async function registerPayment(recordId: string, amount: number, date: Date, bankAccountId: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        const record = await prisma.financialRecord.findUnique({
            where: { id: recordId }
        })

        if (!record) {
            return { success: false, error: "Registro não encontrado." }
        }

        // Verify company access
        if (record.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const newPaidAmount = Number(record.paidAmount) + amount
        const isPaid = newPaidAmount >= Number(record.amount)

        // Update record and bank account balance atomically
        const updatedRecord = await prisma.$transaction(async (tx) => {
            const updated = await tx.financialRecord.update({
                where: { id: recordId },
                data: {
                    paidAmount: newPaidAmount,
                    status: isPaid ? 'PAID' : 'PENDING',
                    paidDate: date,
                    bankAccountId: bankAccountId
                }
            })

            // Update bank balance if bankAccountId is provided
            if (bankAccountId) {
                await tx.bankAccount.update({
                    where: { id: bankAccountId },
                    data: {
                        balance: {
                            increment: amount
                        }
                    }
                })
            }

            return updated
        })

        await logAction('REGISTER_PAYMENT', 'FinancialRecord', recordId, record.description || 'N/A', `Payment: ${amount}, Total paid: ${newPaidAmount}, Status: ${isPaid ? 'PAID' : 'PENDING'}`)

        revalidatePath("/dashboard/financeiro/recebiveis")
        return { success: true, data: updatedRecord }
    } catch (error: any) {
        log.error({ err: error }, "Erro ao registrar pagamento")
        return { success: false, error: "Falha ao registrar pagamento." }
    }
}

export async function getReceivables() {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado", data: [] }
        if (!session.user.companyId) return { success: false, error: "Sem empresa vinculada", data: [] }

        const receivables = await prisma.financialRecord.findMany({
            where: {
                type: 'INCOME',
                companyId: session.user.companyId,
            },
            select: {
                id: true,
                description: true,
                amount: true,
                paidAmount: true,
                status: true,
                dueDate: true,
                paidDate: true,
                companyId: true,
                type: true,
                bankAccountId: true,
                category: true,
                projectId: true,
                costCenterId: true,
                fiscalNoteId: true,
                createdAt: true,
                updatedAt: true,
                isDeleted: true,
                deletedAt: true,
                fiscalNote: {
                    select: { id: true, number: true, type: true, value: true, status: true },
                },
            },
            orderBy: {
                dueDate: 'asc'
            },
            take: 500,
        })

        // Serialize for client components
        const serialized = receivables.map(r => ({
            ...r,
            amount: Number(r.amount),
            paidAmount: Number(r.paidAmount),
            status: r.status // PENDING, PAID
        }))

        return { success: true, data: serialized }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// ============================================================================
// INADIMPLENCIA - OVERDUE RECORDS
// ============================================================================

export async function getOverdueRecords() {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Nao autenticado", data: [] }
        if (!session.user.companyId) return { success: false, error: "Sem empresa vinculada", data: [] }

        const user = session.user as { id: string; role: string; companyId: string; canManageFinancial?: boolean }
        if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && !user.canManageFinancial) {
            return { success: false, error: "Sem permissao", data: [] }
        }

        const now = new Date()

        const records = await prisma.financialRecord.findMany({
            where: {
                companyId: user.companyId,
                type: 'INCOME',
                status: { in: ['PENDING', 'SCHEDULED'] },
                dueDate: { lt: now },
                isDeleted: false,
            },
            select: {
                id: true,
                description: true,
                amount: true,
                dueDate: true,
                status: true,
                category: true,
                collectionNotes: true,
                collectionDate: true,
                project: { select: { id: true, name: true } },
            },
            orderBy: { dueDate: 'asc' },
        })

        const mapped = records.map(r => {
            const daysOverdue = Math.floor((now.getTime() - new Date(r.dueDate).getTime()) / 86400000)
            let agingBucket: string
            if (daysOverdue <= 30) agingBucket = '1-30 dias'
            else if (daysOverdue <= 60) agingBucket = '31-60 dias'
            else if (daysOverdue <= 90) agingBucket = '61-90 dias'
            else agingBucket = '+90 dias'

            return {
                id: r.id,
                description: r.description,
                amount: Number(r.amount),
                dueDate: r.dueDate,
                status: r.status,
                category: r.category,
                collectionNotes: r.collectionNotes,
                collectionDate: r.collectionDate,
                projectName: r.project?.name ?? null,
                agingBucket,
                daysOverdue,
            }
        })

        return { success: true, data: mapped }
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar inadimplencia")
        return { success: false, error: "Erro ao buscar registros vencidos", data: [] }
    }
}

export async function registerCollection(
    recordId: string,
    notes: string,
    options?: {
        sendWhatsApp?: boolean
        whatsAppPhone?: string
    },
) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Nao autenticado" }

        const user = session.user as { id: string; role: string; companyId: string; canManageFinancial?: boolean }
        if (!user.companyId) return { success: false, error: "Sem empresa vinculada" }
        if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && !user.canManageFinancial) {
            return { success: false, error: "Sem permissao" }
        }

        const record = await prisma.financialRecord.findFirst({
            where: { id: recordId, companyId: user.companyId },
        })
        if (!record) return { success: false, error: "Registro nao encontrado" }

        const existingNotes = record.collectionNotes || ''
        const timestamp = new Date().toLocaleString('pt-BR')
        const newNotes = existingNotes
            ? `${existingNotes}\n[${timestamp}] ${notes}`
            : `[${timestamp}] ${notes}`

        // Envio de cobranca por WhatsApp (opcional)
        let whatsAppResult: { success: boolean; error?: string } | null = null
        if (options?.sendWhatsApp && options?.whatsAppPhone) {
            const now = new Date()
            const daysOverdue = Math.floor(
                (now.getTime() - new Date(record.dueDate).getTime()) / 86400000
            )
            const message = collectionNotice({
                description: record.description || 'Titulo pendente',
                amount: Number(record.amount).toFixed(2),
                dueDate: new Date(record.dueDate).toLocaleDateString('pt-BR'),
                daysOverdue: String(daysOverdue),
            })

            whatsAppResult = await whatsappService.sendWhatsAppMessage(
                options.whatsAppPhone,
                message,
            )
        }

        // Adiciona info do WhatsApp nas notas se enviado
        let finalNotes = newNotes
        if (options?.sendWhatsApp) {
            const whatsAppStatus = whatsAppResult?.success
                ? `WhatsApp enviado para ${options.whatsAppPhone}`
                : `WhatsApp falhou: ${whatsAppResult?.error || 'nao configurado'}`
            finalNotes += `\n[${timestamp}] [AUTO] ${whatsAppStatus}`
        }

        await prisma.financialRecord.update({
            where: { id: recordId },
            data: {
                collectionNotes: finalNotes,
                collectionDate: new Date(),
            },
        })

        await logAction('REGISTER_COLLECTION', 'FinancialRecord', recordId, record.description || 'N/A', `Collection note: ${notes}`)

        revalidatePath('/financeiro/inadimplencia')
        return {
            success: true,
            whatsApp: whatsAppResult
                ? { sent: whatsAppResult.success, error: whatsAppResult.error }
                : undefined,
        }
    } catch (error) {
        log.error({ err: error }, "Erro ao registrar cobranca")
        return { success: false, error: "Erro ao registrar cobranca" }
    }
}

export async function markAsNegotiated(
    recordId: string,
    data: {
        negotiatedAmount: number
        negotiatedDueDate: string
        notes?: string
    },
) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Nao autenticado" }

        const user = session.user as { id: string; role: string; companyId: string; canManageFinancial?: boolean }
        if (!user.companyId) return { success: false, error: "Sem empresa vinculada" }
        if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && !user.canManageFinancial) {
            return { success: false, error: "Sem permissao" }
        }

        if (data.negotiatedAmount <= 0) return { success: false, error: "Valor negociado deve ser maior que zero" }

        const record = await prisma.financialRecord.findFirst({
            where: { id: recordId, companyId: user.companyId },
        })
        if (!record) return { success: false, error: "Registro nao encontrado" }

        const existingNotes = record.collectionNotes || ''
        const timestamp = new Date().toLocaleString('pt-BR')
        const noteText = data.notes
            ? `[${timestamp}] NEGOCIADO: R$ ${data.negotiatedAmount.toFixed(2)} para ${data.negotiatedDueDate}. ${data.notes}`
            : `[${timestamp}] NEGOCIADO: R$ ${data.negotiatedAmount.toFixed(2)} para ${data.negotiatedDueDate}.`
        const newNotes = existingNotes ? `${existingNotes}\n${noteText}` : noteText

        await prisma.financialRecord.update({
            where: { id: recordId },
            data: {
                status: 'NEGOTIATED',
                negotiatedAmount: data.negotiatedAmount,
                negotiatedDate: new Date(),
                negotiatedDueDate: new Date(data.negotiatedDueDate),
                collectionNotes: newNotes,
            },
        })

        await logAction('MARK_NEGOTIATED', 'FinancialRecord', recordId, record.description || 'N/A',
            `Negotiated: ${data.negotiatedAmount}, new due: ${data.negotiatedDueDate}`)

        revalidatePath('/financeiro/inadimplencia')
        revalidatePath('/financeiro')
        return { success: true }
    } catch (error) {
        log.error({ err: error }, "Erro ao marcar como negociado")
        return { success: false, error: "Erro ao marcar como negociado" }
    }
}

export async function markAsLoss(
    recordId: string,
    reason: string,
) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Nao autenticado" }

        const user = session.user as { id: string; role: string; companyId: string; canManageFinancial?: boolean }
        if (!user.companyId) return { success: false, error: "Sem empresa vinculada" }
        if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && !user.canManageFinancial) {
            return { success: false, error: "Sem permissao" }
        }

        if (!reason.trim()) return { success: false, error: "Motivo e obrigatorio" }

        const record = await prisma.financialRecord.findFirst({
            where: { id: recordId, companyId: user.companyId },
        })
        if (!record) return { success: false, error: "Registro nao encontrado" }

        const existingNotes = record.collectionNotes || ''
        const timestamp = new Date().toLocaleString('pt-BR')
        const noteText = `[${timestamp}] PERDA: ${reason}`
        const newNotes = existingNotes ? `${existingNotes}\n${noteText}` : noteText

        await prisma.financialRecord.update({
            where: { id: recordId },
            data: {
                status: 'LOSS',
                lossDate: new Date(),
                lossReason: reason,
                collectionNotes: newNotes,
            },
        })

        await logAction('MARK_LOSS', 'FinancialRecord', recordId, record.description || 'N/A',
            `Loss reason: ${reason}`)

        revalidatePath('/financeiro/inadimplencia')
        revalidatePath('/financeiro')
        return { success: true }
    } catch (error) {
        log.error({ err: error }, "Erro ao marcar como perda")
        return { success: false, error: "Erro ao marcar como perda" }
    }
}
