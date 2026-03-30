'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"

// ============================================================================
// SCHEMAS
// ============================================================================

const workflowSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  entityType: z.string().min(1, "Tipo de entidade é obrigatório"),
  approvers: z.array(z.string().uuid()),
  requiresAllApprovals: z.boolean().default(false),
})

const submitForApprovalSchema = z.object({
  entityType: z.string().min(1, "Tipo de entidade é obrigatório"),
  entityId: z.string().uuid().min(1, "ID da entidade é obrigatório"),
  workflowId: z.string().uuid().optional(),
  comments: z.string().optional(),
})

const approveRequestSchema = z.object({
  requestId: z.string().uuid(),
  comments: z.string().optional(),
})

const rejectRequestSchema = z.object({
  requestId: z.string().uuid(),
  comments: z.string().min(1, "Comentários são obrigatórios ao rejeitar"),
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
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  try {
    const validated = workflowSchema.parse(data)

    const workflow = await (prisma as any).approvalWorkflow.create({
      data: {
        name: validated.name,
        description: validated.description || null,
        entityType: validated.entityType,
        approvers: validated.approvers,
        requiresAllApprovals: validated.requiresAllApprovals,
        createdBy: session.user.id,
      },
      include: {
        creator: { select: { id: true, name: true } },
      },
    })
    // TODO: Remove 'as any' after running prisma generate

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
    const workflow = await (prisma as any).approvalWorkflow.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.entityType && { entityType: data.entityType }),
        ...(data.approvers && { approvers: data.approvers }),
        ...(data.requiresAllApprovals !== undefined && {
          requiresAllApprovals: data.requiresAllApprovals,
        }),
      },
      include: {
        creator: { select: { id: true, name: true } },
      },
    })
    // TODO: Remove 'as any' after running prisma generate

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
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  try {
    await (prisma as any).approvalWorkflow.delete({
      where: { id },
    })
    // TODO: Remove 'as any' after running prisma generate

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
      (prisma as any).approvalWorkflow.findMany({
        include: {
          creator: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pagination.limit,
      }),
      // TODO: Remove 'as any' after running prisma generate
      (prisma as any).approvalWorkflow.count(),
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
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  try {
    const validated = submitForApprovalSchema.parse(data)

    let approvers: string[] = []

    if (validated.workflowId) {
      const workflow = await (prisma as any).approvalWorkflow.findUnique({
        where: { id: validated.workflowId },
      })
      // TODO: Remove 'as any' after running prisma generate

      if (!workflow) {
        return { success: false, error: "Workflow não encontrado" }
      }
      approvers = workflow.approvers
    }

    if (approvers.length === 0) {
      return {
        success: false,
        error: "Nenhum aprovador configurado para este workflow",
      }
    }

    const request = await (prisma as any).approvalRequest.create({
      data: {
        entityType: validated.entityType,
        entityId: validated.entityId,
        workflowId: validated.workflowId || null,
        submittedBy: session.user.id,
        submittedAt: new Date(),
        status: 'PENDING',
        comments: validated.comments || null,
        approvers,
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    revalidatePath('/approvals')
    return { success: true, data: request }
  } catch (error) {
    console.error("Erro ao submeter para aprovação:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao submeter para aprovação",
    }
  }
}

export async function approveRequest(
  requestId: string,
  comments?: string
) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  try {
    const request = await (prisma as any).approvalRequest.findUnique({
      where: { id: requestId },
    })
    // TODO: Remove 'as any' after running prisma generate

    if (!request) {
      return { success: false, error: "Solicitação de aprovação não encontrada" }
    }

    const updatedApprovers = request.approvers
      ? (request.approvers as string[]).filter((id: string) => id !== session.user.id)
      : []

    const isFullyApproved =
      updatedApprovers.length === 0 || !request.workflow?.requiresAllApprovals

    const updated = await (prisma as any).approvalRequest.update({
      where: { id: requestId },
      data: {
        approvers: updatedApprovers,
        status: isFullyApproved ? 'APPROVED' : 'PENDING',
        approvedBy: isFullyApproved ? session.user.id : null,
        approvedAt: isFullyApproved ? new Date() : null,
        approvalComments: comments || null,
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    revalidatePath('/approvals')
    return { success: true, data: updated }
  } catch (error) {
    console.error("Erro ao aprovar solicitação:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao aprovar solicitação",
    }
  }
}

export async function rejectRequest(
  requestId: string,
  comments: string
) {
  const session = await getSession()
  if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

  try {
    const validated = rejectRequestSchema.parse({
      requestId,
      comments,
    })

    const request = await (prisma as any).approvalRequest.findUnique({
      where: { id: validated.requestId },
    })
    // TODO: Remove 'as any' after running prisma generate

    if (!request) {
      return { success: false, error: "Solicitação de aprovação não encontrada" }
    }

    const updated = await (prisma as any).approvalRequest.update({
      where: { id: validated.requestId },
      data: {
        status: 'REJECTED',
        rejectedBy: session.user.id,
        rejectedAt: new Date(),
        rejectionComments: validated.comments,
      },
    })
    // TODO: Remove 'as any' after running prisma generate

    revalidatePath('/approvals')
    return { success: true, data: updated }
  } catch (error) {
    console.error("Erro ao rejeitar solicitação:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao rejeitar solicitação",
    }
  }
}

// ============================================================================
// QUERIES
// ============================================================================

export async function getMyPendingApprovals() {
  const session = await getSession()
  if (!session?.user?.id) {
    return { success: false, error: 'Não autenticado', data: null }
  }

  try {
    const requests = await (prisma as any).approvalRequest.findMany({
      where: {
        status: 'PENDING',
        approvers: {
          has: session.user.id,
        },
      },
      include: {
        submitter: { select: { id: true, name: true } },
        workflow: { select: { id: true, name: true } },
      },
      orderBy: { submittedAt: 'desc' },
    })
    // TODO: Remove 'as any' after running prisma generate

    return {
      success: true,
      data: requests,
    }
  } catch (error) {
    console.error("Erro ao buscar aprovações pendentes:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar aprovações pendentes",
      data: null,
    }
  }
}

export async function getApprovalHistory(
  entityType: string,
  entityId: string
) {
  try {
    const requests = await (prisma as any).approvalRequest.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        submitter: { select: { id: true, name: true } },
        workflow: { select: { id: true, name: true } },
      },
      orderBy: { submittedAt: 'desc' },
    })
    // TODO: Remove 'as any' after running prisma generate

    return {
      success: true,
      data: requests,
    }
  } catch (error) {
    console.error("Erro ao buscar histórico de aprovações:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar histórico",
      data: null,
    }
  }
}
