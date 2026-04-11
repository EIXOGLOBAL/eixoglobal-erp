'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"
import type { Role } from "@/lib/generated/prisma/enums"
import { logCreate, logUpdate, logDelete, logAction } from '@/lib/audit-logger'

// ============================================================================
// SCHEMAS
// ============================================================================

const approvalLevelSchema = z.object({
  level: z.number().int().positive(),
  roleRequired: z.enum(["ADMIN", "MANAGER", "USER", "ENGINEER", "SUPERVISOR", "SAFETY_OFFICER", "ACCOUNTANT", "HR_ANALYST"]).optional(),
  specificUserId: z.string().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
})

const workflowSchema = z.object({
  name: z.string().min(1, "Nome e obrigatorio"),
  description: z.string().optional(),
  entityType: z.string().min(1, "Tipo de entidade e obrigatorio"),
  levels: z.array(approvalLevelSchema).min(1, "Pelo menos um nivel de aprovacao e obrigatorio"),
})

const submitForApprovalSchema = z.object({
  entityType: z.string().min(1, "Tipo de entidade e obrigatorio"),
  entityId: z.string().min(1, "ID da entidade e obrigatorio"),
  comments: z.string().optional(),
})

const approveRequestSchema = z.object({
  requestId: z.string(),
  comments: z.string().optional(),
})

const rejectRequestSchema = z.object({
  requestId: z.string(),
  comments: z.string().min(1, "Comentarios sao obrigatorios ao rejeitar"),
})

const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(10),
})

// ============================================================================
// WORKFLOW CRUD
// ============================================================================

export async function createWorkflow(data: z.infer<typeof workflowSchema>) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Nao autenticado' }

  try {
    const validated = workflowSchema.parse(data)

    const workflow = await prisma.approvalWorkflow.create({
      data: {
        companyId: session.user.companyId!,
        name: validated.name,
        description: validated.description || null,
        entityType: validated.entityType,
        levels: {
          create: validated.levels.map((lvl) => ({
            level: lvl.level,
            roleRequired: (lvl.roleRequired as Role) || null,
            specificUserId: lvl.specificUserId || null,
            minAmount: lvl.minAmount ?? null,
            maxAmount: lvl.maxAmount ?? null,
          })),
        },
      },
      include: {
        levels: {
          include: {
            specificUser: { select: { id: true, name: true } },
          },
          orderBy: { level: 'asc' },
        },
      },
    })

    await logCreate('ApprovalWorkflow', workflow.id, workflow.name || 'N/A', validated)

    revalidatePath('/workflows')
    return { success: true, data: workflow }
  } catch (error) {
    console.error("Erro ao criar workflow:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar workflow",
    }
  }
}

export async function updateWorkflow(
  id: string,
  data: Partial<z.infer<typeof workflowSchema>>
) {
  try {
    const oldWorkflow = await prisma.approvalWorkflow.findUnique({ where: { id } })

    const workflow = await prisma.approvalWorkflow.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.entityType && { entityType: data.entityType }),
        ...(data.levels && {
          levels: {
            deleteMany: {},
            create: data.levels.map((lvl) => ({
              level: lvl.level,
              roleRequired: (lvl.roleRequired as Role) || null,
              specificUserId: lvl.specificUserId || null,
              minAmount: lvl.minAmount ?? null,
              maxAmount: lvl.maxAmount ?? null,
            })),
          },
        }),
      },
      include: {
        levels: {
          include: {
            specificUser: { select: { id: true, name: true } },
          },
          orderBy: { level: 'asc' },
        },
      },
    })

    await logUpdate('ApprovalWorkflow', id, workflow.name || 'N/A', oldWorkflow, workflow)

    revalidatePath('/workflows')
    return { success: true, data: workflow }
  } catch (error) {
    console.error("Erro ao atualizar workflow:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar workflow",
    }
  }
}

export async function deleteWorkflow(id: string) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Nao autenticado' }

  try {
    const oldWorkflow = await prisma.approvalWorkflow.findUnique({ where: { id } })

    await prisma.approvalWorkflow.delete({
      where: { id },
    })

    await logDelete('ApprovalWorkflow', id, oldWorkflow?.name || 'N/A', oldWorkflow)

    revalidatePath('/workflows')
    return { success: true }
  } catch (error) {
    console.error("Erro ao deletar workflow:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao deletar workflow",
    }
  }
}

export async function getWorkflows(
  params?: {
    pagination?: z.infer<typeof paginationSchema>
  }
) {
  try {
    const pagination = paginationSchema.parse(params?.pagination || {})
    const skip = (pagination.page - 1) * pagination.limit

    const [data, total] = await Promise.all([
      prisma.approvalWorkflow.findMany({
        include: {
          levels: {
            include: {
              specificUser: { select: { id: true, name: true } },
            },
            orderBy: { level: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pagination.limit,
      }),

      prisma.approvalWorkflow.count(),
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
    console.error("Erro ao buscar workflows:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar workflows",
      data: null,
    }
  }
}

// ============================================================================
// APPROVAL REQUESTS
// ============================================================================

export async function submitForApproval(
  data: z.infer<typeof submitForApprovalSchema>
) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Nao autenticado' }

  try {
    const validated = submitForApprovalSchema.parse(data)

    const request = await prisma.approvalRequest.create({
      data: {
        companyId: session.user.companyId!,
        entityType: validated.entityType,
        entityId: validated.entityId,
        requestedById: session.user.id,
        status: 'PENDING',
        currentLevel: 1,
      },
      include: {
        requestedBy: { select: { id: true, name: true } },
      },
    })

    await logCreate('ApprovalRequest', request.id, `${validated.entityType}:${validated.entityId}`, validated)

    // Record initial submission in history
    if (validated.comments) {
      await prisma.approvalHistory.create({
        data: {
          requestId: request.id,
          level: 1,
          action: 'SUBMITTED',
          userId: session.user.id,
          comments: validated.comments,
        },
      })
    }


    revalidatePath('/approvals')
    return { success: true, data: request }
  } catch (error) {
    console.error("Erro ao submeter para aprovacao:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao submeter para aprovacao",
    }
  }
}

export async function approveRequest(
  requestId: string,
  comments?: string
) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Nao autenticado' }

  try {
    const request = await prisma.approvalRequest.findUnique({
      where: { id: requestId },
    })


    if (!request) {
      return { success: false, error: "Solicitacao de aprovacao nao encontrada" }
    }

    // Record approval action in history
    await prisma.approvalHistory.create({
      data: {
        requestId: request.id,
        level: request.currentLevel,
        action: 'APPROVED',
        userId: session.user.id,
        comments: comments || null,
      },
    })

    const updated = await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
      },
    })

    await logAction('APPROVE', 'ApprovalRequest', requestId, `${request.entityType}:${request.entityId}`, comments || 'Aprovado')

    revalidatePath('/approvals')
    return { success: true, data: updated }
  } catch (error) {
    console.error("Erro ao aprovar solicitacao:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao aprovar solicitacao",
    }
  }
}

export async function rejectRequest(
  requestId: string,
  comments: string
) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Nao autenticado' }

  try {
    const validated = rejectRequestSchema.parse({
      requestId,
      comments,
    })

    const request = await prisma.approvalRequest.findUnique({
      where: { id: validated.requestId },
    })


    if (!request) {
      return { success: false, error: "Solicitacao de aprovacao nao encontrada" }
    }

    // Record rejection in history
    await prisma.approvalHistory.create({
      data: {
        requestId: request.id,
        level: request.currentLevel,
        action: 'REJECTED',
        userId: session.user.id,
        comments: validated.comments,
      },
    })

    const updated = await prisma.approvalRequest.update({
      where: { id: validated.requestId },
      data: {
        status: 'REJECTED',
      },
    })

    await logAction('REJECT', 'ApprovalRequest', validated.requestId, `${request.entityType}:${request.entityId}`, validated.comments)

    revalidatePath('/approvals')
    return { success: true, data: updated }
  } catch (error) {
    console.error("Erro ao rejeitar solicitacao:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao rejeitar solicitacao",
    }
  }
}

// ============================================================================
// QUERIES
// ============================================================================

export async function getMyPendingApprovals() {
  const session = await getSession()
  if (!session?.user?.id) {
    return { success: false, error: 'Nao autenticado', data: null }
  }

  try {
    const requests = await prisma.approvalRequest.findMany({
      where: {
        status: 'PENDING',
        companyId: session.user.companyId!,
      },
      include: {
        requestedBy: { select: { id: true, name: true } },
        history: {
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })


    return {
      success: true,
      data: requests,
    }
  } catch (error) {
    console.error("Erro ao buscar aprovacoes pendentes:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar aprovacoes pendentes",
      data: null,
    }
  }
}

export async function getApprovalHistory(
  entityType: string,
  entityId: string
) {
  try {
    const requests = await prisma.approvalRequest.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        requestedBy: { select: { id: true, name: true } },
        history: {
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })


    return {
      success: true,
      data: requests,
    }
  } catch (error) {
    console.error("Erro ao buscar historico de aprovacoes:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar historico",
      data: null,
    }
  }
}
