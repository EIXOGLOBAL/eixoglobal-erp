import { requireAdmin } from '@/lib/route-guard'
import { getMonitoringDashboard, getAnomalies, getSecurityScans } from '@/app/actions/monitoring-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, Shield, AlertTriangle, Bug, CheckCircle, XCircle } from 'lucide-react'
import { MonitoringActions } from '@/components/monitoring/monitoring-actions'
import { AnomalyList } from '@/components/monitoring/anomaly-list'
import { SecurityScanList } from '@/components/monitoring/security-scan-list'

export const dynamic = 'force-dynamic'

export default async function MonitoramentoPage() {
  await requireAdmin()

  const [dashboardResult, anomaliesResult, scansResult] = await Promise.all([
    getMonitoringDashboard(),
    getAnomalies({ resolved: false }),
    getSecurityScans(),
  ])

  const dashboard = dashboardResult.data
  const anomalies = anomaliesResult.data
  const scans = scansResult.data

  // Health score badge color
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/10 text-green-500 border-green-500/20'
    if (score >= 60) return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    if (score >= 40) return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    return 'bg-red-500/10 text-red-500 border-red-500/20'
  }

  return (
    <div className="flex-1 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="h-8 w-8" />
          Monitoramento do Sistema
        </h2>
        <p className="text-muted-foreground">
          Saude do sistema, deteccao de anomalias e varreduras de seguranca
        </p>
      </div>

      {/* Health Score Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saude do Sistema</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.healthScore ?? 0}%</div>
            <Badge variant="outline" className={getHealthColor(dashboard?.healthScore ?? 0)}>
              {dashboard?.healthStatus ?? 'N/A'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anomalias Abertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.openAnomalies ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.totalAnomaliesLast7d ?? 0} nos ultimos 7 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ultima Varredura</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.lastScanStatus === 'CLEAN' ? (
                <span className="text-green-500">Limpo</span>
              ) : dashboard?.lastScanStatus === 'WARNING' ? (
                <span className="text-amber-500">Atencao</span>
              ) : dashboard?.lastScanStatus === 'CRITICAL' ? (
                <span className="text-red-500">Critico</span>
              ) : (
                'N/A'
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erros Rastreados</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.errorStats?.uniqueErrors ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.errorStats?.totalTracked ?? 0} ocorrencias totais
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <MonitoringActions />

      {/* Tabs */}
      <Tabs defaultValue="anomalies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="anomalies">Anomalias</TabsTrigger>
          <TabsTrigger value="security">Seguranca</TabsTrigger>
        </TabsList>

        <TabsContent value="anomalies">
          <AnomalyList anomalies={anomalies?.items || []} />
        </TabsContent>

        <TabsContent value="security">
          <SecurityScanList scans={scans?.items || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
