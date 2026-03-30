import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, Brain, Zap } from 'lucide-react'
import { AIHealthPanel } from './_components/ai-health-panel'
import { AnomalyDetectionPanel } from './_components/anomaly-detection-panel'
import { ChatPanel } from './_components/chat-panel'
import { ReportGeneratorPanel } from './_components/report-generator-panel'

export const dynamic = 'force-dynamic'

export default async function AIPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  if (session.user?.role !== 'ADMIN' && session.user?.role !== 'MANAGER') {
    redirect('/dashboard')
  }

  const companyId = session.user?.companyId

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
      <Tabs defaultValue="health" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Saúde do Sistema</span>
            <span className="sm:hidden">Saúde</span>
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Anomalias</span>
            <span className="sm:hidden">Anomalias</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Relatórios</span>
            <span className="sm:hidden">Relatórios</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Chat</span>
            <span className="sm:hidden">Chat</span>
          </TabsTrigger>
        </TabsList>

        {/* Health Analysis Tab */}
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

        {/* Anomaly Detection Tab */}
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

        {/* Report Generation Tab */}
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
