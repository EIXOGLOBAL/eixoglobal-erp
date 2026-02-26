'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"
import { assertCanDelete } from "@/lib/permissions"

// ============================================================================
// SCHEMAS
// ============================================================================

const equipmentSchema = z.object({
    code: z.string().min(1, "Código é obrigatório"),
    name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
    type: z.enum([
        'VEHICLE', 'CRANE', 'EXCAVATOR', 'CONCRETE_MIXER', 'COMPRESSOR',
        'GENERATOR', 'SCAFFOLD', 'FORMWORK', 'PUMP', 'TOOL', 'OTHER'
    ]),
    brand: z.string().optional().nullable(),
    model: z.string().optional().nullable(),
    year: z.number().int().optional().nullable(),
    status: z.enum(['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'INACTIVE', 'RENTED_OUT']).optional(),
    costPerHour: z.number().min(0).optional().nullable(),
    costPerDay: z.number().min(0).optional().nullable(),
    isOwned: z.boolean().default(true),
    notes: z.string().optional().nullable(),
})

const usageSchema = z.object({
    projectId: z.string().min(1, "Projeto é obrigatório"),
    startDate: z.string().min(1, "Data de início é obrigatória"),
    endDate: z.string().optional().nullable(),
    hours: z.number().min(0).optional().nullable(),
    days: z.number().min(0).optional().nullable(),
    operator: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    costCenterId: z.string().uuid().optional().nullable(),
})

const maintenanceSchema = z.object({
    type: z.enum(['PREVENTIVE', 'CORRECTIVE', 'INSPECTION']),
    description: z.string().min(1, "Descrição é obrigatória"),
    scheduledAt: z.string().min(1, "Data agendada é obrigatória"),
    provider: z.string().optional().nullable(),
    cost: z.number().min(0).optional().nullable(),
    notes: z.string().optional().nullable(),
})

// ============================================================================
// CRUD DE EQUIPAMENTOS
// ============================================================================

export async function createEquipment(
    data: z.infer<typeof equipmentSchema>,
    companyId: string
) {
    try {
        const validated = equipmentSchema.parse(data)

        const existing = await prisma.equipment.findFirst({
            where: { code: validated.code, companyId },
        })

        if (existing) {
            return { success: false, error: "Já existe um equipamento com este código" }
        }

        const equipment = await prisma.equipment.create({
            data: {
                code: validated.code,
                name: validated.name,
                type: validated.type,
                brand: validated.brand,
                model: validated.model,
                year: validated.year,
                status: validated.status ?? 'AVAILABLE',
                costPerHour: validated.costPerHour,
                costPerDay: validated.costPerDay,
                isOwned: validated.isOwned,
                notes: validated.notes,
                companyId,
            },
        })

        revalidatePath('/equipamentos')
        return { success: true, data: equipment }
    } catch (error) {
        console.error("Erro ao criar equipamento:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar equipamento",
        }
    }
}

export async function updateEquipment(
    id: string,
    data: z.infer<typeof equipmentSchema>
) {
    try {
        const validated = equipmentSchema.parse(data)

        const equipment = await prisma.equipment.update({
            where: { id },
            data: {
                code: validated.code,
                name: validated.name,
                type: validated.type,
                brand: validated.brand,
                model: validated.model,
                year: validated.year,
                status: validated.status,
                costPerHour: validated.costPerHour,
                costPerDay: validated.costPerDay,
                isOwned: validated.isOwned,
                notes: validated.notes,
            },
        })

        revalidatePath('/equipamentos')
        revalidatePath(`/equipamentos/${id}`)
        return { success: true, data: equipment }
    } catch (error) {
        console.error("Erro ao atualizar equipamento:", error)
        return { success: false, error: "Erro ao atualizar equipamento" }
    }
}

export async function deleteEquipment(id: string) {
    const session = await getSession()
    if (!session) return { success: false, error: 'Não autenticado' }

    try {
        assertCanDelete(session.user)
    } catch (e) {
        return { success: false, error: (e as Error).message }
    }

    try {
        const equipment = await prisma.equipment.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { usages: true },
                },
            },
        })

        if (!equipment) {
            return { success: false, error: "Equipamento não encontrado" }
        }

        const activeUsage = await prisma.equipmentUsage.findFirst({
            where: { equipmentId: id, endDate: null },
        })

        if (activeUsage) {
            return {
                success: false,
                error: "Não é possível excluir equipamento com uso ativo. Encerre o uso primeiro.",
            }
        }

        await prisma.equipment.delete({ where: { id } })

        revalidatePath('/equipamentos')
        return { success: true }
    } catch (error) {
        console.error("Erro ao deletar equipamento:", error)
        return { success: false, error: "Erro ao deletar equipamento" }
    }
}

export async function getEquipment(companyId: string) {
    try {
        const equipment = await prisma.equipment.findMany({
            where: { companyId },
            include: {
                _count: {
                    select: {
                        usages: true,
                        maintenances: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        })

        return { success: true, data: equipment }
    } catch (error) {
        console.error("Erro ao buscar equipamentos:", error)
        return { success: false, error: "Erro ao buscar equipamentos", data: [] }
    }
}

export async function getEquipmentById(id: string) {
    try {
        const equipment = await prisma.equipment.findUnique({
            where: { id },
            include: {
                usages: {
                    include: {
                        project: { select: { id: true, name: true } },
                    },
                    orderBy: { startDate: 'desc' },
                },
                maintenances: {
                    orderBy: { scheduledAt: 'desc' },
                },
                _count: {
                    select: { usages: true, maintenances: true },
                },
            },
        })

        if (!equipment) return { success: false, error: "Equipamento não encontrado" }

        return { success: true, data: equipment }
    } catch (error) {
        console.error("Erro ao buscar equipamento:", error)
        return { success: false, error: "Erro ao buscar equipamento" }
    }
}

export async function updateEquipmentStatus(
    id: string,
    status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'INACTIVE' | 'RENTED_OUT'
) {
    try {
        const equipment = await prisma.equipment.update({
            where: { id },
            data: { status },
        })

        revalidatePath('/equipamentos')
        revalidatePath(`/equipamentos/${id}`)
        return { success: true, data: equipment }
    } catch (error) {
        console.error("Erro ao atualizar status:", error)
        return { success: false, error: "Erro ao atualizar status do equipamento" }
    }
}

// ============================================================================
// USOS DE EQUIPAMENTOS
// ============================================================================

function calcTotalCost(
    hours: number | null | undefined,
    days: number | null | undefined,
    costPerHour: number | null | undefined,
    costPerDay: number | null | undefined
): number | null {
    let total = 0
    if (hours && costPerHour) total += hours * costPerHour
    if (days && costPerDay) total += days * costPerDay
    return total > 0 ? total : null
}

export async function addUsage(
    equipmentId: string,
    data: z.infer<typeof usageSchema>
) {
    try {
        const validated = usageSchema.parse(data)

        const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId } })
        if (!equipment) return { success: false, error: "Equipamento não encontrado" }

        const hasActiveUsage = await prisma.equipmentUsage.findFirst({
            where: { equipmentId, endDate: null },
        })

        if (hasActiveUsage) {
            return {
                success: false,
                error: "Este equipamento já possui um uso em aberto. Encerre-o antes de iniciar um novo.",
            }
        }

        const endDate = validated.endDate ? new Date(validated.endDate) : null
        const totalCost = endDate
            ? calcTotalCost(validated.hours, validated.days, equipment.costPerHour, equipment.costPerDay)
            : null

        const usage = await prisma.equipmentUsage.create({
            data: {
                equipmentId,
                projectId: validated.projectId,
                startDate: new Date(validated.startDate),
                endDate,
                hours: validated.hours,
                days: validated.days,
                totalCost,
                operator: validated.operator,
                notes: validated.notes,
                costCenterId: validated.costCenterId || null,
            },
        })

        // Update equipment status
        const newStatus = endDate ? 'AVAILABLE' : 'IN_USE'
        await prisma.equipment.update({
            where: { id: equipmentId },
            data: { status: newStatus },
        })

        revalidatePath('/equipamentos')
        revalidatePath(`/equipamentos/${equipmentId}`)
        return { success: true, data: usage }
    } catch (error) {
        console.error("Erro ao registrar uso:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao registrar uso",
        }
    }
}

export async function endUsage(
    usageId: string,
    endDate: string,
    hours?: number,
    days?: number
) {
    try {
        const usage = await prisma.equipmentUsage.findUnique({
            where: { id: usageId },
            include: { equipment: true },
        })

        if (!usage) return { success: false, error: "Registro de uso não encontrado" }

        const totalCost = calcTotalCost(
            hours ?? usage.hours,
            days ?? usage.days,
            usage.equipment.costPerHour,
            usage.equipment.costPerDay
        )

        const updatedUsage = await prisma.equipmentUsage.update({
            where: { id: usageId },
            data: {
                endDate: new Date(endDate),
                hours: hours ?? usage.hours,
                days: days ?? usage.days,
                totalCost,
            },
        })

        await prisma.equipment.update({
            where: { id: usage.equipmentId },
            data: { status: 'AVAILABLE' },
        })

        revalidatePath('/equipamentos')
        revalidatePath(`/equipamentos/${usage.equipmentId}`)
        return { success: true, data: updatedUsage }
    } catch (error) {
        console.error("Erro ao encerrar uso:", error)
        return { success: false, error: "Erro ao encerrar uso" }
    }
}

// ============================================================================
// MANUTENÇÕES
// ============================================================================

export async function addMaintenance(
    equipmentId: string,
    data: z.infer<typeof maintenanceSchema>
) {
    try {
        const validated = maintenanceSchema.parse(data)

        const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId } })
        if (!equipment) return { success: false, error: "Equipamento não encontrado" }

        const maintenance = await prisma.equipmentMaintenance.create({
            data: {
                equipmentId,
                type: validated.type,
                description: validated.description,
                scheduledAt: new Date(validated.scheduledAt),
                provider: validated.provider,
                cost: validated.cost,
                notes: validated.notes,
            },
        })

        // Change equipment status to MAINTENANCE
        await prisma.equipment.update({
            where: { id: equipmentId },
            data: { status: 'MAINTENANCE' },
        })

        revalidatePath('/equipamentos')
        revalidatePath(`/equipamentos/${equipmentId}`)
        return { success: true, data: maintenance }
    } catch (error) {
        console.error("Erro ao agendar manutenção:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao agendar manutenção",
        }
    }
}

export async function completeMaintenance(
    maintenanceId: string,
    completedAt: string,
    cost?: number
) {
    try {
        const maintenance = await prisma.equipmentMaintenance.findUnique({
            where: { id: maintenanceId },
        })

        if (!maintenance) return { success: false, error: "Manutenção não encontrada" }

        const updated = await prisma.equipmentMaintenance.update({
            where: { id: maintenanceId },
            data: {
                completedAt: new Date(completedAt),
                cost: cost ?? maintenance.cost,
            },
        })

        await prisma.equipment.update({
            where: { id: maintenance.equipmentId },
            data: { status: 'AVAILABLE' },
        })

        revalidatePath('/equipamentos')
        revalidatePath(`/equipamentos/${maintenance.equipmentId}`)
        return { success: true, data: updated }
    } catch (error) {
        console.error("Erro ao concluir manutenção:", error)
        return { success: false, error: "Erro ao concluir manutenção" }
    }
}
