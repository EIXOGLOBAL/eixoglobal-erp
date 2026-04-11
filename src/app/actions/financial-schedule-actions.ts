'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { toNumber } from "@/lib/formatters"
import { assertAuthenticated } from "@/lib/auth-helpers"

const financialScheduleItemSchema = z.object({
    contractId: z.string().uuid("ID do contrato inválido"),
    month: z.number().int().min(1).max(36, "Mês deve estar entre 1 e 36"),
    percentage: z.number().min(0).max(100, "Percentual deve estar entre 0 e 100"),
    value: z.number().min(0, "Valor não pode ser negativo"),
    dueDate: z.string().datetime().optional().nullable(),
})

export async function createFinancialScheduleItem(data: z.infer<typeof financialScheduleItemSchema>) {
    try {
        await assertAuthenticated()
        const validated = financialScheduleItemSchema.parse(data)

        // Verify contract exists
        const contract = await prisma.contract.findUnique({
            where: { id: validated.contractId }
        })

        if (!contract) {
            return { success: false, error: "Contrato não encontrado" }
        }

        // Check if month already exists for this contract
        const existingItem = await prisma.financialScheduleItem.findFirst({
            where: {
                contractId: validated.contractId,
                month: validated.month
            }
        })

        if (existingItem) {
            return { success: false, error: "Já existe um planejamento para este mês neste contrato" }
        }

        const item = await prisma.financialScheduleItem.create({
            data: {
                contractId: validated.contractId,
                month: validated.month,
                percentage: validated.percentage,
                value: validated.value,
                dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
            },
            include: { contract: { select: { id: true, identifier: true } } }
        })

        revalidatePath('/contratos')
        return { success: true, data: item }
    } catch (error) {
        console.error("Erro ao criar item de planejamento financeiro:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar item de planejamento financeiro",
        }
    }
}

export async function updateFinancialScheduleItem(id: string, data: z.infer<typeof financialScheduleItemSchema>) {
    try {
        await assertAuthenticated()
        const validated = financialScheduleItemSchema.parse(data)

        // Verify contract exists
        const contract = await prisma.contract.findUnique({
            where: { id: validated.contractId }
        })

        if (!contract) {
            return { success: false, error: "Contrato não encontrado" }
        }

        // Check if another item has the same month for this contract
        const existingItem = await prisma.financialScheduleItem.findFirst({
            where: {
                contractId: validated.contractId,
                month: validated.month,
                id: { not: id }
            }
        })

        if (existingItem) {
            return { success: false, error: "Já existe um planejamento para este mês neste contrato" }
        }

        const item = await prisma.financialScheduleItem.update({
            where: { id },
            data: {
                contractId: validated.contractId,
                month: validated.month,
                percentage: validated.percentage,
                value: validated.value,
                dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
            },
            include: { contract: { select: { id: true, identifier: true } } }
        })

        revalidatePath('/contratos')
        return { success: true, data: item }
    } catch (error) {
        console.error("Erro ao atualizar item de planejamento financeiro:", error)
        return { success: false, error: "Erro ao atualizar item de planejamento financeiro" }
    }
}

export async function deleteFinancialScheduleItem(id: string) {
    try {
        await assertAuthenticated()
        const item = await prisma.financialScheduleItem.findUnique({
            where: { id },
            select: { contractId: true }
        })

        if (!item) {
            return { success: false, error: "Item não encontrado" }
        }

        await prisma.financialScheduleItem.delete({ where: { id } })
        revalidatePath('/contratos')
        return { success: true }
    } catch (error) {
        console.error("Erro ao deletar item de planejamento financeiro:", error)
        return { success: false, error: "Erro ao deletar item de planejamento financeiro" }
    }
}

export async function getFinancialScheduleItemsByContract(contractId: string) {
    try {
        await assertAuthenticated()
        // Verify contract exists
        const contract = await prisma.contract.findUnique({
            where: { id: contractId }
        })

        if (!contract) {
            return { success: false, error: "Contrato não encontrado" }
        }

        const items = await prisma.financialScheduleItem.findMany({
            where: { contractId },
            include: { contract: { select: { id: true, identifier: true } } },
            orderBy: { month: 'asc' }
        })
        return { success: true, data: items }
    } catch (error) {
        console.error("Erro ao buscar itens de planejamento financeiro:", error)
        return { success: false, error: "Erro ao buscar itens de planejamento financeiro" }
    }
}

export async function getFinancialScheduleItemById(id: string) {
    try {
        await assertAuthenticated()
        const item = await prisma.financialScheduleItem.findUnique({
            where: { id },
            include: { contract: { select: { id: true, identifier: true } } }
        })

        if (!item) {
            return { success: false, error: "Item de planejamento não encontrado" }
        }

        return { success: true, data: item }
    } catch (error) {
        console.error("Erro ao buscar item de planejamento financeiro:", error)
        return { success: false, error: "Erro ao buscar item de planejamento financeiro" }
    }
}

export async function getFinancialScheduleSummary(contractId: string) {
    try {
        await assertAuthenticated()
        const items = await prisma.financialScheduleItem.findMany({
            where: { contractId }
        })

        const totalValue = items.reduce((sum, item) => sum + toNumber(item.value), 0)
        const totalPercentage = items.reduce((sum, item) => sum + toNumber(item.percentage), 0)
        const itemCount = items.length

        return {
            success: true,
            data: {
                totalValue,
                totalPercentage,
                itemCount,
                items
            }
        }
    } catch (error) {
        console.error("Erro ao buscar resumo de planejamento financeiro:", error)
        return { success: false, error: "Erro ao buscar resumo de planejamento financeiro" }
    }
}
