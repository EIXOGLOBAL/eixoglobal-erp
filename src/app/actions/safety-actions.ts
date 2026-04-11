'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import type { SafetyIncidentType } from "@/lib/generated/prisma/client"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"
import { logCreate, logUpdate, logDelete, logAction } from '@/lib/audit-logger'

// ============================================================================
// SCHEMAS
// ============================================================================

const incidentSchema = z.object({
  code: z.string().min(1, "Código é obrigatório"),
  title: z.string().min(2, "Título deve ter no mínimo 2 caracteres"),
  description: z.string().min(1, "Descrição é obrigatória"),
  type: z.enum(['ACCIDENT', 'NEAR_MISS', 'UNSAFE_CONDITION', 'UNSAFE_ACT', 'ENVIRONMENTAL', 'FIRST_AID', 'PPE_VIOLATION']),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  projectId: z.string().uuid().optional(),
  location: z.string().optional(),
  involvedPersons: z.array(z.string()).optional(),
  witnesses: z.array(z.string()).optional(),
  photosEvidence: z.array(z.string()).optional(),
  createNonConformity: z.boolean().optional(),
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
  status: z.enum(['OPEN', 'CLOSED']).optional(),
})

// ============================================================================
// INCIDENTS CRUD
// ============================================================================

export async function reportIncident(data: z.infer<typeof incidentSchema>) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  try {
    const validated = incidentSchema.parse(data)

    const incident = await prisma.safetyIncident.create({
      data: {
        description: validated.description,
        type: validated.type,
        severity: validated.severity,
        date: new Date(),
        projectId: validated.projectId,
        companyId: session.user.companyId!,
        location: validated.location || null,
        witnesses: validated.witnesses || [],
        photos: validated.photosEvidence || [],
        reportedById: session.user.id,
        status: 'OPEN',
      },
      include: {
        project: { select: { id: true, name: true } },
        reportedBy: { select: { id: true, name: true } },
      },
    })

    await logCreate('SafetyIncident', incident.id, validated.title || validated.description, validated)

    // Auto-gerar Não Conformidade vinculada ao incidente
    let nonConformity = null
    if (validated.createNonConformity) {
      nonConformity = await prisma.qualityNonConformity.create({
        data: {
          safetyIncidentId: incident.id,
          description: `[Incidente de Segurança] ${validated.description}`,
          severity: validated.severity,
          status: 'OPEN',
          photos: validated.photosEvidence || [],
        },
      })

      await logCreate(
        'QualityNonConformity',
        nonConformity.id,
        `NC gerada do incidente ${incident.id}`,
        { safetyIncidentId: incident.id, severity: validated.severity }
      )
    }

    revalidatePath('/safety')
    revalidatePath('/seguranca-trabalho')
    revalidatePath('/qualidade')
    return { success: true, data: { ...incident, nonConformity } }
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
    const oldData = await prisma.safetyIncident.findUnique({ where: { id } })

    const incident = await prisma.safetyIncident.update({
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

    await logUpdate('SafetyIncident', id, incident.description || 'N/A', oldData, incident)

    revalidatePath('/safety')
    revalidatePath('/seguranca-trabalho')
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

    const where: Record<string, unknown> = {}
    if (filters.projectId) where.projectId = filters.projectId
    if (filters.type) where.type = filters.type as SafetyIncidentType
    if (filters.severity) where.severity = filters.severity
    if (filters.status) where.status = filters.status

    const [data, total] = await Promise.all([
      prisma.safetyIncident.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          reportedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pagination.limit,
      }),
  
      prisma.safetyIncident.count({ where }),
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
    const incident = await prisma.safetyIncident.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        reportedBy: { select: { id: true, name: true } },
      },
    })


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

    const incident = await prisma.safetyIncident.update({
      where: { id },
      data: {
        status: 'CLOSED',
        rootCause: validated.rootCause,
        correctiveAction: validated.correctiveAction,
        preventiveAction: validated.preventiveAction || null,
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    })

    await logAction('CLOSE', 'SafetyIncident', id, incident.description || 'N/A', `Root cause: ${validated.rootCause}`)

    revalidatePath('/safety')
    revalidatePath('/seguranca-trabalho')
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

    const inspection = await prisma.safetyInspection.create({
      data: {
        type: validated.name,
        projectId: validated.projectId,
        companyId: session.user.companyId!,
        date: new Date(),
        inspectorId: session.user.id,
        status: 'DRAFT',
      },
      include: {
        project: { select: { id: true, name: true } },
        inspector: { select: { id: true, name: true } },
      },
    })

    await logCreate('SafetyInspection', inspection.id, validated.name, validated)

    revalidatePath('/safety')
    revalidatePath('/seguranca-trabalho')
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

    const inspection = await prisma.safetyInspection.findUnique({
      where: { id: inspectionId },
    })


    if (!inspection) {
      return { success: false, error: "Inspeção não encontrada" }
    }

    const updated = await prisma.safetyInspection.update({
      where: { id: inspectionId },
      data: {
        status: 'COMPLETED',
        checklist: validated.checklist,
        overallScore: validated.score,
        findings: validated.findings ? JSON.stringify(validated.findings) : null,
        photos: validated.photos || [],
      },
      include: {
        project: { select: { id: true, name: true } },
        inspector: { select: { id: true, name: true } },
      },
    })

    await logAction('COMPLETE', 'SafetyInspection', inspectionId, inspection.type || 'N/A', `Score: ${validated.score}`)

    revalidatePath('/safety')
    revalidatePath('/seguranca-trabalho')
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
      prisma.safetyInspection.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          inspector: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pagination.limit,
      }),
  
      prisma.safetyInspection.count({ where }),
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
      prisma.safetyIncident.findMany({ where }),
  
      prisma.safetyInspection.findMany({
        where: projectId
          ? { projectId }
          : undefined,
      }),
  
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
