'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"
import { logCreate, logUpdate, logDelete, logAction } from '@/lib/audit-logger'

const allocationSchema = z.object({
    employeeId: z.string().uuid("ID de funcionário inválido"),
    projectId: z.string().uuid("ID de projeto inválido"),
    startDate: z.string().min(1, "Data de início é obrigatória"),
    endDate: z.string().optional().nullable(),
})

export async function createAllocation(data: z.infer<typeof allocationSchema>) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Verify both employee and project belong to user's company
        const [employee, project] = await Promise.all([
            prisma.employee.findUnique({
                where: { id: data.employeeId },
                select: { companyId: true }
            }),
            prisma.project.findUnique({
                where: { id: data.projectId },
                select: { companyId: true }
            })
        ])

        if (!employee || employee.companyId !== session.user.companyId ||
            !project || project.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

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

        await logCreate('Allocation', allocation.id, `${allocation.employee.name} -> ${allocation.project.name}`, validated)

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
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Verify allocation belongs to user's company
        const existing = await prisma.allocation.findUnique({
            where: { id },
            include: {
                employee: { select: { companyId: true, name: true } },
                project: { select: { companyId: true, name: true } }
            }
        })
        if (!existing ||
            existing.employee.companyId !== session.user.companyId ||
            existing.project.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        // Verify both new employee and project belong to user's company
        const [employee, project] = await Promise.all([
            prisma.employee.findUnique({
                where: { id: data.employeeId },
                select: { companyId: true }
            }),
            prisma.project.findUnique({
                where: { id: data.projectId },
                select: { companyId: true }
            })
        ])

        if (!employee || employee.companyId !== session.user.companyId ||
            !project || project.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

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

        await logUpdate('Allocation', id, `${allocation.employee.name} -> ${allocation.project.name}`, existing, allocation)

        revalidatePath('/rh/alocacoes')
        return { success: true, data: allocation }
    } catch (error) {
        console.error("Erro ao atualizar alocação:", error)
        return { success: false, error: "Erro ao atualizar alocação" }
    }
}

export async function deleteAllocation(id: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Check delete permission
        if (session.user.role !== "ADMIN" && !session.user.canDelete) {
            return { success: false, error: "Sem permissão para excluir" }
        }

        // Verify allocation belongs to user's company
        const existing = await prisma.allocation.findUnique({
            where: { id },
            include: {
                employee: { select: { companyId: true, name: true } },
                project: { select: { companyId: true, name: true } }
            }
        })
        if (!existing ||
            existing.employee.companyId !== session.user.companyId ||
            existing.project.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        await prisma.allocation.delete({ where: { id } })

        await logDelete('Allocation', id, `${existing.employee.name} -> ${existing.project.name}`, existing)

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

export async function getEmployeesAllocatedToProject(projectId: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return []

        const now = new Date()

        const allocations = await prisma.allocation.findMany({
            where: {
                projectId,
                startDate: { lte: now },
                OR: [
                    { endDate: null },
                    { endDate: { gte: now } },
                ],
                employee: {
                    companyId: session.user.companyId,
                    status: 'ACTIVE',
                    isDeleted: false,
                },
            },
            include: {
                employee: { select: { id: true, name: true } },
            },
            orderBy: { employee: { name: 'asc' } },
        })

        // Deduplica caso haja múltiplas alocações para o mesmo funcionário
        const seen = new Set<string>()
        const employees: { id: string; name: string }[] = []
        for (const alloc of allocations) {
            if (!seen.has(alloc.employee.id)) {
                seen.add(alloc.employee.id)
                employees.push({ id: alloc.employee.id, name: alloc.employee.name })
            }
        }

        return employees
    } catch (error) {
        console.error("Erro ao buscar funcionários alocados ao projeto:", error)
        return []
    }
}
