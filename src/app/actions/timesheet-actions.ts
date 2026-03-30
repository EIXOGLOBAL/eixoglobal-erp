'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"

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
    const activeEntry = await (prisma as any).timeEntry.findFirst({
      where: {
        employeeId: session.user.id,
        clockOutTime: null,
      },
    })

    if (activeEntry) {
      return {
        success: false,
        error: "Você já possui um ponto aberto. Feche-o antes de iniciar um novo.",
      }
    }

    const timeEntry = await (prisma as any).timeEntry.create({
      data: {
        employeeId: session.user.id,
        projectId: validated.projectId || null,
        clockInTime: new Date(),
        latitude: validated.latitude || null,
        longitude: validated.longitude || null,
        status: 'PENDING',
      },
      include: {
        employee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    revalidatePath('/timesheet')
    return { success: true, data: timeEntry }
  } catch (error) {
    console.error("Erro ao fazer clock-in:", error)
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
    const timeEntry = await (prisma as any).timeEntry.findUnique({
      where: { id: timeEntryId },
    })
    // TODO: Remove 'as any' after running prisma generate

    if (!timeEntry) {
      return { success: false, error: "Ponto não encontrado" }
    }

    if (timeEntry.employeeId !== session.user.id) {
      return { success: false, error: "Você não tem permissão para fechar este ponto" }
    }

    if (timeEntry.clockOutTime) {
      return { success: false, error: "Este ponto já foi fechado" }
    }

    const clockOutTime = new Date()
    const durationMinutes = Math.floor(
      (clockOutTime.getTime() - timeEntry.clockInTime.getTime()) / 60000
    )

    const updated = await (prisma as any).timeEntry.update({
      where: { id: timeEntryId },
      data: {
        clockOutTime,
        durationMinutes,
      },
      include: {
        employee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    revalidatePath('/timesheet')
    return { success: true, data: updated }
  } catch (error) {
    console.error("Erro ao fazer clock-out:", error)
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
        clockInTime: { gte: new Date(filters.startDate) },
      }),
      ...(filters.endDate && {
        clockInTime: { lte: new Date(filters.endDate) },
      }),
    }

    const [data, total] = await Promise.all([
      (prisma as any).timeEntry.findMany({
        where,
        include: {
          employee: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { clockInTime: 'desc' },
        skip,
        take: pagination.limit,
      }),
      // TODO: Remove 'as any' after running prisma generate
      (prisma as any).timeEntry.count({ where }),
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
    console.error("Erro ao buscar pontos:", error)
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
        clockInTime: { gte: new Date(filters.startDate) },
      }),
      ...(filters.endDate && {
        clockInTime: { lte: new Date(filters.endDate) },
      }),
    }

    const [data, total] = await Promise.all([
      (prisma as any).timeEntry.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
        },
        orderBy: { clockInTime: 'desc' },
        skip,
        take: pagination.limit,
      }),
      // TODO: Remove 'as any' after running prisma generate
      (prisma as any).timeEntry.count({ where }),
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
    console.error("Erro ao buscar meus pontos:", error)
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
    const timeEntry = await (prisma as any).timeEntry.findUnique({
      where: { id },
    })
    // TODO: Remove 'as any' after running prisma generate

    if (!timeEntry) {
      return { success: false, error: "Ponto não encontrado" }
    }

    const updated = await (prisma as any).timeEntry.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: session.user.id,
        approvedAt: new Date(),
        approvalComments: comments || null,
      },
      include: {
        employee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    revalidatePath('/timesheet')
    return { success: true, data: updated }
  } catch (error) {
    console.error("Erro ao aprovar ponto:", error)
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

    const timeEntry = await (prisma as any).timeEntry.findUnique({
      where: { id },
    })
    // TODO: Remove 'as any' after running prisma generate

    if (!timeEntry) {
      return { success: false, error: "Ponto não encontrado" }
    }

    const updated = await (prisma as any).timeEntry.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedBy: session.user.id,
        rejectedAt: new Date(),
        rejectionReason: validated.reason,
      },
      include: {
        employee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    revalidatePath('/timesheet')
    return { success: true, data: updated }
  } catch (error) {
    console.error("Erro ao rejeitar ponto:", error)
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
    const updated = await (prisma as any).timeEntry.updateMany({
      where: { id: { in: ids } },
      data: {
        status: 'APPROVED',
        approvedBy: session.user.id,
        approvedAt: new Date(),
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    revalidatePath('/timesheet')
    return {
      success: true,
      data: { count: updated.count },
    }
  } catch (error) {
    console.error("Erro ao aprovar pontos em lote:", error)
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

    const entries = await (prisma as any).timeEntry.findMany({
      where: {
        employeeId,
        clockInTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    const totalMinutes = entries
      .filter((e: any) => e.durationMinutes)
      .reduce((sum: number, e: any) => sum + e.durationMinutes, 0)

    const totalHours = Math.round((totalMinutes / 60) * 100) / 100
    const approvedEntries = entries.filter((e: any) => e.status === 'APPROVED')
    const approvedMinutes = approvedEntries
      .filter((e: any) => e.durationMinutes)
      .reduce((sum: number, e: any) => sum + e.durationMinutes, 0)
    const approvedHours = Math.round((approvedMinutes / 60) * 100) / 100

    const byProject = entries.reduce((acc: any, entry: any) => {
      const projectName = entry.project?.name || 'Sem projeto'
      if (!acc[projectName]) {
        acc[projectName] = { minutes: 0, entries: 0 }
      }
      acc[projectName].minutes += entry.durationMinutes || 0
      acc[projectName].entries += 1
      return acc
    }, {})

    const projectBreakdown = Object.entries(byProject).map(([name, data]: [string, any]) => ({
      project: name,
      hours: Math.round((data.minutes / 60) * 100) / 100,
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
    console.error("Erro ao buscar resumo da folha de ponto:", error)
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

    const entries = await (prisma as any).timeEntry.findMany({
      where: {
        clockInTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        ...(projectId && { projectId }),
      },
      include: {
        employee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { clockInTime: 'asc' },
    })
    // TODO: Remove 'as any' after running prisma generate

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
      if (!emp.clockIn) emp.clockIn = entry.clockInTime
      if (entry.clockOutTime) emp.clockOut = entry.clockOutTime
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
    console.error("Erro ao buscar presença diária:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar presença",
      data: null,
    }
  }
}
