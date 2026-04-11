'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit-logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AdminUserListFilters = {
  status?: 'all' | 'active' | 'inactive'
  role?: string
  search?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

export type AdminUserRow = {
  id: string
  name: string | null
  username: string
  email: string | null
  role: string
  isActive: boolean
  isBlocked: boolean
  lastLoginAt: string | null
  createdAt: string
  companyName: string | null
  moduleClients: boolean
  moduleSuppliers: boolean
  moduleProjects: boolean
  moduleContracts: boolean
  moduleFinancial: boolean
  moduleBudgets: boolean
  moduleMeasurements: boolean
  modulePurchases: boolean
  moduleInventory: boolean
  moduleEquipment: boolean
  moduleRentals: boolean
  moduleEmployees: boolean
  moduleTimesheet: boolean
  moduleDocuments: boolean
  moduleQuality: boolean
  moduleSafety: boolean
  moduleDailyReports: boolean
  moduleTraining: boolean
  moduleBilling: boolean
  moduleCostCenters: boolean
}

export type AdminUserListResult = {
  users: AdminUserRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  stats: {
    total: number
    active: number
    inactive: number
    admins: number
  }
}

export type AdminUserDetail = AdminUserRow & {
  avatarUrl: string | null
  blockedAt: string | null
  blockedReason: string | null
  canDelete: boolean
  canApprove: boolean
  canManageFinancial: boolean
  canManageHR: boolean
  canManageSystem: boolean
  canViewReports: boolean
  recentAuditLogs: {
    id: string
    action: string
    entity: string | null
    entityName: string | null
    details: string | null
    createdAt: string
  }[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireAdminSession() {
  const session = await getSession()
  if (!session || !session.user) throw new Error('Nao autenticado')
  if (session.user.role !== 'ADMIN') throw new Error('Acesso restrito a administradores')
  return session
}

function serializeDate(d: Date | string | null | undefined): string | null {
  if (!d) return null
  return d instanceof Date ? d.toISOString() : d
}

// Module keys (exist in schema but may not be in generated Prisma types yet)
const MODULE_KEYS = [
  'moduleClients', 'moduleSuppliers', 'moduleProjects', 'moduleContracts',
  'moduleFinancial', 'moduleBudgets', 'moduleMeasurements', 'modulePurchases',
  'moduleInventory', 'moduleEquipment', 'moduleRentals', 'moduleEmployees',
  'moduleTimesheet', 'moduleDocuments', 'moduleQuality', 'moduleSafety',
  'moduleDailyReports', 'moduleTraining', 'moduleBilling', 'moduleCostCenters',
] as const

/** Extract module boolean flags from a user record (safe even if generated types are stale) */
function extractModules(u: Record<string, unknown>) {
  const modules: Record<string, boolean> = {}
  for (const key of MODULE_KEYS) {
    modules[key] = (u[key] as boolean) ?? false
  }
  return modules as Record<typeof MODULE_KEYS[number], boolean>
}

// ---------------------------------------------------------------------------
// getAdminUserList
// ---------------------------------------------------------------------------

export async function getAdminUserList(
  filters: AdminUserListFilters = {}
): Promise<{ success: boolean; data?: AdminUserListResult; error?: string }> {
  try {
    await requireAdminSession()

    const {
      status = 'all',
      role,
      search,
      page = 1,
      pageSize = 20,
      sortBy = 'name',
      sortDir = 'asc',
    } = filters

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (status === 'active') where.isActive = true
    if (status === 'inactive') where.isActive = false

    if (role && role !== 'all') where.role = role

    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Determine sort field
    const allowedSorts: Record<string, string> = {
      name: 'name',
      email: 'email',
      role: 'role',
      isActive: 'isActive',
      lastLoginAt: 'lastLoginAt',
      createdAt: 'createdAt',
    }
    const orderField = allowedSorts[sortBy] || 'name'
    const orderBy = { [orderField]: sortDir }

    // Fetch users without explicit select to get all DB columns including module flags
    // (the generated Prisma types may be out of sync with the schema)
    const [usersRaw, total, statsRaw] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { company: { select: { name: true } } },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
      Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ where: { isActive: false } }),
        prisma.user.count({ where: { role: 'ADMIN' } }),
      ]),
    ])

    const mapped: AdminUserRow[] = usersRaw.map((u) => {
      // Cast to Record for safe property access on module fields
      const rec = u as unknown as Record<string, unknown>
      const mods = extractModules(rec)
      return {
        id: u.id,
        name: u.name,
        username: u.username,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        isBlocked: u.isBlocked,
        lastLoginAt: serializeDate(u.lastLoginAt),
        createdAt: u.createdAt.toISOString(),
        companyName: u.company?.name ?? null,
        ...mods,
      }
    })

    return {
      success: true,
      data: {
        users: mapped,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        stats: {
          total: statsRaw[0],
          active: statsRaw[1],
          inactive: statsRaw[2],
          admins: statsRaw[3],
        },
      },
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

// ---------------------------------------------------------------------------
// getUserDetail
// ---------------------------------------------------------------------------

export async function getUserDetail(
  userId: string
): Promise<{ success: boolean; data?: AdminUserDetail; error?: string }> {
  try {
    await requireAdminSession()

    const userRaw = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: { select: { name: true } } },
    })

    if (!userRaw) return { success: false, error: 'Usuario nao encontrado' }

    const rec = userRaw as unknown as Record<string, unknown>
    const mods = extractModules(rec)

    const recentLogs = await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        action: true,
        entity: true,
        entityName: true,
        details: true,
        createdAt: true,
      },
    })

    return {
      success: true,
      data: {
        id: userRaw.id,
        name: userRaw.name,
        username: userRaw.username,
        email: userRaw.email,
        role: userRaw.role,
        isActive: userRaw.isActive,
        isBlocked: userRaw.isBlocked,
        avatarUrl: userRaw.avatarUrl,
        lastLoginAt: serializeDate(userRaw.lastLoginAt),
        createdAt: userRaw.createdAt.toISOString(),
        blockedAt: serializeDate(userRaw.blockedAt),
        blockedReason: userRaw.blockedReason,
        canDelete: userRaw.canDelete,
        canApprove: userRaw.canApprove,
        canManageFinancial: userRaw.canManageFinancial,
        canManageHR: userRaw.canManageHR,
        canManageSystem: userRaw.canManageSystem,
        canViewReports: userRaw.canViewReports,
        companyName: userRaw.company?.name ?? null,
        ...mods,
        recentAuditLogs: recentLogs.map((l) => ({
          id: l.id,
          action: l.action,
          entity: l.entity,
          entityName: l.entityName,
          details: l.details,
          createdAt: l.createdAt.toISOString(),
        })),
      },
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

// ---------------------------------------------------------------------------
// toggleUserStatus
// ---------------------------------------------------------------------------

export async function toggleUserStatus(
  userId: string
): Promise<{ success: boolean; isActive?: boolean; error?: string }> {
  try {
    const session = await requireAdminSession()

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true, name: true, username: true },
    })

    if (!user) return { success: false, error: 'Usuario nao encontrado' }

    // Prevent admin from deactivating themselves
    if (user.id === session.user?.id) {
      return { success: false, error: 'Voce nao pode desativar sua propria conta' }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: { isActive: true },
    })

    await logAudit({
      action: updated.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entity: 'User',
      entityId: userId,
      entityName: user.name || user.username,
      userId: session.user?.id,
      companyId: session.user?.companyId,
      details: `Usuario ${updated.isActive ? 'ativado' : 'desativado'} pelo admin`,
    })

    return { success: true, isActive: updated.isActive }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

// ---------------------------------------------------------------------------
// forceLogoutUser
// ---------------------------------------------------------------------------

export async function forceLogoutUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAdminSession()

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, username: true },
    })

    if (!user) return { success: false, error: 'Usuario nao encontrado' }

    // Invalidate by clearing lastLoginAt to force re-authentication
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: null },
      })
    } catch {
      // Field may not exist yet, continue
    }

    await logAudit({
      action: 'FORCE_LOGOUT',
      entity: 'User',
      entityId: userId,
      entityName: user.name || user.username,
      userId: session.user?.id,
      companyId: session.user?.companyId,
      details: `Logout forcado pelo administrador`,
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

// ---------------------------------------------------------------------------
// updateUserModules
// ---------------------------------------------------------------------------

export type ModuleAccessMap = {
  moduleClients?: boolean
  moduleSuppliers?: boolean
  moduleProjects?: boolean
  moduleContracts?: boolean
  moduleFinancial?: boolean
  moduleBudgets?: boolean
  moduleMeasurements?: boolean
  modulePurchases?: boolean
  moduleInventory?: boolean
  moduleEquipment?: boolean
  moduleRentals?: boolean
  moduleEmployees?: boolean
  moduleTimesheet?: boolean
  moduleDocuments?: boolean
  moduleQuality?: boolean
  moduleSafety?: boolean
  moduleDailyReports?: boolean
  moduleTraining?: boolean
  moduleBilling?: boolean
  moduleCostCenters?: boolean
}

export async function updateUserModules(
  userId: string,
  modules: ModuleAccessMap
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAdminSession()

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, username: true },
    })

    if (!user) return { success: false, error: 'Usuario nao encontrado' }

    // Only update fields that are valid module booleans
    const data: Record<string, boolean> = {}
    for (const key of MODULE_KEYS) {
      if (key in modules && typeof (modules as Record<string, unknown>)[key] === 'boolean') {
        data[key] = (modules as Record<string, boolean>)[key]
      }
    }

    // Use raw-ish update to bypass stale generated types
    await prisma.user.update({
      where: { id: userId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: data as any,
    })

    await logAudit({
      action: 'UPDATE_USER_MODULES',
      entity: 'User',
      entityId: userId,
      entityName: user.name || user.username,
      userId: session.user?.id,
      companyId: session.user?.companyId,
      details: `Modulos atualizados: ${Object.entries(data).map(([k, v]) => `${k}=${v}`).join(', ')}`,
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
