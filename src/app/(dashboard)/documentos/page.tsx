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
  FileText,
  AlertTriangle,
  Clock,
  Upload,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

export const dynamic = 'force-dynamic'

export default async function DocumentosPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const companyId = session.user?.companyId
  if (!companyId) redirect('/login')

  // Placeholder values
  const kpis = {
    totalDocumentos: 0,
    pendentesAprovacao: 0,
    vencidos: 0,
    uploadRecentes: 0,
  }

  const temDados =
    kpis.totalDocumentos > 0 ||
    kpis.pendentesAprovacao > 0 ||
    kpis.uploadRecentes > 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Gestão de Documentos
        </h1>
        <p className="text-muted-foreground">
          Armazenamento e controle de versão de documentos
        </p>
      </div>

      {/* KPI Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Indicadores Principais
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Total Documentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-700">
                    {kpis.totalDocumentos}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Armazenados
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-600/20" />
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
                    Aguardando
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Documentos Vencidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-700">
                    {kpis.vencidos}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Para renovar
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Uploads Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-700">
                    {kpis.uploadRecentes}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Últimos 7 dias
                  </p>
                </div>
                <Upload className="h-8 w-8 text-green-600/20" />
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
              icon={FileText}
              title="Nenhum documento armazenado"
              description="Comece a fazer upload de documentos e organize-os por categorias."
            />
          </CardContent>
        </Card>
      )}

      {/* Coming Soon Notice */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Módulo em Desenvolvimento</CardTitle>
          <CardDescription>
            Em breve, você poderá fazer upload de documentos, organizar em
            pastas, acompanhar versões e controlar acessos através dessa
            interface.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
