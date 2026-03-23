'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const taskSchema = z.object({
    name: z.string().min(2, "Nome é obrigatório (mínimo 2 caracteres)"),
    description: z.string().optional().nullable(),
    phase: z.string().optional().nullable(),
    startDate: z.string().min(1, "Data de início é obrigatória"),
    endDate: z.string().min(1, "Data de fim é obrigatória"),
    plannedStart: z.string().optional().nullable(),
    plannedEnd: z.string().optional().nullable(),
    percentDone: z.number().min(0).max(100).optional().default(0),
    status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "CANCELLED"]).default("TODO"),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
    projectId: z.string().uuid("Projeto inválido"),
    parentId: z.string().uuid().optional().nullable(),
})

type TaskInput = z.infer<typeof taskSchema>

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createTask(data: TaskInput) {
    try {
        const validated = taskSchema.parse(data)

        const task = await prisma.projectTask.create({
            data: {
                name: validated.name,
                description: validated.description || null,
                phase: validated.phase || null,
                startDate: new Date(validated.startDate),
                endDate: new Date(validated.endDate),
                plannedStart: validated.plannedStart ? new Date(validated.plannedStart) : null,
                plannedEnd: validated.plannedEnd ? new Date(validated.plannedEnd) : null,
                percentDone: validated.percentDone ?? 0,
                status: validated.status,
                priority: validated.priority,
                projectId: validated.projectId,
                parentId: validated.parentId || null,
            },
        })

        revalidatePath("/cronograma")
        return { success: true, data: task }
    } catch (error) {
        console.error("Erro ao criar tarefa:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar tarefa",
        }
    }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateTask(id: string, data: TaskInput) {
    try {
        const validated = taskSchema.parse(data)

        const task = await prisma.projectTask.update({
            where: { id },
            data: {
                name: validated.name,
                description: validated.description || null,
                phase: validated.phase || null,
                startDate: new Date(validated.startDate),
                endDate: new Date(validated.endDate),
                plannedStart: validated.plannedStart ? new Date(validated.plannedStart) : null,
                plannedEnd: validated.plannedEnd ? new Date(validated.plannedEnd) : null,
                percentDone: validated.percentDone ?? 0,
                status: validated.status,
                priority: validated.priority,
                projectId: validated.projectId,
                parentId: validated.parentId || null,
            },
        })

        revalidatePath("/cronograma")
        return { success: true, data: task }
    } catch (error) {
        console.error("Erro ao atualizar tarefa:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao atualizar tarefa",
        }
    }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteTask(id: string) {
    try {
        // Check if task has children
        const childCount = await prisma.projectTask.count({
            where: { parentId: id },
        })

        if (childCount > 0) {
            return {
                success: false,
                error: `Esta tarefa possui ${childCount} subtarefa(s) vinculada(s). Remova as subtarefas antes de excluir.`,
            }
        }

        await prisma.projectTask.delete({ where: { id } })
        revalidatePath("/cronograma")
        return { success: true }
    } catch (error) {
        console.error("Erro ao deletar tarefa:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao deletar tarefa",
        }
    }
}

// ---------------------------------------------------------------------------
// Get tasks for a project
// ---------------------------------------------------------------------------

export async function getTasks(projectId: string) {
    try {
        const tasks = await prisma.projectTask.findMany({
            where: { projectId },
            orderBy: { startDate: "asc" },
            include: {
                children: {
                    orderBy: { startDate: "asc" },
                },
            },
        })
        return tasks
    } catch (error) {
        console.error("Erro ao buscar tarefas:", error)
        return []
    }
}

// ---------------------------------------------------------------------------
// Get all tasks for all projects of a company
// ---------------------------------------------------------------------------

export async function getTasksByCompany(companyId: string) {
    try {
        const tasks = await prisma.projectTask.findMany({
            where: {
                project: { companyId },
            },
            orderBy: { startDate: "asc" },
            include: {
                project: {
                    select: { id: true, name: true },
                },
                children: {
                    orderBy: { startDate: "asc" },
                },
            },
        })
        return tasks
    } catch (error) {
        console.error("Erro ao buscar tarefas da empresa:", error)
        return []
    }
}

// ---------------------------------------------------------------------------
// Update progress
// ---------------------------------------------------------------------------

export async function updateTaskProgress(id: string, percentDone: number) {
    try {
        const clampedPercent = Math.min(Math.max(percentDone, 0), 100)

        let status: "TODO" | "IN_PROGRESS" | "COMPLETED"
        if (clampedPercent === 0) {
            status = "TODO"
        } else if (clampedPercent === 100) {
            status = "COMPLETED"
        } else {
            status = "IN_PROGRESS"
        }

        const task = await prisma.projectTask.update({
            where: { id },
            data: {
                percentDone: clampedPercent,
                status,
            },
        })

        revalidatePath("/cronograma")
        return { success: true, data: task }
    } catch (error) {
        console.error("Erro ao atualizar progresso:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao atualizar progresso",
        }
    }
}

export async function getTaskById(id: string) {
    try {
        const task = await prisma.projectTask.findUnique({
            where: { id },
            include: {
                project: { select: { id: true, name: true } },
                parent: { select: { id: true, name: true } },
                children: { select: { id: true, name: true, percentDone: true, status: true }, orderBy: { startDate: 'asc' } },
                dependenciesAsPredecessor: { include: { successor: { select: { id: true, name: true } } } },
                dependenciesAsSuccessor: { include: { predecessor: { select: { id: true, name: true } } } },
            },
        })
        if (!task) return { success: false, error: "Tarefa não encontrada" }
        return { success: true, data: task }
    } catch (error) {
        console.error("Erro ao buscar tarefa:", error)
        return { success: false, error: "Erro ao buscar tarefa" }
    }
}
