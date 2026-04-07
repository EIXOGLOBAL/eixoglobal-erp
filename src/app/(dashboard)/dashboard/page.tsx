import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { PageTransition } from '@/components/ui/page-transition'
import { DashboardContent } from './dashboard-content'
import {
  getDashboardKPIs,
  getCashflowChartData,
  getProjectsChartData,
  getTopProjectsData,
  getHRChartData,
  getRecentProjects,
  getRecentTransactions,
  getOperationalAlerts,
} from './_components/dashboard-data'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = session.user as {
    id: string
    role: string
    companyId: string
    name?: string
  }
  const companyId = user.companyId
  if (!companyId) redirect('/login')

  const isManager = user.role === 'ADMIN' || user.role === 'MANAGER'

  // Parallel data fetching — allSettled para não derrubar a página inteira
  const fetchers = [
    ['kpis', () => getDashboardKPIs(companyId, 'month')],
    ['cashflow', () => getCashflowChartData(companyId, 12)],
    ['projectsChart', () => getProjectsChartData(companyId)],
    ['topProjects', () => getTopProjectsData(companyId, 5)],
    ['hrChart', () => getHRChartData(companyId, 6)],
    ['recentProjects', () => getRecentProjects(companyId, 5)],
    ['recentTx', () => getRecentTransactions(companyId, 5)],
    ['alerts', () => getOperationalAlerts(companyId)],
  ] as const

  const settled = await Promise.allSettled(fetchers.map(([, fn]) => fn()))
  settled.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[dashboard] fetcher=${fetchers[i][0]} FAILED:`, r.reason?.message, r.reason?.stack)
    }
  })
  const val = <T,>(i: number, fallback: T): T =>
    settled[i].status === 'fulfilled' ? (settled[i] as PromiseFulfilledResult<T>).value : fallback

  const kpis = val(0, {
    activeProjects: 0,
    totalProjects: 0,
    periodRevenue: 0,
    periodExpenses: 0,
    currentBalance: 0,
    allocatedEmployees: 0,
    totalActiveEmployees: 0,
    pendingBulletins: 0,
    pendingBudgets: 0,
    expiringContracts30d: 0,
  } as any)
  const cashflow = val(1, [] as any)
  const projectsChart = val(2, [] as any)
  const topProjects = val(3, [] as any)
  const hrChart = val(4, [] as any)
  const recentProjects = val(5, [] as any)
  const recentTx = val(6, [] as any)
  const alerts = val(7, [] as any)

  return (
    <PageTransition>
      <DashboardContent
        kpis={kpis}
        cashflow={cashflow}
        projectsChart={projectsChart}
        topProjects={topProjects}
        hrChart={hrChart}
        recentProjects={recentProjects}
        recentTransactions={recentTx}
        alerts={alerts}
        companyId={companyId}
        isManager={isManager}
      />
    </PageTransition>
  )
}
