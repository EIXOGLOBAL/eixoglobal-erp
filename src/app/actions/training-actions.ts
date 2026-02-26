'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

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

        revalidatePath('/rh/treinamentos')
        return { success: true, data: training }
    } catch (error) {
        console.error("Erro ao criar treinamento:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar treinamento",
        }
    }
}

export async function updateTraining(id: string, data: z.infer<typeof trainingSchema>) {
    try {
        const validated = trainingSchema.parse(data)

        const training = await prisma.training.update({
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

        revalidatePath('/rh/treinamentos')
        return { success: true, data: training }
    } catch (error) {
        console.error("Erro ao atualizar treinamento:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao atualizar treinamento",
        }
    }
}

export async function deleteTraining(id: string) {
    try {
        await prisma.training.delete({
            where: { id },
        })

        revalidatePath('/rh/treinamentos')
        return { success: true }
    } catch (error) {
        console.error("Erro ao deletar treinamento:", error)
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
        console.error("Erro ao buscar treinamentos:", error)
        return []
    }
}

export async function addParticipant(trainingId: string, employeeId: string) {
    try {
        const participant = await prisma.trainingParticipant.create({
            data: {
                trainingId,
                employeeId,
            },
        })

        revalidatePath('/rh/treinamentos')
        return { success: true, data: participant }
    } catch (error) {
        console.error("Erro ao adicionar participante:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao adicionar participante",
        }
    }
}

export async function removeParticipant(trainingId: string, employeeId: string) {
    try {
        await prisma.trainingParticipant.delete({
            where: {
                trainingId_employeeId: {
                    trainingId,
                    employeeId,
                },
            },
        })

        revalidatePath('/rh/treinamentos')
        return { success: true }
    } catch (error) {
        console.error("Erro ao remover participante:", error)
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

        revalidatePath('/rh/treinamentos')
        return { success: true, data: participant }
    } catch (error) {
        console.error("Erro ao atualizar presença:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao atualizar presença",
        }
    }
}

export async function getTrainingParticipants(trainingId: string) {
    try {
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
        console.error("Erro ao buscar participantes:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao buscar participantes",
            data: [],
        }
    }
}
