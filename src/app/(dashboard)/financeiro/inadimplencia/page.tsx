import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, TrendingDown, Clock, DollarSign } from 'lucide-react'
import { InadimplenciaClient } from '@/components/financeiro/inadimplencia-client'

export const dynamic = 'force-dynamic'

function agingBucket(dueDate: Date, now: Date): string {
  const days = Math.floor((now.getTime() - new Date(dueDate).getTime()) / 86400000)
  if (days <= 30) return '1-30 dias'
  if (days <= 60) return '31-60 dias'
  if (days <= 90) return '61-90 dias'
  return '+90 dias'
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default async function InadimplenciaPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const companyId = session.user?.companyId
  if (!companyId) redirect('/login')

  const now = new Date()

  // Overdue receivables (INCOME with status PENDING/SCHEDULED and dueDate < now)
  const overdueRaw = await prisma.financialRecord.findMany({
    where: {
      companyId,
      type: 'INCOME',
      status: { in: ['PENDING', 'SCHEDULED'] },
      dueDate: { lt: now },
    },
    select: {
      id: true,
      description: true,
      amount: true,
      dueDate: true,
      status: true,
      category: true,
    },
    orderBy: { dueDate: 'asc' },
  })

  // All pending/scheduled receivables for % calculation
  const allPendingReceivables = await prisma.financialRecord.findMany({
    where: {
      companyId,
      type: 'INCOME',
      status: { in: ['PENDING', 'SCHEDULED'] },
    },
    select: { amount: true },
  })

  const totalOverdue = overdueRaw.reduce((acc, r) => acc + Number(r.amount), 0)
  const totalAllPending = allPendingReceivables.reduce((acc, r) => acc + Number(r.amount), 0)
  const pctInadimplencia = totalAllPending > 0
    ? (totalOverdue / totalAllPending) * 100
    : 0

  // Find the biggest overdue record as proxy for 'maior devedor'
  const biggestRecord = overdueRaw.reduce<typeof overdueRaw[0] | null>((max, r) => {
    if (!max) return r
    return Number(r.amount) > Number(max.amount) ? r : max
  }, null)

  // Build records with aging info
  const records = overdueRaw.map(r => {
    const daysOverdue = Math.floor((now.getTime() - new Date(r.dueDate).getTime()) / 86400000)
    return {
      id: r.id,
      description: r.description,
      amount: Number(r.amount),
      dueDate: r.dueDate,
      status: r.status,
      category: r.category,
      agingBucket: agingBucket(r.dueDate, now),
      daysOverdue,
    }
  })

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Inadimplência</h2>
        <p className="text-muted-foreground">
          Recebíveis vencidos e não pagos — controle de inadimplência
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total em Aberto</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(totalAllPending)}</div>
            <p className="text-xs text-muted-foreground">
              Todos os recebíveis pendentes
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Total Vencido</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{fmt(totalOverdue)}</div>
            <p className="text-xs text-muted-foreground">
              {overdueRaw.length} registro{overdueRaw.length !== 1 ? 's' : ''} vencido{overdueRaw.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">% Inadimplência</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {pctInadimplencia.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Do total a receber
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maior Atraso</CardTitle>
            <Clock className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            {biggestRecord ? (
              <>
                <div className="text-2xl font-bold">{fmt(Number(biggestRecord.amount))}</div>
                <p className="text-xs text-muted-foreground truncate" title={biggestRecord.description}>
                  {biggestRecord.description}
                </p>
              </>
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">—</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue Records Table (client component) */}
      {records.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum recebível vencido encontrado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <InadimplenciaClient records={records} />
      )}
    </div>
  )
}
