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
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Clipboard,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { QualidadeClient } from '@/components/qualidade/qualidade-client'

export const dynamic = 'force-dynamic'

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Pendente', className: 'bg-orange-100 text-orange-800' },
  IN_PROGRESS: { label: 'Em Andamento', className: 'bg-blue-100 text-blue-800' },
  PASSED: { label: 'Aprovado', className: 'bg-green-100 text-green-800' },
  FAILED: { label: 'Reprovado', className: 'bg-red-100 text-red-800' },
  CONDITIONAL: { label: 'Condicional', className: 'bg-yellow-100 text-yellow-800' },
}

export default async function QualidadePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const companyId = session.user?.companyId
  if (!companyId) redirect('/login')

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  const [
    pendingCount,
    totalThisMonth,
    openNonConformities,
    statusCounts,
    checkpoints,
    nonConformities,
    projects,
    users,
  ] = await Promise.all([
    prisma.qualityCheckpoint.count({
      where: { companyId, status: 'PENDING' },
    }),
    prisma.qualityCheckpoint.count({
      where: { companyId, createdAt: { gte: monthStart } },
    }),
    prisma.qualityNonConformity.count({
      where: {
        checkpoint: { companyId },
        status: 'OPEN',
      },
    }),
    prisma.qualityCheckpoint.groupBy({
      by: ['status'],
      where: { companyId },
      _count: { id: true },
    }),
    prisma.qualityCheckpoint.findMany({
      where: { companyId },
      include: {
        project: { select: { name: true } },
        inspector: { select: { name: true } },
        _count: { select: { nonConformities: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.qualityNonConformity.findMany({
      where: {
        checkpoint: { companyId },
        status: 'OPEN',
      },
      include: {
        checkpoint: { select: { name: true } },
        responsible: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.project.findMany({
      where: { companyId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: { companyId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const totalResolved = statusCounts.reduce((sum, s) => {
    if (s.status === 'PASSED' || s.status === 'FAILED' || s.status === 'CONDITIONAL') {
      return sum + s._count.id
    }
    return sum
  }, 0)
  const passedCount = statusCounts.find((s) => s.status === 'PASSED')?._count.id ?? 0
  const approvalRate = totalResolved > 0 ? Math.round((passedCount / totalResolved) * 100) : 0

  const serializedCheckpoints = checkpoints.map((cp) => ({
    ...cp,
    inspectionDate: cp.inspectionDate?.toISOString() ?? null,
    createdAt: cp.createdAt.toISOString(),
    updatedAt: cp.updatedAt.toISOString(),
  }))

  const serializedNCs = nonConformities.map((nc) => ({
    ...nc,
    dueDate: nc.dueDate?.toISOString() ?? null,
    resolvedAt: nc.resolvedAt?.toISOString() ?? null,
    createdAt: nc.createdAt.toISOString(),
    updatedAt: nc.updatedAt.toISOString(),
  }))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Gestão de Qualidade
        </h1>
        <p className="text-muted-foreground">
          Controle de qualidade, inspeções e conformidades
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Indicadores Principais
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Inspeções Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-700">
                    {pendingCount}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Aguardando
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Não-Conformidades Abertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-700">
                    {openNonConformities}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Em aberto
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Taxa de Aprovação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-700">
                    {approvalRate}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Geral
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Inspeções no Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-700">
                    {totalThisMonth}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Realizadas
                  </p>
                </div>
                <Clipboard className="h-8 w-8 text-blue-600/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {statusCounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {statusCounts.map((s) => {
                const info = STATUS_MAP[s.status] || {
                  label: s.status,
                  className: 'bg-gray-100 text-gray-800',
                }
                return (
                  <Badge key={s.status} className={`${info.className} text-xs`}>
                    {info.label}: {s._count.id}
                  </Badge>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <QualidadeClient
        companyId={companyId}
        checkpoints={serializedCheckpoints}
        nonConformities={serializedNCs}
        projects={projects}
        users={users}
      />
    </div>
  )
}
