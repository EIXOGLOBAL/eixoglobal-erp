'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { assertAuthenticated, assertRole } from "@/lib/auth-helpers"
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'work-calendar' })

const REVALIDATE_PATH = '/configuracoes/calendario'

const calendarInclude = {
    company: { select: { id: true, name: true } },
    project: { select: { id: true, name: true } },
    holidays: { orderBy: { date: 'asc' as const } },
    _count: { select: { holidays: true } },
}

// ============================================================================
// SCHEMAS
// ============================================================================

const workCalendarSchema = z.object({
    name: z.string().min(1, "Nome e obrigatorio"),
    description: z.string().optional().nullable(),
    hoursPerDay: z.coerce.number().min(1, "Minimo 1 hora").max(24, "Maximo 24 horas"),
    isActive: z.boolean().default(true),
    monday: z.boolean().default(true),
    tuesday: z.boolean().default(true),
    wednesday: z.boolean().default(true),
    thursday: z.boolean().default(true),
    friday: z.boolean().default(true),
    saturday: z.boolean().default(false),
    sunday: z.boolean().default(false),
    companyId: z.string().uuid("ID da empresa invalido"),
})

const holidaySchema = z.object({
    name: z.string().min(1, "Nome e obrigatorio"),
    date: z.string().min(1, "Data e obrigatoria"),
    type: z.enum(["NACIONAL", "ESTADUAL", "MUNICIPAL", "PONTE"]),
    recurring: z.boolean().default(false),
    calendarId: z.string().uuid("ID do calendario invalido"),
})

// ============================================================================
// CALENDAR ACTIONS
// ============================================================================

export async function getWorkCalendars(companyId: string) {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, 'ADMIN')

        const workCalendars = await prisma.workCalendar.findMany({
            where: { companyId },
            include: calendarInclude,
            orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        })
        return { success: true, data: workCalendars }
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar calendarios de trabalho")
        return { success: false, error: "Erro ao buscar calendarios de trabalho", data: [] as any[] }
    }
}

export async function getWorkCalendarById(id: string) {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, 'ADMIN')

        const workCalendar = await prisma.workCalendar.findUnique({
            where: { id },
            include: calendarInclude,
        })

        if (!workCalendar) {
            return { success: false, error: "Calendario de trabalho nao encontrado" }
        }

        return { success: true, data: workCalendar }
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar calendario de trabalho")
        return { success: false, error: "Erro ao buscar calendario de trabalho" }
    }
}

export async function createWorkCalendar(data: z.infer<typeof workCalendarSchema>) {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, 'ADMIN')
        const validated = workCalendarSchema.parse(data)

        const workCalendar = await prisma.workCalendar.create({
            data: {
                name: validated.name,
                description: validated.description || null,
                hoursPerDay: validated.hoursPerDay,
                isActive: validated.isActive,
                monday: validated.monday,
                tuesday: validated.tuesday,
                wednesday: validated.wednesday,
                thursday: validated.thursday,
                friday: validated.friday,
                saturday: validated.saturday,
                sunday: validated.sunday,
                companyId: validated.companyId,
            },
            include: calendarInclude,
        })

        revalidatePath(REVALIDATE_PATH)
        return { success: true, data: workCalendar }
    } catch (error) {
        log.error({ err: error }, "Erro ao criar calendario de trabalho")
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar calendario de trabalho",
        }
    }
}

export async function updateWorkCalendar(id: string, data: z.infer<typeof workCalendarSchema>) {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, 'ADMIN')
        const validated = workCalendarSchema.parse(data)

        const workCalendar = await prisma.workCalendar.update({
            where: { id },
            data: {
                name: validated.name,
                description: validated.description || null,
                hoursPerDay: validated.hoursPerDay,
                isActive: validated.isActive,
                monday: validated.monday,
                tuesday: validated.tuesday,
                wednesday: validated.wednesday,
                thursday: validated.thursday,
                friday: validated.friday,
                saturday: validated.saturday,
                sunday: validated.sunday,
                companyId: validated.companyId,
            },
            include: calendarInclude,
        })

        revalidatePath(REVALIDATE_PATH)
        return { success: true, data: workCalendar }
    } catch (error) {
        log.error({ err: error }, "Erro ao atualizar calendario de trabalho")
        return { success: false, error: "Erro ao atualizar calendario de trabalho" }
    }
}

export async function deleteWorkCalendar(id: string) {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, 'ADMIN')

        // Verifica dependencias (holidays serao deletados em cascata)
        await prisma.workCalendar.delete({ where: { id } })

        revalidatePath(REVALIDATE_PATH)
        return { success: true }
    } catch (error) {
        log.error({ err: error }, "Erro ao deletar calendario de trabalho")
        return { success: false, error: "Erro ao deletar calendario de trabalho" }
    }
}

// ============================================================================
// HOLIDAY ACTIONS
// ============================================================================

export async function addHoliday(data: z.infer<typeof holidaySchema>) {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, 'ADMIN')
        const validated = holidaySchema.parse(data)

        // Verifica se o calendario existe
        const calendar = await prisma.workCalendar.findUnique({
            where: { id: validated.calendarId },
        })
        if (!calendar) {
            return { success: false, error: "Calendario nao encontrado" }
        }

        const holiday = await prisma.workCalendarHoliday.create({
            data: {
                name: validated.name,
                date: new Date(validated.date),
                type: validated.type,
                recurring: validated.recurring,
                calendarId: validated.calendarId,
            },
        })

        revalidatePath(REVALIDATE_PATH)
        return { success: true, data: holiday }
    } catch (error) {
        log.error({ err: error }, "Erro ao adicionar feriado")
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao adicionar feriado",
        }
    }
}

export async function removeHoliday(calendarId: string, holidayId: string) {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, 'ADMIN')

        // Verifica se o feriado pertence ao calendario
        const holiday = await prisma.workCalendarHoliday.findFirst({
            where: { id: holidayId, calendarId },
        })
        if (!holiday) {
            return { success: false, error: "Feriado nao encontrado neste calendario" }
        }

        await prisma.workCalendarHoliday.delete({ where: { id: holidayId } })

        revalidatePath(REVALIDATE_PATH)
        return { success: true }
    } catch (error) {
        log.error({ err: error }, "Erro ao remover feriado")
        return { success: false, error: "Erro ao remover feriado" }
    }
}

export async function getHolidays(calendarId: string, year?: number) {
    try {
        const session = await assertAuthenticated()
        await assertRole(session, 'ADMIN')

        const where: any = { calendarId }
        if (year) {
            where.date = {
                gte: new Date(`${year}-01-01`),
                lte: new Date(`${year}-12-31`),
            }
        }

        const holidays = await prisma.workCalendarHoliday.findMany({
            where,
            orderBy: { date: 'asc' },
        })
        return { success: true, data: holidays }
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar feriados")
        return { success: false, error: "Erro ao buscar feriados", data: [] as any[] }
    }
}

// ============================================================================
// LEGACY FUNCTIONS (mantidas para compatibilidade)
// ============================================================================

export async function getCompanyWorkCalendars(companyId: string) {
    return getWorkCalendars(companyId)
}

export async function getProjectWorkCalendars(projectId: string) {
    try {
        await assertAuthenticated()
        const workCalendars = await prisma.workCalendar.findMany({
            where: { projectId },
            include: calendarInclude,
            orderBy: { name: 'asc' },
        })
        return { success: true, data: workCalendars }
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar calendarios do projeto")
        return { success: false, error: "Erro ao buscar calendarios do projeto" }
    }
}
