'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Activity,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  LogIn,
  LogOut,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RecentActivityData } from '@/app/actions/dashboard-actions'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACTION_CONFIG: Record<string, { icon: typeof Plus; color: string; label: string }> = {
  CREATE: { icon: Plus, color: 'bg-emerald-100 text-emerald-600', label: 'criou' },
  UPDATE: { icon: Pencil, color: 'bg-blue-100 text-blue-600', label: 'atualizou' },
  DELETE: { icon: Trash2, color: 'bg-red-100 text-red-600', label: 'removeu' },
  APPROVE: { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-600', label: 'aprovou' },
  REJECT: { icon: XCircle, color: 'bg-red-100 text-red-600', label: 'rejeitou' },
  LOGIN_SUCCESS: { icon: LogIn, color: 'bg-blue-100 text-blue-600', label: 'entrou' },
  LOGOUT: { icon: LogOut, color: 'bg-gray-100 text-gray-600', label: 'saiu' },
  MARK_AS_PAID: { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-600', label: 'pagou' },
  REGISTER_PAYMENT: { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-600', label: 'registrou pagamento' },
}

const ENTITY_LABELS: Record<string, string> = {
  Project: 'projeto',
  Contract: 'contrato',
  Employee: 'funcionario',
  FinancialRecord: 'lancamento',
  BankAccount: 'conta bancaria',
  Budget: 'orcamento',
  PurchaseOrder: 'ordem de compra',
  MeasurementBulletin: 'boletim',
  ApprovalWorkflow: 'workflow',
  ApprovalRequest: 'solicitacao',
  User: 'usuario',
  Equipment: 'equipamento',
  Inventory: 'estoque',
  SafetyIncident: 'incidente',
}

function formatTimestamp(date: Date): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMin / 60)

  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin}min`
  if (diffHours < 24) return `${diffHours}h`

  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] || { icon: FileText, color: 'bg-gray-100 text-gray-600', label: action.toLowerCase() }
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

export function RecentActivitySkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-36" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
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

interface RecentActivityWidgetProps {
  activities: RecentActivityData[]
  isLoading?: boolean
}

export function RecentActivityWidget({ activities, isLoading }: RecentActivityWidgetProps) {
  if (isLoading) return <RecentActivitySkeleton />

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Atividade Recente
        </CardTitle>
      </CardHeader>

      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhuma atividade registrada
          </p>
        ) : (
          <div className="space-y-1">
            {activities.map((item, idx) => {
              const config = getActionConfig(item.action)
              const Icon = config.icon

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 py-2"
                >
                  {/* User initials avatar */}
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                      config.color,
                    )}
                    title={item.userName || undefined}
                  >
                    {item.userInitials}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">
                      <span className="font-medium">{item.userName || 'Sistema'}</span>
                      {' '}
                      <span className="text-muted-foreground">{config.label}</span>
                      {item.entity && (
                        <>
                          {' '}
                          <span className="text-muted-foreground">
                            {ENTITY_LABELS[item.entity] || item.entity.toLowerCase()}
                          </span>
                        </>
                      )}
                      {item.entityName && (
                        <>
                          {' '}
                          <span className="font-medium truncate">{item.entityName}</span>
                        </>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {formatTimestamp(item.createdAt)}
                    </p>
                  </div>

                  {/* Action icon */}
                  <div className="shrink-0 mt-1">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
