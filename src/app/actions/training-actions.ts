'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"
import { logCreate, logUpdate, logDelete, logAction } from '@/lib/audit-logger'
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'training' })

const trainingSchema = z.object({
    title: z.string().min(3, "Título deve ter no mínimo 3 caracteres"),
    description: z.string().optional().nullable(),
    instructor: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    startDate: z.string(),
    endDate: z.string().optional().nullable(),
    hours: z.number().min(0, "Carga horária não pode ser negativa"),
    maxParticipants: z.number().int().positive().optional().nullable(),
    status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    type: z.enum(['INTERNAL', 'EXTERNAL', 'NR', 'CERTIFICATION', 'OTHER']).optional(),
    cost: z.number().min(0).optional().nullable(),
    companyId: z.string().uuid(),
})

export async function createTraining(data: z.infer<typeof trainingSchema>) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Check write permission - USER role cannot create trainings
        if (session.user.role === 'USER') {
            return { success: false, error: "Sem permissão para criar treinamento" }
        }

        // Verify company access
        if (data.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const validated = trainingSchema.parse(data)

        const training = await prisma.training.create({
            data: {
                title: validated.title,
                description: validated.description || null,
                instructor: validated.instructor || null,
                location: validated.location || null,
                startDate: new Date(validated.startDate),
                endDate: validated.endDate ? new Date(validated.endDate) : null,
                hours: validated.hours,
                maxParticipants: validated.maxParticipants ?? null,
                status: validated.status || 'SCHEDULED',
                type: validated.type || 'INTERNAL',
                cost: validated.cost ?? null,
                companyId: validated.companyId,
            },
        })

        await logCreate('Training', training.id, training.title || 'N/A', validated)

        revalidatePath('/rh/treinamentos')
        return { success: true, data: training }
    } catch (error) {
        log.error({ err: error }, "Erro ao criar treinamento")
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar treinamento",
        }
    }
}

export async function updateTraining(id: string, data: z.infer<typeof trainingSchema>) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Check write permission - USER role cannot update trainings
        if (session.user.role === 'USER') {
            return { success: false, error: "Sem permissão para editar treinamento" }
        }

        // Verify training belongs to user's company
        const training = await prisma.training.findUnique({
            where: { id },
        })
        if (!training || training.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const validated = trainingSchema.parse(data)

        const updated = await prisma.training.update({
            where: { id },
            data: {
                title: validated.title,
                description: validated.description || null,
                instructor: validated.instructor || null,
                location: validated.location || null,
                startDate: new Date(validated.startDate),
                endDate: validated.endDate ? new Date(validated.endDate) : null,
                hours: validated.hours,
                maxParticipants: validated.maxParticipants ?? null,
                status: validated.status || 'SCHEDULED',
                type: validated.type || 'INTERNAL',
                cost: validated.cost ?? null,
            },
        })

        await logUpdate('Training', id, updated.title || 'N/A', training, updated)

        revalidatePath('/rh/treinamentos')
        return { success: true, data: updated }
    } catch (error) {
        log.error({ err: error }, "Erro ao atualizar treinamento")
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao atualizar treinamento",
        }
    }
}

export async function deleteTraining(id: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Check delete permission
        if (session.user.role !== "ADMIN" && !session.user.canDelete) {
            return { success: false, error: "Sem permissão para excluir" }
        }

        // Verify training belongs to user's company
        const training = await prisma.training.findUnique({
            where: { id },
        })
        if (!training || training.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        await prisma.training.delete({
            where: { id },
        })

        await logDelete('Training', id, training.title || 'N/A', training)

        revalidatePath('/rh/treinamentos')
        return { success: true }
    } catch (error) {
        log.error({ err: error }, "Erro ao deletar treinamento")
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao deletar treinamento",
        }
    }
}

export async function getTrainings(companyId: string) {
    try {
        const trainings = await prisma.training.findMany({
            where: { companyId },
            include: {
                _count: {
                    select: { participants: true },
                },
            },
            orderBy: { startDate: 'desc' },
        })

        return trainings.map(t => ({
            ...t,
            hours: Number(t.hours),
            cost: t.cost ? Number(t.cost) : null,
        }))
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar treinamentos")
        return []
    }
}

export async function addParticipant(trainingId: string, employeeId: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Verify training belongs to user's company
        const training = await prisma.training.findUnique({
            where: { id: trainingId },
            select: { companyId: true }
        })
        if (!training || training.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        // Verify employee belongs to user's company
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            select: { companyId: true }
        })
        if (!employee || employee.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const participant = await prisma.trainingParticipant.create({
            data: {
                trainingId,
                employeeId,
            },
        })

        await logCreate('TrainingParticipant', participant.id, `Training:${trainingId} Employee:${employeeId}`, { trainingId, employeeId })

        revalidatePath('/rh/treinamentos')
        return { success: true, data: participant }
    } catch (error) {
        log.error({ err: error }, "Erro ao adicionar participante")
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao adicionar participante",
        }
    }
}

export async function removeParticipant(trainingId: string, employeeId: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Check delete permission
        if (session.user.role !== "ADMIN" && !session.user.canDelete) {
            return { success: false, error: "Sem permissão para excluir" }
        }

        // Verify training belongs to user's company
        const training = await prisma.training.findUnique({
            where: { id: trainingId },
            select: { companyId: true }
        })
        if (!training || training.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const oldParticipant = await prisma.trainingParticipant.findUnique({
            where: { trainingId_employeeId: { trainingId, employeeId } },
        })

        await prisma.trainingParticipant.delete({
            where: {
                trainingId_employeeId: {
                    trainingId,
                    employeeId,
                },
            },
        })

        await logDelete('TrainingParticipant', oldParticipant?.id || `${trainingId}-${employeeId}`, `Training:${trainingId} Employee:${employeeId}`, oldParticipant)

        revalidatePath('/rh/treinamentos')
        return { success: true }
    } catch (error) {
        log.error({ err: error }, "Erro ao remover participante")
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao remover participante",
        }
    }
}

export async function markAttendance(
    trainingId: string,
    employeeId: string,
    attended: boolean,
    certified: boolean
) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Verify training belongs to user's company
        const training = await prisma.training.findUnique({
            where: { id: trainingId },
            select: { companyId: true }
        })
        if (!training || training.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const oldParticipant = await prisma.trainingParticipant.findUnique({
            where: { trainingId_employeeId: { trainingId, employeeId } },
        })

        const participant = await prisma.trainingParticipant.update({
            where: {
                trainingId_employeeId: {
                    trainingId,
                    employeeId,
                },
            },
            data: {
                attended,
                certified,
            },
        })

        await logUpdate('TrainingParticipant', participant.id, `Training:${trainingId} Employee:${employeeId}`, oldParticipant, participant)

        revalidatePath('/rh/treinamentos')
        return { success: true, data: participant }
    } catch (error) {
        log.error({ err: error }, "Erro ao atualizar presença")
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao atualizar presença",
        }
    }
}

export async function getTrainingParticipants(trainingId: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Verify training belongs to user's company
        const training = await prisma.training.findUnique({
            where: { id: trainingId },
            select: { companyId: true }
        })
        if (!training || training.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado", data: [] }
        }

        const participants = await prisma.trainingParticipant.findMany({
            where: { trainingId },
            include: {
                employee: {
                    select: {
                        id: true,
                        name: true,
                        jobTitle: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        })

        return { success: true, data: participants }
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar participantes")
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao buscar participantes",
            data: [],
        }
    }
}

// ============================================================================
// CERTIFICAÇÕES DO FUNCIONÁRIO
// ============================================================================

/**
 * Busca certificações e treinamentos de um funcionário.
 * Retorna participações onde certified=true OU attended=true, com dados do treinamento.
 */
export async function getEmployeeCertifications(employeeId: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return []

        // Verify employee belongs to user's company
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            select: { companyId: true },
        })
        if (!employee || employee.companyId !== session.user.companyId) {
            return []
        }

        const participations = await prisma.trainingParticipant.findMany({
            where: {
                employeeId,
                OR: [
                    { certified: true },
                    { attended: true },
                ],
            },
            include: {
                training: {
                    select: {
                        id: true,
                        title: true,
                        type: true,
                        status: true,
                        startDate: true,
                        endDate: true,
                        hours: true,
                        instructor: true,
                    },
                },
            },
            orderBy: { training: { startDate: 'desc' } },
        })

        return participations.map(p => ({
            id: p.id,
            trainingId: p.training.id,
            title: p.training.title,
            type: p.training.type,
            status: p.training.status,
            startDate: p.training.startDate,
            endDate: p.training.endDate,
            hours: Number(p.training.hours),
            instructor: p.training.instructor,
            attended: p.attended,
            certified: p.certified,
            notes: p.notes,
        }))
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar certificações do funcionário")
        return []
    }
}
