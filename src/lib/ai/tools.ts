/**
 * AI Tools — funcoes de dados para as principais entidades do ERP.
 *
 * Cada funcao recebe o Prisma client e parametros, retornando dados
 * formatados para uso como contexto nas chamadas de IA.
 */

import type { PrismaClient } from '@/lib/generated/prisma/client'

// ============================================================================
// getFinancialSummary
// ============================================================================

export async function getFinancialSummary(
  prisma: PrismaClient,
  companyId: string,
  startDate?: string,
  endDate?: string
) {
  const end = endDate ? new Date(endDate) : new Date()
  const start = startDate
    ? new Date(startDate)
    : new Date(end.getTime() - 30 * 24 * 3600000)

  const records = await prisma.financialRecord.findMany({
    where: {
      companyId,
      createdAt: { gte: start, lte: end },
    },
    select: { amount: true, type: true, status: true, category: true },
  })

  const income = records
    .filter((r) => r.type === 'INCOME')
    .reduce((sum, r) => sum + Number(r.amount), 0)

  const expense = records
    .filter((r) => r.type === 'EXPENSE')
    .reduce((sum, r) => sum + Number(r.amount), 0)

  const pending = records.filter((r) => r.status === 'PENDING').length

  return {
    periodo: { inicio: start.toISOString(), fim: end.toISOString() },
    receitas: income,
    despesas: expense,
    saldo: income - expense,
    totalRegistros: records.length,
    pendentes: pending,
  }
}

// ============================================================================
// getProjectStatus
// ============================================================================

export async function getProjectStatus(
  prisma: PrismaClient,
  companyId: string,
  statusFilter?: string
) {
  const where: Record<string, unknown> = { companyId }
  if (statusFilter) where.status = statusFilter

  const projects = await prisma.project.findMany({
    where: where as Parameters<typeof prisma.project.findMany>[0]['where'],
    select: {
      id: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      _count: { select: { allocations: true, measurements: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  })

  return {
    total: projects.length,
    projetos: projects.map((p) => ({
      id: p.id,
      nome: p.name,
      status: p.status,
      inicio: p.startDate?.toISOString() ?? null,
      fim: p.endDate?.toISOString() ?? null,
      alocacoes: p._count.allocations,
      medicoes: p._count.measurements,
    })),
  }
}

// ============================================================================
// getEmployeeInfo
// ============================================================================

export async function getEmployeeInfo(
  prisma: PrismaClient,
  companyId: string,
  search?: string,
  statusFilter?: string
) {
  const where: Record<string, unknown> = { companyId }
  if (statusFilter) where.status = statusFilter
  if (search) where.name = { contains: search, mode: 'insensitive' }

  const employees = await prisma.employee.findMany({
    where: where as Parameters<typeof prisma.employee.findMany>[0]['where'],
    select: {
      id: true,
      name: true,
      jobTitle: true,
      department: true,
      status: true,
      admissionDate: true,
      _count: { select: { allocations: true } },
    },
    orderBy: { name: 'asc' },
    take: 30,
  })

  return {
    total: employees.length,
    colaboradores: employees.map((e) => ({
      id: e.id,
      nome: e.name,
      cargo: e.jobTitle,
      departamento: e.department,
      status: e.status,
      admissao: e.admissionDate?.toISOString() ?? null,
      alocacoes: e._count.allocations,
    })),
  }
}

// ============================================================================
// getSupplyStock
// ============================================================================

export async function getSupplyStock(
  prisma: PrismaClient,
  companyId: string,
  search?: string,
  lowStockOnly?: boolean
) {
  const where: Record<string, unknown> = { companyId }
  if (search) where.name = { contains: search, mode: 'insensitive' }

  const materials = await prisma.material.findMany({
    where: where as Parameters<typeof prisma.material.findMany>[0]['where'],
    select: {
      id: true,
      name: true,
      unit: true,
      currentStock: true,
      minStock: true,
      category: true,
    },
    orderBy: { name: 'asc' },
    take: 50,
  })

  const filtered = lowStockOnly
    ? materials.filter(
        (m) =>
          m.minStock !== null &&
          m.currentStock !== null &&
          Number(m.currentStock) <= Number(m.minStock)
      )
    : materials

  return {
    total: filtered.length,
    materiais: filtered.map((m) => ({
      id: m.id,
      nome: m.name,
      unidade: m.unit,
      estoqueAtual: Number(m.currentStock ?? 0),
      estoqueMinimo: Number(m.minStock ?? 0),
      categoria: m.category,
      baixo: m.minStock !== null && Number(m.currentStock ?? 0) <= Number(m.minStock),
    })),
  }
}

// ============================================================================
// createTask — cria WorkTask
// ============================================================================

export async function createTask(
  prisma: PrismaClient,
  data: {
    title: string
    description?: string
    priority?: string
    projectId?: string
    companyId: string
    createdById: string
  }
) {
  const task = await prisma.workTask.create({
    data: {
      title: data.title,
      description: data.description ?? '',
      priority: (data.priority ?? 'NONE') as 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
      status: 'TODO',
      ...(data.projectId ? { projectId: data.projectId } : {}),
      companyId: data.companyId,
      createdById: data.createdById,
    },
    select: { id: true, title: true, priority: true, status: true },
  })

  return {
    sucesso: true,
    tarefa: {
      id: task.id,
      titulo: task.title,
      prioridade: task.priority,
      status: task.status,
    },
  }
}

// ============================================================================
// updateProjectStatus
// ============================================================================

export async function updateProjectStatus(
  prisma: PrismaClient,
  projectId: string,
  status: string
) {
  const project = await prisma.project.update({
    where: { id: projectId },
    data: { status: status as 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED' | 'PLANNING' },
    select: { id: true, name: true, status: true },
  })

  return {
    sucesso: true,
    projeto: {
      id: project.id,
      nome: project.name,
      novoStatus: project.status,
    },
  }
}
