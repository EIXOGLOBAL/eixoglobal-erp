'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { toNumber } from "@/lib/formatters"
import { assertAuthenticated, assertCompanyAccess } from "@/lib/auth-helpers"
import { logCreate, logUpdate, logDelete, logAction } from '@/lib/audit-logger'

const costCenterSchema = z.object({
    code: z.string().min(1, "Código é obrigatório"),
    name: z.string().min(2, "Nome é obrigatório"),
    description: z.string().optional().nullable(),
    type: z.enum(['OPERATIONAL', 'ADMINISTRATIVE', 'FINANCIAL', 'COMMERCIAL', 'OTHER']).optional(),
    isActive: z.boolean().optional(),
    parentId: z.string().uuid().optional().nullable(),
    companyId: z.string().uuid(),
    projectId: z.string().uuid().optional().nullable(),
})

export async function createCostCenter(data: z.infer<typeof costCenterSchema>) {
    try {
        await assertAuthenticated()
        const validated = costCenterSchema.parse(data)

        const costCenter = await prisma.costCenter.create({
            data: {
                code: validated.code,
                name: validated.name,
                description: validated.description || null,
                type: validated.type || 'OPERATIONAL',
                isActive: validated.isActive ?? true,
                parentId: validated.parentId || null,
                companyId: validated.companyId,
                projectId: validated.projectId || null,
            },
        })

        await logCreate('CostCenter', costCenter.id, costCenter.name, validated)

        revalidatePath('/financeiro/centros-de-custo')
        return { success: true, data: costCenter }
    } catch (error) {
        console.error("Erro ao criar centro de custo:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar centro de custo",
        }
    }
}

export async function updateCostCenter(id: string, data: z.infer<typeof costCenterSchema>) {
    try {
        await assertAuthenticated()
        const validated = costCenterSchema.parse(data)

        // Prevent setting itself as its own parent
        if (validated.parentId === id) {
            return { success: false, error: "Um centro de custo não pode ser seu próprio pai." }
        }

        const oldData = await prisma.costCenter.findUnique({ where: { id } })

        const costCenter = await prisma.costCenter.update({
            where: { id },
            data: {
                code: validated.code,
                name: validated.name,
                description: validated.description || null,
                type: validated.type || 'OPERATIONAL',
                isActive: validated.isActive ?? true,
                parentId: validated.parentId || null,
                projectId: validated.projectId || null,
            },
        })

        await logUpdate('CostCenter', id, costCenter.name, oldData, costCenter)

        revalidatePath('/financeiro/centros-de-custo')
        return { success: true, data: costCenter }
    } catch (error) {
        console.error("Erro ao atualizar centro de custo:", error)
        return { success: false, error: "Erro ao atualizar centro de custo" }
    }
}

export async function deleteCostCenter(id: string) {
    try {
        await assertAuthenticated()
        // Check if the cost center has children
        const childrenCount = await prisma.costCenter.count({
            where: { parentId: id },
        })

        if (childrenCount > 0) {
            return {
                success: false,
                error: `Este centro de custo possui ${childrenCount} sub-centro(s) vinculado(s). Remova os vínculos antes de excluir.`,
            }
        }

        const old = await prisma.costCenter.findUnique({ where: { id } })

        await prisma.costCenter.delete({ where: { id } })

        await logDelete('CostCenter', id, old?.name || 'N/A', old)

        revalidatePath('/financeiro/centros-de-custo')
        return { success: true }
    } catch (error) {
        console.error("Erro ao deletar centro de custo:", error)
        return { success: false, error: "Erro ao deletar centro de custo" }
    }
}

export async function getCostCenters(companyId: string) {
    try {
        await assertAuthenticated()
        const costCenters = await prisma.costCenter.findMany({
            where: { companyId },
            include: {
                _count: { select: { children: true } },
                parent: { select: { id: true, name: true, code: true } },
                project: { select: { id: true, name: true } },
            },
            orderBy: { code: 'asc' },
        })
        return costCenters
    } catch (error) {
        console.error("Erro ao buscar centros de custo:", error)
        return []
    }
}

export async function getCostCentersByProject(projectId: string, companyId: string) {
    try {
        await assertAuthenticated()
        const costCenters = await prisma.costCenter.findMany({
            where: {
                companyId,
                OR: [
                    { projectId },
                    { projectId: null },
                ],
                isActive: true,
            },
            orderBy: [{ projectId: 'asc' }, { name: 'asc' }],
        })
        return { success: true, data: costCenters }
    } catch (error) {
        console.error("Erro ao buscar centros de custo por projeto:", error)
        return { success: false, data: [], error: "Erro ao buscar centros de custo" }
    }
}

export async function getCostCenterReport(companyId: string, projectId?: string) {
    try {
        await assertAuthenticated()
        const costCenters = await prisma.costCenter.findMany({
            where: {
                companyId,
                ...(projectId ? { OR: [{ projectId }, { projectId: null }] } : {}),
            },
            include: {
                project: { select: { id: true, name: true } },
                financialRecords: {
                    where: { type: 'EXPENSE' },
                    select: { amount: true },
                },
                equipmentUsages: {
                    select: { totalCost: true },
                },
                rentalPayments: {
                    select: { amount: true },
                },
                purchaseOrders: {
                    select: { totalValue: true },
                },
            },
            orderBy: { code: 'asc' },
        })

        return {
            success: true,
            data: costCenters.map((cc) => {
                const financial = cc.financialRecords.reduce((s, r) => s + toNumber(r.amount), 0)
                const equipment = cc.equipmentUsages.reduce((s, u) => s + toNumber(u.totalCost), 0)
                const rentals = cc.rentalPayments.reduce((s, p) => s + toNumber(p.amount), 0)
                const purchases = cc.purchaseOrders.reduce((s, o) => s + toNumber(o.totalValue), 0)
                const totalExpenses = financial + equipment + rentals + purchases

                return {
                    id: cc.id,
                    code: cc.code,
                    name: cc.name,
                    project: cc.project,
                    totalExpenses,
                    breakdown: { financial, equipment, rentals, purchases },
                }
            }),
        }
    } catch (error) {
        console.error("Erro ao gerar relatório de centro de custo:", error)
        return { success: false, data: [], error: "Erro ao gerar relatório" }
    }
}

export async function toggleCostCenterStatus(id: string, isActive: boolean) {
    try {
        await assertAuthenticated()
        const costCenter = await prisma.costCenter.update({
            where: { id },
            data: { isActive },
        })

        await logAction(isActive ? 'ACTIVATE' : 'DEACTIVATE', 'CostCenter', id, costCenter.name, `Status set to ${isActive ? 'active' : 'inactive'}`)

        revalidatePath('/financeiro/centros-de-custo')
        return { success: true, data: costCenter }
    } catch (error) {
        console.error("Erro ao alterar status do centro de custo:", error)
        return { success: false, error: "Erro ao alterar status do centro de custo" }
    }
}

export async function getCostCenterById(id: string) {
    try {
        const session = await assertAuthenticated()
        const costCenter = await prisma.costCenter.findUnique({
            where: { id },
            include: {
                parent: { select: { id: true, name: true, code: true } },
                children: { select: { id: true, name: true, code: true, isActive: true }, orderBy: { code: 'asc' } },
                project: { select: { id: true, name: true } },
                budgets: { orderBy: { year: 'desc' } },
                _count: { select: { children: true, financialRecords: true } },
            },
        })
        if (!costCenter) return { success: false, error: "Centro de custo não encontrado" }

        if (costCenter.companyId) {
            await assertCompanyAccess(session, costCenter.companyId)
        }

        return { success: true, data: costCenter }
    } catch (error) {
        console.error("Erro ao buscar centro de custo:", error)
        return { success: false, error: "Erro ao buscar centro de custo" }
    }
}
