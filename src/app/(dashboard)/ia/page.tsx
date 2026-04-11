import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { resolveAIPermissions, type AiAccessLevel } from '@/lib/permissions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, Brain, Lock, Zap } from 'lucide-react'
import { AIHealthPanel } from './_components/ai-health-panel'
import { AnomalyDetectionPanel } from './_components/anomaly-detection-panel'
import { ChatPanel } from './_components/chat-panel'
import { ReportGeneratorPanel } from './_components/report-generator-panel'

export const dynamic = 'force-dynamic'

export default async function AIPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const role = session.user?.role ?? ''
  const aiAccessLevel = (session.user as Record<string, unknown> | undefined)?.aiAccessLevel as AiAccessLevel | null | undefined
  const permissions = resolveAIPermissions(role, aiAccessLevel)

  // Se o nível de acesso for NONE, redirecionar
  if (!permissions.canUseChat) {
    redirect('/dashboard')
  }

  const companyId = session.user?.companyId

  // Determinar aba padrão baseado nas permissões
  const defaultTab = permissions.canRunAnalysis ? 'health' : 'chat'

  // Contar abas disponíveis para grid layout
  const tabCount = [
    permissions.canRunAnalysis,
    permissions.canDetectAnomalies,
    permissions.canGenerateReports,
    permissions.canUseChat,
  ].filter(Boolean).length

  // Tailwind precisa de classes completas (não dinâmicas)
  const gridColsClass =
    tabCount === 4 ? 'grid-cols-4' :
    tabCount === 3 ? 'grid-cols-3' :
    tabCount === 2 ? 'grid-cols-2' :
    'grid-cols-1'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-8 w-8 text-purple-600" />
            Assistente de IA
          </h1>
          <p className="text-muted-foreground">
            Análises inteligentes, detecção de anomalias e suporte em tempo real
          </p>
        </div>
        <div className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
          {permissions.maxCallsPerHour} chamadas/hora
        </div>
      </div>

      {/* Warning Banner */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex gap-3 pt-6">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Recursos em Beta</p>
            <p className="mt-1">
              A assistência de IA está em fase de testes. As análises são baseadas em dados históricos e devem ser
              validadas por especialistas antes de decisões críticas.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className={`grid w-full ${gridColsClass}`}>
          {permissions.canRunAnalysis && (
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Saúde do Sistema</span>
              <span className="sm:hidden">Saúde</span>
            </TabsTrigger>
          )}
          {permissions.canDetectAnomalies && (
            <TabsTrigger value="anomalies" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Anomalias</span>
              <span className="sm:hidden">Anomalias</span>
            </TabsTrigger>
          )}
          {permissions.canGenerateReports && (
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Relatórios</span>
              <span className="sm:hidden">Relatórios</span>
            </TabsTrigger>
          )}
          {permissions.canUseChat && (
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
              <span className="sm:hidden">Chat</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Health Analysis Tab */}
        {permissions.canRunAnalysis ? (
          <TabsContent value="health" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Análise de Saúde do Sistema</CardTitle>
                <CardDescription>
                  Avalie o estado geral do ERP e identifique áreas de melhoria
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AIHealthPanel companyId={companyId} />
              </CardContent>
            </Card>
          </TabsContent>
        ) : (
          <TabsContent value="health" className="space-y-4">
            <RestrictedAccessCard feature="Análise de Saúde do Sistema" />
          </TabsContent>
        )}

        {/* Anomaly Detection Tab */}
        {permissions.canDetectAnomalies ? (
          <TabsContent value="anomalies" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Detecção de Anomalias</CardTitle>
                <CardDescription>
                  Identifique padrões incomuns em medições, finanças e alocações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnomalyDetectionPanel companyId={companyId} />
              </CardContent>
            </Card>
          </TabsContent>
        ) : (
          <TabsContent value="anomalies" className="space-y-4">
            <RestrictedAccessCard feature="Detecção de Anomalias" />
          </TabsContent>
        )}

        {/* Report Generation Tab */}
        {permissions.canGenerateReports ? (
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Gerador de Relatórios</CardTitle>
                <CardDescription>
                  Crie relatórios executivos, técnicos ou financeiros com IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReportGeneratorPanel companyId={companyId} />
              </CardContent>
            </Card>
          </TabsContent>
        ) : (
          <TabsContent value="reports" className="space-y-4">
            <RestrictedAccessCard feature="Gerador de Relatórios" />
          </TabsContent>
        )}

        {/* Chat Tab */}
        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chat com Assistente</CardTitle>
              <CardDescription>
                Faça perguntas sobre dados do ERP e receba respostas inteligentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChatPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function RestrictedAccessCard({ feature }: { feature: string }) {
  return (
    <Card className="border-slate-200">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Lock className="h-12 w-12 text-slate-400 mb-4" />
        <h3 className="text-lg font-semibold text-slate-700">Acesso Restrito</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          O recurso <strong>{feature}</strong> não está disponível para o seu perfil de acesso.
          Entre em contato com o administrador para solicitar acesso.
        </p>
      </CardContent>
    </Card>
  )
}
