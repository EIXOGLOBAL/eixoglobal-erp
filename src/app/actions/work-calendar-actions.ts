'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { assertAuthenticated } from "@/lib/auth-helpers"

const workCalendarSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    companyId: z.string().uuid().optional().nullable(),
    projectId: z.string().uuid().optional().nullable(),
})

export async function createWorkCalendar(data: z.infer<typeof workCalendarSchema>) {
    try {
        await assertAuthenticated()
        const validated = workCalendarSchema.parse(data)

        // Validate that at least one association exists
        if (!validated.companyId && !validated.projectId) {
            return { success: false, error: "Empresa ou projeto é obrigatório" }
        }

        const workCalendar = await prisma.workCalendar.create({
            data: {
                name: validated.name,
                companyId: validated.companyId || null,
                projectId: validated.projectId || null,
            },
            include: {
                company: { select: { id: true, name: true } },
                project: { select: { id: true, name: true } }
            }
        })

        revalidatePath('/configuracoes')
        return { success: true, data: workCalendar }
    } catch (error) {
        console.error("Erro ao criar calendário de trabalho:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar calendário de trabalho",
        }
    }
}

export async function updateWorkCalendar(id: string, data: z.infer<typeof workCalendarSchema>) {
    try {
        await assertAuthenticated()
        const validated = workCalendarSchema.parse(data)

        // Validate that at least one association exists
        if (!validated.companyId && !validated.projectId) {
            return { success: false, error: "Empresa ou projeto é obrigatório" }
        }

        const workCalendar = await prisma.workCalendar.update({
            where: { id },
            data: {
                name: validated.name,
                companyId: validated.companyId || null,
                projectId: validated.projectId || null,
            },
            include: {
                company: { select: { id: true, name: true } },
                project: { select: { id: true, name: true } }
            }
        })

        revalidatePath('/configuracoes')
        return { success: true, data: workCalendar }
    } catch (error) {
        console.error("Erro ao atualizar calendário de trabalho:", error)
        return { success: false, error: "Erro ao atualizar calendário de trabalho" }
    }
}

export async function deleteWorkCalendar(id: string) {
    try {
        await assertAuthenticated()
        await prisma.workCalendar.delete({ where: { id } })
        revalidatePath('/configuracoes')
        return { success: true }
    } catch (error) {
        console.error("Erro ao deletar calendário de trabalho:", error)
        return { success: false, error: "Erro ao deletar calendário de trabalho" }
    }
}

export async function getWorkCalendars(companyId?: string, projectId?: string) {
    try {
        await assertAuthenticated()
        const workCalendars = await prisma.workCalendar.findMany({
            where: {
                ...(companyId ? { companyId } : {}),
                ...(projectId ? { projectId } : {}),
            },
            include: {
                company: { select: { id: true, name: true } },
                project: { select: { id: true, name: true } }
            },
            orderBy: { name: 'asc' }
        })
        return { success: true, data: workCalendars }
    } catch (error) {
        console.error("Erro ao buscar calendários de trabalho:", error)
        return { success: false, error: "Erro ao buscar calendários de trabalho" }
    }
}

export async function getWorkCalendarById(id: string) {
    try {
        await assertAuthenticated()
        const workCalendar = await prisma.workCalendar.findUnique({
            where: { id },
            include: {
                company: { select: { id: true, name: true } },
                project: { select: { id: true, name: true } }
            }
        })

        if (!workCalendar) {
            return { success: false, error: "Calendário de trabalho não encontrado" }
        }

        return { success: true, data: workCalendar }
    } catch (error) {
        console.error("Erro ao buscar calendário de trabalho:", error)
        return { success: false, error: "Erro ao buscar calendário de trabalho" }
    }
}

export async function getCompanyWorkCalendars(companyId: string) {
    try {
        await assertAuthenticated()
        const workCalendars = await prisma.workCalendar.findMany({
            where: { companyId },
            include: {
                company: { select: { id: true, name: true } },
                project: { select: { id: true, name: true } }
            },
            orderBy: { name: 'asc' }
        })
        return { success: true, data: workCalendars }
    } catch (error) {
        console.error("Erro ao buscar calendários da empresa:", error)
        return { success: false, error: "Erro ao buscar calendários da empresa" }
    }
}

export async function getProjectWorkCalendars(projectId: string) {
    try {
        await assertAuthenticated()
        const workCalendars = await prisma.workCalendar.findMany({
            where: { projectId },
            include: {
                company: { select: { id: true, name: true } },
                project: { select: { id: true, name: true } }
            },
            orderBy: { name: 'asc' }
        })
        return { success: true, data: workCalendars }
    } catch (error) {
        console.error("Erro ao buscar calendários do projeto:", error)
        return { success: false, error: "Erro ao buscar calendários do projeto" }
    }
}
