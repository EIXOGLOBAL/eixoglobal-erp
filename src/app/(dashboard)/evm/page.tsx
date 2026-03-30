import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { PageTransition } from '@/components/ui/page-transition'
import { EVMContent } from './evm-content'
import {
  getAllProjectsEVMData,
  getPortfolioEVMSummary,
} from '@/app/actions/evm-actions'

export const dynamic = 'force-dynamic'

export default async function EVMPage() {
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

  // Fetch data in parallel using new EVM actions with real database integration
  const [projects, summary] = await Promise.all([
    getAllProjectsEVMData(companyId),
    getPortfolioEVMSummary(companyId),
  ])

  return (
    <PageTransition>
      <EVMContent
        projects={projects}
        summary={summary}
        companyId={companyId}
        isManager={isManager}
      />
    </PageTransition>
  )
}
