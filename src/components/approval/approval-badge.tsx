'use client'

import { useEffect, useState, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react'
import { getApprovalStatus } from '@/app/actions/approval-workflow-actions'
import { cn } from '@/lib/utils'

type ApprovalStatus = 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

interface ApprovalStatusData {
  id: string
  status: ApprovalStatus
  currentLevel: number
  requestedBy: { id: string; name: string | null }
  createdAt: Date
  updatedAt: Date
}

interface ApprovalBadgeProps {
  entityType: string
  entityId: string
  className?: string
  /** Show compact version (icon only, no text) */
  compact?: boolean
  /** Called when status data is loaded */
  onStatusLoaded?: (data: ApprovalStatusData | null) => void
}

const statusConfig: Record<ApprovalStatus, {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  icon: typeof CheckCircle2
  colorClass: string
}> = {
  PENDING: {
    label: 'Pendente',
    variant: 'outline',
    icon: Clock,
    colorClass: 'border-yellow-500/50 text-yellow-700 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/30',
  },
  IN_REVIEW: {
    label: 'Em Revisao',
    variant: 'outline',
    icon: AlertCircle,
    colorClass: 'border-blue-500/50 text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30',
  },
  APPROVED: {
    label: 'Aprovado',
    variant: 'default',
    icon: CheckCircle2,
    colorClass: 'border-green-500/50 text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/30',
  },
  REJECTED: {
    label: 'Rejeitado',
    variant: 'destructive',
    icon: XCircle,
    colorClass: 'border-red-500/50 text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/30',
  },
  CANCELLED: {
    label: 'Cancelado',
    variant: 'secondary',
    icon: XCircle,
    colorClass: 'border-gray-500/50 text-gray-700 bg-gray-50 dark:text-gray-400 dark:bg-gray-950/30',
  },
}

export function ApprovalBadge({
  entityType,
  entityId,
  className,
  compact = false,
  onStatusLoaded,
}: ApprovalBadgeProps) {
  const [status, setStatus] = useState<ApprovalStatusData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      const result = await getApprovalStatus(entityType, entityId)
      if (result.success && result.data) {
        setStatus(result.data as ApprovalStatusData)
        onStatusLoaded?.(result.data as ApprovalStatusData)
      } else {
        setStatus(null)
        onStatusLoaded?.(null)
      }
    } catch {
      setStatus(null)
      onStatusLoaded?.(null)
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId, onStatusLoaded])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  if (loading) {
    return (
      <Badge variant="outline" className={cn('gap-1', className)}>
        <Loader2 className="size-3 animate-spin" />
        {!compact && <span>Carregando...</span>}
      </Badge>
    )
  }

  if (!status) {
    return null
  }

  const config = statusConfig[status.status]
  const Icon = config.icon

  return (
    <Badge
      variant={config.variant}
      className={cn('gap-1', config.colorClass, className)}
    >
      <Icon className="size-3" />
      {!compact && <span>{config.label}</span>}
    </Badge>
  )
}

export type { ApprovalStatusData, ApprovalBadgeProps }
