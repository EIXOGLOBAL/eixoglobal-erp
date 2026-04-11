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

// ============================================================================
// Permissões de IA
// ============================================================================

export type AiAccessLevel = 'FULL' | 'STANDARD' | 'BASIC' | 'NONE'

export type AIPermissions = {
  canUseChat: boolean
  canRunAnalysis: boolean
  canGenerateReports: boolean
  canAccessAllData: boolean
  canDetectAnomalies: boolean
  canAccessHRData: boolean
  maxCallsPerHour: number
}

/**
 * Resolve o nível de acesso à IA baseado no role e no aiAccessLevel explícito.
 * Se aiAccessLevel for null/undefined, infere a partir do role.
 */
export function resolveAiAccessLevel(role: string | null | undefined, aiAccessLevel?: AiAccessLevel | null): AiAccessLevel {
  if (aiAccessLevel) return aiAccessLevel

  switch (role) {
    case 'ADMIN':
      return 'FULL'
    case 'MANAGER':
      return 'STANDARD'
    case 'USER':
    case 'ENGINEER':
    case 'SUPERVISOR':
    case 'SAFETY_OFFICER':
    case 'ACCOUNTANT':
    case 'HR_ANALYST':
      return 'BASIC'
    default:
      return 'NONE'
  }
}

/**
 * Resolve as permissões de IA efetivas com base no role e nível de acesso.
 */
export function resolveAIPermissions(
  role: string | null | undefined,
  aiAccessLevel?: AiAccessLevel | null
): AIPermissions {
  const level = resolveAiAccessLevel(role, aiAccessLevel)

  switch (level) {
    case 'FULL':
      return {
        canUseChat: true,
        canRunAnalysis: true,
        canGenerateReports: true,
        canAccessAllData: true,
        canDetectAnomalies: true,
        canAccessHRData: true,
        maxCallsPerHour: 100,
      }
    case 'STANDARD':
      return {
        canUseChat: true,
        canRunAnalysis: true,
        canGenerateReports: true,
        canAccessAllData: false,
        canDetectAnomalies: true,
        canAccessHRData: false,
        maxCallsPerHour: 30,
      }
    case 'BASIC':
      return {
        canUseChat: true,
        canRunAnalysis: false,
        canGenerateReports: false,
        canAccessAllData: false,
        canDetectAnomalies: false,
        canAccessHRData: false,
        maxCallsPerHour: 15,
      }
    case 'NONE':
    default:
      return {
        canUseChat: false,
        canRunAnalysis: false,
        canGenerateReports: false,
        canAccessAllData: false,
        canDetectAnomalies: false,
        canAccessHRData: false,
        maxCallsPerHour: 0,
      }
  }
}
