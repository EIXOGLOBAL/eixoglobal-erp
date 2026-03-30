'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"
import { getPaginationArgs, paginatedResponse, type PaginationParams } from "@/lib/pagination"
import { buildWhereClause, type FilterParams } from "@/lib/filters"

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
        console.error("Failed to log audit:", error)
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
        const validated = financialRecordSchema.parse(data)

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
                companyId: validated.companyId,
                projectId: validated.projectId || null,
                costCenterId: validated.costCenterId || null,
            }
        })

        revalidatePath('/financeiro')
        revalidatePath('/financeiro/faturamento')
        revalidatePath('/financeiro/recebiveis')
        revalidatePath('/financeiro/despesas')
        return { success: true, data: record }
    } catch (error) {
        console.error("Erro ao criar lançamento:", error)
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

        // Verify company access
        const record = await prisma.financialRecord.findUnique({
            where: { id },
            select: { companyId: true }
        })
        if (!record || record.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const validated = financialRecordSchema.parse(data)

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

        // Log audit
        await logAuditAction(
            session.user.id,
            validated.companyId,
            'UPDATE',
            'FinancialRecord',
            id,
            {
                description: validated.description,
                amount: validated.amount,
                type: validated.type,
                status: validated.status,
            }
        )

        revalidatePath('/financeiro')
        revalidatePath('/financeiro/faturamento')
        revalidatePath('/financeiro/recebiveis')
        revalidatePath('/financeiro/despesas')
        return { success: true, data: updated }
    } catch (error) {
        console.error("Erro ao atualizar lançamento:", error)
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

        // Log audit
        await logAuditAction(
            session.user.id,
            record.companyId,
            'MARK_AS_PAID',
            'FinancialRecord',
            id,
            {
                paidAmount: finalPaidAmount,
                paidDate: new Date(),
                bankAccountId: record.bankAccountId,
            }
        )

        revalidatePath('/financeiro')
        revalidatePath('/financeiro/faturamento')
        revalidatePath('/financeiro/recebiveis')
        revalidatePath('/financeiro/despesas')
        revalidatePath('/financeiro/inadimplencia')
        return { success: true, data: updated }
    } catch (error) {
        console.error("Erro ao marcar como pago:", error)
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
            select: { companyId: true }
        })
        if (!record || record.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        // Get record details before deletion for audit logging
        const recordDetails = await prisma.financialRecord.findUnique({ where: { id } })

        await prisma.financialRecord.delete({ where: { id } })

        // Log audit
        await logAuditAction(
            session.user.id,
            record.companyId,
            'DELETE',
            'FinancialRecord',
            id,
            recordDetails ? {
                description: recordDetails.description,
                amount: Number(recordDetails.amount),
                type: recordDetails.type,
                status: recordDetails.status,
            } : {}
        )

        revalidatePath('/financeiro')
        revalidatePath('/financeiro/faturamento')
        revalidatePath('/financeiro/recebiveis')
        revalidatePath('/financeiro/despesas')
        return { success: true }
    } catch (error) {
        console.error("Erro ao deletar lançamento:", error)
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
            companyId: params?.companyId || (session.user as any).companyId,
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
        console.error("Erro ao buscar lançamentos:", error)
        return { success: false, error: "Erro ao buscar lançamentos", data: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } }
    }
}

export async function getFinancialSummary(companyId: string) {
    try {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

        const records = await prisma.financialRecord.findMany({
            where: { companyId },
        })

        const totalIncome = records
            .filter(r => r.type === 'INCOME' && r.status === 'PAID')
            .reduce((sum, r) => sum + Number(r.paidAmount || r.amount), 0)

        const totalExpense = records
            .filter(r => r.type === 'EXPENSE' && r.status === 'PAID')
            .reduce((sum, r) => sum + Number(r.paidAmount || r.amount), 0)

        const pendingIncome = records
            .filter(r => r.type === 'INCOME' && r.status === 'PENDING')
            .reduce((sum, r) => sum + Number(r.amount), 0)

        const pendingExpense = records
            .filter(r => r.type === 'EXPENSE' && r.status === 'PENDING')
            .reduce((sum, r) => sum + Number(r.amount), 0)

        const overdueRecords = records.filter(r =>
            r.status === 'PENDING' && new Date(r.dueDate) < now
        ).length

        return {
            success: true,
            data: {
                totalIncome,
                totalExpense,
                balance: totalIncome - totalExpense,
                pendingIncome,
                pendingExpense,
                overdueRecords,
            }
        }
    } catch (error) {
        console.error("Erro ao calcular resumo:", error)
        return { success: false, error: "Erro ao calcular resumo financeiro" }
    }
}

// ============================================================================
// CONTAS BANCÁRIAS
// ============================================================================

export async function createBankAccount(data: z.infer<typeof bankAccountSchema>) {
    try {
        const validated = bankAccountSchema.parse(data)

        const account = await prisma.bankAccount.create({
            data: {
                name: validated.name,
                bankName: validated.bankName,
                accountNumber: validated.accountNumber,
                agency: validated.agency,
                balance: validated.balance || 0,
                currency: validated.currency || 'BRL',
                companyId: validated.companyId,
            }
        })

        revalidatePath('/financeiro')
        return { success: true, data: account }
    } catch (error) {
        console.error("Erro ao criar conta bancária:", error)
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

        // Verify company access
        const account = await prisma.bankAccount.findUnique({
            where: { id },
            select: { companyId: true }
        })
        if (!account || account.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const validated = bankAccountSchema.parse(data)

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

        revalidatePath('/financeiro')
        return { success: true, data: updated }
    } catch (error) {
        console.error("Erro ao atualizar conta bancária:", error)
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
            select: { companyId: true }
        })
        if (!account || account.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        await prisma.bankAccount.delete({ where: { id } })
        revalidatePath('/financeiro')
        return { success: true }
    } catch (error) {
        console.error("Erro ao deletar conta bancária:", error)
        return { success: false, error: "Erro ao deletar conta bancária" }
    }
}

export async function getBankAccounts(companyId: string) {
    try {
        const accounts = await prisma.bankAccount.findMany({
            where: { companyId },
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
        console.error("Erro ao buscar contas bancárias:", error)
        return []
    }
}

export async function getFinancialRecordById(id: string) {
    try {
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
        return {
            success: true,
            data: { ...record, amount: Number(record.amount), paidAmount: Number(record.paidAmount) },
        }
    } catch (error) {
        console.error("Erro ao buscar lançamento:", error)
        return { success: false, error: "Erro ao buscar lançamento" }
    }
}

export async function getBankAccountById(id: string) {
    try {
        const account = await prisma.bankAccount.findUnique({
            where: { id },
            include: {
                _count: { select: { transactions: true, statements: true } },
            },
        })
        if (!account) return { success: false, error: "Conta bancária não encontrada" }
        return { success: true, data: { ...account, balance: Number(account.balance) } }
    } catch (error) {
        console.error("Erro ao buscar conta bancária:", error)
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

        // Log audit
        await logAuditAction(
            session.user.id,
            record.companyId,
            'REGISTER_PAYMENT',
            'FinancialRecord',
            recordId,
            {
                paymentAmount: amount,
                totalPaidAmount: newPaidAmount,
                status: isPaid ? 'PAID' : 'PENDING',
                bankAccountId: bankAccountId,
                paidDate: date,
            }
        )

        revalidatePath("/dashboard/financeiro/recebiveis")
        return { success: true, data: updatedRecord }
    } catch (error: any) {
        console.error("Erro ao registrar pagamento:", error)
        return { success: false, error: "Falha ao registrar pagamento." }
    }
}

export async function getReceivables() {
    try {
        const receivables = await prisma.financialRecord.findMany({
            where: {
                type: 'INCOME'
            },
            include: {
                fiscalNote: true
            },
            orderBy: {
                dueDate: 'asc'
            }
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
