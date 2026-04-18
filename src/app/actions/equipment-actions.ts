'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"
import { assertAuthenticated, assertCompanyAccess } from "@/lib/auth-helpers"
import { assertCanDelete } from "@/lib/permissions"
import { toNumber } from "@/lib/formatters"
import { getPaginationArgs, paginatedResponse, type PaginationParams } from "@/lib/pagination"
import { buildWhereClause, type FilterParams } from "@/lib/filters"
import { logCreate, logUpdate, logDelete, logAction } from '@/lib/audit-logger'
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'equipment' })

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
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Verificar acesso à empresa
        if (session.user.companyId !== companyId) {
            return { success: false, error: "Acesso negado" }
        }

        // Check write permission - USER role cannot create equipment
        if (session.user.role === 'USER') {
            return { success: false, error: "Sem permissão para criar equipamento" }
        }

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

        await logCreate('Equipment', equipment.id, equipment.name, validated)

        revalidatePath('/equipamentos')
        return { success: true, data: equipment }
    } catch (error) {
        log.error({ err: error }, "Erro ao criar equipamento")
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
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Check write permission - USER role cannot update equipment
        if (session.user.role === 'USER') {
            return { success: false, error: "Sem permissão para editar equipamento" }
        }

        const validated = equipmentSchema.parse(data)

        const oldData = await prisma.equipment.findUnique({ where: { id } })
        if (!oldData) return { success: false, error: "Equipamento não encontrado" }

        // Verificar que o equipamento pertence à empresa do usuário
        if (oldData.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

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

        await logUpdate('Equipment', id, equipment.name, oldData, equipment)

        revalidatePath('/equipamentos')
        revalidatePath(`/equipamentos/${id}`)
        return { success: true, data: equipment }
    } catch (error) {
        log.error({ err: error }, "Erro ao atualizar equipamento")
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

        // Verificar que o equipamento pertence à empresa do usuário
        if (equipment.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
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

        await logDelete('Equipment', id, equipment.name, equipment)

        revalidatePath('/equipamentos')
        return { success: true }
    } catch (error) {
        log.error({ err: error }, "Erro ao deletar equipamento")
        return { success: false, error: "Erro ao deletar equipamento" }
    }
}

export async function getEquipment(params?: {
    companyId?: string
    pagination?: PaginationParams
    filters?: FilterParams
}) {
    try {
        const session = await getSession()
        if (!session?.user) return { success: true, data: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } }

        const { skip, take, page, pageSize } = getPaginationArgs(params?.pagination)
        const filterWhere = buildWhereClause(params?.filters || {}, ['name', 'code'])
        const where = {
            companyId: (session.user as any).companyId,
            ...filterWhere
        }

        const [equipment, total] = await Promise.all([
            prisma.equipment.findMany({
                where,
                skip,
                take,
                include: {
                    _count: {
                        select: {
                            usages: true,
                            maintenances: true,
                        },
                    },
                },
                orderBy: { name: 'asc' },
            }),
            prisma.equipment.count({ where })
        ])

        return { success: true, data: equipment, pagination: paginatedResponse(equipment, total, page, pageSize).pagination }
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar equipamentos")
        return { success: false, error: "Erro ao buscar equipamentos", data: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } }
    }
}

export async function getEquipmentById(id: string) {
    try {
        const session = await assertAuthenticated()

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

        if (equipment.companyId) {
            await assertCompanyAccess(session, equipment.companyId)
        }

        return { success: true, data: equipment }
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar equipamento")
        return { success: false, error: "Erro ao buscar equipamento" }
    }
}

export async function updateEquipmentStatus(
    id: string,
    status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'INACTIVE' | 'RENTED_OUT'
) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        const oldEquipment = await prisma.equipment.findUnique({ where: { id }, select: { status: true, name: true, companyId: true } })
        if (!oldEquipment) return { success: false, error: "Equipamento não encontrado" }

        // Verificar que o equipamento pertence à empresa do usuário
        if (oldEquipment.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const equipment = await prisma.equipment.update({
            where: { id },
            data: { status },
        })

        await logAction('STATUS_CHANGE', 'Equipment', id, equipment.name, `Status alterado de ${oldEquipment?.status || 'N/A'} para ${status}`)

        revalidatePath('/equipamentos')
        revalidatePath(`/equipamentos/${id}`)
        return { success: true, data: equipment }
    } catch (error) {
        log.error({ err: error }, "Erro ao atualizar status")
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
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        const validated = usageSchema.parse(data)

        const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId } })
        if (!equipment) return { success: false, error: "Equipamento não encontrado" }

        // Verificar que o equipamento pertence à empresa do usuário
        if (equipment.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

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
            ? calcTotalCost(validated.hours, validated.days, equipment.costPerHour !== null ? toNumber(equipment.costPerHour) : null, equipment.costPerDay !== null ? toNumber(equipment.costPerDay) : null)
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
        log.error({ err: error }, "Erro ao registrar uso")
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
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        const usage = await prisma.equipmentUsage.findUnique({
            where: { id: usageId },
            include: { equipment: true },
        })

        if (!usage) return { success: false, error: "Registro de uso não encontrado" }

        // Verificar que o equipamento pertence à empresa do usuário
        if (usage.equipment.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const totalCost = calcTotalCost(
            hours ?? (usage.hours !== null ? toNumber(usage.hours) : null),
            days ?? (usage.days !== null ? toNumber(usage.days) : null),
            usage.equipment.costPerHour !== null ? toNumber(usage.equipment.costPerHour) : null,
            usage.equipment.costPerDay !== null ? toNumber(usage.equipment.costPerDay) : null
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
        log.error({ err: error }, "Erro ao encerrar uso")
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
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        const validated = maintenanceSchema.parse(data)

        const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId } })
        if (!equipment) return { success: false, error: "Equipamento não encontrado" }

        // Verificar que o equipamento pertence à empresa do usuário
        if (equipment.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

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

        await logCreate('EquipmentMaintenance', maintenance.id, maintenance.description, validated)

        // Change equipment status to MAINTENANCE
        await prisma.equipment.update({
            where: { id: equipmentId },
            data: { status: 'MAINTENANCE' },
        })

        // Sync: create financial record (expense) when maintenance has cost > 0
        if (validated.cost && validated.cost > 0) {
            try {
                const financialRecord = await prisma.financialRecord.create({
                    data: {
                        companyId: equipment.companyId,
                        description: `Manutenção - ${equipment.name} - ${validated.description}`,
                        amount: validated.cost,
                        type: 'EXPENSE',
                        status: 'PENDING',
                        category: 'MANUTENCAO',
                        dueDate: new Date(validated.scheduledAt),
                    },
                })

                await logCreate('FinancialRecord', financialRecord.id, financialRecord.description, {
                    maintenanceId: maintenance.id,
                    equipmentId,
                    amount: validated.cost,
                })
                revalidatePath('/financeiro')
            } catch (finError) {
                // Log but do not fail – the maintenance itself was already saved.
                log.error({ err: finError, context: maintenance.id }, '[addMaintenance] Failed to create FinancialRecord for maintenance')
            }
        }

        revalidatePath('/equipamentos')
        revalidatePath(`/equipamentos/${equipmentId}`)
        return { success: true, data: maintenance }
    } catch (error) {
        log.error({ err: error }, "Erro ao agendar manutenção")
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
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        const maintenance = await prisma.equipmentMaintenance.findUnique({
            where: { id: maintenanceId },
            include: { equipment: { select: { companyId: true } } },
        })

        if (!maintenance) return { success: false, error: "Manutenção não encontrada" }

        // Verificar que o equipamento pertence à empresa do usuário
        if (maintenance.equipment.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const updated = await prisma.equipmentMaintenance.update({
            where: { id: maintenanceId },
            data: {
                completedAt: new Date(completedAt),
                cost: cost ?? maintenance.cost,
            },
        })

        await logUpdate('EquipmentMaintenance', maintenanceId, updated.description, maintenance, updated)

        await prisma.equipment.update({
            where: { id: maintenance.equipmentId },
            data: { status: 'AVAILABLE' },
        })

        revalidatePath('/equipamentos')
        revalidatePath(`/equipamentos/${maintenance.equipmentId}`)
        return { success: true, data: updated }
    } catch (error) {
        log.error({ err: error }, "Erro ao concluir manutenção")
        return { success: false, error: "Erro ao concluir manutenção" }
    }
}
