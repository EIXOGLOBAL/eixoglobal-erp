'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Decimal } from "@prisma/client/runtime/client"
import { toNumber } from "@/lib/formatters"
import { assertAuthenticated, assertCompanyAccess } from "@/lib/auth-helpers"
import { logCreate, logUpdate, logDelete, logAction } from '@/lib/audit-logger'
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'budget' })

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

export async function getBudgets(_companyId?: string) {
    try {
        const session = await assertAuthenticated()
        const companyId = session.user.companyId
        if (!companyId) return { success: true, data: [] }
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
        log.error({ err: error }, "Erro ao buscar orçamentos")
        return { success: false, data: [], error: "Erro ao buscar orçamentos" }
    }
}

export async function getBudgetById(id: string) {
    try {
        const session = await assertAuthenticated()
        const budget = await prisma.budget.findUnique({
            where: { id },
            include: {
                project: { select: { id: true, name: true, code: true } },
                items: { orderBy: { description: 'asc' } },
            },
        })
        if (!budget) return { success: false, error: "Orçamento não encontrado" }

        if (budget.companyId) {
            await assertCompanyAccess(session, budget.companyId)
        }

        return { success: true, data: budget }
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar orçamento")
        return { success: false, error: "Erro ao buscar orçamento" }
    }
}

export async function createBudget(data: z.infer<typeof budgetSchema>) {
    try {
        const session = await assertAuthenticated()
        // Check write permission - USER role cannot create budgets
        if (session.user.role === 'USER') {
            return { success: false, error: "Sem permissão para criar orçamento" }
        }
        if (session.user.companyId && data.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }
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
        await logCreate('Budget', budget.id, budget.name, validated)
        revalidatePath('/orcamentos')
        return { success: true, data: budget }
    } catch (error: unknown) {
        log.error({ err: error }, "Erro ao criar orçamento")
        const zodError = error as { issues?: { message: string }[] }
        if (zodError.issues) return { success: false, error: zodError.issues[0]?.message }
        return { success: false, error: error instanceof Error ? error.message : "Erro ao criar orçamento" }
    }
}

export async function updateBudget(id: string, data: Partial<z.infer<typeof budgetSchema>>) {
    try {
        const session = await assertAuthenticated()
        // Check write permission - USER role cannot update budgets
        if (session.user.role === 'USER') {
            return { success: false, error: "Sem permissão para editar orçamento" }
        }
        const oldBudget = await prisma.budget.findUnique({ where: { id } })
        const budget = await prisma.budget.update({
            where: { id },
            data: {
                name: data.name,
                code: data.code || null,
                description: data.description || null,
                projectId: data.projectId,
            },
        })
        await logUpdate('Budget', id, budget.name, oldBudget, budget)
        revalidatePath('/orcamentos')
        revalidatePath(`/orcamentos/${id}`)
        return { success: true, data: budget }
    } catch (error) {
        log.error({ err: error }, "Erro ao atualizar orçamento")
        return { success: false, error: "Erro ao atualizar orçamento" }
    }
}

export async function addBudgetItem(budgetId: string, data: z.infer<typeof budgetItemSchema>) {
    try {
        await assertAuthenticated()
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

        await logCreate('BudgetItem', item.id, item.description, validated)

        // Update budget total
        await recalcBudgetTotal(budgetId)

        revalidatePath(`/orcamentos/${budgetId}`)
        return { success: true, data: item }
    } catch (error: unknown) {
        log.error({ err: error }, "Erro ao adicionar item")
        const zodError = error as { issues?: { message: string }[] }
        if (zodError.issues) return { success: false, error: zodError.issues[0]?.message }
        return { success: false, error: error instanceof Error ? error.message : "Erro ao adicionar item" }
    }
}

export async function updateBudgetItem(itemId: string, budgetId: string, data: z.infer<typeof budgetItemSchema>) {
    try {
        await assertAuthenticated()
        const oldItem = await prisma.budgetItem.findUnique({ where: { id: itemId } })
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

        await logUpdate('BudgetItem', itemId, item.description, oldItem, item)

        await recalcBudgetTotal(budgetId)

        revalidatePath(`/orcamentos/${budgetId}`)
        return { success: true, data: item }
    } catch (error: unknown) {
        log.error({ err: error }, "Erro ao atualizar item")
        const zodError = error as { issues?: { message: string }[] }
        if (zodError.issues) return { success: false, error: zodError.issues[0]?.message }
        return { success: false, error: error instanceof Error ? error.message : "Erro ao atualizar item" }
    }
}

export async function deleteBudgetItem(itemId: string, budgetId: string) {
    try {
        const session = await assertAuthenticated()
        // Check delete permission
        if (session.user.role !== "ADMIN" && !session.user.canDelete) {
            return { success: false, error: "Sem permissão para excluir item" }
        }
        const oldItem = await prisma.budgetItem.findUnique({ where: { id: itemId } })
        await prisma.budgetItem.delete({ where: { id: itemId } })
        await logDelete('BudgetItem', itemId, oldItem?.description || 'N/A', oldItem)
        await recalcBudgetTotal(budgetId)
        revalidatePath(`/orcamentos/${budgetId}`)
        return { success: true }
    } catch (error) {
        log.error({ err: error }, "Erro ao remover item")
        return { success: false, error: "Erro ao remover item do orçamento" }
    }
}

export async function approveBudget(id: string) {
    try {
        await assertAuthenticated()
        const budget = await prisma.budget.update({
            where: { id },
            data: { status: 'APPROVED' },
        })
        await logAction('APPROVE', 'Budget', id, budget.name, 'Budget approved')
        revalidatePath('/orcamentos')
        revalidatePath(`/orcamentos/${id}`)
        return { success: true, data: budget }
    } catch (error) {
        return { success: false, error: "Erro ao aprovar orçamento" }
    }
}

export async function rejectBudget(id: string) {
    try {
        await assertAuthenticated()
        const budget = await prisma.budget.update({
            where: { id },
            data: { status: 'REJECTED' },
        })
        await logAction('REJECT', 'Budget', id, budget.name, 'Budget rejected')
        revalidatePath('/orcamentos')
        revalidatePath(`/orcamentos/${id}`)
        return { success: true, data: budget }
    } catch (error) {
        return { success: false, error: "Erro ao rejeitar orçamento" }
    }
}

export async function reviseBudget(id: string) {
    try {
        await assertAuthenticated()
        const budget = await prisma.budget.update({
            where: { id },
            data: { status: 'REVISED' },
        })
        await logAction('REVISE', 'Budget', id, budget.name, 'Budget revised')
        revalidatePath('/orcamentos')
        revalidatePath(`/orcamentos/${id}`)
        return { success: true, data: budget }
    } catch (error) {
        return { success: false, error: "Erro ao revisar orçamento" }
    }
}

export async function deleteBudget(id: string) {
    try {
        const session = await assertAuthenticated()
        // Check delete permission
        if (session.user.role !== "ADMIN" && !session.user.canDelete) {
            return { success: false, error: "Sem permissão para excluir orçamento" }
        }
        const budget = await prisma.budget.findUnique({
            where: { id },
        })
        if (!budget) return { success: false, error: "Orçamento não encontrado" }
        if (budget.status === 'APPROVED') {
            return { success: false, error: "Não é possível excluir um orçamento aprovado" }
        }
        await prisma.budget.delete({ where: { id } })
        await logDelete('Budget', id, budget.name, budget)
        revalidatePath('/orcamentos')
        return { success: true }
    } catch (error) {
        log.error({ err: error }, "Erro ao deletar orçamento")
        return { success: false, error: "Erro ao deletar orçamento" }
    }
}

async function recalcBudgetTotal(budgetId: string) {
    const items = await prisma.budgetItem.findMany({ where: { budgetId } })
    const total = items.reduce((sum, item) => sum + toNumber(item.totalPrice), 0)
    await prisma.budget.update({ where: { id: budgetId }, data: { totalValue: total } })
}

// ── Orçamento com Medido Acumulado ──────────────────────────────────────────

export interface BudgetItemWithMeasured {
    id: string
    budgetId: string
    code: string | null
    description: string
    unit: string
    quantity: number
    unitPrice: number
    totalPrice: number
    category: string | null
    measuredQuantity: number
    measuredPercentage: number
}

export interface BudgetWithMeasuredData {
    id: string
    code: string | null
    name: string
    description: string | null
    projectId: string
    companyId: string
    status: string
    totalValue: number
    createdAt: Date
    updatedAt: Date
    project: { id: string; name: string; code: string | null }
    items: BudgetItemWithMeasured[]
}

/**
 * Retorna o orçamento com o campo extra `measuredQuantity` em cada item,
 * que é a soma das quantidades medidas (currentMeasured) dos boletins aprovados
 * vinculados a cada BudgetItem.
 */
export async function getBudgetWithMeasured(budgetId: string): Promise<{
    success: boolean
    data?: BudgetWithMeasuredData
    error?: string
}> {
    try {
        const session = await assertAuthenticated()

        const budget = await prisma.budget.findUnique({
            where: { id: budgetId },
            include: {
                project: { select: { id: true, name: true, code: true } },
                items: {
                    orderBy: { description: 'asc' },
                    include: {
                        bulletinItems: {
                            where: {
                                bulletin: {
                                    status: { in: ['APPROVED', 'ENGINEER_APPROVED', 'MANAGER_APPROVED'] },
                                },
                            },
                            select: {
                                currentMeasured: true,
                            },
                        },
                    },
                },
            },
        })

        if (!budget) return { success: false, error: "Orçamento não encontrado" }

        await assertCompanyAccess(session, budget.companyId)

        const items: BudgetItemWithMeasured[] = budget.items.map(item => {
            const qty = toNumber(item.quantity)
            const measuredQuantity = item.bulletinItems.reduce(
                (sum, bi) => sum + toNumber(bi.currentMeasured),
                0
            )
            const measuredPercentage = qty > 0 ? (measuredQuantity / qty) * 100 : 0

            return {
                id: item.id,
                budgetId: item.budgetId,
                code: item.code,
                description: item.description,
                unit: item.unit,
                quantity: qty,
                unitPrice: toNumber(item.unitPrice),
                totalPrice: toNumber(item.totalPrice),
                category: item.category,
                measuredQuantity,
                measuredPercentage,
            }
        })

        return {
            success: true,
            data: {
                id: budget.id,
                code: budget.code,
                name: budget.name,
                description: budget.description,
                projectId: budget.projectId,
                companyId: budget.companyId,
                status: budget.status,
                totalValue: toNumber(budget.totalValue),
                createdAt: budget.createdAt,
                updatedAt: budget.updatedAt,
                project: budget.project,
                items,
            },
        }
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar orçamento com medições")
        return { success: false, error: "Erro ao buscar orçamento com medições" }
    }
}

// ── Orçado vs Realizado ──────────────────────────────────────────────────────

export interface BudgetVsActualItem {
    id: string
    code: string | null
    description: string
    category: string | null
    unit: string
    budgeted: number
    actual: number
    deviation: number
    deviationPercent: number
}

export interface BudgetVsActualData {
    budgetId: string
    budgetName: string
    projectId: string
    projectName: string
    items: BudgetVsActualItem[]
    totalBudgeted: number
    totalActual: number
    totalDeviation: number
    totalDeviationPercent: number
}

export async function getBudgetVsActual(budgetId: string): Promise<{ success: boolean; data?: BudgetVsActualData; error?: string }> {
    try {
        const session = await assertAuthenticated()

        const budget = await prisma.budget.findUnique({
            where: { id: budgetId },
            include: {
                project: { select: { id: true, name: true } },
                items: { orderBy: { description: 'asc' } },
            },
        })

        if (!budget) return { success: false, error: "Orçamento não encontrado" }

        await assertCompanyAccess(session, budget.companyId)

        // Buscar registros financeiros (despesas) do projeto vinculado
        const financialRecords = await prisma.financialRecord.findMany({
            where: {
                projectId: budget.projectId,
                type: 'EXPENSE',
                status: { in: ['PAID', 'PENDING'] },
            },
            select: {
                amount: true,
                paidAmount: true,
                status: true,
                category: true,
                description: true,
            },
        })

        // Buscar boletins de medição aprovados do projeto
        const bulletins = await prisma.measurementBulletin.findMany({
            where: {
                projectId: budget.projectId,
                status: { in: ['APPROVED', 'ENGINEER_APPROVED', 'MANAGER_APPROVED'] },
            },
            select: {
                totalValue: true,
            },
        })

        // Total realizado = soma dos financeiros (pagos usam paidAmount, pendentes usam amount)
        // + soma dos boletins de medição aprovados
        const financialTotal = financialRecords.reduce((sum, fr) => {
            const val = fr.status === 'PAID' ? toNumber(fr.paidAmount) : toNumber(fr.amount)
            return sum + val
        }, 0)

        const bulletinTotal = bulletins.reduce((sum, b) => sum + toNumber(b.totalValue), 0)

        const totalActual = financialTotal + bulletinTotal

        // Tentar distribuir o valor realizado proporcionalmente entre os itens do orçamento
        // com base na proporção de cada item no total orçado
        const totalBudgeted = budget.items.reduce((sum, item) => sum + toNumber(item.totalPrice), 0)

        const items: BudgetVsActualItem[] = budget.items.map(item => {
            const budgetedValue = toNumber(item.totalPrice)
            // Distribuição proporcional do valor realizado
            const proportion = totalBudgeted > 0 ? budgetedValue / totalBudgeted : 0
            const actualValue = totalActual * proportion

            const deviation = actualValue - budgetedValue
            const deviationPercent = budgetedValue > 0
                ? (deviation / budgetedValue) * 100
                : (actualValue > 0 ? 100 : 0)

            return {
                id: item.id,
                code: item.code,
                description: item.description,
                category: item.category,
                unit: item.unit,
                budgeted: budgetedValue,
                actual: actualValue,
                deviation,
                deviationPercent,
            }
        })

        const totalDeviation = totalActual - totalBudgeted
        const totalDeviationPercent = totalBudgeted > 0
            ? (totalDeviation / totalBudgeted) * 100
            : (totalActual > 0 ? 100 : 0)

        return {
            success: true,
            data: {
                budgetId: budget.id,
                budgetName: budget.name,
                projectId: budget.projectId,
                projectName: budget.project.name,
                items,
                totalBudgeted,
                totalActual,
                totalDeviation,
                totalDeviationPercent,
            },
        }
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar comparativo orçado vs realizado")
        return { success: false, error: "Erro ao buscar dados comparativos" }
    }
}

// ── Gerar Orçamento a partir de Contrato ────────────────────────────────────

export async function generateBudgetFromContract(contractId: string) {
    try {
        const session = await assertAuthenticated()

        const contract = await prisma.contract.findUnique({
            where: { id: contractId },
            include: {
                project: { select: { id: true, name: true } },
                items: true,
            },
        })

        if (!contract) {
            return { success: false, error: "Contrato não encontrado" }
        }

        await assertCompanyAccess(session, contract.companyId)

        if (!contract.items || contract.items.length === 0) {
            return { success: false, error: "Contrato não possui itens para gerar orçamento" }
        }

        const budget = await prisma.$transaction(async (tx) => {
            // Criar o Budget vinculado ao projeto do contrato
            const newBudget = await tx.budget.create({
                data: {
                    name: `Orçamento - ${contract.identifier}`,
                    description: `Orçamento gerado a partir do contrato ${contract.identifier}`,
                    projectId: contract.projectId,
                    companyId: contract.companyId,
                    status: 'DRAFT',
                    totalValue: 0,
                },
            })

            // Copiar cada ContractItem como BudgetItem
            let total = new Decimal(0)
            for (const item of contract.items) {
                const quantity = new Decimal(item.quantity)
                const unitPrice = new Decimal(item.unitPrice)
                const totalPrice = quantity.mul(unitPrice)
                total = total.add(totalPrice)

                await tx.budgetItem.create({
                    data: {
                        budgetId: newBudget.id,
                        description: item.description,
                        unit: item.unit,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice,
                    },
                })
            }

            // Atualizar o total do orçamento
            const updatedBudget = await tx.budget.update({
                where: { id: newBudget.id },
                data: { totalValue: total },
            })

            return updatedBudget
        })

        await logCreate('Budget', budget.id, budget.name, {
            source: 'contract',
            contractId: contract.id,
            contractIdentifier: contract.identifier,
            itemsCount: contract.items.length,
        })

        revalidatePath('/orcamentos')
        revalidatePath(`/contratos/${contractId}`)

        return { success: true, data: budget }
    } catch (error) {
        log.error({ err: error }, "Erro ao gerar orçamento a partir do contrato")
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao gerar orçamento a partir do contrato",
        }
    }
}
