import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getStatements } from '@/app/actions/bank-reconciliation-actions'
import { getBankAccounts } from '@/app/actions/financial-actions'
import { ReconciliationClient } from './reconciliation-client'
import { toNumber } from '@/lib/formatters'

export const dynamic = 'force-dynamic'

export default async function ConciliacaoPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = session.user as { id: string; role: string; companyId: string; canManageFinancial?: boolean }
  if (!user.companyId) redirect('/login')

  // Permission check
  if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && !user.canManageFinancial) {
    redirect('/dashboard')
  }

  const [bankAccounts, statementsResult] = await Promise.all([
    getBankAccounts(user.companyId),
    getStatements(),
  ])

  const statements = statementsResult.success ? statementsResult.data! : []

  // Converter Decimal para number para Client Component
  const serializedStatements = statements.map(s => ({
    ...s,
    totalCredits: toNumber(s.totalCredits),
    totalDebits: toNumber(s.totalDebits),
  }))

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Conciliação Bancária</h2>
        <p className="text-muted-foreground">
          Importe extratos e concilie com os lançamentos financeiros
        </p>
      </div>

      <ReconciliationClient
        bankAccounts={bankAccounts}
        initialStatements={serializedStatements}
      />
    </div>
  )
}
