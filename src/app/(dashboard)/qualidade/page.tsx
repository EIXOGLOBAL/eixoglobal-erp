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
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Clipboard,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

export const dynamic = 'force-dynamic'

export default async function QualidadePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const companyId = session.user?.companyId
  if (!companyId) redirect('/login')

  // Placeholder values
  const kpis = {
    inspecoesPendentes: 0,
    naoConformidades: 0,
    taxaAprovacao: 0,
    inspecoesNoMes: 0,
  }

  const temDados =
    kpis.inspecoesPendentes > 0 ||
    kpis.naoConformidades > 0 ||
    kpis.inspecoesNoMes > 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Gestão de Qualidade
        </h1>
        <p className="text-muted-foreground">
          Controle de qualidade, inspeções e conformidades
        </p>
      </div>

      {/* KPI Cards */}
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
                    {kpis.inspecoesPendentes}
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
                    {kpis.naoConformidades}
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
                    {kpis.taxaAprovacao}%
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
                    {kpis.inspecoesNoMes}
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

      {/* Empty State */}
      {!temDados && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <EmptyState
              icon={CheckCircle}
              title="Nenhuma inspeção registrada"
              description="Comece a registrar inspeções de qualidade para acompanhar a conformidade dos processos."
            />
          </CardContent>
        </Card>
      )}

      {/* Coming Soon Notice */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Módulo em Desenvolvimento</CardTitle>
          <CardDescription>
            Em breve, você poderá registrar inspeções, acompanhar
            não-conformidades e gerar relatórios de qualidade através dessa
            interface.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
