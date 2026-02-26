'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

const allocationSchema = z.object({
    employeeId: z.string().uuid("ID de funcionário inválido"),
    projectId: z.string().uuid("ID de projeto inválido"),
    startDate: z.string().min(1, "Data de início é obrigatória"),
    endDate: z.string().optional().nullable(),
})

export async function createAllocation(data: z.infer<typeof allocationSchema>) {
    try {
        const validated = allocationSchema.parse(data)

        const allocation = await prisma.allocation.create({
            data: {
                employeeId: validated.employeeId,
                projectId: validated.projectId,
                startDate: new Date(validated.startDate),
                endDate: validated.endDate ? new Date(validated.endDate) : null,
            },
            include: {
                employee: { select: { id: true, name: true, jobTitle: true } },
                project: { select: { id: true, name: true, status: true } },
            }
        })

        revalidatePath('/rh/alocacoes')
        return { success: true, data: allocation }
    } catch (error) {
        console.error("Erro ao criar alocação:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar alocação"
        }
    }
}

export async function updateAllocation(id: string, data: z.infer<typeof allocationSchema>) {
    try {
        const validated = allocationSchema.parse(data)

        const allocation = await prisma.allocation.update({
            where: { id },
            data: {
                employeeId: validated.employeeId,
                projectId: validated.projectId,
                startDate: new Date(validated.startDate),
                endDate: validated.endDate ? new Date(validated.endDate) : null,
            },
            include: {
                employee: { select: { id: true, name: true, jobTitle: true } },
                project: { select: { id: true, name: true, status: true } },
            }
        })

        revalidatePath('/rh/alocacoes')
        return { success: true, data: allocation }
    } catch (error) {
        console.error("Erro ao atualizar alocação:", error)
        return { success: false, error: "Erro ao atualizar alocação" }
    }
}

export async function deleteAllocation(id: string) {
    try {
        await prisma.allocation.delete({ where: { id } })
        revalidatePath('/rh/alocacoes')
        return { success: true }
    } catch (error) {
        console.error("Erro ao deletar alocação:", error)
        return { success: false, error: "Erro ao deletar alocação" }
    }
}

export async function getAllocations(companyId: string) {
    try {
        const allocations = await prisma.allocation.findMany({
            where: { employee: { companyId } },
            include: {
                employee: { select: { id: true, name: true, jobTitle: true } },
                project: { select: { id: true, name: true, status: true } },
            },
            orderBy: { startDate: 'desc' },
        })
        return allocations
    } catch (error) {
        console.error("Erro ao buscar alocações:", error)
        return []
    }
}
