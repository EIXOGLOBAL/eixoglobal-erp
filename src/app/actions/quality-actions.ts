'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"

// ============================================================================
// SCHEMAS
// ============================================================================

const checkpointSchema = z.object({
  code: z.string().min(1, "Código é obrigatório"),
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  description: z.string().optional(),
  projectId: z.string().uuid(),
  phase: z.string().optional(),
  checklistTemplate: z.record(z.string(), z.any()).optional(),
  successCriteria: z.string().optional(),
})

const inspectionSchema = z.object({
  result: z.enum(['PASS', 'FAIL', 'CONDITIONAL']),
  notes: z.string().optional(),
  photos: z.array(z.string()).optional(),
  inspectorId: z.string().uuid().optional(),
})

const nonConformitySchema = z.object({
  code: z.string().min(1, "Código é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  severity: z.enum(['CRITICAL', 'MAJOR', 'MINOR']),
  evidence: z.string().optional(),
  affectedAreas: z.array(z.string()).optional(),
})

const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(10),
})

const filterSchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED']).optional(),
})

// ============================================================================
// CHECKPOINTS CRUD
// ============================================================================

export async function createCheckpoint(data: z.infer<typeof checkpointSchema>) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  try {
    const validated = checkpointSchema.parse(data)

    const existing = await (prisma as any).qualityCheckpoint.findFirst({
      where: {
        code: validated.code,
        projectId: validated.projectId,
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    if (existing) {
      return {
        success: false,
        error: "Já existe um ponto de controle com este código neste projeto",
      }
    }

    const checkpoint = await (prisma as any).qualityCheckpoint.create({
      data: {
        code: validated.code,
        name: validated.name,
        description: validated.description || null,
        projectId: validated.projectId,
        phase: validated.phase || null,
        checklistTemplate: validated.checklistTemplate || null,
        successCriteria: validated.successCriteria || null,
        status: 'PENDING',
        createdBy: session.user.id,
      },
      include: {
        project: { select: { id: true, name: true } },
        inspections: true,
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    revalidatePath('/quality')
    return { success: true, data: checkpoint }
  } catch (error) {
    console.error("Erro ao criar ponto de controle:", error)
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

    const checkpoint = await (prisma as any).qualityCheckpoint.update({
      where: { id },
      data: {
        code: validated.code,
        name: validated.name,
        description: validated.description,
        phase: validated.phase,
        checklistTemplate: validated.checklistTemplate,
        successCriteria: validated.successCriteria,
      },
      include: {
        project: { select: { id: true, name: true } },
        inspections: true,
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    revalidatePath('/quality')
    return { success: true, data: checkpoint }
  } catch (error) {
    console.error("Erro ao atualizar ponto de controle:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar ponto de controle",
    }
  }
}

export async function deleteCheckpoint(id: string) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  try {
    await (prisma as any).qualityCheckpoint.delete({
      where: { id },
    })
    // TODO: Remove 'as any' after running prisma generate

    revalidatePath('/quality')
    return { success: true }
  } catch (error) {
    console.error("Erro ao deletar ponto de controle:", error)
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
      (prisma as any).qualityCheckpoint.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          inspections: true,
          nonConformities: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pagination.limit,
      }),
      // TODO: Remove 'as any' after running prisma generate
      (prisma as any).qualityCheckpoint.count({ where }),
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
    console.error("Erro ao buscar pontos de controle:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar pontos de controle",
      data: null,
    }
  }
}

export async function getCheckpointById(id: string) {
  try {
    const checkpoint = await (prisma as any).qualityCheckpoint.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        inspections: {
          include: {
            inspector: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        nonConformities: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    if (!checkpoint) {
      return { success: false, error: "Ponto de controle não encontrado" }
    }

    return { success: true, data: checkpoint }
  } catch (error) {
    console.error("Erro ao buscar ponto de controle:", error)
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

    const checkpoint = await (prisma as any).qualityCheckpoint.findUnique({
      where: { id: checkpointId },
    })
    // TODO: Remove 'as any' after running prisma generate

    if (!checkpoint) {
      return { success: false, error: "Ponto de controle não encontrado" }
    }

    const inspection = await (prisma as any).qualityInspection.create({
      data: {
        checkpointId,
        result: validated.result,
        notes: validated.notes || null,
        photos: validated.photos || null,
        inspectorId: validated.inspectorId || session.user.id,
        performedAt: new Date(),
      },
      include: {
        checkpoint: { select: { id: true, name: true } },
        inspector: { select: { id: true, name: true } },
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    // Update checkpoint status based on inspection result
    const newStatus = validated.result === 'PASS' ? 'COMPLETED' : 'IN_PROGRESS'
    await (prisma as any).qualityCheckpoint.update({
      where: { id: checkpointId },
      data: { status: newStatus },
    })
    // TODO: Remove 'as any' after running prisma generate

    revalidatePath('/quality')
    return { success: true, data: inspection }
  } catch (error) {
    console.error("Erro ao realizar inspeção:", error)
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

    const checkpoint = await (prisma as any).qualityCheckpoint.findUnique({
      where: { id: checkpointId },
    })
    // TODO: Remove 'as any' after running prisma generate

    if (!checkpoint) {
      return { success: false, error: "Ponto de controle não encontrado" }
    }

    const nonConformity = await (prisma as any).nonConformity.create({
      data: {
        code: validated.code,
        description: validated.description,
        severity: validated.severity,
        evidence: validated.evidence || null,
        affectedAreas: validated.affectedAreas || null,
        checkpointId,
        reportedBy: session.user.id,
        reportedAt: new Date(),
        status: 'OPEN',
      },
      include: {
        checkpoint: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true } },
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    revalidatePath('/quality')
    return { success: true, data: nonConformity }
  } catch (error) {
    console.error("Erro ao criar não conformidade:", error)
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

    const nonConformity = await (prisma as any).nonConformity.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolution,
        resolvedBy: session.user.id,
        resolvedAt: new Date(),
      },
      include: {
        checkpoint: { select: { id: true, name: true } },
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    revalidatePath('/quality')
    return { success: true, data: nonConformity }
  } catch (error) {
    console.error("Erro ao resolver não conformidade:", error)
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

    const [checkpoints, inspections, nonConformities] = await Promise.all([
      (prisma as any).qualityCheckpoint.findMany({ where }),
      // TODO: Remove 'as any' after running prisma generate
      (prisma as any).qualityInspection.findMany({
        where: projectId
          ? { checkpoint: { projectId } }
          : undefined,
      }),
      // TODO: Remove 'as any' after running prisma generate
      (prisma as any).nonConformity.findMany({
        where: projectId
          ? { checkpoint: { projectId } }
          : undefined,
      }),
      // TODO: Remove 'as any' after running prisma generate
    ])

    const totalCheckpoints = checkpoints.length
    const completedCheckpoints = checkpoints.filter(
      (c: any) => c.status === 'COMPLETED'
    ).length
    const failedCheckpoints = checkpoints.filter(
      (c: any) => c.status === 'FAILED'
    ).length

    const passedInspections = inspections.filter(
      (i: any) => i.result === 'PASS'
    ).length
    const failedInspections = inspections.filter(
      (i: any) => i.result === 'FAIL'
    ).length
    const conditionalInspections = inspections.filter(
      (i: any) => i.result === 'CONDITIONAL'
    ).length

    const openNonConformities = nonConformities.filter(
      (nc: any) => nc.status === 'OPEN'
    ).length
    const criticalNCs = nonConformities.filter(
      (nc: any) => nc.severity === 'CRITICAL'
    ).length

    const qualityScore =
      totalCheckpoints > 0
        ? Math.round((completedCheckpoints / totalCheckpoints) * 100)
        : 0

    return {
      success: true,
      data: {
        checkpoints: {
          total: totalCheckpoints,
          completed: completedCheckpoints,
          failed: failedCheckpoints,
          pending: totalCheckpoints - completedCheckpoints - failedCheckpoints,
        },
        inspections: {
          total: inspections.length,
          passed: passedInspections,
          failed: failedInspections,
          conditional: conditionalInspections,
        },
        nonConformities: {
          total: nonConformities.length,
          open: openNonConformities,
          resolved: nonConformities.filter(
            (nc: any) => nc.status === 'RESOLVED'
          ).length,
          critical: criticalNCs,
        },
        qualityScore,
      },
    }
  } catch (error) {
    console.error("Erro ao buscar dashboard de qualidade:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar dashboard",
      data: null,
    }
  }
}
