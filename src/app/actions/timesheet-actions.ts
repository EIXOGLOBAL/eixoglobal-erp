'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"
import { logCreate, logUpdate, logDelete, logAction } from '@/lib/audit-logger'
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'timesheet' })

// ============================================================================
// SCHEMAS
// ============================================================================

const clockInSchema = z.object({
  projectId: z.string().uuid().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

const timeEntryFilterSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  employeeId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

const approveTimeEntrySchema = z.object({
  comments: z.string().optional(),
})

const rejectTimeEntrySchema = z.object({
  reason: z.string().min(1, "Motivo da rejeição é obrigatório"),
})

const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(10),
})

// ============================================================================
// CLOCK IN/OUT
// ============================================================================

export async function clockIn(data: z.infer<typeof clockInSchema>) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  try {
    const validated = clockInSchema.parse(data)

    // Check if employee already has an active clock-in
    const activeEntry = await prisma.timeEntry.findFirst({
      where: {
        employeeId: session.user.id,
        clockOut: null,
      },
    })

    if (activeEntry) {
      return {
        success: false,
        error: "Você já possui um ponto aberto. Feche-o antes de iniciar um novo.",
      }
    }

    const timeEntry = await prisma.timeEntry.create({
      data: {
        employeeId: session.user.id,
        companyId: session.user.companyId!,
        projectId: validated.projectId || null,
        date: new Date(),
        clockIn: new Date(),
        latitude: validated.latitude || null,
        longitude: validated.longitude || null,
        status: 'PENDING',
      },
      include: {
        employee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    })

    await logAction('CLOCK_IN', 'TimeEntry', timeEntry.id, timeEntry.employee?.name || 'N/A', `Project: ${timeEntry.project?.name || 'N/A'}`)

    revalidatePath('/timesheet')
    return { success: true, data: timeEntry }
  } catch (error) {
    log.error({ err: error }, "Erro ao fazer clock-in")
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao fazer clock-in",
    }
  }
}

export async function clockOut(timeEntryId: string) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  try {
    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
    })


    if (!timeEntry) {
      return { success: false, error: "Ponto não encontrado" }
    }

    if (timeEntry.employeeId !== session.user.id) {
      return { success: false, error: "Você não tem permissão para fechar este ponto" }
    }

    if (timeEntry.clockOut) {
      return { success: false, error: "Este ponto já foi fechado" }
    }

    const clockOut = new Date()
    const totalHours = Math.round(
      ((clockOut.getTime() - timeEntry.clockIn.getTime()) / 3600000) * 100
    ) / 100

    const updated = await prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        clockOut: clockOut,
        totalHours,
      },
      include: {
        employee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    })

    await logAction('CLOCK_OUT', 'TimeEntry', timeEntryId, updated.employee?.name || 'N/A', `Total hours: ${totalHours}`)

    revalidatePath('/timesheet')
    return { success: true, data: updated }
  } catch (error) {
    log.error({ err: error }, "Erro ao fazer clock-out")
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao fazer clock-out",
    }
  }
}

// ============================================================================
// LIST TIME ENTRIES
// ============================================================================

export async function getTimeEntries(
  params?: {
    pagination?: z.infer<typeof paginationSchema>
    filters?: z.infer<typeof timeEntryFilterSchema>
  }
) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado', data: null }

  try {
    const pagination = paginationSchema.parse(params?.pagination || {})
    const filters = timeEntryFilterSchema.parse(params?.filters || {})

    const skip = (pagination.page - 1) * pagination.limit

    const where = {
      ...(filters.status && { status: filters.status }),
      ...(filters.employeeId && { employeeId: filters.employeeId }),
      ...(filters.projectId && { projectId: filters.projectId }),
      ...(filters.startDate && {
        clockIn: { gte: new Date(filters.startDate) },
      }),
      ...(filters.endDate && {
        clockIn: { lte: new Date(filters.endDate) },
      }),
    }

    const [data, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where,
        include: {
          employee: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { clockIn: 'desc' },
        skip,
        take: pagination.limit,
      }),
  
      prisma.timeEntry.count({ where }),
    ])

    return {
      success: true,
      data: {
        items: data,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          pages: Math.ceil(total / pagination.limit),
        },
      },
    }
  } catch (error) {
    log.error({ err: error }, "Erro ao buscar pontos")
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar pontos",
      data: null,
    }
  }
}

export async function getMyTimeEntries(
  params?: {
    pagination?: z.infer<typeof paginationSchema>
    filters?: z.infer<typeof timeEntryFilterSchema>
  }
) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado', data: null }

  try {
    const pagination = paginationSchema.parse(params?.pagination || {})
    const filters = timeEntryFilterSchema.parse(params?.filters || {})

    const skip = (pagination.page - 1) * pagination.limit

    const where = {
      employeeId: session.user.id,
      ...(filters.status && { status: filters.status }),
      ...(filters.projectId && { projectId: filters.projectId }),
      ...(filters.startDate && {
        clockIn: { gte: new Date(filters.startDate) },
      }),
      ...(filters.endDate && {
        clockIn: { lte: new Date(filters.endDate) },
      }),
    }

    const [data, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
        },
        orderBy: { clockIn: 'desc' },
        skip,
        take: pagination.limit,
      }),
  
      prisma.timeEntry.count({ where }),
    ])

    return {
      success: true,
      data: {
        items: data,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          pages: Math.ceil(total / pagination.limit),
        },
      },
    }
  } catch (error) {
    log.error({ err: error }, "Erro ao buscar meus pontos")
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar meus pontos",
      data: null,
    }
  }
}

// ============================================================================
// APPROVAL
// ============================================================================

export async function approveTimeEntry(
  id: string,
  comments?: string
) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  try {
    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id },
    })


    if (!timeEntry) {
      return { success: false, error: "Ponto não encontrado" }
    }

    const updated = await prisma.timeEntry.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: session.user.id,
        approvedAt: new Date(),
        notes: comments || null,
      },
      include: {
        employee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    })

    await logAction('APPROVE', 'TimeEntry', id, updated.employee?.name || 'N/A', comments || 'Approved')

    revalidatePath('/timesheet')
    return { success: true, data: updated }
  } catch (error) {
    log.error({ err: error }, "Erro ao aprovar ponto")
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao aprovar ponto",
    }
  }
}

export async function rejectTimeEntry(
  id: string,
  reason: string
) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  try {
    const validated = rejectTimeEntrySchema.parse({ reason })

    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id },
    })


    if (!timeEntry) {
      return { success: false, error: "Ponto não encontrado" }
    }

    const updated = await prisma.timeEntry.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: session.user.id,
        approvedAt: new Date(),
        notes: validated.reason,
      },
      include: {
        employee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    })

    await logAction('REJECT', 'TimeEntry', id, updated.employee?.name || 'N/A', `Reason: ${validated.reason}`)

    revalidatePath('/timesheet')
    return { success: true, data: updated }
  } catch (error) {
    log.error({ err: error }, "Erro ao rejeitar ponto")
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao rejeitar ponto",
    }
  }
}

export async function bulkApproveTimeEntries(ids: string[]) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  try {
    const updated = await prisma.timeEntry.updateMany({
      where: { id: { in: ids } },
      data: {
        status: 'APPROVED',
        approvedById: session.user.id,
        approvedAt: new Date(),
      },
    })

    await logAction('BULK_APPROVE', 'TimeEntry', ids.join(','), `${updated.count} entries`, `Approved ${updated.count} time entries`)

    revalidatePath('/timesheet')
    return {
      success: true,
      data: { count: updated.count },
    }
  } catch (error) {
    log.error({ err: error }, "Erro ao aprovar pontos em lote")
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao aprovar pontos em lote",
    }
  }
}

// ============================================================================
// SUMMARIES & DASHBOARDS
// ============================================================================

export async function getTimesheetSummary(
  employeeId: string,
  month: number,
  year: number
) {
  try {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    const entries = await prisma.timeEntry.findMany({
      where: {
        employeeId,
        clockIn: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    })


    const totalHours = entries
      .filter((e: any) => e.totalHours)
      .reduce((sum: number, e: any) => sum + e.totalHours, 0)

    const approvedEntries = entries.filter((e: any) => e.status === 'APPROVED')
    const approvedHours = approvedEntries
      .filter((e: any) => e.totalHours)
      .reduce((sum: number, e: any) => sum + e.totalHours, 0)

    const byProject = entries.reduce((acc: any, entry: any) => {
      const projectName = entry.project?.name || 'Sem projeto'
      if (!acc[projectName]) {
        acc[projectName] = { hours: 0, entries: 0 }
      }
      acc[projectName].hours += entry.totalHours || 0
      acc[projectName].entries += 1
      return acc
    }, {})

    const projectBreakdown = Object.entries(byProject).map(([name, data]: [string, any]) => ({
      project: name,
      hours: Math.round(data.hours * 100) / 100,
      entries: data.entries,
    }))

    return {
      success: true,
      data: {
        period: { month, year },
        totalHours,
        approvedHours,
        totalEntries: entries.length,
        approvedEntries: approvedEntries.length,
        pendingEntries: entries.filter((e: any) => e.status === 'PENDING').length,
        rejectedEntries: entries.filter((e: any) => e.status === 'REJECTED').length,
        projectBreakdown,
      },
    }
  } catch (error) {
    log.error({ err: error }, "Erro ao buscar resumo da folha de ponto")
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar resumo",
      data: null,
    }
  }
}

export async function getDailyPresence(
  date?: string,
  projectId?: string
) {
  try {
    const targetDate = date ? new Date(date) : new Date()
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    const entries = await prisma.timeEntry.findMany({
      where: {
        clockIn: {
          gte: startOfDay,
          lte: endOfDay,
        },
        ...(projectId && { projectId }),
      },
      include: {
        employee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { clockIn: 'asc' },
    })


    const employees = new Map()
    entries.forEach((entry: any) => {
      const empId = entry.employeeId
      if (!employees.has(empId)) {
        employees.set(empId, {
          employeeId: empId,
          employeeName: entry.employee.name,
          clockIn: null,
          clockOut: null,
          duration: null,
          project: entry.project?.name || null,
        })
      }
      const emp = employees.get(empId)
      if (!emp.clockIn) emp.clockIn = entry.clockIn
      if (entry.clockOut) emp.clockOut = entry.clockOut
    })

    const result = Array.from(employees.values()).map((emp: any) => ({
      ...emp,
      duration: emp.clockOut
        ? Math.floor((emp.clockOut.getTime() - emp.clockIn.getTime()) / 60000)
        : null,
    }))

    return {
      success: true,
      data: {
        date: targetDate.toISOString().split('T')[0],
        totalPresent: result.length,
        employees: result,
      },
    }
  } catch (error) {
    log.error({ err: error }, "Erro ao buscar presença diária")
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar presença",
      data: null,
    }
  }
}
