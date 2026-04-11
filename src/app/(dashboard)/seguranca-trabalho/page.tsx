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
  Shield,
  AlertTriangle,
  TrendingUp,
  ClipboardCheck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { SegurancaClient } from '@/components/seguranca/seguranca-client'

export const dynamic = 'force-dynamic'

const INCIDENT_TYPE_MAP: Record<string, string> = {
  ACCIDENT: 'Acidente',
  NEAR_MISS: 'Quase-Acidente',
  UNSAFE_CONDITION: 'Condicao Insegura',
  UNSAFE_ACT: 'Ato Inseguro',
  ENVIRONMENTAL: 'Ambiental',
  FIRST_AID: 'Primeiros Socorros',
  PPE_VIOLATION: 'Violacao EPI',
}

export default async function SegurancaTrabalhoPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const companyId = session.user?.companyId
  if (!companyId) redirect('/login')

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  const [
    totalIncidents,
    incidentsThisMonth,
    openIncidents,
    incidentsByType,
    lastIncidentDate,
    pendingInspections,
    inspectionsThisMonth,
    incidents,
    inspections,
    projects,
  ] = await Promise.all([
    prisma.safetyIncident.count({ where: { companyId } }),
    prisma.safetyIncident.count({
      where: { companyId, date: { gte: monthStart } },
    }),
    prisma.safetyIncident.count({
      where: { companyId, status: 'OPEN' },
    }),
    prisma.safetyIncident.groupBy({
      by: ['type'],
      where: { companyId },
      _count: { id: true },
    }),
    prisma.safetyIncident.findFirst({
      where: { companyId },
      orderBy: { date: 'desc' },
      select: { date: true },
    }),
    prisma.safetyInspection.count({
      where: { companyId, status: 'DRAFT' },
    }),
    prisma.safetyInspection.count({
      where: { companyId, date: { gte: monthStart } },
    }),
    prisma.safetyIncident.findMany({
      where: { companyId },
      include: {
        project: { select: { name: true } },
        reportedBy: { select: { name: true } },
        injuredEmployee: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 30,
    }),
    prisma.safetyInspection.findMany({
      where: { companyId },
      include: {
        project: { select: { name: true } },
        inspector: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 20,
    }),
    prisma.project.findMany({
      where: { companyId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  let daysSinceLastIncident = 0
  if (lastIncidentDate?.date) {
    const diff = Date.now() - new Date(lastIncidentDate.date).getTime()
    daysSinceLastIncident = Math.floor(diff / (1000 * 60 * 60 * 24))
  } else if (totalIncidents === 0) {
    daysSinceLastIncident = 0
  }

  const serializedIncidents = incidents.map((inc) => ({
    ...inc,
    date: inc.date.toISOString(),
  }))

  const serializedInspections = inspections.map((insp) => ({
    ...insp,
    date: insp.date.toISOString(),
    overallScore: insp.overallScore ? Number(insp.overallScore) : null,
  }))

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Segurança do Trabalho
          </h1>
          <p className="text-muted-foreground">
            Gestão de segurança, acidentes e prevenção
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Indicadores Principais
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Dias Sem Acidentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-700">
                    {totalIncidents === 0 ? '\u2014' : daysSinceLastIncident}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalIncidents === 0
                      ? 'Sem registros'
                      : 'Consecutivos'}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Incidentes no Mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-700">
                    {incidentsThisMonth}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Registrados
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Incidentes Abertos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-700">
                    {openIncidents}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Aguardando resolucao
                  </p>
                </div>
                <Shield className="h-8 w-8 text-orange-600/20" />
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
                    {inspectionsThisMonth}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Realizadas
                  </p>
                </div>
                <ClipboardCheck className="h-8 w-8 text-blue-600/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {incidentsByType.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Incidentes por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {incidentsByType.map((t) => (
                <Badge key={t.type} variant="outline" className="text-xs">
                  {INCIDENT_TYPE_MAP[t.type] || t.type}: {t._count.id}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <SegurancaClient
        incidents={serializedIncidents as any}
        inspections={serializedInspections as any}
        projects={projects}
      />
    </div>
  )
}
