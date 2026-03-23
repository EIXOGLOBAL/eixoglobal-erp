'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { toNumber } from "@/lib/formatters"

const budgetSchema = z.object({
    name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
    code: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    projectId: z.string().min(1, "Projeto é obrigatório"),
    companyId: z.string().min(1, "Empresa é obrigatória"),
})

const budgetItemSchema = z.object({
    code: z.string().optional().nullable(),
    description: z.string().min(2, "Descrição deve ter no mínimo 2 caracteres"),
    unit: z.string().min(1, "Unidade é obrigatória"),
    quantity: z.number().positive("Quantidade deve ser maior que zero"),
    unitPrice: z.number().positive("Preço unitário deve ser maior que zero"),
    category: z.string().optional().nullable(),
})

export async function getBudgets(companyId: string) {
    try {
        const budgets = await prisma.budget.findMany({
            where: { companyId },
            include: {
                project: { select: { id: true, name: true } },
                _count: { select: { items: true } },
            },
            orderBy: { createdAt: 'desc' },
        })
        return { success: true, data: budgets }
    } catch (error) {
        console.error("Erro ao buscar orçamentos:", error)
        return { success: false, data: [], error: "Erro ao buscar orçamentos" }
    }
}

export async function getBudgetById(id: string) {
    try {
        const budget = await prisma.budget.findUnique({
            where: { id },
            include: {
                project: { select: { id: true, name: true, code: true } },
                items: { orderBy: { description: 'asc' } },
            },
        })
        if (!budget) return { success: false, error: "Orçamento não encontrado" }
        return { success: true, data: budget }
    } catch (error) {
        console.error("Erro ao buscar orçamento:", error)
        return { success: false, error: "Erro ao buscar orçamento" }
    }
}

export async function createBudget(data: z.infer<typeof budgetSchema>) {
    try {
        const validated = budgetSchema.parse(data)
        const budget = await prisma.budget.create({
            data: {
                name: validated.name,
                code: validated.code || null,
                description: validated.description || null,
                projectId: validated.projectId,
                companyId: validated.companyId,
                status: 'DRAFT',
                totalValue: 0,
            },
        })
        revalidatePath('/orcamentos')
        return { success: true, data: budget }
    } catch (error: unknown) {
        console.error("Erro ao criar orçamento:", error)
        const zodError = error as { issues?: { message: string }[] }
        if (zodError.issues) return { success: false, error: zodError.issues[0]?.message }
        return { success: false, error: error instanceof Error ? error.message : "Erro ao criar orçamento" }
    }
}

export async function updateBudget(id: string, data: Partial<z.infer<typeof budgetSchema>>) {
    try {
        const budget = await prisma.budget.update({
            where: { id },
            data: {
                name: data.name,
                code: data.code || null,
                description: data.description || null,
                projectId: data.projectId,
            },
        })
        revalidatePath('/orcamentos')
        revalidatePath(`/orcamentos/${id}`)
        return { success: true, data: budget }
    } catch (error) {
        console.error("Erro ao atualizar orçamento:", error)
        return { success: false, error: "Erro ao atualizar orçamento" }
    }
}

export async function addBudgetItem(budgetId: string, data: z.infer<typeof budgetItemSchema>) {
    try {
        const validated = budgetItemSchema.parse(data)
        const totalPrice = validated.quantity * validated.unitPrice

        const item = await prisma.budgetItem.create({
            data: {
                budgetId,
                code: validated.code || null,
                description: validated.description,
                unit: validated.unit,
                quantity: validated.quantity,
                unitPrice: validated.unitPrice,
                totalPrice,
                category: validated.category || null,
            },
        })

        // Update budget total
        await recalcBudgetTotal(budgetId)

        revalidatePath(`/orcamentos/${budgetId}`)
        return { success: true, data: item }
    } catch (error: unknown) {
        console.error("Erro ao adicionar item:", error)
        const zodError = error as { issues?: { message: string }[] }
        if (zodError.issues) return { success: false, error: zodError.issues[0]?.message }
        return { success: false, error: error instanceof Error ? error.message : "Erro ao adicionar item" }
    }
}

export async function updateBudgetItem(itemId: string, budgetId: string, data: z.infer<typeof budgetItemSchema>) {
    try {
        const validated = budgetItemSchema.parse(data)
        const totalPrice = validated.quantity * validated.unitPrice

        const item = await prisma.budgetItem.update({
            where: { id: itemId },
            data: {
                code: validated.code || null,
                description: validated.description,
                unit: validated.unit,
                quantity: validated.quantity,
                unitPrice: validated.unitPrice,
                totalPrice,
                category: validated.category || null,
            },
        })

        await recalcBudgetTotal(budgetId)

        revalidatePath(`/orcamentos/${budgetId}`)
        return { success: true, data: item }
    } catch (error: unknown) {
        console.error("Erro ao atualizar item:", error)
        const zodError = error as { issues?: { message: string }[] }
        if (zodError.issues) return { success: false, error: zodError.issues[0]?.message }
        return { success: false, error: error instanceof Error ? error.message : "Erro ao atualizar item" }
    }
}

export async function deleteBudgetItem(itemId: string, budgetId: string) {
    try {
        await prisma.budgetItem.delete({ where: { id: itemId } })
        await recalcBudgetTotal(budgetId)
        revalidatePath(`/orcamentos/${budgetId}`)
        return { success: true }
    } catch (error) {
        console.error("Erro ao remover item:", error)
        return { success: false, error: "Erro ao remover item do orçamento" }
    }
}

export async function approveBudget(id: string) {
    try {
        const budget = await prisma.budget.update({
            where: { id },
            data: { status: 'APPROVED' },
        })
        revalidatePath('/orcamentos')
        revalidatePath(`/orcamentos/${id}`)
        return { success: true, data: budget }
    } catch (error) {
        return { success: false, error: "Erro ao aprovar orçamento" }
    }
}

export async function rejectBudget(id: string) {
    try {
        const budget = await prisma.budget.update({
            where: { id },
            data: { status: 'REJECTED' },
        })
        revalidatePath('/orcamentos')
        revalidatePath(`/orcamentos/${id}`)
        return { success: true, data: budget }
    } catch (error) {
        return { success: false, error: "Erro ao rejeitar orçamento" }
    }
}

export async function reviseBudget(id: string) {
    try {
        const budget = await prisma.budget.update({
            where: { id },
            data: { status: 'REVISED' },
        })
        revalidatePath('/orcamentos')
        revalidatePath(`/orcamentos/${id}`)
        return { success: true, data: budget }
    } catch (error) {
        return { success: false, error: "Erro ao revisar orçamento" }
    }
}

export async function deleteBudget(id: string) {
    try {
        const budget = await prisma.budget.findUnique({
            where: { id },
        })
        if (!budget) {
            return { success: false, error: "Orçamento não encontrado" }
        }
        if (budget.status !== 'DRAFT' && budget.status !== 'REJECTED') {
            return { success: false, error: "Apenas orçamentos em rascunho ou rejeitados podem ser excluídos" }
        }
        await prisma.budget.delete({ where: { id } })
        revalidatePath('/orcamentos')
        return { success: true }
    } catch (error) {
        console.error("Erro ao excluir orçamento:", error)
        return { success: false, error: "Erro ao excluir orçamento" }
    }
}

async function recalcBudgetTotal(budgetId: string) {
    const items = await prisma.budgetItem.findMany({ where: { budgetId } })
    const total = items.reduce((sum, item) => sum + toNumber(item.totalPrice), 0)
    await prisma.budget.update({ where: { id: budgetId }, data: { totalValue: total } })
}
