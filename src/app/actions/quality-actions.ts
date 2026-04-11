'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"
import { logCreate, logUpdate, logDelete, logAction } from '@/lib/audit-logger'
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'quality' })

// ============================================================================
// SCHEMAS
// ============================================================================

const checkpointSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  description: z.string().optional(),
  projectId: z.string().uuid(),
  companyId: z.string().uuid(),
  category: z.string().optional(),
  inspectorId: z.string().uuid().optional(),
  inspectionDate: z.string().datetime().optional(),
  notes: z.string().optional(),
})

const inspectionSchema = z.object({
  result: z.enum(['PASSED', 'FAILED', 'CONDITIONAL']),
  notes: z.string().optional(),
  photos: z.array(z.string()).optional(),
  inspectorId: z.string().uuid().optional(),
})

const nonConformitySchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  severity: z.string().min(1, "Severidade é obrigatória"),
  correctiveAction: z.string().optional(),
  responsibleId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
  photos: z.array(z.string()).optional(),
})

const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(10),
})

const filterSchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'CONDITIONAL']).optional(),
})

// ============================================================================
// CHECKPOINTS CRUD
// ============================================================================

export async function createCheckpoint(data: z.infer<typeof checkpointSchema>) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  // Check write permission - USER role cannot create checkpoints
  if (session.user.role === 'USER') {
    return { success: false, error: 'Sem permissão para criar checkpoint de qualidade' }
  }

  try {
    const validated = checkpointSchema.parse(data)

    const checkpoint = await prisma.qualityCheckpoint.create({
      data: {
        name: validated.name,
        description: validated.description || null,
        projectId: validated.projectId,
        companyId: validated.companyId,
        category: validated.category || null,
        inspectorId: validated.inspectorId || null,
        inspectionDate: validated.inspectionDate ? new Date(validated.inspectionDate) : null,
        notes: validated.notes || null,
        status: 'PENDING',
      },
      include: {
        project: { select: { id: true, name: true } },
        inspector: { select: { id: true, name: true } },
      },
    })

    await logCreate('QualityCheckpoint', checkpoint.id, checkpoint.name, validated)

    revalidatePath('/qualidade')
    return { success: true, data: checkpoint }
  } catch (error) {
    log.error({ err: error }, "Erro ao criar ponto de controle")
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar ponto de controle",
    }
  }
}

export async function updateCheckpoint(
  id: string,
  data: z.infer<typeof checkpointSchema>
) {
  try {
    const validated = checkpointSchema.parse(data)

    const oldData = await prisma.qualityCheckpoint.findUnique({ where: { id } })

    const checkpoint = await prisma.qualityCheckpoint.update({
      where: { id },
      data: {
        name: validated.name,
        description: validated.description,
        category: validated.category,
        inspectorId: validated.inspectorId,
        inspectionDate: validated.inspectionDate ? new Date(validated.inspectionDate) : undefined,
        notes: validated.notes,
      },
      include: {
        project: { select: { id: true, name: true } },
        inspector: { select: { id: true, name: true } },
      },
    })

    await logUpdate('QualityCheckpoint', id, checkpoint.name, oldData, checkpoint)

    revalidatePath('/qualidade')
    return { success: true, data: checkpoint }
  } catch (error) {
    log.error({ err: error }, "Erro ao atualizar ponto de controle")
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar ponto de controle",
    }
  }
}

export async function deleteCheckpoint(id: string) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  // Check delete permission
  if (session.user.role !== "ADMIN" && !session.user.canDelete) {
    return { success: false, error: "Sem permissão para excluir checkpoint" }
  }

  try {
    const old = await prisma.qualityCheckpoint.findUnique({ where: { id } })

    await prisma.qualityCheckpoint.delete({
      where: { id },
    })

    await logDelete('QualityCheckpoint', id, old?.name || 'N/A', old)

    revalidatePath('/qualidade')
    return { success: true }
  } catch (error) {
    log.error({ err: error }, "Erro ao deletar ponto de controle")
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao deletar ponto de controle",
    }
  }
}

export async function getCheckpoints(
  params?: {
    pagination?: z.infer<typeof paginationSchema>
    filters?: z.infer<typeof filterSchema>
  }
) {
  try {
    const pagination = paginationSchema.parse(params?.pagination || {})
    const filters = filterSchema.parse(params?.filters || {})

    const skip = (pagination.page - 1) * pagination.limit

    const where = {
      ...(filters.projectId && { projectId: filters.projectId }),
      ...(filters.status && { status: filters.status }),
    }

    const [data, total] = await Promise.all([
      prisma.qualityCheckpoint.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          inspector: { select: { id: true, name: true } },
          nonConformities: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pagination.limit,
      }),
  
      prisma.qualityCheckpoint.count({ where }),
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
    log.error({ err: error }, "Erro ao buscar pontos de controle")
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar pontos de controle",
      data: null,
    }
  }
}

export async function getCheckpointById(id: string) {
  try {
    const checkpoint = await prisma.qualityCheckpoint.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        inspector: { select: { id: true, name: true } },
        nonConformities: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })


    if (!checkpoint) {
      return { success: false, error: "Ponto de controle não encontrado" }
    }

    return { success: true, data: checkpoint }
  } catch (error) {
    log.error({ err: error }, "Erro ao buscar ponto de controle")
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar ponto de controle",
    }
  }
}

// ============================================================================
// INSPECTIONS
// ============================================================================

export async function performInspection(
  checkpointId: string,
  data: z.infer<typeof inspectionSchema>
) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  try {
    const validated = inspectionSchema.parse(data)

    const checkpoint = await prisma.qualityCheckpoint.findUnique({
      where: { id: checkpointId },
    })


    if (!checkpoint) {
      return { success: false, error: "Ponto de controle não encontrado" }
    }

    const updatedCheckpoint = await prisma.qualityCheckpoint.update({
      where: { id: checkpointId },
      data: {
        result: validated.result,
        notes: validated.notes || null,
        photos: validated.photos || [],
        inspectorId: validated.inspectorId || session.user.id,
        inspectionDate: new Date(),
        status: validated.result === 'PASSED' ? 'PASSED' : validated.result === 'FAILED' ? 'FAILED' : 'CONDITIONAL',
      },
      include: {
        project: { select: { id: true, name: true } },
        inspector: { select: { id: true, name: true } },
      },
    })

    await logAction('INSPECT', 'QualityCheckpoint', checkpointId, updatedCheckpoint.name, `Result: ${validated.result}`)

    revalidatePath('/qualidade')
    return { success: true, data: updatedCheckpoint }
  } catch (error) {
    log.error({ err: error }, "Erro ao realizar inspeção")
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao realizar inspeção",
    }
  }
}

// ============================================================================
// NON-CONFORMITIES
// ============================================================================

export async function createNonConformity(
  checkpointId: string,
  data: z.infer<typeof nonConformitySchema>
) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  try {
    const validated = nonConformitySchema.parse(data)

    const checkpoint = await prisma.qualityCheckpoint.findUnique({
      where: { id: checkpointId },
    })


    if (!checkpoint) {
      return { success: false, error: "Ponto de controle não encontrado" }
    }

    const nonConformity = await prisma.qualityNonConformity.create({
      data: {
        description: validated.description,
        severity: validated.severity,
        correctiveAction: validated.correctiveAction || null,
        responsibleId: validated.responsibleId || null,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
        photos: validated.photos || [],
        checkpointId,
        status: 'OPEN',
      },
      include: {
        checkpoint: { select: { id: true, name: true } },
        responsible: { select: { id: true, name: true } },
      },
    })

    await logCreate('QualityNonConformity', nonConformity.id, validated.description, validated)

    revalidatePath('/qualidade')
    return { success: true, data: nonConformity }
  } catch (error) {
    log.error({ err: error }, "Erro ao criar não conformidade")
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar não conformidade",
    }
  }
}

export async function resolveNonConformity(
  id: string,
  resolution: string
) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  try {
    if (!resolution || resolution.trim().length === 0) {
      return {
        success: false,
        error: "Descrição da resolução é obrigatória",
      }
    }

    const nonConformity = await prisma.qualityNonConformity.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        correctiveAction: resolution,
        resolvedAt: new Date(),
      },
      include: {
        checkpoint: { select: { id: true, name: true } },
      },
    })

    await logAction('RESOLVE', 'QualityNonConformity', id, nonConformity.description || 'N/A', `Resolved: ${resolution}`)

    revalidatePath('/qualidade')
    return { success: true, data: nonConformity }
  } catch (error) {
    log.error({ err: error }, "Erro ao resolver não conformidade")
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao resolver não conformidade",
    }
  }
}

// ============================================================================
// DASHBOARD
// ============================================================================

export async function getQualityDashboard(projectId?: string) {
  try {
    const where = projectId ? { projectId } : {}

    const [checkpoints, nonConformities] = await Promise.all([
      prisma.qualityCheckpoint.findMany({ where }),

      prisma.qualityNonConformity.findMany({
        where: projectId
          ? { checkpoint: { projectId } }
          : undefined,
      }),
    ])

    const totalCheckpoints = checkpoints.length
    const passedCheckpoints = checkpoints.filter(
      (c) => c.status === 'PASSED'
    ).length
    const failedCheckpoints = checkpoints.filter(
      (c) => c.status === 'FAILED'
    ).length
    const conditionalCheckpoints = checkpoints.filter(
      (c) => c.status === 'CONDITIONAL'
    ).length
    const inProgressCheckpoints = checkpoints.filter(
      (c) => c.status === 'IN_PROGRESS'
    ).length

    const openNonConformities = nonConformities.filter(
      (nc) => nc.status === 'OPEN'
    ).length
    const criticalNCs = nonConformities.filter(
      (nc) => nc.severity === 'CRITICAL'
    ).length

    const qualityScore =
      totalCheckpoints > 0
        ? Math.round((passedCheckpoints / totalCheckpoints) * 100)
        : 0

    return {
      success: true,
      data: {
        checkpoints: {
          total: totalCheckpoints,
          passed: passedCheckpoints,
          failed: failedCheckpoints,
          conditional: conditionalCheckpoints,
          inProgress: inProgressCheckpoints,
          pending: totalCheckpoints - passedCheckpoints - failedCheckpoints - conditionalCheckpoints - inProgressCheckpoints,
        },
        nonConformities: {
          total: nonConformities.length,
          open: openNonConformities,
          resolved: nonConformities.filter(
            (nc) => nc.status === 'RESOLVED'
          ).length,
          critical: criticalNCs,
        },
        qualityScore,
      },
    }
  } catch (error) {
    log.error({ err: error }, "Erro ao buscar dashboard de qualidade")
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar dashboard",
      data: null,
    }
  }
}
