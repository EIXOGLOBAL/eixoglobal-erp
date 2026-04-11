import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Clock,
  Users,
  Clock3,
  AlertCircle,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { ClockInDialog } from '@/components/ponto/clock-in-dialog'
import { PontoTable } from '@/components/ponto/ponto-table'

export const dynamic = 'force-dynamic'

export default async function PontoPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const companyId = session.user?.companyId
  if (!companyId) redirect('/login')

  // Compute today boundaries
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)

  // This week (Monday-based)
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset)

  const [
    todayEntries,
    weekEntries,
    pendingCount,
    recentEntries,
    projects,
  ] = await Promise.all([
    prisma.timeEntry.count({
      where: { companyId, date: { gte: todayStart, lt: todayEnd } },
    }),
    prisma.timeEntry.findMany({
      where: { companyId, date: { gte: weekStart } },
      select: { totalHours: true, overtimeHours: true },
    }),
    prisma.timeEntry.count({
      where: { companyId, status: 'PENDING' },
    }),
    prisma.timeEntry.findMany({
      where: { companyId },
      include: {
        employee: { select: { name: true, jobTitle: true } },
        project: { select: { name: true } },
        approvedBy: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 50,
    }),
    prisma.project.findMany({
      where: { companyId, status: { in: ['PLANNING', 'IN_PROGRESS'] } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const hoursThisWeek = weekEntries.reduce(
    (sum, e) => sum + (e.totalHours ?? 0),
    0
  )
  const overtimeThisWeek = weekEntries.reduce(
    (sum, e) => sum + (e.overtimeHours ?? 0),
    0
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Controle de Ponto
          </h1>
          <p className="text-muted-foreground">
            Gestao de ponto e registro de horas dos funcionarios
          </p>
        </div>
        <ClockInDialog projects={projects} />
      </div>

      {/* KPI Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Indicadores do Dia
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Registros Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-700">
                    {todayEntries}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Funcionarios
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Horas na Semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-700">
                    {hoursThisWeek.toFixed(1)}h
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total trabalhado
                  </p>
                </div>
                <Clock3 className="h-8 w-8 text-blue-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Pendentes Aprovacao
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-700">
                    {pendingCount}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Registros
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Horas Extras na Semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-700">
                    {overtimeThisWeek.toFixed(1)}h
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Extra acumulado
                  </p>
                </div>
                <Clock className="h-8 w-8 text-red-600/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Time Entries Table */}
      {recentEntries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <EmptyState
              icon={Clock}
              title="Nenhum registro de ponto"
              description="Nenhum registro de ponto foi encontrado para esta empresa."
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5" />
              Registros Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PontoTable
              entries={JSON.parse(JSON.stringify(recentEntries))}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
