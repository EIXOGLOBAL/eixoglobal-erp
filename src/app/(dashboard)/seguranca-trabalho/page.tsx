import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  Users,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

export const dynamic = 'force-dynamic'

export default async function SegurancaTrabalhoPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const companyId = session.user?.companyId
  if (!companyId) redirect('/login')

  // Placeholder values
  const kpis = {
    diasSemAcidentes: 0,
    incidentesNoMes: 0,
    inspecoesPendentes: 0,
    ddsRealizados: 0,
  }

  const temDados =
    kpis.diasSemAcidentes > 0 ||
    kpis.incidentesNoMes > 0 ||
    kpis.ddsRealizados > 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Segurança do Trabalho
        </h1>
        <p className="text-muted-foreground">
          Gestão de segurança, acidentes e prevenção
        </p>
      </div>

      {/* KPI Cards */}
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
                    {kpis.diasSemAcidentes}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Consecutivos
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Incidentes no Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-700">
                    {kpis.incidentesNoMes}
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
                Inspeções Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-700">
                    {kpis.inspecoesPendentes}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Aguardando
                  </p>
                </div>
                <Shield className="h-8 w-8 text-orange-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                DDS Realizados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-700">
                    {kpis.ddsRealizados}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Este mês
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-600/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Empty State */}
      {!temDados && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <EmptyState
              icon={Shield}
              title="Nenhum dado registrado"
              description="Comece a registrar informações de segurança do trabalho, acidentes e inspeções."
            />
          </CardContent>
        </Card>
      )}

      {/* Coming Soon Notice */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Módulo em Desenvolvimento</CardTitle>
          <CardDescription>
            Em breve, você poderá gerenciar incidentes, programar inspeções de
            segurança e acompanhar DDS (Diálogo Diário de Segurança) através
            dessa interface.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
