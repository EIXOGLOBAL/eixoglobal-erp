'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

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
        const validated = financialRecordSchema.parse(data)

        const record = await prisma.financialRecord.update({
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

        revalidatePath('/financeiro')
        revalidatePath('/financeiro/faturamento')
        revalidatePath('/financeiro/recebiveis')
        revalidatePath('/financeiro/despesas')
        return { success: true, data: record }
    } catch (error) {
        console.error("Erro ao atualizar lançamento:", error)
        return { success: false, error: "Erro ao atualizar lançamento" }
    }
}

export async function markAsPaid(id: string, paidAmount?: number) {
    try {
        const record = await prisma.financialRecord.findUnique({ where: { id } })
        if (!record) return { success: false, error: "Lançamento não encontrado" }

        const updated = await prisma.financialRecord.update({
            where: { id },
            data: {
                status: 'PAID',
                paidDate: new Date(),
                paidAmount: paidAmount || Number(record.amount),
            }
        })

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
        await prisma.financialRecord.delete({ where: { id } })
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

export async function getFinancialRecords(companyId: string, type?: 'INCOME' | 'EXPENSE', status?: string) {
    try {
        const records = await prisma.financialRecord.findMany({
            where: {
                companyId,
                ...(type && { type }),
                ...(status && { status: status as any }),
            },
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
            take: 200,
        })

        return records.map(r => ({
            ...r,
            amount: Number(r.amount),
            paidAmount: Number(r.paidAmount),
        }))
    } catch (error) {
        console.error("Erro ao buscar lançamentos:", error)
        return []
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
        const validated = bankAccountSchema.parse(data)

        const account = await prisma.bankAccount.update({
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
        return { success: true, data: account }
    } catch (error) {
        console.error("Erro ao atualizar conta bancária:", error)
        return { success: false, error: "Erro ao atualizar conta bancária" }
    }
}

export async function deleteBankAccount(id: string) {
    try {
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
