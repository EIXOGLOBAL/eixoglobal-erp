'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { assertAuthenticated } from "@/lib/auth-helpers"
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'task-dependency' })

const DEPENDENCY_TYPES = ['FS', 'SS', 'FF', 'SF'] as const

const taskDependencySchema = z.object({
    predecessorId: z.string().uuid("ID da tarefa predecessora inválido"),
    successorId: z.string().uuid("ID da tarefa sucessora inválido"),
    type: z.enum(DEPENDENCY_TYPES).default('FS'),
    lag: z.number().int().default(0),
})

// Helper function to check for circular dependencies
async function hasCircularDependency(predecessorId: string, successorId: string): Promise<boolean> {
    // Check if there's already a path from successor to predecessor
    const reachable = new Set<string>()
    const queue = [successorId]

    while (queue.length > 0) {
        const current = queue.shift()!
        if (current === predecessorId) {
            return true
        }

        if (reachable.has(current)) {
            continue
        }

        reachable.add(current)

        const dependents = await prisma.taskDependency.findMany({
            where: { predecessorId: current },
            select: { successorId: true }
        })

        for (const dep of dependents) {
            if (!reachable.has(dep.successorId)) {
                queue.push(dep.successorId)
            }
        }
    }

    return false
}

export async function createTaskDependency(data: z.infer<typeof taskDependencySchema>) {
    try {
        await assertAuthenticated()
        const validated = taskDependencySchema.parse(data)

        // Prevent self-referencing
        if (validated.predecessorId === validated.successorId) {
            return { success: false, error: "Uma tarefa não pode depender de si mesma" }
        }

        // Verify both tasks exist
        const [predecessor, successor] = await Promise.all([
            prisma.projectTask.findUnique({ where: { id: validated.predecessorId } }),
            prisma.projectTask.findUnique({ where: { id: validated.successorId } })
        ])

        if (!predecessor || !successor) {
            return { success: false, error: "Uma ou ambas as tarefas não foram encontradas" }
        }

        // Check for circular dependencies
        const hasCircular = await hasCircularDependency(validated.predecessorId, validated.successorId)
        if (hasCircular) {
            return { success: false, error: "Esta dependência criaria uma referência circular" }
        }

        // Check if dependency already exists (unique constraint)
        const existing = await prisma.taskDependency.findUnique({
            where: {
                predecessorId_successorId: {
                    predecessorId: validated.predecessorId,
                    successorId: validated.successorId
                }
            }
        })

        if (existing) {
            return { success: false, error: "Esta dependência já existe" }
        }

        const dependency = await prisma.taskDependency.create({
            data: {
                predecessorId: validated.predecessorId,
                successorId: validated.successorId,
                type: validated.type,
                lag: validated.lag,
            },
            include: {
                predecessor: { select: { id: true, name: true } },
                successor: { select: { id: true, name: true } }
            }
        })

        revalidatePath('/cronograma')
        return { success: true, data: dependency }
    } catch (error) {
        log.error({ err: error }, "Erro ao criar dependência de tarefa")
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar dependência de tarefa",
        }
    }
}

export async function updateTaskDependency(id: string, data: z.infer<typeof taskDependencySchema>) {
    try {
        await assertAuthenticated()
        const validated = taskDependencySchema.parse(data)

        // Prevent self-referencing
        if (validated.predecessorId === validated.successorId) {
            return { success: false, error: "Uma tarefa não pode depender de si mesma" }
        }

        // Verify the dependency exists
        const existing = await prisma.taskDependency.findUnique({ where: { id } })
        if (!existing) {
            return { success: false, error: "Dependência não encontrada" }
        }

        // Verify both tasks exist
        const [predecessor, successor] = await Promise.all([
            prisma.projectTask.findUnique({ where: { id: validated.predecessorId } }),
            prisma.projectTask.findUnique({ where: { id: validated.successorId } })
        ])

        if (!predecessor || !successor) {
            return { success: false, error: "Uma ou ambas as tarefas não foram encontradas" }
        }

        // Check for circular dependencies only if the relationship changed
        if (validated.predecessorId !== existing.predecessorId || validated.successorId !== existing.successorId) {
            const hasCircular = await hasCircularDependency(validated.predecessorId, validated.successorId)
            if (hasCircular) {
                return { success: false, error: "Esta dependência criaria uma referência circular" }
            }
        }

        // Check if another dependency already exists with the same pair
        const duplicateExists = await prisma.taskDependency.findFirst({
            where: {
                AND: [
                    { predecessorId: validated.predecessorId },
                    { successorId: validated.successorId },
                    { id: { not: id } }
                ]
            }
        })

        if (duplicateExists) {
            return { success: false, error: "Esta dependência já existe" }
        }

        const dependency = await prisma.taskDependency.update({
            where: { id },
            data: {
                predecessorId: validated.predecessorId,
                successorId: validated.successorId,
                type: validated.type,
                lag: validated.lag,
            },
            include: {
                predecessor: { select: { id: true, name: true } },
                successor: { select: { id: true, name: true } }
            }
        })

        revalidatePath('/cronograma')
        return { success: true, data: dependency }
    } catch (error) {
        log.error({ err: error }, "Erro ao atualizar dependência de tarefa")
        return { success: false, error: "Erro ao atualizar dependência de tarefa" }
    }
}

export async function deleteTaskDependency(id: string) {
    try {
        await assertAuthenticated()
        await prisma.taskDependency.delete({ where: { id } })
        revalidatePath('/cronograma')
        return { success: true }
    } catch (error) {
        log.error({ err: error }, "Erro ao deletar dependência de tarefa")
        return { success: false, error: "Erro ao deletar dependência de tarefa" }
    }
}

export async function getTaskDependencies(taskId: string) {
    try {
        await assertAuthenticated()
        const [predecessors, successors] = await Promise.all([
            prisma.taskDependency.findMany({
                where: { successorId: taskId },
                include: {
                    predecessor: { select: { id: true, name: true } },
                    successor: { select: { id: true, name: true } }
                }
            }),
            prisma.taskDependency.findMany({
                where: { predecessorId: taskId },
                include: {
                    predecessor: { select: { id: true, name: true } },
                    successor: { select: { id: true, name: true } }
                }
            })
        ])

        return { success: true, data: { predecessors, successors } }
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar dependências de tarefa")
        return { success: false, error: "Erro ao buscar dependências de tarefa" }
    }
}

export async function getTaskDependencyById(id: string) {
    try {
        await assertAuthenticated()
        const dependency = await prisma.taskDependency.findUnique({
            where: { id },
            include: {
                predecessor: { select: { id: true, name: true } },
                successor: { select: { id: true, name: true } }
            }
        })

        if (!dependency) {
            return { success: false, error: "Dependência não encontrada" }
        }

        return { success: true, data: dependency }
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar dependência de tarefa")
        return { success: false, error: "Erro ao buscar dependência de tarefa" }
    }
}

export async function getTaskPredecessors(taskId: string) {
    try {
        await assertAuthenticated()
        const predecessors = await prisma.taskDependency.findMany({
            where: { successorId: taskId },
            include: {
                predecessor: { select: { id: true, name: true } }
            },
            orderBy: { type: 'asc' }
        })

        return { success: true, data: predecessors }
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar predecessores")
        return { success: false, error: "Erro ao buscar predecessores" }
    }
}

export async function getTaskSuccessors(taskId: string) {
    try {
        await assertAuthenticated()
        const successors = await prisma.taskDependency.findMany({
            where: { predecessorId: taskId },
            include: {
                successor: { select: { id: true, name: true } }
            },
            orderBy: { type: 'asc' }
        })

        return { success: true, data: successors }
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar sucessores")
        return { success: false, error: "Erro ao buscar sucessores" }
    }
}
