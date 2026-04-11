// Definição centralizada de permissões do sistema

export type UserPermissions = {
  canDelete: boolean
  canApprove: boolean
  canManageFinancial: boolean
  canManageHR: boolean
  canManageSystem: boolean
  canViewReports: boolean
}

export type SessionUser = {
  role?: string | null
  canDelete?: boolean | null
  canApprove?: boolean | null
  canManageFinancial?: boolean | null
  canManageHR?: boolean | null
  canManageSystem?: boolean | null
  canViewReports?: boolean | null
}

/**
 * Resolve permissões efetivas do usuário.
 * ADMIN sempre tem tudo. Para outros roles, combina defaults do role + overrides individuais.
 */
export function resolvePermissions(user: SessionUser): UserPermissions {
  const role = user.role ?? ''
  const isAdmin = role === 'ADMIN'

  if (isAdmin) {
    return {
      canDelete: true,
      canApprove: true,
      canManageFinancial: true,
      canManageHR: true,
      canManageSystem: true,
      canViewReports: true,
    }
  }

  const roleDefaults: Record<string, Partial<UserPermissions>> = {
    MANAGER: { canApprove: true, canManageFinancial: true, canViewReports: true },
    ENGINEER: { canViewReports: true },
    USER: { canViewReports: true },
  }

  const defaults = roleDefaults[role] ?? {}

  return {
    canDelete: user.canDelete ?? defaults.canDelete ?? false,
    canApprove: user.canApprove ?? defaults.canApprove ?? false,
    canManageFinancial: user.canManageFinancial ?? defaults.canManageFinancial ?? false,
    canManageHR: user.canManageHR ?? defaults.canManageHR ?? false,
    canManageSystem: user.canManageSystem ?? defaults.canManageSystem ?? false,
    canViewReports: user.canViewReports ?? defaults.canViewReports ?? true,
  }
}

export function assertAdmin(role: string) {
  if (role !== 'ADMIN') throw new Error('Acesso negado: requer ADMIN')
}

export function assertCanDelete(user: SessionUser) {
  const perms = resolvePermissions(user)
  if (!perms.canDelete) throw new Error('Você não tem permissão para excluir registros')
}
