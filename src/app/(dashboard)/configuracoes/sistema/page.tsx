import { requireAdmin } from '@/lib/route-guard'
import { getAnomalies } from '@/app/actions/monitoring-actions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import {
  Monitor,
  HardDrive,
  ArrowUpCircle,
  Heart,
  ShieldAlert,
  Database,
  Construction,
} from 'lucide-react'
import { SystemOverview } from '@/components/system/system-overview'
import { StorageUsage } from '@/components/monitoring/storage-usage'
import { HealthChart } from '@/components/monitoring/health-chart'
import { FraudAlerts } from '@/components/monitoring/fraud-alerts'
import { AnomalyList } from '@/components/monitoring/anomaly-list'
import { BackupManager } from '@/components/monitoring/backup-manager'

export const dynamic = 'force-dynamic'

export default async function SistemaPage() {
  await requireAdmin()

  const anomaliesResult = await getAnomalies({ resolved: false })
  const anomalies = anomaliesResult.data

  return (
    <div className="flex-1 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Monitor className="h-8 w-8" />
          Painel de Controle do Sistema
        </h2>
        <p className="text-muted-foreground">
          Monitoramento, armazenamento, saude e gerenciamento do sistema
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">
            <Monitor className="mr-1.5 h-3.5 w-3.5" />
            Visao Geral
          </TabsTrigger>
          <TabsTrigger value="storage">
            <HardDrive className="mr-1.5 h-3.5 w-3.5" />
            Armazenamento
          </TabsTrigger>
          <TabsTrigger value="updates">
            <ArrowUpCircle className="mr-1.5 h-3.5 w-3.5" />
            Atualizacoes
          </TabsTrigger>
          <TabsTrigger value="health">
            <Heart className="mr-1.5 h-3.5 w-3.5" />
            Saude
          </TabsTrigger>
          <TabsTrigger value="anomalies">
            <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
            Anomalias
          </TabsTrigger>
          <TabsTrigger value="backup">
            <Database className="mr-1.5 h-3.5 w-3.5" />
            Backup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <SystemOverview />
        </TabsContent>

        <TabsContent value="storage">
          <StorageUsage />
        </TabsContent>

        <TabsContent value="updates">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <Construction className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">Em desenvolvimento</p>
              <p className="text-sm text-muted-foreground">
                O gerenciamento de atualizacoes estara disponivel em breve.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health">
          <HealthChart />
        </TabsContent>

        <TabsContent value="anomalies">
          <FraudAlerts />
          <div className="mt-4">
            <AnomalyList anomalies={anomalies?.items || []} />
          </div>
        </TabsContent>

        <TabsContent value="backup">
          <BackupManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
