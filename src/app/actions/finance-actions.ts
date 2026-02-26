'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export async function registerPayment(recordId: string, amount: number, date: Date, bankAccountId: string) {
    try {
        const record = await prisma.financialRecord.findUnique({
            where: { id: recordId }
        })

        if (!record) {
            return { success: false, error: "Registro não encontrado." }
        }

        const newPaidAmount = Number(record.paidAmount) + amount
        const isPaid = newPaidAmount >= Number(record.amount)

        // Update record
        const updatedRecord = await prisma.financialRecord.update({
            where: { id: recordId },
            data: {
                paidAmount: newPaidAmount,
                status: isPaid ? 'PAID' : 'PENDING',
                paidDate: date,
                bankAccountId: bankAccountId
            }
        })

        // Ideally, create a separate transaction record for the bank account
        // but for now, just update the bank balance directly? 
        // Or if bank account logic is handled elsewhere.
        // Let's at least update bank balance if bankAccountId is provided.
        if (bankAccountId) {
            await prisma.bankAccount.update({
                where: { id: bankAccountId },
                data: {
                    balance: {
                        increment: amount
                    }
                }
            })
        }

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
