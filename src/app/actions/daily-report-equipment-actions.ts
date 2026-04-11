'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { assertAuthenticated } from "@/lib/auth-helpers"
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'daily-report-equipment' })

// ============================================================================
// SCHEMAS
// ============================================================================

const equipmentEntrySchema = z.object({
    equipmentId: z.string().optional().nullable(),
    name: z.string().min(1, "Nome do equipamento é obrigatório"),
    hours: z.coerce.number().min(0, "Horas não podem ser negativas"),
    observations: z.string().optional().nullable(),
})

// ============================================================================
// DAILY REPORT EQUIPMENT
// ============================================================================

export async function createDailyReportEquipment(
    reportId: string,
    data: z.infer<typeof equipmentEntrySchema>
) {
    try {
        await assertAuthenticated()
        const validated = equipmentEntrySchema.parse(data)

        const equipment = await prisma.dailyReportEquipment.create({
            data: {
                reportId,
                equipmentId: validated.equipmentId ?? null,
                name: validated.name,
                hours: validated.hours,
                observations: validated.observations ?? null,
            }
        })

        revalidatePath('/rdo')
        revalidatePath(`/rdo/${reportId}`)
        return { success: true, data: equipment }
    } catch (error) {
        log.error({ err: error }, "Erro ao criar equipamento do RDO")
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar equipamento do RDO"
        }
    }
}

export async function updateDailyReportEquipment(
    equipmentId: string,
    data: z.infer<typeof equipmentEntrySchema>
) {
    try {
        await assertAuthenticated()
        const validated = equipmentEntrySchema.parse(data)

        const equipment = await prisma.dailyReportEquipment.findUnique({
            where: { id: equipmentId }
        })

        if (!equipment) {
            return { success: false, error: "Equipamento não encontrado" }
        }

        const updated = await prisma.dailyReportEquipment.update({
            where: { id: equipmentId },
            data: {
                equipmentId: validated.equipmentId ?? null,
                name: validated.name,
                hours: validated.hours,
                observations: validated.observations ?? null,
            }
        })

        revalidatePath('/rdo')
        revalidatePath(`/rdo/${equipment.reportId}`)
        return { success: true, data: updated }
    } catch (error) {
        log.error({ err: error }, "Erro ao atualizar equipamento do RDO")
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao atualizar equipamento do RDO"
        }
    }
}

export async function deleteDailyReportEquipment(equipmentId: string) {
    try {
        await assertAuthenticated()
        const equipment = await prisma.dailyReportEquipment.findUnique({
            where: { id: equipmentId }
        })

        if (!equipment) {
            return { success: false, error: "Equipamento não encontrado" }
        }

        await prisma.dailyReportEquipment.delete({ where: { id: equipmentId } })

        revalidatePath('/rdo')
        revalidatePath(`/rdo/${equipment.reportId}`)
        return { success: true }
    } catch (error) {
        log.error({ err: error }, "Erro ao deletar equipamento do RDO")
        return {
            success: false,
            error: "Erro ao deletar equipamento do RDO"
        }
    }
}

export async function getDailyReportEquipments(reportId: string) {
    try {
        await assertAuthenticated()
        const equipments = await prisma.dailyReportEquipment.findMany({
            where: { reportId },
            include: {
                equipment: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { name: 'asc' }
        })

        return equipments
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar equipamentos do RDO")
        return []
    }
}

export async function getDailyReportEquipmentById(equipmentId: string) {
    try {
        await assertAuthenticated()
        const equipment = await prisma.dailyReportEquipment.findUnique({
            where: { id: equipmentId },
            include: {
                equipment: {
                    select: { id: true, name: true }
                }
            }
        })

        return equipment
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar equipamento do RDO")
        return null
    }
}
