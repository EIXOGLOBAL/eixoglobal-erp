'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"

// ============================================================================
// SCHEMAS
// ============================================================================

const incidentSchema = z.object({
  code: z.string().min(1, "Código é obrigatório"),
  title: z.string().min(2, "Título deve ter no mínimo 2 caracteres"),
  description: z.string().min(1, "Descrição é obrigatória"),
  type: z.enum(['ACCIDENT', 'NEAR_MISS', 'HAZARD', 'INJURY', 'OTHER']),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  projectId: z.string().uuid().optional(),
  location: z.string().optional(),
  involvedPersons: z.array(z.string()).optional(),
  witnesses: z.array(z.string()).optional(),
  photosEvidence: z.array(z.string()).optional(),
})

const incidentCloseSchema = z.object({
  rootCause: z.string().min(1, "Causa raiz é obrigatória"),
  correctiveAction: z.string().min(1, "Ação corretiva é obrigatória"),
  preventiveAction: z.string().optional(),
  actionOwner: z.string().optional(),
})

const inspectionSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  projectId: z.string().uuid().optional(),
  checklistTemplate: z.record(z.string(), z.any()).optional(),
})

const completeInspectionSchema = z.object({
  checklist: z.record(z.string(), z.boolean()),
  score: z.number().min(0).max(100),
  findings: z.array(
    z.object({
      item: z.string(),
      status: z.enum(['PASS', 'FAIL', 'OBSERVATION']),
      notes: z.string().optional(),
    })
  ).optional(),
  photos: z.array(z.string()).optional(),
})

const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(10),
})

const filterSchema = z.object({
  projectId: z.string().uuid().optional(),
  type: z.string().optional(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  status: z.enum(['OPEN', 'IN_INVESTIGATION', 'CLOSED']).optional(),
})

// ============================================================================
// INCIDENTS CRUD
// ============================================================================

export async function reportIncident(data: z.infer<typeof incidentSchema>) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  try {
    const validated = incidentSchema.parse(data)

    const incident = await (prisma as any).safetyIncident.create({
      data: {
        code: validated.code,
        title: validated.title,
        description: validated.description,
        type: validated.type,
        severity: validated.severity,
        projectId: validated.projectId || null,
        location: validated.location || null,
        involvedPersons: validated.involvedPersons || null,
        witnesses: validated.witnesses || null,
        photosEvidence: validated.photosEvidence || null,
        reportedBy: session.user.id,
        reportedAt: new Date(),
        status: 'OPEN',
      },
      include: {
        project: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true } },
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    revalidatePath('/safety')
    return { success: true, data: incident }
  } catch (error) {
    console.error("Erro ao reportar incidente:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao reportar incidente",
    }
  }
}

export async function updateIncident(
  id: string,
  data: Partial<z.infer<typeof incidentSchema>>
) {
  try {
    const incident = await (prisma as any).safetyIncident.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.type && { type: data.type }),
        ...(data.severity && { severity: data.severity }),
        ...(data.location && { location: data.location }),
        ...(data.involvedPersons && { involvedPersons: data.involvedPersons }),
        ...(data.witnesses && { witnesses: data.witnesses }),
        ...(data.photosEvidence && { photosEvidence: data.photosEvidence }),
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    revalidatePath('/safety')
    return { success: true, data: incident }
  } catch (error) {
    console.error("Erro ao atualizar incidente:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar incidente",
    }
  }
}

export async function getIncidents(
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
      ...(filters.type && { type: filters.type }),
      ...(filters.severity && { severity: filters.severity }),
      ...(filters.status && { status: filters.status }),
    }

    const [data, total] = await Promise.all([
      (prisma as any).safetyIncident.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          reporter: { select: { id: true, name: true } },
        },
        orderBy: { reportedAt: 'desc' },
        skip,
        take: pagination.limit,
      }),
      // TODO: Remove 'as any' after running prisma generate
      (prisma as any).safetyIncident.count({ where }),
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
    console.error("Erro ao buscar incidentes:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar incidentes",
      data: null,
    }
  }
}

export async function getIncidentById(id: string) {
  try {
    const incident = await (prisma as any).safetyIncident.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true } },
        investigations: true,
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    if (!incident) {
      return { success: false, error: "Incidente não encontrado" }
    }

    return { success: true, data: incident }
  } catch (error) {
    console.error("Erro ao buscar incidente:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar incidente",
    }
  }
}

export async function closeIncident(
  id: string,
  data: z.infer<typeof incidentCloseSchema>
) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  try {
    const validated = incidentCloseSchema.parse(data)

    const incident = await (prisma as any).safetyIncident.update({
      where: { id },
      data: {
        status: 'CLOSED',
        rootCause: validated.rootCause,
        correctiveAction: validated.correctiveAction,
        preventiveAction: validated.preventiveAction || null,
        actionOwner: validated.actionOwner || null,
        closedBy: session.user.id,
        closedAt: new Date(),
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    revalidatePath('/safety')
    return { success: true, data: incident }
  } catch (error) {
    console.error("Erro ao encerrar incidente:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao encerrar incidente",
    }
  }
}

// ============================================================================
// INSPECTIONS
// ============================================================================

export async function createInspection(data: z.infer<typeof inspectionSchema>) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  try {
    const validated = inspectionSchema.parse(data)

    const inspection = await (prisma as any).safetyInspection.create({
      data: {
        name: validated.name,
        description: validated.description || null,
        projectId: validated.projectId || null,
        checklistTemplate: validated.checklistTemplate || null,
        createdBy: session.user.id,
        status: 'PENDING',
      },
      include: {
        project: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    revalidatePath('/safety')
    return { success: true, data: inspection }
  } catch (error) {
    console.error("Erro ao criar inspeção:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar inspeção",
    }
  }
}

export async function completeInspection(
  inspectionId: string,
  data: z.infer<typeof completeInspectionSchema>
) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  try {
    const validated = completeInspectionSchema.parse(data)

    const inspection = await (prisma as any).safetyInspection.findUnique({
      where: { id: inspectionId },
    })
    // TODO: Remove 'as any' after running prisma generate

    if (!inspection) {
      return { success: false, error: "Inspeção não encontrada" }
    }

    const updated = await (prisma as any).safetyInspection.update({
      where: { id: inspectionId },
      data: {
        status: 'COMPLETED',
        checklist: validated.checklist,
        score: validated.score,
        findings: validated.findings || null,
        photosEvidence: validated.photos || null,
        completedBy: session.user.id,
        completedAt: new Date(),
      },
      include: {
        project: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    revalidatePath('/safety')
    return { success: true, data: updated }
  } catch (error) {
    console.error("Erro ao completar inspeção:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao completar inspeção",
    }
  }
}

export async function getInspections(
  params?: {
    pagination?: z.infer<typeof paginationSchema>
    filters?: Partial<{
      projectId: string
      status: string
    }>
  }
) {
  try {
    const pagination = paginationSchema.parse(params?.pagination || {})
    const filters = params?.filters || {}

    const skip = (pagination.page - 1) * pagination.limit

    const where = {
      ...(filters.projectId && { projectId: filters.projectId }),
      ...(filters.status && { status: filters.status }),
    }

    const [data, total] = await Promise.all([
      (prisma as any).safetyInspection.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pagination.limit,
      }),
      // TODO: Remove 'as any' after running prisma generate
      (prisma as any).safetyInspection.count({ where }),
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
    console.error("Erro ao buscar inspeções:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar inspeções",
      data: null,
    }
  }
}

// ============================================================================
// DASHBOARD
// ============================================================================

export async function getSafetyDashboard(projectId?: string) {
  try {
    const where = projectId ? { projectId } : {}

    const [incidents, inspections] = await Promise.all([
      (prisma as any).safetyIncident.findMany({ where }),
      // TODO: Remove 'as any' after running prisma generate
      (prisma as any).safetyInspection.findMany({
        where: projectId
          ? { projectId }
          : undefined,
      }),
      // TODO: Remove 'as any' after running prisma generate
    ])

    const openIncidents = incidents.filter((i: any) => i.status === 'OPEN')
    const criticalIncidents = incidents.filter(
      (i: any) => i.severity === 'CRITICAL'
    )
    const highSeverityIncidents = incidents.filter(
      (i: any) => i.severity === 'HIGH'
    )

    const completedInspections = inspections.filter(
      (i: any) => i.status === 'COMPLETED'
    )
    const avgScore =
      completedInspections.length > 0
        ? Math.round(
            completedInspections.reduce((sum: number, i: any) => sum + i.score, 0) /
              completedInspections.length
          )
        : 0

    const incidentsByType = incidents.reduce((acc: any, i: any) => {
      acc[i.type] = (acc[i.type] || 0) + 1
      return acc
    }, {})

    return {
      success: true,
      data: {
        incidents: {
          total: incidents.length,
          open: openIncidents.length,
          critical: criticalIncidents.length,
          high: highSeverityIncidents.length,
          closed: incidents.filter((i: any) => i.status === 'CLOSED').length,
          byType: incidentsByType,
        },
        inspections: {
          total: inspections.length,
          completed: completedInspections.length,
          pending: inspections.filter((i: any) => i.status === 'PENDING').length,
          averageScore: avgScore,
        },
      },
    }
  } catch (error) {
    console.error("Erro ao buscar dashboard de segurança:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar dashboard",
      data: null,
    }
  }
}
