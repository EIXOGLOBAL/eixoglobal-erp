'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { assertAuthenticated } from "@/lib/auth-helpers"
import { logCreate, logUpdate, logDelete, logAction } from '@/lib/audit-logger'

export async function createBankAccount(data: {
    name: string;
    bankName: string;
    accountNumber: string;
    agency: string;
}) {
    try {
        const session = await assertAuthenticated()
        const companyId = session.user.companyId
        if (!companyId) {
            return { success: false, error: "Usuário sem empresa vinculada" }
        }

        const created = await prisma.bankAccount.create({
            data: {
                name: data.name,
                bankName: data.bankName,
                accountNumber: data.accountNumber,
                agency: data.agency,
                companyId,
            }
        })

        await logCreate('BankAccount', created.id, created.name || 'N/A', data)

        revalidatePath("/configuracoes")
        revalidatePath("/financeiro/faturamento")
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getBankAccounts() {
    try {
        const session = await assertAuthenticated()
        const companyId = session.user.companyId
        if (!companyId) return { success: true, data: [] }
        const accounts = await prisma.bankAccount.findMany({ where: { companyId } })
        return { success: true, data: accounts }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getCompanySettings() {
    try {
        const session = await assertAuthenticated()
        const companyId = session.user.companyId
        if (!companyId) return { success: true, data: null }
        const company = await prisma.company.findUnique({ where: { id: companyId } })
        return { success: true, data: company }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
