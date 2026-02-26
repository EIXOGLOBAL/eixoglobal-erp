'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { createNotificationForMany } from "./notification-actions"
import { notifyUsers } from "@/lib/sse-notifications"

const vacationSchema = z.object({
    employeeId: z.string().uuid(),
    type: z.enum(['VACATION', 'SICK_LEAVE', 'MATERNITY', 'PATERNITY', 'BEREAVEMENT', 'PERSONAL', 'ACCIDENT', 'OTHER']),
    startDate: z.string(),
    endDate: z.string(),
    reason: z.string().optional().nullable(),
    approvedBy: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
})

type VacationInput = z.infer<typeof vacationSchema>

function calculateDays(startDate: string, endDate: string): number {
    return Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
}

export async function createVacationRequest(data: VacationInput) {
    try {
        const validated = vacationSchema.parse(data)
        const days = calculateDays(validated.startDate, validated.endDate)

        const request = await prisma.vacationRequest.create({
            data: {
                employeeId: validated.employeeId,
                type: validated.type,
                startDate: new Date(validated.startDate),
                endDate: new Date(validated.endDate),
                days,
                status: 'PENDING',
                reason: validated.reason || null,
                approvedBy: validated.approvedBy || null,
                notes: validated.notes || null,
            },
        })

        revalidatePath('/dep-pessoal/ferias')
        return { success: true, data: request }
    } catch (error) {
        console.error("Erro ao criar solicitação:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar solicitação",
        }
    }
}

export async function updateVacationRequest(id: string, data: VacationInput) {
    try {
        const validated = vacationSchema.parse(data)
        const days = calculateDays(validated.startDate, validated.endDate)

        const request = await prisma.vacationRequest.update({
            where: { id },
            data: {
                employeeId: validated.employeeId,
                type: validated.type,
                startDate: new Date(validated.startDate),
                endDate: new Date(validated.endDate),
                days,
                reason: validated.reason || null,
                approvedBy: validated.approvedBy || null,
                notes: validated.notes || null,
            },
        })

        revalidatePath('/dep-pessoal/ferias')
        return { success: true, data: request }
    } catch (error) {
        console.error("Erro ao atualizar solicitação:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao atualizar solicitação",
        }
    }
}

export async function deleteVacationRequest(id: string) {
    try {
        const existing = await prisma.vacationRequest.findUnique({ where: { id } })
        if (!existing) {
            return { success: false, error: "Solicitação não encontrada" }
        }
        if (existing.status !== 'PENDING' && existing.status !== 'REJECTED') {
            return { success: false, error: "Apenas solicitações pendentes ou rejeitadas podem ser excluídas" }
        }

        await prisma.vacationRequest.delete({ where: { id } })

        revalidatePath('/dep-pessoal/ferias')
        return { success: true }
    } catch (error) {
        console.error("Erro ao excluir solicitação:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao excluir solicitação",
        }
    }
}

export async function approveVacationRequest(id: string, approvedBy: string) {
    try {
        const request = await prisma.vacationRequest.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedBy,
            },
            include: { employee: { select: { name: true, companyId: true } } },
        })

        // Notify ADMIN/MANAGER about approval
        const managers = await prisma.user.findMany({
            where: { companyId: request.employee.companyId, role: { in: ['ADMIN', 'MANAGER'] } },
            select: { id: true },
        })
        const managerIds = managers.map(m => m.id)
        const notifData = {
            type: 'VACATION_APPROVED',
            title: 'Férias aprovadas',
            message: `Férias de ${request.employee.name} foram aprovadas.`,
            link: '/dep-pessoal/ferias',
        }
        await createNotificationForMany({ userIds: managerIds, companyId: request.employee.companyId, ...notifData })
        notifyUsers(managerIds, notifData)

        revalidatePath('/dep-pessoal/ferias')
        return { success: true, data: request }
    } catch (error) {
        console.error("Erro ao aprovar solicitação:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao aprovar solicitação",
        }
    }
}

export async function rejectVacationRequest(id: string, reason: string) {
    try {
        const request = await prisma.vacationRequest.update({
            where: { id },
            data: {
                status: 'REJECTED',
                notes: reason,
            },
            include: { employee: { select: { name: true, companyId: true } } },
        })

        // Notify ADMIN/MANAGER about rejection
        const managers = await prisma.user.findMany({
            where: { companyId: request.employee.companyId, role: { in: ['ADMIN', 'MANAGER'] } },
            select: { id: true },
        })
        const managerIds = managers.map(m => m.id)
        const notifData = {
            type: 'VACATION_REJECTED',
            title: 'Férias rejeitadas',
            message: `Férias de ${request.employee.name} foram rejeitadas.`,
            link: '/dep-pessoal/ferias',
        }
        await createNotificationForMany({ userIds: managerIds, companyId: request.employee.companyId, ...notifData })
        notifyUsers(managerIds, notifData)

        revalidatePath('/dep-pessoal/ferias')
        return { success: true, data: request }
    } catch (error) {
        console.error("Erro ao rejeitar solicitação:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao rejeitar solicitação",
        }
    }
}

export async function getVacationRequests(companyId: string) {
    try {
        const requests = await prisma.vacationRequest.findMany({
            where: { employee: { companyId } },
            include: {
                employee: {
                    select: {
                        id: true,
                        name: true,
                        jobTitle: true,
                    },
                },
            },
            orderBy: { startDate: 'desc' },
        })

        return requests
    } catch (error) {
        console.error("Erro ao buscar solicitações:", error)
        return []
    }
}
