'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"

const taskSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  description: z.string().optional().nullable(),
  status: z.enum(["BACKLOG","TODO","IN_PROGRESS","IN_REVIEW","DONE","CANCELLED"]).default("TODO"),
  priority: z.enum(["CRITICAL","HIGH","MEDIUM","LOW","NONE"]).default("NONE"),
  dueDate: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).default([]),
  labelIds: z.array(z.string()).default([]),
})

type TaskInput = z.infer<typeof taskSchema>

async function getUser() {
  const session = await getSession()
  if (!session?.user) throw new Error("Não autenticado")
  return session.user as { id: string; role: string; companyId: string }
}

export async function getWorkTasks(filters?: {
  myTasks?: boolean
  departmentId?: string
  projectId?: string
  priority?: string
  overdue?: boolean
}) {
  try {
    const user = await getUser()
    const userDepts = await prisma.userDepartment.findMany({
      where: { userId: user.id },
      select: { departmentId: true },
    })
    const userDeptIds = userDepts.map(d => d.departmentId)
    const where: Record<string, unknown> = { companyId: user.companyId }
    if (user.role !== "ADMIN") {
      where.OR = [
        { createdById: user.id },
        { assignments: { some: { userId: user.id } } },
        ...(userDeptIds.length > 0 ? [{ departmentId: { in: userDeptIds } }] : []),
      ]
    }
    if (filters?.myTasks) where.assignments = { some: { userId: user.id } }
    if (filters?.departmentId) where.departmentId = filters.departmentId
    if (filters?.projectId) where.projectId = filters.projectId
    if (filters?.priority) where.priority = filters.priority
    if (filters?.overdue) {
      where.dueDate = { lt: new Date() }
      where.status = { notIn: ["DONE", "CANCELLED"] }
    }
    const tasks = await prisma.workTask.findMany({
      where,
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      include: {
        assignments: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        labels: { include: { label: true } },
        subtasks: { orderBy: { order: "asc" } },
        project: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { comments: true, subtasks: true } },
      },
    })
    return { success: true as const, data: tasks }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Erro" }
  }
}

export async function getWorkTaskById(taskId: string) {
  try {
    const user = await getUser()
    const task = await prisma.workTask.findUnique({
      where: { id: taskId },
      include: {
        assignments: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        labels: { include: { label: true } },
        subtasks: { orderBy: { order: "asc" } },
        comments: {
          include: { author: { select: { id: true, name: true, email: true, avatarUrl: true } } },
          orderBy: { createdAt: "asc" },
        },
        activities: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        project: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })
    if (!task || task.companyId !== user.companyId) {
      return { success: false as const, error: "Tarefa não encontrada" }
    }
    return { success: true as const, data: task }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Erro" }
  }
}

export async function createWorkTask(data: TaskInput) {
  try {
    const user = await getUser()
    const v = taskSchema.parse(data)
    const maxOrder = await prisma.workTask.findFirst({
      where: { companyId: user.companyId, status: v.status },
      orderBy: { order: "desc" },
      select: { order: true },
    })
    const task = await prisma.workTask.create({
      data: {
        title: v.title,
        description: v.description ?? null,
        status: v.status,
        priority: v.priority,
        dueDate: v.dueDate ? new Date(v.dueDate) : null,
        order: (maxOrder?.order ?? -1) + 1,
        companyId: user.companyId,
        projectId: v.projectId ?? null,
        departmentId: v.departmentId ?? null,
        createdById: user.id,
        assignments: { create: v.assigneeIds.map(userId => ({ userId })) },
        labels: { create: v.labelIds.map(labelId => ({ labelId })) },
      },
    })
    await prisma.workTaskActivity.create({
      data: { type: "CREATED", taskId: task.id, userId: user.id, newValue: v.title },
    })
    revalidatePath("/tarefas")
    return { success: true as const, data: task }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Erro ao criar" }
  }
}

export async function updateWorkTask(taskId: string, data: Partial<TaskInput>) {
  try {
    const user = await getUser()
    const existing = await prisma.workTask.findUnique({
      where: { id: taskId },
      select: { companyId: true, status: true, priority: true },
    })
    if (!existing || existing.companyId !== user.companyId) {
      return { success: false as const, error: "Não encontrado" }
    }
    const activities: Array<{ type: string; field: string; oldValue?: string; newValue?: string }> = []
    if (data.status && data.status !== existing.status) {
      activities.push({ type: "STATUS_CHANGED", field: "status", oldValue: existing.status, newValue: data.status })
    }
    if (data.priority && data.priority !== existing.priority) {
      activities.push({ type: "PRIORITY_CHANGED", field: "priority", oldValue: existing.priority, newValue: data.priority })
    }
    const task = await prisma.workTask.update({
      where: { id: taskId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
        ...(data.projectId !== undefined && { projectId: data.projectId ?? null }),
        ...(data.departmentId !== undefined && { departmentId: data.departmentId ?? null }),
        ...(data.assigneeIds !== undefined && {
          assignments: { deleteMany: {}, create: data.assigneeIds.map(userId => ({ userId })) },
        }),
        ...(data.labelIds !== undefined && {
          labels: { deleteMany: {}, create: data.labelIds.map(labelId => ({ labelId })) },
        }),
      },
    })
    if (activities.length > 0) {
      await prisma.workTaskActivity.createMany({
        data: activities.map(a => ({ ...a, taskId, userId: user.id })),
      })
    }
    revalidatePath("/tarefas")
    revalidatePath(`/tarefas/${taskId}`)
    return { success: true as const, data: task }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Erro" }
  }
}

export async function moveWorkTask(taskId: string, newStatus: string, newOrder: number) {
  try {
    const user = await getUser()
    const existing = await prisma.workTask.findUnique({
      where: { id: taskId },
      select: { companyId: true, status: true },
    })
    if (!existing || existing.companyId !== user.companyId) {
      return { success: false as const, error: "Não encontrado" }
    }
    const statusChanged = existing.status !== newStatus
    await prisma.workTask.update({
      where: { id: taskId },
      data: { status: newStatus as "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED", order: newOrder },
    })
    if (statusChanged) {
      await prisma.workTaskActivity.create({
        data: { type: "STATUS_CHANGED", field: "status", oldValue: existing.status, newValue: newStatus, taskId, userId: user.id },
      })
    }
    revalidatePath("/tarefas")
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Erro" }
  }
}

export async function deleteWorkTask(taskId: string) {
  try {
    const user = await getUser()
    const task = await prisma.workTask.findUnique({
      where: { id: taskId },
      select: { companyId: true, createdById: true },
    })
    if (!task || task.companyId !== user.companyId) {
      return { success: false as const, error: "Não encontrado" }
    }
    if (user.role !== "ADMIN" && task.createdById !== user.id) {
      return { success: false as const, error: "Sem permissão" }
    }
    await prisma.workTask.delete({ where: { id: taskId } })
    revalidatePath("/tarefas")
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Erro" }
  }
}

export async function addWorkTaskComment(taskId: string, content: string) {
  try {
    const user = await getUser()
    if (!content.trim()) return { success: false as const, error: "Comentário vazio" }
    const task = await prisma.workTask.findUnique({ where: { id: taskId }, select: { companyId: true } })
    if (!task || task.companyId !== user.companyId) return { success: false as const, error: "Acesso negado" }
    const comment = await prisma.workTaskComment.create({
      data: { content, taskId, authorId: user.id },
      include: { author: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    })
    await prisma.workTaskActivity.create({ data: { type: "COMMENT_ADDED", taskId, userId: user.id } })
    revalidatePath(`/tarefas/${taskId}`)
    return { success: true as const, data: comment }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Erro" }
  }
}

export async function deleteWorkTaskComment(commentId: string) {
  try {
    const user = await getUser()
    const comment = await prisma.workTaskComment.findUnique({
      where: { id: commentId },
      include: { task: { select: { companyId: true, id: true } } },
    })
    if (!comment || comment.task.companyId !== user.companyId) {
      return { success: false as const, error: "Não encontrado" }
    }
    if (comment.authorId !== user.id && user.role !== "ADMIN") {
      return { success: false as const, error: "Sem permissão" }
    }
    await prisma.workTaskComment.delete({ where: { id: commentId } })
    revalidatePath(`/tarefas/${comment.task.id}`)
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Erro" }
  }
}

export async function addSubtask(taskId: string, title: string) {
  try {
    const user = await getUser()
    const task = await prisma.workTask.findUnique({ where: { id: taskId }, select: { companyId: true } })
    if (!task || task.companyId !== user.companyId) return { success: false as const, error: "Acesso negado" }
    const maxOrder = await prisma.workTaskSubtask.findFirst({
      where: { taskId }, orderBy: { order: "desc" }, select: { order: true },
    })
    const subtask = await prisma.workTaskSubtask.create({
      data: { title, taskId, order: (maxOrder?.order ?? -1) + 1 },
    })
    revalidatePath(`/tarefas/${taskId}`)
    return { success: true as const, data: subtask }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Erro" }
  }
}

export async function toggleSubtask(subtaskId: string) {
  try {
    const user = await getUser()
    const subtask = await prisma.workTaskSubtask.findUnique({
      where: { id: subtaskId },
      include: { task: { select: { companyId: true, id: true } } },
    })
    if (!subtask || subtask.task.companyId !== user.companyId) return { success: false as const, error: "Acesso negado" }
    const updated = await prisma.workTaskSubtask.update({
      where: { id: subtaskId },
      data: { done: !subtask.done },
    })
    revalidatePath(`/tarefas/${subtask.task.id}`)
    return { success: true as const, data: updated }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Erro" }
  }
}

export async function deleteSubtask(subtaskId: string) {
  try {
    const user = await getUser()
    const subtask = await prisma.workTaskSubtask.findUnique({
      where: { id: subtaskId },
      include: { task: { select: { companyId: true, id: true } } },
    })
    if (!subtask || subtask.task.companyId !== user.companyId) return { success: false as const, error: "Acesso negado" }
    await prisma.workTaskSubtask.delete({ where: { id: subtaskId } })
    revalidatePath(`/tarefas/${subtask.task.id}`)
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Erro" }
  }
}

export async function getWorkTaskLabels() {
  try {
    const user = await getUser()
    const labels = await prisma.workTaskLabel.findMany({
      where: { companyId: user.companyId },
      orderBy: { name: "asc" },
    })
    return { success: true as const, data: labels }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Erro" }
  }
}

export async function createWorkTaskLabel(name: string, color: string) {
  try {
    const user = await getUser()
    if (!["ADMIN","MANAGER"].includes(user.role)) return { success: false as const, error: "Sem permissão" }
    const label = await prisma.workTaskLabel.create({
      data: { name, color, companyId: user.companyId },
    })
    revalidatePath("/tarefas")
    return { success: true as const, data: label }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Erro" }
  }
}

export async function getDepartments() {
  try {
    const user = await getUser()
    const depts = await prisma.department.findMany({
      where: { companyId: user.companyId, isActive: true },
      orderBy: { name: "asc" },
      include: { _count: { select: { userDepts: true } } },
    })
    return { success: true as const, data: depts }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Erro" }
  }
}

export async function createDepartment(name: string, description?: string) {
  try {
    const user = await getUser()
    if (user.role !== "ADMIN") return { success: false as const, error: "Somente ADMIN" }
    const dept = await prisma.department.create({
      data: { name, description: description ?? null, companyId: user.companyId },
    })
    revalidatePath("/tarefas")
    return { success: true as const, data: dept }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Erro" }
  }
}
