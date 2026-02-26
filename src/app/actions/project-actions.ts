'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getNextCode } from "@/lib/sequence"
import { getSession } from "@/lib/auth"
import { assertCanDelete } from "@/lib/permissions"

const projectSchema = z.object({
    name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
    description: z.string().optional(),
    companyId: z.string().uuid("Empresa inválida"),
    startDate: z.string(),
    endDate: z.string().optional(),
    budget: z.number().optional(),
    status: z.enum(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED']).optional(),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    address: z.string().optional(),
    area: z.coerce.number().optional().nullable(),
    clientId: z.string().uuid().optional().nullable(),
})

export async function createProject(data: z.infer<typeof projectSchema>) {
    try {
        const validated = projectSchema.parse(data)

        const code = await getNextCode('project', validated.companyId)

        const project = await prisma.project.create({
            data: {
                code,
                name: validated.name,
                description: validated.description,
                companyId: validated.companyId,
                startDate: new Date(validated.startDate),
                endDate: validated.endDate ? new Date(validated.endDate) : null,
                budget: validated.budget || 0,
                status: validated.status || 'PLANNING',
                latitude: validated.latitude ?? null,
                longitude: validated.longitude ?? null,
                address: validated.address ?? null,
                area: validated.area ?? null,
                clientId: validated.clientId ?? null,
            }
        })

        revalidatePath('/projects')
        return { success: true, data: project }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao criar projeto' }
    }
}

export async function updateProject(id: string, data: z.infer<typeof projectSchema>) {
    try {
        const validated = projectSchema.parse(data)

        const existingProject = await prisma.project.findUnique({ where: { id }, select: { status: true } })

        const project = await prisma.project.update({
            where: { id },
            data: {
                name: validated.name,
                description: validated.description,
                companyId: validated.companyId,
                startDate: new Date(validated.startDate),
                endDate: validated.endDate ? new Date(validated.endDate) : null,
                budget: validated.budget || 0,
                status: validated.status || 'PLANNING',
                latitude: validated.latitude ?? null,
                longitude: validated.longitude ?? null,
                address: validated.address ?? null,
                area: validated.area ?? null,
                clientId: validated.clientId ?? null,
            }
        })

        if (existingProject && existingProject.status !== (validated.status || 'PLANNING')) {
            await prisma.projectStatusHistory.create({
                data: {
                    projectId: id,
                    oldStatus: existingProject.status,
                    newStatus: validated.status || 'PLANNING',
                    changedBy: 'Sistema',
                    note: null,
                }
            })
        }

        revalidatePath('/projects')
        revalidatePath(`/projects/${id}`)
        return { success: true, data: project }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao atualizar projeto' }
    }
}

export async function deleteProject(id: string) {
    const session = await getSession()
    if (!session) return { success: false, error: 'Não autenticado' }

    try {
        assertCanDelete(session.user)
    } catch (e) {
        return { success: false, error: (e as Error).message }
    }

    try {
        // Check if project has measurements or contracts
        const projectWithRelations = await prisma.project.findUnique({
            where: { id },
            include: {
                measurements: true,
                contracts: true,
            }
        })

        if (!projectWithRelations) {
            return { success: false, error: 'Projeto não encontrado' }
        }

        if (projectWithRelations.measurements.length > 0) {
            return { success: false, error: 'Não é possível excluir projetos com medições registradas' }
        }

        if (projectWithRelations.contracts.length > 0) {
            return { success: false, error: 'Não é possível excluir projetos com contratos ativos' }
        }

        await prisma.project.delete({
            where: { id }
        })

        revalidatePath('/projects')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao excluir projeto' }
    }
}

export async function getProjects(companyId?: string) {
    try {
        const projects = await prisma.project.findMany({
            where: companyId ? { companyId } : undefined,
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        cnpj: true,
                    }
                },
                _count: {
                    select: {
                        measurements: true,
                        contracts: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        // Convert Decimal to Number for client components
        const serializedProjects = projects.map(project => ({
            ...project,
            budget: Number(project.budget || 0)
        }))

        return { success: true, data: serializedProjects }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao buscar projetos' }
    }
}

export async function getProjectById(id: string) {
    try {
        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                company: true,
                client: true,
                contracts: {
                    include: {
                        items: true,
                    }
                },
                measurements: {
                    include: {
                        contractItem: true,
                        employee: true,
                    },
                    orderBy: {
                        date: 'desc'
                    }
                },
                allocations: {
                    include: {
                        employee: true,
                    }
                },
                _count: {
                    select: {
                        measurements: true,
                        contracts: true,
                    }
                }
            }
        })

        if (!project) {
            return { success: false, error: 'Projeto não encontrado' }
        }

        // Convert Decimal to Number for client components
        const serializedProject = {
            ...project,
            budget: Number(project.budget || 0)
        }

        return { success: true, data: serializedProject }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao buscar projeto' }
    }
}

// ========================================
// ALOCAÇÕES
// ========================================

export async function createAllocation(data: {
    projectId: string
    employeeId: string
    startDate: string
    endDate?: string
}) {
    try {
        const allocation = await prisma.allocation.create({
            data: {
                projectId: data.projectId,
                employeeId: data.employeeId,
                startDate: new Date(data.startDate),
                endDate: data.endDate ? new Date(data.endDate) : null,
            },
            include: {
                employee: { select: { name: true, jobTitle: true } }
            }
        })
        revalidatePath(`/projects/${data.projectId}`)
        return { success: true, data: allocation }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao criar alocação' }
    }
}

export async function deleteAllocation(allocationId: string, projectId: string) {
    try {
        await prisma.allocation.delete({ where: { id: allocationId } })
        revalidatePath(`/projects/${projectId}`)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao remover alocação' }
    }
}

export async function changeProjectStatus(id: string, status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED') {
    try {
        const existing = await prisma.project.findUnique({ where: { id }, select: { status: true } })
        const project = await prisma.project.update({ where: { id }, data: { status } })
        if (existing && existing.status !== status) {
            await prisma.projectStatusHistory.create({
                data: {
                    projectId: id,
                    oldStatus: existing.status,
                    newStatus: status,
                    changedBy: 'Sistema',
                    note: null,
                }
            })
        }
        revalidatePath('/projects')
        revalidatePath(`/projects/${id}`)
        return { success: true, data: project }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao alterar status do projeto' }
    }
}
