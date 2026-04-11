'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'dashboard' })

// ============================================================================
// TYPES
// ============================================================================

export interface FinancialSummaryData {
  monthRevenue: number
  monthExpenses: number
  balance: number
  revenueTrend: number // percentual vs mes anterior
  expenseTrend: number
  monthlyBars: { label: string; revenue: number; expense: number }[]
}

export interface ActiveProjectData {
  id: string
  name: string
  code: string | null
  status: string
  progress: number // 0..100
  tasksTotal: number
  tasksDone: number
}

export interface PendingApprovalData {
  id: string
  entityType: string
  entityId: string
  status: string
  requestedByName: string
  createdAt: Date
}

export interface RecentActivityData {
  id: string
  action: string
  entity: string | null
  entityName: string | null
  userName: string | null
  userInitials: string
  createdAt: Date
  details: string | null
}

export interface TeamMemberData {
  id: string
  name: string | null
  role: string
  avatarUrl: string | null
  initials: string
  lastLoginAt: Date | null
  isOnline: boolean
}

export interface DashboardData {
  financial: FinancialSummaryData | null
  activeProjects: ActiveProjectData[]
  activeProjectsCount: number
  pendingApprovals: PendingApprovalData[]
  pendingApprovalsCount: number
  recentActivity: RecentActivityData[]
  teamMembers: TeamMemberData[]
  teamActiveCount: number
}

// ============================================================================
// HELPERS
// ============================================================================

function getInitials(name: string | null | undefined): string {
  if (!name) return '??'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return (parts[0]?.substring(0, 2) || '??').toUpperCase()
}

function safeNumber(val: unknown): number {
  return typeof val === 'number' ? val : Number(val) || 0
}

// ============================================================================
// MAIN: getDashboardData
// ============================================================================

export async function getDashboardData(userId: string, companyId: string): Promise<{ success: boolean; data: DashboardData | null; error?: string }> {
  try {
    const session = await getSession()
    if (!session?.user?.id) return { success: false, data: null, error: 'Nao autenticado' }

    const user = session.user as {
      id: string
      role: string
      companyId: string
      canManageFinancial?: boolean
      moduleFinancial?: boolean
      moduleProjects?: boolean
      moduleEmployees?: boolean
    }

    const isAdmin = user.role === 'ADMIN'
    const isManager = user.role === 'MANAGER'
    const hasFinancial = isAdmin || user.canManageFinancial || user.moduleFinancial
    const hasProjects = isAdmin || isManager || user.moduleProjects
    const hasTeam = isAdmin || isManager

    // Parallel fetch everything the user has permission to see
    const [
      financialResult,
      projectsResult,
      approvalsResult,
      activityResult,
      teamResult,
    ] = await Promise.allSettled([
      hasFinancial ? fetchFinancialSummary(companyId) : Promise.resolve(null),
      hasProjects ? fetchActiveProjects(companyId) : Promise.resolve({ projects: [], count: 0 }),
      fetchPendingApprovals(companyId),
      fetchRecentActivity(companyId),
      hasTeam ? fetchTeamOverview(companyId) : Promise.resolve({ members: [], activeCount: 0 }),
    ])

    const financial = financialResult.status === 'fulfilled' ? financialResult.value : null
    const projects = projectsResult.status === 'fulfilled' ? projectsResult.value : { projects: [], count: 0 }
    const approvals = approvalsResult.status === 'fulfilled' ? approvalsResult.value : { items: [], count: 0 }
    const activity = activityResult.status === 'fulfilled' ? activityResult.value : []
    const team = teamResult.status === 'fulfilled' ? teamResult.value : { members: [], activeCount: 0 }

    return {
      success: true,
      data: {
        financial,
        activeProjects: projects?.projects ?? [],
        activeProjectsCount: projects?.count ?? 0,
        pendingApprovals: approvals?.items ?? [],
        pendingApprovalsCount: approvals?.count ?? 0,
        recentActivity: activity ?? [],
        teamMembers: team?.members ?? [],
        teamActiveCount: team?.activeCount ?? 0,
      },
    }
  } catch (error) {
    log.error({ err: error }, '[dashboard-actions] getDashboardData error')
    return { success: false, data: null, error: 'Erro ao carregar dados do dashboard' }
  }
}

// ============================================================================
// FINANCIAL SUMMARY
// ============================================================================

async function fetchFinancialSummary(companyId: string): Promise<FinancialSummaryData> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

  const [currentRecords, prevRecords, last6MonthsRecords] = await Promise.all([
    prisma.financialRecord.findMany({
      where: { companyId, dueDate: { gte: startOfMonth, lte: endOfMonth } },
      select: { type: true, amount: true, status: true },
    }),
    prisma.financialRecord.findMany({
      where: { companyId, dueDate: { gte: startOfPrevMonth, lte: endOfPrevMonth } },
      select: { type: true, amount: true, status: true },
    }),
    prisma.financialRecord.findMany({
      where: {
        companyId,
        dueDate: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1), lte: endOfMonth },
      },
      select: { type: true, amount: true, dueDate: true },
    }),
  ])

  const sumByType = (records: typeof currentRecords, type: string) =>
    records.filter(r => r.type === type).reduce((s, r) => s + safeNumber(r.amount), 0)

  const monthRevenue = sumByType(currentRecords, 'INCOME')
  const monthExpenses = sumByType(currentRecords, 'EXPENSE')
  const prevRevenue = sumByType(prevRecords, 'INCOME')
  const prevExpenses = sumByType(prevRecords, 'EXPENSE')

  const revenueTrend = prevRevenue > 0 ? ((monthRevenue - prevRevenue) / prevRevenue) * 100 : 0
  const expenseTrend = prevExpenses > 0 ? ((monthExpenses - prevExpenses) / prevExpenses) * 100 : 0

  // Build monthly bars for last 6 months
  const monthlyBars: FinancialSummaryData['monthlyBars'] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
    const monthRecords = last6MonthsRecords.filter(r => {
      const rd = new Date(r.dueDate)
      return rd >= d && rd <= monthEnd
    })
    const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    monthlyBars.push({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      revenue: monthRecords.filter(r => r.type === 'INCOME').reduce((s, r) => s + safeNumber(r.amount), 0),
      expense: monthRecords.filter(r => r.type === 'EXPENSE').reduce((s, r) => s + safeNumber(r.amount), 0),
    })
  }

  return {
    monthRevenue,
    monthExpenses,
    balance: monthRevenue - monthExpenses,
    revenueTrend: Math.round(revenueTrend * 10) / 10,
    expenseTrend: Math.round(expenseTrend * 10) / 10,
    monthlyBars,
  }
}

// ============================================================================
// ACTIVE PROJECTS
// ============================================================================

async function fetchActiveProjects(companyId: string): Promise<{ projects: ActiveProjectData[]; count: number }> {
  const activeStatuses = ['IN_PROGRESS', 'PLANNING', 'BIDDING', 'AWARDED']

  const [projects, count] = await Promise.all([
    prisma.project.findMany({
      where: { companyId, status: { in: activeStatuses as any[] } },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        _count: { select: { tasks: true } },
        tasks: { select: { percentDone: true, status: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    prisma.project.count({ where: { companyId, status: { in: activeStatuses as any[] } } }),
  ])

  const mapped: ActiveProjectData[] = projects.map(p => {
    const tasksTotal = p._count.tasks
    const tasksDone = p.tasks.filter(t => t.status === 'COMPLETED').length
    const progress = tasksTotal > 0
      ? Math.round(p.tasks.reduce((s, t) => s + safeNumber(t.percentDone), 0) / tasksTotal)
      : 0

    return {
      id: p.id,
      name: p.name,
      code: p.code,
      status: p.status,
      progress,
      tasksTotal,
      tasksDone,
    }
  })

  return { projects: mapped, count }
}

// ============================================================================
// PENDING APPROVALS
// ============================================================================

async function fetchPendingApprovals(companyId: string): Promise<{ items: PendingApprovalData[]; count: number }> {
  const [requests, count] = await Promise.all([
    prisma.approvalRequest.findMany({
      where: { companyId, status: 'PENDING' },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        status: true,
        createdAt: true,
        requestedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.approvalRequest.count({ where: { companyId, status: 'PENDING' } }),
  ])

  return {
    items: requests.map(r => ({
      id: r.id,
      entityType: r.entityType,
      entityId: r.entityId,
      status: r.status,
      requestedByName: r.requestedBy?.name || 'Desconhecido',
      createdAt: r.createdAt,
    })),
    count,
  }
}

// ============================================================================
// RECENT ACTIVITY (Audit Log)
// ============================================================================

async function fetchRecentActivity(companyId: string): Promise<RecentActivityData[]> {
  const logs = await prisma.auditLog.findMany({
    where: { companyId },
    select: {
      id: true,
      action: true,
      entity: true,
      entityName: true,
      details: true,
      createdAt: true,
      user: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  return logs.map(l => ({
    id: l.id,
    action: l.action,
    entity: l.entity,
    entityName: l.entityName,
    userName: l.user?.name ?? null,
    userInitials: getInitials(l.user?.name),
    createdAt: l.createdAt,
    details: l.details,
  }))
}

// ============================================================================
// TEAM OVERVIEW (ADMIN/MANAGER only)
// ============================================================================

async function fetchTeamOverview(companyId: string): Promise<{ members: TeamMemberData[]; activeCount: number }> {
  const onlineThreshold = new Date(Date.now() - 15 * 60 * 1000) // 15 min

  const users = await prisma.user.findMany({
    where: { companyId, isActive: true, isBlocked: false },
    select: {
      id: true,
      name: true,
      role: true,
      avatarUrl: true,
      lastLoginAt: true,
    },
    orderBy: { lastLoginAt: 'desc' },
    take: 20,
  })

  const members: TeamMemberData[] = users.map(u => ({
    id: u.id,
    name: u.name,
    role: u.role,
    avatarUrl: u.avatarUrl,
    initials: getInitials(u.name),
    lastLoginAt: u.lastLoginAt,
    isOnline: u.lastLoginAt ? u.lastLoginAt >= onlineThreshold : false,
  }))

  const activeCount = members.filter(m => m.isOnline).length

  return { members, activeCount }
}
