import { requireAdmin } from '@/lib/route-guard'
import { GitBranch, Activity, Clock, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getWorkflows, getWorkflowStats, getMyPendingApprovals } from '@/app/actions/approval-workflow-actions'
import { WorkflowTable } from '@/components/configuracoes/workflow-table'
import { ApprovalPanel } from '@/components/configuracoes/approval-panel'

export const dynamic = 'force-dynamic'

export default async function FluxosAprovacaoPage() {
  const session = await requireAdmin()
  const user = session.user as { id: string; role: string; companyId: string }
  if (!user.companyId) return null

  const [workflowsResult, statsResult, pendingResult] = await Promise.all([
    getWorkflows({ pagination: { page: 1, limit: 50 } }),
    getWorkflowStats(),
    getMyPendingApprovals(),
  ])

  const workflows = workflowsResult.success && workflowsResult.data ? workflowsResult.data.items : []
  const stats = statsResult.success && statsResult.data ? statsResult.data : {
    totalWorkflows: 0,
    activeWorkflows: 0,
    pendingApprovals: 0,
    approvalsToday: 0,
  }
  const pendingApprovals = pendingResult.success && pendingResult.data ? pendingResult.data : []

  const kpis = [
    {
      title: 'Total de Fluxos',
      value: stats.totalWorkflows,
      icon: GitBranch,
      color: 'text-blue-600',
    },
    {
      title: 'Fluxos Ativos',
      value: stats.activeWorkflows,
      icon: Activity,
      color: 'text-green-600',
    },
    {
      title: 'Aprovacoes Pendentes',
      value: stats.pendingApprovals,
      icon: Clock,
      color: 'text-amber-600',
    },
    {
      title: 'Aprovacoes Hoje',
      value: stats.approvalsToday,
      icon: CheckCircle,
      color: 'text-emerald-600',
    },
  ]

  return (
    <div className="flex-1 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <GitBranch className="h-8 w-8" />
          Fluxos de Aprovacao
        </h2>
        <p className="text-muted-foreground">
          Gerencie os fluxos de aprovacao e acompanhe solicitacoes pendentes
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Workflows Table */}
      <WorkflowTable initialWorkflows={workflows} />

      {/* Pending Approvals Panel */}
      <ApprovalPanel initialApprovals={pendingApprovals} />
    </div>
  )
}
