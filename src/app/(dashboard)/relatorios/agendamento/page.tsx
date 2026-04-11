import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listScheduledReports } from '@/app/actions/scheduled-report-actions'
import { SchedulePageClient } from './schedule-page-client'

export const dynamic = 'force-dynamic'

export default async function AgendamentoRelatoriosPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const role = session.user?.role
  if (role !== 'ADMIN' && role !== 'MANAGER') {
    redirect('/relatorios')
  }

  const result = await listScheduledReports()

  return (
    <SchedulePageClient
      initialReports={result.data ?? []}
      error={result.success ? undefined : result.error}
    />
  )
}
