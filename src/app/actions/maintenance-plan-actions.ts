'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { assertAuthenticated } from "@/lib/auth-helpers"

// ============================================================================
// SCHEMAS
// ============================================================================

const maintenancePlanItemSchema = z.object({
    maintenanceType: z.string().min(1, "Tipo de manutenção é obrigatório"),
    intervalDays: z.coerce.number().int().positive().optional().nullable(),
    intervalHours: z.coerce.number().min(0).optional().nullable(),
    description: z.string().min(1, "Descrição é obrigatória"),
    lastPerformedAt: z.string().optional().nullable(),
    nextScheduledAt: z.string().optional().nullable(),
})

// ============================================================================
// MAINTENANCE PLAN ITEMS
// ============================================================================

export async function createMaintenancePlanItem(
    equipmentId: string,
    data: z.infer<typeof maintenancePlanItemSchema>
) {
    try {
        await assertAuthenticated()
        const validated = maintenancePlanItemSchema.parse(data)

        const item = await prisma.maintenancePlanItem.create({
            data: {
                equipmentId,
                maintenanceType: validated.maintenanceType,
                intervalDays: validated.intervalDays ?? null,
                intervalHours: validated.intervalHours ?? null,
                description: validated.description,
                lastPerformedAt: validated.lastPerformedAt ? new Date(validated.lastPerformedAt) : null,
                nextScheduledAt: validated.nextScheduledAt ? new Date(validated.nextScheduledAt) : null,
            }
        })

        revalidatePath('/equipamentos')
        revalidatePath(`/equipamentos/${equipmentId}`)
        return { success: true, data: item }
    } catch (error) {
        console.error("Erro ao criar item do plano de manutenção:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar item do plano de manutenção"
        }
    }
}

export async function updateMaintenancePlanItem(
    itemId: string,
    data: z.infer<typeof maintenancePlanItemSchema>
) {
    try {
        await assertAuthenticated()
        const validated = maintenancePlanItemSchema.parse(data)

        const item = await prisma.maintenancePlanItem.findUnique({
            where: { id: itemId }
        })

        if (!item) {
            return { success: false, error: "Item do plano não encontrado" }
        }

        const updated = await prisma.maintenancePlanItem.update({
            where: { id: itemId },
            data: {
                maintenanceType: validated.maintenanceType,
                intervalDays: validated.intervalDays ?? null,
                intervalHours: validated.intervalHours ?? null,
                description: validated.description,
                lastPerformedAt: validated.lastPerformedAt ? new Date(validated.lastPerformedAt) : null,
                nextScheduledAt: validated.nextScheduledAt ? new Date(validated.nextScheduledAt) : null,
            }
        })

        revalidatePath('/equipamentos')
        revalidatePath(`/equipamentos/${item.equipmentId}`)
        return { success: true, data: updated }
    } catch (error) {
        console.error("Erro ao atualizar item do plano de manutenção:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao atualizar item do plano de manutenção"
        }
    }
}

export async function deleteMaintenancePlanItem(itemId: string) {
    try {
        await assertAuthenticated()
        const item = await prisma.maintenancePlanItem.findUnique({
            where: { id: itemId }
        })

        if (!item) {
            return { success: false, error: "Item do plano não encontrado" }
        }

        await prisma.maintenancePlanItem.delete({ where: { id: itemId } })

        revalidatePath('/equipamentos')
        revalidatePath(`/equipamentos/${item.equipmentId}`)
        return { success: true }
    } catch (error) {
        console.error("Erro ao deletar item do plano de manutenção:", error)
        return {
            success: false,
            error: "Erro ao deletar item do plano de manutenção"
        }
    }
}

export async function getMaintenancePlanItems(equipmentId: string) {
    try {
        await assertAuthenticated()
        const items = await prisma.maintenancePlanItem.findMany({
            where: { equipmentId },
            include: {
                equipment: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { maintenanceType: 'asc' }
        })

        return items
    } catch (error) {
        console.error("Erro ao buscar itens do plano de manutenção:", error)
        return []
    }
}

export async function getMaintenancePlanItemById(itemId: string) {
    try {
        await assertAuthenticated()
        const item = await prisma.maintenancePlanItem.findUnique({
            where: { id: itemId },
            include: {
                equipment: {
                    select: { id: true, name: true }
                }
            }
        })

        return item
    } catch (error) {
        console.error("Erro ao buscar item do plano de manutenção:", error)
        return null
    }
}

// ============================================================================
// MAINTENANCE TRACKING
// ============================================================================

export async function markMaintenanceAsPerformed(itemId: string) {
    try {
        await assertAuthenticated()
        const item = await prisma.maintenancePlanItem.findUnique({
            where: { id: itemId }
        })

        if (!item) {
            return { success: false, error: "Item do plano não encontrado" }
        }

        const now = new Date()
        let nextScheduledAt: Date | null = null

        // Calculate next scheduled date based on intervals
        if (item.intervalDays) {
            nextScheduledAt = new Date(now.getTime() + item.intervalDays * 24 * 60 * 60 * 1000)
        } else if (item.intervalHours) {
            const hoursInMillis = Number(item.intervalHours) * 60 * 60 * 1000
            nextScheduledAt = new Date(now.getTime() + hoursInMillis)
        }

        const updated = await prisma.maintenancePlanItem.update({
            where: { id: itemId },
            data: {
                lastPerformedAt: now,
                nextScheduledAt,
            }
        })

        revalidatePath('/equipamentos')
        revalidatePath(`/equipamentos/${item.equipmentId}`)
        return { success: true, data: updated }
    } catch (error) {
        console.error("Erro ao marcar manutenção como realizada:", error)
        return {
            success: false,
            error: "Erro ao marcar manutenção como realizada"
        }
    }
}

export async function getOverdueMaintenanceItems(equipmentId: string) {
    try {
        await assertAuthenticated()
        const now = new Date()

        const overdueItems = await prisma.maintenancePlanItem.findMany({
            where: {
                equipmentId,
                nextScheduledAt: {
                    lt: now,
                    not: null,
                }
            },
            include: {
                equipment: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { nextScheduledAt: 'asc' }
        })

        return overdueItems
    } catch (error) {
        console.error("Erro ao buscar manutenções atrasadas:", error)
        return []
    }
}

export async function getUpcomingMaintenanceItems(equipmentId: string, daysAhead: number = 30) {
    try {
        await assertAuthenticated()
        const now = new Date()
        const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

        const upcomingItems = await prisma.maintenancePlanItem.findMany({
            where: {
                equipmentId,
                nextScheduledAt: {
                    gte: now,
                    lte: futureDate,
                }
            },
            include: {
                equipment: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { nextScheduledAt: 'asc' }
        })

        return upcomingItems
    } catch (error) {
        console.error("Erro ao buscar manutenções próximas:", error)
        return []
    }
}
