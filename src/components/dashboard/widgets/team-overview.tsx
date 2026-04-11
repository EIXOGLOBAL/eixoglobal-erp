'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TeamMemberData } from '@/app/actions/dashboard-actions'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  ENGINEER: 'Engenheiro',
  SUPERVISOR: 'Supervisor',
  SAFETY_OFFICER: 'Seguranca',
  ACCOUNTANT: 'Contador',
  HR_ANALYST: 'Analista RH',
  USER: 'Colaborador',
}

function formatLastSeen(date: Date | null): string {
  if (!date) return 'Nunca acessou'
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMin < 15) return 'Online agora'
  if (diffMin < 60) return `${diffMin}min atras`
  if (diffHours < 24) return `${diffHours}h atras`
  if (diffDays === 1) return 'Ontem'
  return `${diffDays}d atras`
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

export function TeamOverviewSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-24" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-2 w-2 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Component (ADMIN/MANAGER only)
// ---------------------------------------------------------------------------

interface TeamOverviewWidgetProps {
  members: TeamMemberData[]
  activeCount: number
  isLoading?: boolean
}

export function TeamOverviewWidget({
  members,
  activeCount,
  isLoading,
}: TeamOverviewWidgetProps) {
  if (isLoading) return <TeamOverviewSkeleton />

  // Sort: online first, then by name
  const sorted = [...members].sort((a, b) => {
    if (a.isOnline && !b.isOnline) return -1
    if (!a.isOnline && b.isOnline) return 1
    return (a.name || '').localeCompare(b.name || '', 'pt-BR')
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Equipe
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {members.length} membros
            </Badge>
            {activeCount > 0 && (
              <Badge variant="default" className="text-xs bg-emerald-500 hover:bg-emerald-600">
                {activeCount} online
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum membro encontrado
          </p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {sorted.map(member => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.name || ''}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {member.initials}
                    </div>
                  )}
                  {/* Online indicator */}
                  <Circle
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-current stroke-background stroke-2',
                      member.isOnline ? 'text-emerald-500' : 'text-gray-300',
                    )}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {member.name || 'Sem nome'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {ROLE_LABELS[member.role] || member.role}
                  </p>
                </div>

                {/* Last seen */}
                <span
                  className={cn(
                    'text-[10px] shrink-0',
                    member.isOnline ? 'text-emerald-600 font-medium' : 'text-muted-foreground',
                  )}
                >
                  {formatLastSeen(member.lastLoginAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
