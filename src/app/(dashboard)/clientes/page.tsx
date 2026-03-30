import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getClients } from '@/app/actions/client-actions'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Building2, CheckCircle2, CalendarDays } from 'lucide-react'
import { ClientsTable } from '@/components/clients/clients-table'
import { ClientDialog } from '@/components/clients/client-dialog'

export const dynamic = 'force-dynamic'

export default async function ClientesPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const companyId = session.user?.companyId
  if (!companyId) redirect('/login')

  const clientsResult = await getClients({ companyId })
  const clients = clientsResult.success ? (clientsResult.data ?? []) : []

  // KPIs
  const totalActive = clients.filter((c) => c.status === 'ACTIVE').length

  // Clients with ongoing projects
  const clientsWithOngoingProjects = clients.filter((c) =>
    c._count.projects > 0
  ).length

  // Completed projects count (across all clients)
  const completedProjectsCount = await prisma.project.count({
    where: {
      companyId,
      clientId: { not: null },
      status: 'COMPLETED',
    },
  })

  // New clients this month
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const newClientsThisMonth = clients.filter(
    (c) => new Date(c.createdAt) >= startOfMonth
  ).length

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie os clientes que contratam a Eixo Global
          </p>
        </div>
        <ClientDialog companyId={companyId} />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActive}</div>
            <p className="text-xs text-muted-foreground">Clientes com status ativo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Obras em Andamento</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientsWithOngoingProjects}</div>
            <p className="text-xs text-muted-foreground">Clientes com projetos vinculados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Obras Concluídas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedProjectsCount}</div>
            <p className="text-xs text-muted-foreground">Total de projetos concluídos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos Este Mês</CardTitle>
            <CalendarDays className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newClientsThisMonth}</div>
            <p className="text-xs text-muted-foreground">Cadastrados neste mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <ClientsTable clients={clients} companyId={companyId} />
    </div>
  )
}
