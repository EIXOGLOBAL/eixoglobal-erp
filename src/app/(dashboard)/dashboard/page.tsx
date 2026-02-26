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

  // Parallel data fetching
  const [
    kpis,
    cashflow,
    projectsChart,
    topProjects,
    hrChart,
    recentProjects,
    recentTx,
    alerts,
  ] = await Promise.all([
    getDashboardKPIs(companyId, 'month'),
    getCashflowChartData(companyId, 12),
    getProjectsChartData(companyId),
    getTopProjectsData(companyId, 5),
    getHRChartData(companyId, 6),
    getRecentProjects(companyId, 5),
    getRecentTransactions(companyId, 5),
    getOperationalAlerts(companyId),
  ])

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
