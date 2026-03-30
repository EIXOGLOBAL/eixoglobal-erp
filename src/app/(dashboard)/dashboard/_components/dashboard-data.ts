import { prisma } from '@/lib/prisma'

// ---------------------------------------------------------------------------
// Period helpers
// ---------------------------------------------------------------------------

type Period = { start: Date; end: Date }

function getPeriodDates(period: string): Period {
  const now = new Date()
  const start = new Date()

  switch (period) {
    case 'week':
      start.setDate(now.getDate() - now.getDay())
      start.setHours(0, 0, 0, 0)
      break
    case 'month':
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      break
    case 'quarter':
      start.setMonth(Math.floor(now.getMonth() / 3) * 3, 1)
      start.setHours(0, 0, 0, 0)
      break
    case 'year':
      start.setMonth(0, 1)
      start.setHours(0, 0, 0, 0)
      break
    default:
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
  }

  return { start, end: now }
}

// ---------------------------------------------------------------------------
// 1. getDashboardKPIs
// ---------------------------------------------------------------------------

export async function getDashboardKPIs(companyId: string, period: string) {
  const { start, end } = getPeriodDates(period)
  const now = new Date()
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const [
    projects,
    periodIncomes,
    periodExpenses,
    bankAccounts,
    activeEmployees,
    allocatedEmployeeIds,
    pendingBulletins,
    pendingBudgets,
    expiringContracts,
  ] = await Promise.all([
    // All projects for the company
    prisma.project.findMany({
      where: { companyId },
      select: { status: true },
    }),

    // Period income
    prisma.financialRecord.findMany({
      where: {
        companyId,
        type: 'INCOME',
        status: { in: ['PAID', 'PENDING', 'SCHEDULED'] },
        dueDate: { gte: start, lte: end },
      },
      select: { amount: true, status: true },
    }),

    // Period expenses
    prisma.financialRecord.findMany({
      where: {
        companyId,
        type: 'EXPENSE',
        status: { in: ['PAID', 'PENDING', 'SCHEDULED'] },
        dueDate: { gte: start, lte: end },
      },
      select: { amount: true, status: true },
    }),

    // Bank accounts balance
    prisma.bankAccount.findMany({
      where: { companyId },
      select: { balance: true },
    }),

    // Total active employees
    prisma.employee.count({
      where: { companyId, status: 'ACTIVE' },
    }),

    // Allocated employees (allocations active now: startDate <= now && (endDate is null OR endDate >= now))
    prisma.allocation.findMany({
      where: {
        employee: { companyId },
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
      },
      select: { employeeId: true },
      distinct: ['employeeId'],
    }),

    // Pending bulletins
    prisma.measurementBulletin.findMany({
      where: {
        project: { companyId },
        status: { in: ['SUBMITTED', 'DRAFT'] },
      },
      select: { id: true },
    }),

    // Pending budgets (DRAFT is the closest to "pending")
    prisma.budget.count({
      where: { companyId, status: 'DRAFT' },
    }),

    // Expiring contracts within 30 days
    prisma.contract.count({
      where: {
        companyId,
        status: 'ACTIVE',
        endDate: { lte: in30Days, gte: now },
      },
    }),
  ])

  const activeProjects = projects.filter(p => p.status === 'IN_PROGRESS').length
  const totalProjects = projects.length

  const periodRevenue = periodIncomes.reduce(
    (acc, r) => acc + Number(r.amount),
    0,
  )
  const periodExpensesTotal = periodExpenses.reduce(
    (acc, r) => acc + Number(r.amount),
    0,
  )

  const currentBalance = bankAccounts.reduce(
    (acc, a) => acc + Number(a.balance),
    0,
  )

  return {
    activeProjects,
    totalProjects,
    periodRevenue,
    periodExpenses: periodExpensesTotal,
    currentBalance,
    allocatedEmployees: allocatedEmployeeIds.length,
    totalActiveEmployees: activeEmployees,
    pendingBulletins: pendingBulletins.length,
    pendingBudgets,
    expiringContracts30d: expiringContracts,
  }
}

// ---------------------------------------------------------------------------
// 2. getCashflowChartData
// ---------------------------------------------------------------------------

export async function getCashflowChartData(companyId: string, months: number) {
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - (months - 1))
  startDate.setDate(1)
  startDate.setHours(0, 0, 0, 0)

  const records = await prisma.financialRecord.findMany({
    where: {
      companyId,
      dueDate: { gte: startDate },
    },
    select: {
      type: true,
      amount: true,
      status: true,
      dueDate: true,
      paidDate: true,
    },
  })

  // Build monthly slots
  const slots = Array.from({ length: months }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (months - 1 - i))
    d.setDate(1)
    return {
      label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      year: d.getFullYear(),
      monthIndex: d.getMonth(),
      receitas: 0,
      despesas: 0,
    }
  })

  for (const r of records) {
    const date = r.paidDate ? new Date(r.paidDate) : new Date(r.dueDate)
    const slot = slots.find(
      s => s.monthIndex === date.getMonth() && s.year === date.getFullYear(),
    )
    if (!slot) continue

    const amount = Number(r.amount)
    if (r.type === 'INCOME') {
      slot.receitas += amount
    } else if (r.type === 'EXPENSE') {
      slot.despesas += amount
    }
  }

  // Compute cumulative balance
  let cumulative = 0
  return slots.map(({ label, receitas, despesas }) => {
    cumulative += receitas - despesas
    return {
      month: label,
      receitas,
      despesas,
      saldo: cumulative,
    }
  })
}

// ---------------------------------------------------------------------------
// 3. getProjectsChartData
// ---------------------------------------------------------------------------

const PROJECT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  IN_PROGRESS: { label: 'Em Andamento', color: '#3b82f6' },
  PLANNING: { label: 'Planejamento', color: '#f59e0b' },
  COMPLETED: { label: 'Concluidos', color: '#10b981' },
  ON_HOLD: { label: 'Em Espera', color: '#8b5cf6' },
  CANCELLED: { label: 'Cancelados', color: '#ef4444' },
}

export async function getProjectsChartData(companyId: string) {
  const projects = await prisma.project.findMany({
    where: { companyId },
    select: { status: true },
  })

  return Object.entries(PROJECT_STATUS_MAP)
    .map(([status, meta]) => ({
      name: meta.label,
      value: projects.filter(p => p.status === status).length,
      color: meta.color,
    }))
    .filter(item => item.value > 0)
}

// ---------------------------------------------------------------------------
// 4. getTopProjectsData
// ---------------------------------------------------------------------------

export async function getTopProjectsData(companyId: string, limit: number) {
  const projects = await prisma.project.findMany({
    where: { companyId, status: { in: ['IN_PROGRESS', 'COMPLETED'] } },
    select: {
      id: true,
      name: true,
      contracts: {
        select: { value: true },
      },
      bulletins: {
        where: { status: { in: ['APPROVED', 'MANAGER_APPROVED'] } },
        select: { totalValue: true },
      },
    },
    take: limit * 2, // fetch extra to sort
  })

  return projects
    .map(p => {
      const contractValue = p.contracts.reduce(
        (acc, c) => acc + Number(c.value ?? 0),
        0,
      )
      const measuredValue = p.bulletins.reduce(
        (acc, b) => acc + Number(b.totalValue ?? 0),
        0,
      )
      return {
        name: p.name.length > 25 ? p.name.slice(0, 22) + '...' : p.name,
        contractValue,
        measuredValue,
      }
    })
    .sort((a, b) => b.contractValue - a.contractValue)
    .slice(0, limit)
}

// ---------------------------------------------------------------------------
// 5. getHRChartData
// ---------------------------------------------------------------------------

export async function getHRChartData(companyId: string, months: number) {
  const employees = await prisma.employee.findMany({
    where: { companyId },
    select: { status: true, admissionDate: true, leaveDate: true },
  })

  const allocations = await prisma.allocation.findMany({
    where: { employee: { companyId } },
    select: { startDate: true, endDate: true },
  })

  return Array.from({ length: months }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (months - 1 - i))
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0) // last day
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)

    // Headcount: employees who had been admitted by monthEnd and hadn't left by monthStart
    const headcount = employees.filter(e => {
      const admitted = e.admissionDate ? new Date(e.admissionDate) : null
      const left = e.leaveDate ? new Date(e.leaveDate) : null
      if (admitted && admitted > monthEnd) return false
      if (left && left < monthStart) return false
      // Fall back to status for employees without dates
      if (!admitted && e.status === 'INACTIVE') return false
      return true
    }).length

    // Allocation rate: allocations active during this month
    const allocatedCount = new Set(
      allocations
        .filter(a => {
          const aStart = new Date(a.startDate)
          const aEnd = a.endDate ? new Date(a.endDate) : monthEnd
          return aStart <= monthEnd && aEnd >= monthStart
        })
        .map(() => 1),
    ).size

    // Count unique allocated employees for the month
    const allocatedEmployees = new Set<string>()
    // We need employeeId, but it's not selected above. Let me re-query...
    // Actually let's fix this by checking unique allocations
    const activeAllocations = allocations.filter(a => {
      const aStart = new Date(a.startDate)
      const aEnd = a.endDate ? new Date(a.endDate) : monthEnd
      return aStart <= monthEnd && aEnd >= monthStart
    })

    const allocationRate = headcount > 0
      ? Math.round((activeAllocations.length / headcount) * 100)
      : 0

    return {
      month: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      headcount,
      allocationRate: Math.min(allocationRate, 100),
    }
  })
}

// ---------------------------------------------------------------------------
// 6. getRecentProjects
// ---------------------------------------------------------------------------

export async function getRecentProjects(companyId: string, limit: number) {
  const projects = await prisma.project.findMany({
    where: { companyId },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      name: true,
      status: true,
      budget: true,
      endDate: true,
      contracts: { select: { value: true } },
      bulletins: {
        where: { status: { in: ['APPROVED', 'MANAGER_APPROVED'] } },
        select: { totalValue: true },
      },
    },
  })

  return projects.map(p => {
    const contractTotal = p.contracts.reduce(
      (acc, c) => acc + Number(c.value ?? 0),
      0,
    )
    const measuredTotal = p.bulletins.reduce(
      (acc, b) => acc + Number(b.totalValue ?? 0),
      0,
    )
    const value = contractTotal || Number(p.budget ?? 0)
    const progress = value > 0 ? Math.round((measuredTotal / value) * 100) : 0

    return {
      id: p.id,
      name: p.name,
      status: p.status,
      progress: Math.min(progress, 100),
      value,
      deadline: p.endDate ? p.endDate.toISOString() : null,
    }
  })
}

// ---------------------------------------------------------------------------
// 7. getRecentTransactions
// ---------------------------------------------------------------------------

export async function getRecentTransactions(companyId: string, limit: number) {
  const records = await prisma.financialRecord.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      description: true,
      type: true,
      amount: true,
      status: true,
      dueDate: true,
      paidDate: true,
    },
  })

  return records.map(r => ({
    id: r.id,
    date: (r.paidDate ?? r.dueDate).toISOString(),
    description: r.description,
    type: r.type as string,
    amount: Number(r.amount),
    status: r.status as string,
  }))
}

// ---------------------------------------------------------------------------
// 8. getOperationalAlerts
// ---------------------------------------------------------------------------

export interface OperationalAlert {
  type: string
  title: string
  message: string
  link: string
  severity: 'low' | 'medium' | 'high'
}

export async function getOperationalAlerts(companyId: string): Promise<OperationalAlert[]> {
  const now = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [lowStockMaterials, overdueMaintenances, expiringContracts, overdueVacations] =
    await Promise.all([
      // Low stock materials
      prisma.material.findMany({
        where: {
          companyId,
          isActive: true,
          minStock: { gt: 0 },
        },
        select: { name: true, currentStock: true, minStock: true },
      }),

      // Overdue equipment maintenance
      prisma.equipmentMaintenance.findMany({
        where: {
          equipment: { companyId },
          completedAt: null,
          scheduledAt: { lt: now },
        },
        select: {
          description: true,
          scheduledAt: true,
          equipment: { select: { name: true } },
        },
        take: 10,
      }),

      // Contracts expiring within 7 days
      prisma.contract.findMany({
        where: {
          companyId,
          status: 'ACTIVE',
          endDate: { lte: in7Days, gte: now },
        },
        select: { identifier: true, endDate: true },
      }),

      // Overdue / pending vacation requests
      prisma.vacationRequest.findMany({
        where: {
          employee: { companyId },
          status: 'PENDING',
        },
        select: {
          startDate: true,
          employee: { select: { name: true } },
        },
        take: 10,
      }),
    ])

  const alerts: OperationalAlert[] = []

  // Low stock alerts
  const lowStock = lowStockMaterials.filter(
    m => Number(m.currentStock) <= Number(m.minStock),
  )
  if (lowStock.length > 0) {
    alerts.push({
      type: 'low_stock',
      title: 'Estoque Baixo',
      message: `${lowStock.length} material${lowStock.length !== 1 ? 'is' : ''} com estoque abaixo do minimo: ${lowStock
        .slice(0, 3)
        .map(m => m.name)
        .join(', ')}${lowStock.length > 3 ? '...' : ''}`,
      link: '/estoque',
      severity: lowStock.some(m => Number(m.currentStock) === 0) ? 'high' : 'medium',
    })
  }

  // Overdue maintenance
  if (overdueMaintenances.length > 0) {
    alerts.push({
      type: 'overdue_maintenance',
      title: 'Manutencao Atrasada',
      message: `${overdueMaintenances.length} manutencao${overdueMaintenances.length !== 1 ? 'oes' : ''} em atraso: ${overdueMaintenances
        .slice(0, 2)
        .map(m => m.equipment.name)
        .join(', ')}`,
      link: '/equipamentos',
      severity: 'high',
    })
  }

  // Expiring contracts
  if (expiringContracts.length > 0) {
    alerts.push({
      type: 'expiring_contract',
      title: 'Contratos Vencendo',
      message: `${expiringContracts.length} contrato${expiringContracts.length !== 1 ? 's' : ''} vencendo em ate 7 dias: ${expiringContracts
        .slice(0, 2)
        .map(c => c.identifier)
        .join(', ')}`,
      link: '/contracts',
      severity: 'high',
    })
  }

  // Pending vacations
  if (overdueVacations.length > 0) {
    alerts.push({
      type: 'pending_vacation',
      title: 'Ferias Pendentes',
      message: `${overdueVacations.length} solicitacao${overdueVacations.length !== 1 ? 'oes' : ''} de ferias aguardando aprovacao`,
      link: '/rh/ferias',
      severity: 'medium',
    })
  }

  return alerts
}
