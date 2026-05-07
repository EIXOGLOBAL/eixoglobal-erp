import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  getCommunications,
  getCommunicationStats,
} from '@/app/actions/communication-actions'
import { CommunicationsTable } from '@/components/comunicados/communications-table'
import { CreateComunicadoButton } from '@/components/comunicados/create-comunicado-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Megaphone,
  CheckCheck,
  AlertTriangle,
  CalendarDays,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ComunicadosPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = session.user as {
    id?: string
    role?: string
    companyId?: string
  }
  if (!user.companyId) redirect('/login')

  const canManage = ['ADMIN', 'MANAGER'].includes(user.role ?? '')
  const currentUserId = user.id ?? ''

  const [commsResult, statsResult] = await Promise.all([
    getCommunications(),
    getCommunicationStats(),
  ])

  const communications = commsResult.success ? commsResult.data : []
  const stats = statsResult.success
    ? statsResult.data
    : { total: 0, active: 0, urgent: 0, thisMonth: 0, totalUsers: 0 }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Mural de Comunicados
            </h1>
            <p className="text-muted-foreground">
              Avisos e comunicados internos da empresa
            </p>
          </div>
        </div>
        {canManage && <CreateComunicadoButton />}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <Megaphone className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              Comunicados vigentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgentes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.urgent}</div>
            <p className="text-xs text-muted-foreground">
              Prioridade urgente ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
            <CalendarDays className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonth}</div>
            <p className="text-xs text-muted-foreground">
              Publicados neste mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <CheckCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Comunicados no historico
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <CommunicationsTable
        communications={communications.map((c) => ({
          ...c,
          targetAudience: (c as any).targetAudience ?? 'ALL',
          expiresAt: c.expiresAt ? new Date(c.expiresAt) : null,
          createdAt: new Date(c.createdAt),
          author: { id: c.author.id, name: c.author.name },
          reads: c.reads.map((r) => ({
            userId: r.userId,
            readAt: new Date(r.readAt),
          })),
        }))}
        canManage={canManage}
        currentUserId={currentUserId}
        totalUsers={stats.totalUsers}
      />
    </div>
  )
}
