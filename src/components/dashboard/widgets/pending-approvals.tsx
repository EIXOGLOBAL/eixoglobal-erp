'use client'

import { useState, useTransition } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ClipboardCheck,
  Check,
  X,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { approveRequest, rejectRequest } from '@/app/actions/approval-workflow-actions'
import type { PendingApprovalData } from '@/app/actions/dashboard-actions'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ENTITY_LABELS: Record<string, string> = {
  Budget: 'Orcamento',
  PurchaseOrder: 'Ordem de Compra',
  Contract: 'Contrato',
  FinancialRecord: 'Lancamento',
  MeasurementBulletin: 'Boletim',
  Expense: 'Despesa',
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return 'agora'
  if (minutes < 60) return `${minutes}min atras`
  if (hours < 24) return `${hours}h atras`
  if (days === 1) return 'ontem'
  return `${days}d atras`
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

export function PendingApprovalsSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-40" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex gap-1">
              <Skeleton className="h-7 w-7 rounded" />
              <Skeleton className="h-7 w-7 rounded" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PendingApprovalsWidgetProps {
  approvals: PendingApprovalData[]
  totalCount: number
  isLoading?: boolean
}

export function PendingApprovalsWidget({
  approvals,
  totalCount,
  isLoading,
}: PendingApprovalsWidgetProps) {
  if (isLoading) return <PendingApprovalsSkeleton />

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            Aprovacoes Pendentes
          </span>
          {totalCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {totalCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {approvals.length === 0 ? (
          <div className="text-center py-6">
            <ClipboardCheck className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma aprovacao pendente
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {approvals.map(approval => (
              <ApprovalItem key={approval.id} approval={approval} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Approval Item with quick actions
// ---------------------------------------------------------------------------

function ApprovalItem({ approval }: { approval: PendingApprovalData }) {
  const [isPending, startTransition] = useTransition()
  const [resolved, setResolved] = useState<'approved' | 'rejected' | null>(null)

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveRequest(approval.id)
      if (result.success) setResolved('approved')
    })
  }

  const handleReject = () => {
    startTransition(async () => {
      const result = await rejectRequest(approval.id, 'Rejeitado via dashboard')
      if (result.success) setResolved('rejected')
    })
  }

  if (resolved) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border px-3 py-2 text-xs',
          resolved === 'approved'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-red-200 bg-red-50 text-red-700',
        )}
      >
        {resolved === 'approved' ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <X className="h-3.5 w-3.5" />
        )}
        {resolved === 'approved' ? 'Aprovado' : 'Rejeitado'}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {ENTITY_LABELS[approval.entityType] || approval.entityType}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground truncate">
            {approval.requestedByName}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatRelativeTime(approval.createdAt)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
 variant="ghost"
 size="icon" aria-label="Aprovar" 
 className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
 onClick={handleApprove}
 disabled={isPending}
 title="Aprovar"
>
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </Button>
        <Button
 variant="ghost"
 size="icon" aria-label="Rejeitar" 
 className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-600"
 onClick={handleReject}
 disabled={isPending}
 title="Rejeitar"
>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
