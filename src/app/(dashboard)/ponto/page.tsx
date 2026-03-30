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
  Clock,
  Users,
  Clock3,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PontoPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const companyId = session.user?.companyId
  if (!companyId) redirect('/login')

  // Placeholder values
  const kpis = {
    presentesHoje: 0,
    horasTrabalhadas: 0,
    pendentesAprovacao: 0,
    horasExtrasNoMes: 0,
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Controle de Ponto</h1>
        <p className="text-muted-foreground">
          Gestão de ponto e registro de horas dos funcionários
        </p>
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
                Presentes Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-700">
                    {kpis.presentesHoje}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Funcionários
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Horas Trabalhadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-700">
                    {kpis.horasTrabalhadas}h
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hoje
                  </p>
                </div>
                <Clock3 className="h-8 w-8 text-blue-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Pendentes Aprovação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-700">
                    {kpis.pendentesAprovacao}
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
                Horas Extras
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-700">
                    {kpis.horasExtrasNoMes}h
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Este mês
                  </p>
                </div>
                <Clock className="h-8 w-8 text-red-600/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-center pt-4">
        <Button size="lg" className="gap-2">
          <Clock className="h-5 w-5" />
          Registrar Ponto
        </Button>
      </div>

      {/* Coming Soon Notice */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Módulo em Desenvolvimento</CardTitle>
          <CardDescription>
            Em breve, você poderá registrar ponto, visualizar histórico e
            gerenciar horas extras através dessa interface.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
