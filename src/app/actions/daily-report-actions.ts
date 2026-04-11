'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { WeatherCondition, DailyReportStatus } from "@/lib/generated/prisma/client"
import { assertAuthenticated, assertCompanyAccess } from "@/lib/auth-helpers"
import { logCreate, logUpdate, logDelete, logAction } from '@/lib/audit-logger'

// ============================================================================
// SCHEMAS
// ============================================================================

const reportSchema = z.object({
    projectId: z.string().min(1, "Projeto é obrigatório"),
    date: z.string().min(1, "Data é obrigatória"),
    weather: z.nativeEnum(WeatherCondition).default(WeatherCondition.SUNNY),
    temperature: z.coerce.number().optional().nullable(),
    notes: z.string().optional().nullable(),
    occurrences: z.string().optional().nullable(),
    supervisorId: z.string().optional().nullable(),
})

const workerSchema = z.object({
    role: z.string().min(1, "Função é obrigatória"),
    count: z.coerce.number().int().min(1, "Quantidade deve ser ao menos 1"),
})

const activitySchema = z.object({
    description: z.string().min(1, "Descrição é obrigatória"),
    location: z.string().optional().nullable(),
    percentDone: z.coerce.number().min(0).max(100).default(0),
    quantity: z.coerce.number().min(0).optional().nullable(),
    contractItemId: z.string().optional().nullable(),
})

// ============================================================================
// DAILY REPORTS
// ============================================================================

export async function createDailyReport(
    data: z.infer<typeof reportSchema>,
    companyId: string
) {
    try {
        const validated = reportSchema.parse(data)

        // Check uniqueness date + projectId
        const existing = await prisma.dailyReport.findUnique({
            where: {
                date_projectId: {
                    date: new Date(validated.date),
                    projectId: validated.projectId,
                }
            }
        })

        if (existing) {
            return {
                success: false,
                error: "Já existe um RDO para este projeto nesta data."
            }
        }

        const report = await prisma.dailyReport.create({
            data: {
                projectId: validated.projectId,
                companyId,
                date: new Date(validated.date),
                weather: validated.weather,
                temperature: validated.temperature ?? null,
                notes: validated.notes ?? null,
                occurrences: validated.occurrences ?? null,
                supervisorId: validated.supervisorId ?? null,
                status: DailyReportStatus.DRAFT,
            }
        })

        await logCreate('DailyReport', report.id, validated.date, validated)

        revalidatePath('/rdo')
        return { success: true, data: report }
    } catch (error) {
        console.error("Erro ao criar RDO:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar RDO"
        }
    }
}

export async function updateDailyReport(id: string, data: z.infer<typeof reportSchema>) {
    try {
        await assertAuthenticated()
        const validated = reportSchema.parse(data)

        const oldData = await prisma.dailyReport.findUnique({ where: { id } })

        const report = await prisma.dailyReport.update({
            where: { id },
            data: {
                projectId: validated.projectId,
                date: new Date(validated.date),
                weather: validated.weather,
                temperature: validated.temperature ?? null,
                notes: validated.notes ?? null,
                occurrences: validated.occurrences ?? null,
                supervisorId: validated.supervisorId ?? null,
            }
        })

        await logUpdate('DailyReport', id, validated.date, oldData, report)

        revalidatePath('/rdo')
        revalidatePath(`/rdo/${id}`)
        return { success: true, data: report }
    } catch (error) {
        console.error("Erro ao atualizar RDO:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao atualizar RDO"
        }
    }
}

export async function deleteDailyReport(id: string) {
    try {
        await assertAuthenticated()
        const report = await prisma.dailyReport.findUnique({ where: { id } })

        if (!report) {
            return { success: false, error: "RDO não encontrado" }
        }

        if (report.status !== DailyReportStatus.DRAFT) {
            return {
                success: false,
                error: "Apenas RDOs em Rascunho podem ser excluídos"
            }
        }

        await prisma.dailyReport.delete({ where: { id } })

        await logDelete('DailyReport', id, report.date?.toISOString() || 'N/A', report)

        revalidatePath('/rdo')
        return { success: true }
    } catch (error) {
        console.error("Erro ao deletar RDO:", error)
        return {
            success: false,
            error: "Erro ao deletar RDO"
        }
    }
}

export async function getDailyReports(companyId: string, projectId?: string) {
    try {
        await assertAuthenticated()
        const reports = await prisma.dailyReport.findMany({
            where: {
                companyId,
                ...(projectId ? { projectId } : {}),
            },
            include: {
                project: {
                    select: { id: true, name: true }
                },
                _count: {
                    select: { workforce: true, activities: true }
                }
            },
            orderBy: { date: 'desc' }
        })

        return reports
    } catch (error) {
        console.error("Erro ao buscar RDOs:", error)
        return []
    }
}

export async function getDailyReportById(id: string) {
    try {
        const session = await assertAuthenticated()
        const report = await prisma.dailyReport.findUnique({
            where: { id },
            include: {
                project: {
                    select: { id: true, name: true }
                },
                workforce: {
                    orderBy: { role: 'asc' }
                },
                activities: {
                    include: {
                        contractItem: {
                            select: { id: true, description: true, unit: true }
                        }
                    },
                    orderBy: { description: 'asc' }
                }
            }
        })

        if (report && report.companyId) {
            await assertCompanyAccess(session, report.companyId)
        }

        return report
    } catch (error) {
        console.error("Erro ao buscar RDO:", error)
        return null
    }
}

// ============================================================================
// WORKFORCE
// ============================================================================

export async function addWorker(reportId: string, role: string, count: number) {
    try {
        await assertAuthenticated()
        const validated = workerSchema.parse({ role, count })

        const worker = await prisma.dailyReportWorker.create({
            data: {
                reportId,
                role: validated.role,
                count: validated.count,
            }
        })

        await logCreate('DailyReportWorker', worker.id, validated.role, validated)

        revalidatePath('/rdo')
        revalidatePath(`/rdo/${reportId}`)
        return { success: true, data: worker }
    } catch (error) {
        console.error("Erro ao adicionar efetivo:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao adicionar efetivo"
        }
    }
}

export async function updateWorker(workerId: string, role: string, count: number) {
    try {
        await assertAuthenticated()
        const validated = workerSchema.parse({ role, count })

        const oldData = await prisma.dailyReportWorker.findUnique({ where: { id: workerId } })

        const worker = await prisma.dailyReportWorker.update({
            where: { id: workerId },
            data: {
                role: validated.role,
                count: validated.count,
            }
        })

        await logUpdate('DailyReportWorker', workerId, validated.role, oldData, worker)

        revalidatePath('/rdo')
        revalidatePath(`/rdo/${worker.reportId}`)
        return { success: true, data: worker }
    } catch (error) {
        console.error("Erro ao atualizar efetivo:", error)
        return {
            success: false,
            error: "Erro ao atualizar efetivo"
        }
    }
}

export async function deleteWorker(workerId: string) {
    try {
        await assertAuthenticated()
        const worker = await prisma.dailyReportWorker.findUnique({
            where: { id: workerId }
        })

        if (!worker) {
            return { success: false, error: "Efetivo não encontrado" }
        }

        await prisma.dailyReportWorker.delete({ where: { id: workerId } })

        await logDelete('DailyReportWorker', workerId, worker.role, worker)

        revalidatePath('/rdo')
        revalidatePath(`/rdo/${worker.reportId}`)
        return { success: true }
    } catch (error) {
        console.error("Erro ao remover efetivo:", error)
        return {
            success: false,
            error: "Erro ao remover efetivo"
        }
    }
}

// ============================================================================
// ACTIVITIES
// ============================================================================

export async function addActivity(reportId: string, data: z.infer<typeof activitySchema>) {
    try {
        await assertAuthenticated()
        const validated = activitySchema.parse(data)

        const activity = await prisma.dailyReportActivity.create({
            data: {
                reportId,
                description: validated.description,
                location: validated.location ?? null,
                percentDone: validated.percentDone,
                quantity: validated.quantity ?? null,
                contractItemId: validated.contractItemId ?? null,
            }
        })

        await logCreate('DailyReportActivity', activity.id, validated.description, validated)

        revalidatePath('/rdo')
        revalidatePath(`/rdo/${reportId}`)
        return { success: true, data: activity }
    } catch (error) {
        console.error("Erro ao adicionar atividade:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao adicionar atividade"
        }
    }
}

export async function updateActivity(activityId: string, data: z.infer<typeof activitySchema>) {
    try {
        await assertAuthenticated()
        const validated = activitySchema.parse(data)

        const oldData = await prisma.dailyReportActivity.findUnique({ where: { id: activityId } })

        const activity = await prisma.dailyReportActivity.update({
            where: { id: activityId },
            data: {
                description: validated.description,
                location: validated.location ?? null,
                percentDone: validated.percentDone,
                quantity: validated.quantity ?? null,
                contractItemId: validated.contractItemId ?? null,
            }
        })

        await logUpdate('DailyReportActivity', activityId, validated.description, oldData, activity)

        revalidatePath('/rdo')
        revalidatePath(`/rdo/${activity.reportId}`)
        return { success: true, data: activity }
    } catch (error) {
        console.error("Erro ao atualizar atividade:", error)
        return {
            success: false,
            error: "Erro ao atualizar atividade"
        }
    }
}

export async function deleteActivity(activityId: string) {
    try {
        await assertAuthenticated()
        const activity = await prisma.dailyReportActivity.findUnique({
            where: { id: activityId }
        })

        if (!activity) {
            return { success: false, error: "Atividade não encontrada" }
        }

        await prisma.dailyReportActivity.delete({ where: { id: activityId } })

        await logDelete('DailyReportActivity', activityId, activity.description, activity)

        revalidatePath('/rdo')
        revalidatePath(`/rdo/${activity.reportId}`)
        return { success: true }
    } catch (error) {
        console.error("Erro ao remover atividade:", error)
        return {
            success: false,
            error: "Erro ao remover atividade"
        }
    }
}

// ============================================================================
// STATUS TRANSITIONS
// ============================================================================

export async function submitDailyReport(id: string) {
    try {
        await assertAuthenticated()
        const report = await prisma.dailyReport.update({
            where: { id },
            data: { status: DailyReportStatus.SUBMITTED }
        })

        await logAction('SUBMIT', 'DailyReport', id, report.date?.toISOString() || 'N/A', 'Status changed to SUBMITTED')

        revalidatePath('/rdo')
        revalidatePath(`/rdo/${id}`)
        return { success: true, data: report }
    } catch (error) {
        console.error("Erro ao submeter RDO:", error)
        return {
            success: false,
            error: "Erro ao submeter RDO"
        }
    }
}

export async function approveDailyReport(id: string) {
    try {
        await assertAuthenticated()
        const report = await prisma.dailyReport.update({
            where: { id },
            data: { status: DailyReportStatus.APPROVED }
        })

        await logAction('APPROVE', 'DailyReport', id, report.date?.toISOString() || 'N/A', 'Status changed to APPROVED')

        revalidatePath('/rdo')
        revalidatePath(`/rdo/${id}`)
        return { success: true, data: report }
    } catch (error) {
        console.error("Erro ao aprovar RDO:", error)
        return {
            success: false,
            error: "Erro ao aprovar RDO"
        }
    }
}
