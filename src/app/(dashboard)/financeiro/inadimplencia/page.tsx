import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, TrendingDown, Clock, DollarSign, CalendarClock, Ban, Handshake } from 'lucide-react'
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

  const user = session.user as { id: string; role: string; companyId: string; canManageFinancial?: boolean }
  if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && !user.canManageFinancial) {
    redirect('/dashboard')
  }

  const now = new Date()

  // Overdue receivables (INCOME with status PENDING/SCHEDULED and dueDate < now)
  const overdueRaw = await prisma.financialRecord.findMany({
    where: {
      companyId,
      type: 'INCOME',
      status: { in: ['PENDING', 'SCHEDULED'] },
      dueDate: { lt: now },
      isDeleted: false,
    },
    select: {
      id: true,
      description: true,
      amount: true,
      dueDate: true,
      status: true,
      category: true,
      collectionNotes: true,
      collectionDate: true,
      project: { select: { id: true, name: true } },
    },
    orderBy: { dueDate: 'asc' },
  })

  // All pending/scheduled receivables for % calculation
  const allPendingReceivables = await prisma.financialRecord.findMany({
    where: {
      companyId,
      type: 'INCOME',
      status: { in: ['PENDING', 'SCHEDULED'] },
      isDeleted: false,
    },
    select: { amount: true },
  })

  // Negotiated records count & total
  const negotiatedRecords = await prisma.financialRecord.findMany({
    where: {
      companyId,
      type: 'INCOME',
      status: 'NEGOTIATED',
      isDeleted: false,
    },
    select: { amount: true, negotiatedAmount: true },
  })

  // Loss records count & total
  const lossRecords = await prisma.financialRecord.findMany({
    where: {
      companyId,
      type: 'INCOME',
      status: 'LOSS',
      isDeleted: false,
    },
    select: { amount: true },
  })

  const totalOverdue = overdueRaw.reduce((acc, r) => acc + Number(r.amount), 0)
  const totalAllPending = allPendingReceivables.reduce((acc, r) => acc + Number(r.amount), 0)
  const pctInadimplencia = totalAllPending > 0
    ? (totalOverdue / totalAllPending) * 100
    : 0

  const totalNegotiated = negotiatedRecords.reduce((acc, r) => acc + Number(r.negotiatedAmount || r.amount), 0)
  const totalLoss = lossRecords.reduce((acc, r) => acc + Number(r.amount), 0)

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
      collectionNotes: r.collectionNotes,
      collectionDate: r.collectionDate,
      projectName: r.project?.name ?? null,
      agingBucket: agingBucket(r.dueDate, now),
      daysOverdue,
    }
  })

  // KPIs by bucket
  const bucket30 = records.filter(r => r.agingBucket === '1-30 dias')
  const bucket60 = records.filter(r => r.agingBucket === '31-60 dias')
  const bucket90 = records.filter(r => r.agingBucket === '61-90 dias')
  const bucket90plus = records.filter(r => r.agingBucket === '+90 dias')
  const total30 = bucket30.reduce((acc, r) => acc + r.amount, 0)
  const total60 = bucket60.reduce((acc, r) => acc + r.amount, 0)
  const total90 = bucket90.reduce((acc, r) => acc + r.amount, 0)
  const total90plus = bucket90plus.reduce((acc, r) => acc + r.amount, 0)

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Inadimplencia</h2>
        <p className="text-muted-foreground">
          Recebiveis vencidos e nao pagos — controle de inadimplencia
        </p>
      </div>

      {/* KPI Cards - Row 1: Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total em Aberto</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(totalAllPending)}</div>
            <p className="text-xs text-muted-foreground">
              Todos os recebiveis pendentes
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
            <CardTitle className="text-sm font-medium text-orange-700">% Inadimplencia</CardTitle>
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
            <CardTitle className="text-sm font-medium">Negociados / Perdas</CardTitle>
            <Handshake className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-amber-600">{negotiatedRecords.length}</span>
              <span className="text-muted-foreground text-xs">/</span>
              <span className="text-lg font-bold text-red-600">{lossRecords.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {fmt(totalNegotiated)} negociado, {fmt(totalLoss)} perda
            </p>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards - Row 2: Aging Buckets */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700">Vencidos 1-30 dias</CardTitle>
            <CalendarClock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">{fmt(total30)}</div>
            <p className="text-xs text-muted-foreground">{bucket30.length} registro{bucket30.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">Vencidos 31-60 dias</CardTitle>
            <CalendarClock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{fmt(total60)}</div>
            <p className="text-xs text-muted-foreground">{bucket60.length} registro{bucket60.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Vencidos 61-90 dias</CardTitle>
            <Clock className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{fmt(total90)}</div>
            <p className="text-xs text-muted-foreground">{bucket90.length} registro{bucket90.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>

        <Card className="border-red-300 bg-red-50/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Vencidos +90 dias</CardTitle>
            <Ban className="h-4 w-4 text-red-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-800">{fmt(total90plus)}</div>
            <p className="text-xs text-muted-foreground">{bucket90plus.length} registro{bucket90plus.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Records Table (client component) */}
      {records.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum recebivel vencido encontrado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <InadimplenciaClient records={records} />
      )}
    </div>
  )
}
