'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'scheduled-report' })

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const REPORT_TYPES = ['DRE', 'FLUXO_CAIXA', 'EXECUTIVO', 'BENCHMARK', 'CAPACIDADE', 'COMPARATIVO'] as const
const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY'] as const

const scheduledReportSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório (mínimo 2 caracteres)'),
  type: z.enum(REPORT_TYPES, { error: 'Tipo de relatório inválido' }),
  frequency: z.enum(FREQUENCIES, { error: 'Frequência inválida' }),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  hour: z.number().int().min(0).max(23).default(8),
  recipients: z.array(z.string().email('Email inválido')).min(1, 'Pelo menos um destinatário é obrigatório'),
  filters: z.record(z.string(), z.unknown()).nullable().optional(),
  isActive: z.boolean().default(true),
})

type ScheduledReportInput = z.infer<typeof scheduledReportSchema>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeNextRun(frequency: string, hour: number, dayOfWeek?: number | null, dayOfMonth?: number | null): Date {
  const now = new Date()
  const next = new Date(now)
  next.setMinutes(0, 0, 0)
  next.setHours(hour)

  switch (frequency) {
    case 'DAILY': {
      if (next <= now) {
        next.setDate(next.getDate() + 1)
      }
      break
    }
    case 'WEEKLY': {
      const targetDay = dayOfWeek ?? 1 // segunda por padrao
      const currentDay = next.getDay()
      let daysUntil = targetDay - currentDay
      if (daysUntil < 0 || (daysUntil === 0 && next <= now)) {
        daysUntil += 7
      }
      next.setDate(next.getDate() + daysUntil)
      break
    }
    case 'MONTHLY': {
      const targetDate = dayOfMonth ?? 1
      next.setDate(targetDate)
      if (next <= now) {
        next.setMonth(next.getMonth() + 1)
        next.setDate(targetDate)
      }
      break
    }
  }

  return next
}

function assertAdminOrManager(role: string | null | undefined): void {
  if (role !== 'ADMIN' && role !== 'MANAGER') {
    throw new Error('Acesso restrito a administradores e gerentes')
  }
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export async function listScheduledReports() {
  try {
    const session = await getSession()
    if (!session?.user?.id || !session.user.companyId) {
      return { success: false, error: 'Não autenticado', data: [] }
    }
    assertAdminOrManager(session.user.role)

    const reports = await prisma.scheduledReport.findMany({
      where: { companyId: session.user.companyId },
      include: {
        createdBy: { select: { id: true, name: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { success: true, data: reports }
  } catch (error) {
    log.error({ err: error }, 'Erro ao listar relatórios agendados')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao listar relatórios agendados',
      data: [],
    }
  }
}

// ---------------------------------------------------------------------------
// Get by ID
// ---------------------------------------------------------------------------

export async function getScheduledReport(id: string) {
  try {
    const session = await getSession()
    if (!session?.user?.id || !session.user.companyId) {
      return { success: false, error: 'Não autenticado' }
    }
    assertAdminOrManager(session.user.role)

    const report = await prisma.scheduledReport.findFirst({
      where: { id, companyId: session.user.companyId },
      include: {
        createdBy: { select: { id: true, name: true, username: true } },
      },
    })

    if (!report) {
      return { success: false, error: 'Relatório agendado não encontrado' }
    }

    return { success: true, data: report }
  } catch (error) {
    log.error({ err: error }, 'Erro ao buscar relatório agendado')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao buscar relatório agendado',
    }
  }
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createScheduledReport(data: ScheduledReportInput) {
  try {
    const session = await getSession()
    if (!session?.user?.id || !session.user.companyId) {
      return { success: false, error: 'Não autenticado' }
    }
    assertAdminOrManager(session.user.role)

    const validated = scheduledReportSchema.parse(data)

    const nextRun = computeNextRun(validated.frequency, validated.hour, validated.dayOfWeek, validated.dayOfMonth)

    const report = await prisma.scheduledReport.create({
      data: {
        name: validated.name,
        type: validated.type,
        frequency: validated.frequency,
        dayOfWeek: validated.frequency === 'WEEKLY' ? (validated.dayOfWeek ?? 1) : null,
        dayOfMonth: validated.frequency === 'MONTHLY' ? (validated.dayOfMonth ?? 1) : null,
        hour: validated.hour,
        recipients: JSON.stringify(validated.recipients),
        filters: validated.filters ? JSON.stringify(validated.filters) : null,
        isActive: validated.isActive,
        nextRun,
        companyId: session.user.companyId,
        createdById: session.user.id,
      },
    })

    revalidatePath('/relatorios/agendamento')
    return { success: true, data: report }
  } catch (error) {
    log.error({ err: error }, 'Erro ao criar relatório agendado')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar relatório agendado',
    }
  }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateScheduledReport(id: string, data: ScheduledReportInput) {
  try {
    const session = await getSession()
    if (!session?.user?.id || !session.user.companyId) {
      return { success: false, error: 'Não autenticado' }
    }
    assertAdminOrManager(session.user.role)

    const existing = await prisma.scheduledReport.findFirst({
      where: { id, companyId: session.user.companyId },
    })

    if (!existing) {
      return { success: false, error: 'Relatório agendado não encontrado' }
    }

    const validated = scheduledReportSchema.parse(data)

    const nextRun = computeNextRun(validated.frequency, validated.hour, validated.dayOfWeek, validated.dayOfMonth)

    const report = await prisma.scheduledReport.update({
      where: { id },
      data: {
        name: validated.name,
        type: validated.type,
        frequency: validated.frequency,
        dayOfWeek: validated.frequency === 'WEEKLY' ? (validated.dayOfWeek ?? 1) : null,
        dayOfMonth: validated.frequency === 'MONTHLY' ? (validated.dayOfMonth ?? 1) : null,
        hour: validated.hour,
        recipients: JSON.stringify(validated.recipients),
        filters: validated.filters ? JSON.stringify(validated.filters) : null,
        isActive: validated.isActive,
        nextRun,
      },
    })

    revalidatePath('/relatorios/agendamento')
    return { success: true, data: report }
  } catch (error) {
    log.error({ err: error }, 'Erro ao atualizar relatório agendado')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar relatório agendado',
    }
  }
}

// ---------------------------------------------------------------------------
// Toggle Active
// ---------------------------------------------------------------------------

export async function toggleScheduledReport(id: string) {
  try {
    const session = await getSession()
    if (!session?.user?.id || !session.user.companyId) {
      return { success: false, error: 'Não autenticado' }
    }
    assertAdminOrManager(session.user.role)

    const existing = await prisma.scheduledReport.findFirst({
      where: { id, companyId: session.user.companyId },
    })

    if (!existing) {
      return { success: false, error: 'Relatório agendado não encontrado' }
    }

    const newActive = !existing.isActive
    let nextRun = existing.nextRun
    if (newActive && !nextRun) {
      nextRun = computeNextRun(existing.frequency, existing.hour, existing.dayOfWeek, existing.dayOfMonth)
    }

    const report = await prisma.scheduledReport.update({
      where: { id },
      data: {
        isActive: newActive,
        nextRun: newActive ? nextRun : null,
      },
    })

    revalidatePath('/relatorios/agendamento')
    return { success: true, data: report }
  } catch (error) {
    log.error({ err: error }, 'Erro ao alternar relatório agendado')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao alternar relatório agendado',
    }
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteScheduledReport(id: string) {
  try {
    const session = await getSession()
    if (!session?.user?.id || !session.user.companyId) {
      return { success: false, error: 'Não autenticado' }
    }
    assertAdminOrManager(session.user.role)

    const existing = await prisma.scheduledReport.findFirst({
      where: { id, companyId: session.user.companyId },
    })

    if (!existing) {
      return { success: false, error: 'Relatório agendado não encontrado' }
    }

    await prisma.scheduledReport.delete({ where: { id } })

    revalidatePath('/relatorios/agendamento')
    return { success: true }
  } catch (error) {
    log.error({ err: error }, 'Erro ao excluir relatório agendado')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir relatório agendado',
    }
  }
}
