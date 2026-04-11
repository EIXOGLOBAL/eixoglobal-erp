'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { toNumber } from '@/lib/formatters'
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'cost-center-budget' })

// ─── Types ───────────────────────────────────────────────────────────────────

export type BudgetStatus = 'ok' | 'warning' | 'exceeded'

export type CostCenterBudgetReportItem = {
  costCenter: {
    id: string
    name: string
    code: string
    type: string
    parentId: string | null
  }
  budgeted: number
  realized: number
  remaining: number
  burnRate: number
  status: BudgetStatus
}

export type CostCenterHierarchyNode = {
  id: string
  code: string
  name: string
  type: string
  isActive: boolean
  parentId: string | null
  budgeted: number
  realized: number
  burnRate: number
  status: BudgetStatus
  children: CostCenterHierarchyNode[]
}

// ─── setCostCenterBudget ─────────────────────────────────────────────────────

export async function setCostCenterBudget(
  costCenterId: string,
  year: number,
  amount: number,
  month?: number | null,
  notes?: string
) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return { success: false, error: 'Sessão expirada. Faça login novamente.' }
    }

    const userId = session.user.id as string
    const companyId = session.user.companyId as string

    // Verify cost center belongs to company
    const costCenter = await prisma.costCenter.findFirst({
      where: { id: costCenterId, companyId },
    })

    if (!costCenter) {
      return { success: false, error: 'Centro de custo não encontrado.' }
    }

    const monthValue = month ?? null

    // Upsert: check if exists (use findFirst because month can be null)
    const existing = await prisma.costCenterBudget.findFirst({
      where: {
        costCenterId,
        year,
        month: monthValue,
      },
    })

    let budget
    if (existing) {
      budget = await prisma.costCenterBudget.update({
        where: { id: existing.id },
        data: {
          budgetedAmount: amount,
          notes: notes ?? null,
        },
      })

      await logAudit({
        action: 'UPDATE',
        entity: 'CostCenterBudget',
        entityId: budget.id,
        entityName: `${costCenter.code} - ${year}${monthValue ? `/${String(monthValue).padStart(2, '0')}` : ' (anual)'}`,
        userId,
        companyId,
        oldData: { budgetedAmount: existing.budgetedAmount, notes: existing.notes },
        newData: { budgetedAmount: amount, notes },
      })
    } else {
      budget = await prisma.costCenterBudget.create({
        data: {
          costCenterId,
          year,
          month: monthValue,
          budgetedAmount: amount,
          notes: notes ?? null,
          createdBy: userId,
        },
      })

      await logAudit({
        action: 'CREATE',
        entity: 'CostCenterBudget',
        entityId: budget.id,
        entityName: `${costCenter.code} - ${year}${monthValue ? `/${String(monthValue).padStart(2, '0')}` : ' (anual)'}`,
        userId,
        companyId,
        newData: { budgetedAmount: amount, notes },
      })
    }

    revalidatePath('/financeiro/centros-de-custo')
    return { success: true, data: budget }
  } catch (error) {
    log.error({ err: error }, 'Erro ao definir orçamento')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao definir orçamento do centro de custo.',
    }
  }
}

// ─── deleteCostCenterBudget ──────────────────────────────────────────────────

export async function deleteCostCenterBudget(
  costCenterId: string,
  year: number,
  month?: number | null
) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return { success: false, error: 'Sessão expirada. Faça login novamente.' }
    }

    const userId = session.user.id as string
    const companyId = session.user.companyId as string

    const monthValue = month ?? null

    // Verify cost center belongs to company
    const costCenter = await prisma.costCenter.findFirst({
      where: { id: costCenterId, companyId },
      select: { id: true, code: true },
    })

    if (!costCenter) {
      return { success: false, error: 'Centro de custo não encontrado.' }
    }

    const existing = await prisma.costCenterBudget.findFirst({
      where: {
        costCenterId,
        year,
        month: monthValue,
      },
    })

    if (!existing) {
      return { success: false, error: 'Orçamento não encontrado.' }
    }

    await prisma.costCenterBudget.delete({
      where: { id: existing.id },
    })

    await logAudit({
      action: 'DELETE',
      entity: 'CostCenterBudget',
      entityId: existing.id,
      entityName: `${costCenter.code} - ${year}${monthValue ? `/${String(monthValue).padStart(2, '0')}` : ' (anual)'}`,
      userId,
      companyId,
      oldData: { budgetedAmount: existing.budgetedAmount, notes: existing.notes },
    })

    revalidatePath('/financeiro/centros-de-custo')
    return { success: true }
  } catch (error) {
    log.error({ err: error }, 'Erro ao excluir orçamento')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir orçamento.',
    }
  }
}

// ─── getCostCenterBudgetReport ───────────────────────────────────────────────

function computeStatus(burnRate: number): BudgetStatus {
  if (burnRate > 100) return 'exceeded'
  if (burnRate > 80) return 'warning'
  return 'ok'
}

export async function getCostCenterBudgetReport(companyId: string, year: number) {
  try {
    const costCenters = await prisma.costCenter.findMany({
      where: { companyId, isActive: true },
      include: {
        budgets: {
          where: { year },
        },
        financialRecords: {
          where: {
            type: 'EXPENSE',
            status: { in: ['PAID', 'PENDING'] },
            dueDate: {
              gte: new Date(`${year}-01-01`),
              lt: new Date(`${year + 1}-01-01`),
            },
          },
          select: { amount: true },
        },
      },
      orderBy: { code: 'asc' },
    })

    const report: CostCenterBudgetReportItem[] = costCenters
      .filter((cc) => cc.budgets.length > 0)
      .map((cc) => {
        const budgeted = cc.budgets.reduce((sum, b) => sum + toNumber(b.budgetedAmount), 0)
        const realized = cc.financialRecords.reduce(
          (sum, r) => sum + toNumber(r.amount),
          0
        )
        const remaining = budgeted - realized
        const burnRate = budgeted > 0 ? (realized / budgeted) * 100 : 0

        return {
          costCenter: {
            id: cc.id,
            name: cc.name,
            code: cc.code,
            type: cc.type,
            parentId: cc.parentId,
          },
          budgeted,
          realized,
          remaining,
          burnRate: Math.round(burnRate * 100) / 100,
          status: computeStatus(burnRate),
        }
      })

    return { success: true, data: report }
  } catch (error) {
    log.error({ err: error }, 'Erro ao gerar relatório de orçamento')
    return { success: false, data: [] as CostCenterBudgetReportItem[], error: 'Erro ao gerar relatório.' }
  }
}

// ─── getCostCenterHierarchy ──────────────────────────────────────────────────

export async function getCostCenterHierarchy(companyId: string, year?: number) {
  try {
    const targetYear = year ?? new Date().getFullYear()

    const costCenters = await prisma.costCenter.findMany({
      where: { companyId, isActive: true },
      include: {
        budgets: {
          where: { year: targetYear },
        },
        financialRecords: {
          where: {
            type: 'EXPENSE',
            status: { in: ['PAID', 'PENDING'] },
            dueDate: {
              gte: new Date(`${targetYear}-01-01`),
              lt: new Date(`${targetYear + 1}-01-01`),
            },
          },
          select: { amount: true },
        },
      },
      orderBy: { code: 'asc' },
    })

    // Build flat nodes
    const nodesMap = new Map<string, CostCenterHierarchyNode>()
    for (const cc of costCenters) {
      const budgeted = cc.budgets.reduce((sum, b) => sum + toNumber(b.budgetedAmount), 0)
      const realized = cc.financialRecords.reduce(
        (sum, r) => sum + toNumber(r.amount),
        0
      )
      const burnRate = budgeted > 0 ? (realized / budgeted) * 100 : 0

      nodesMap.set(cc.id, {
        id: cc.id,
        code: cc.code,
        name: cc.name,
        type: cc.type,
        isActive: cc.isActive,
        parentId: cc.parentId,
        budgeted,
        realized,
        burnRate: Math.round(burnRate * 100) / 100,
        status: computeStatus(burnRate),
        children: [],
      })
    }

    // Build tree
    const roots: CostCenterHierarchyNode[] = []
    for (const node of nodesMap.values()) {
      if (node.parentId && nodesMap.has(node.parentId)) {
        const parent = nodesMap.get(node.parentId)!
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    }

    return { success: true, data: roots }
  } catch (error) {
    log.error({ err: error }, 'Erro ao buscar hierarquia')
    return { success: false, data: [] as CostCenterHierarchyNode[], error: 'Erro ao buscar hierarquia.' }
  }
}

// ─── getRecentFinancialRecords ───────────────────────────────────────────────

export async function getRecentFinancialRecords(costCenterId: string) {
  try {
    const records = await prisma.financialRecord.findMany({
      where: { costCenterId },
      orderBy: { dueDate: 'desc' },
      take: 10,
      select: {
        id: true,
        description: true,
        amount: true,
        type: true,
        status: true,
        dueDate: true,
        paidDate: true,
      },
    })

    return {
      success: true,
      data: records.map((r) => ({
        ...r,
        amount: toNumber(r.amount),
        dueDate: r.dueDate.toISOString(),
        paidDate: r.paidDate?.toISOString() ?? null,
      })),
    }
  } catch (error) {
    log.error({ err: error }, 'Erro ao buscar registros financeiros')
    return { success: false, data: [], error: 'Erro ao buscar registros.' }
  }
}
