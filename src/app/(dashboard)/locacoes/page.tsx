import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getRentals, getRentalItems, getRentalKPIs } from '@/app/actions/rental-actions'
import { getProjects } from '@/app/actions/project-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { KeyRound, TrendingDown, AlertTriangle, Building2, Truck, Package } from 'lucide-react'
import { RentalsTable } from '@/components/locacoes/rentals-table'
import { RentalDialog } from '@/components/locacoes/rental-dialog'
import { RentalItemDialog } from '@/components/locacoes/rental-item-dialog'
import { RentalItemsTable } from '@/components/locacoes/rental-items-table'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export default async function LocacoesPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const companyId = session.user?.companyId
  if (!companyId) redirect('/login')

  const [rentalsResult, itemsResult, kpisResult, projectsResult] = await Promise.all([
    getRentals({ companyId }),
    getRentalItems(companyId),
    getRentalKPIs(companyId),
    getProjects(companyId),
  ])

  const rentals = rentalsResult.data ?? []
  const items = itemsResult.data ?? []
  const kpis = kpisResult.data ?? {
    activeCount: 0,
    overdueCount: 0,
    monthlyCost: 0,
    properties: 0,
    vehicles: 0,
    equipment: 0,
  }
  const projects = (projectsResult.data ?? []).map((p: { id: string; name: string }) => ({
    id: p.id,
    name: p.name,
  }))

  const activeRentals = rentals.filter((r) => r.status === 'ACTIVE' || r.status === 'OVERDUE')
  const historyRentals = rentals.filter((r) => r.status === 'RETURNED' || r.status === 'CANCELLED')

  const itemsForDialog = items.map((i) => ({
    id: i.id,
    name: i.name,
    type: i.type,
    dailyRate: i.dailyRate != null ? Number(i.dailyRate) : null,
    weeklyRate: i.weeklyRate != null ? Number(i.weeklyRate) : null,
    monthlyRate: i.monthlyRate != null ? Number(i.monthlyRate) : null,
  }))

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Locações</h2>
          <p className="text-muted-foreground">
            Gestão de locações de imóveis, veículos e equipamentos para obras
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <RentalItemDialog companyId={companyId} />
          <RentalDialog companyId={companyId} items={itemsForDialog} projects={projects} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locações Ativas</CardTitle>
            <KeyRound className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{kpis.activeCount}</div>
            <p className="text-xs text-muted-foreground">Contratos em andamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Mensal Estimado</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(kpis.monthlyCost)}
            </div>
            <p className="text-xs text-muted-foreground">Soma das locações ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Categoria</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-1 flex-wrap mt-1">
              <Badge variant="outline" className="text-xs gap-1">
                <Building2 className="h-3 w-3" />
                {kpis.properties} imóv.
              </Badge>
              <Badge variant="outline" className="text-xs gap-1">
                <Truck className="h-3 w-3" />
                {kpis.vehicles} veíc.
              </Badge>
              <Badge variant="outline" className="text-xs gap-1">
                <Package className="h-3 w-3" />
                {kpis.equipment} equip.
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locações Vencidas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{kpis.overdueCount}</div>
            <p className="text-xs text-muted-foreground">Requerem atenção</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ativas">
        <TabsList>
          <TabsTrigger value="ativas">Locações Ativas</TabsTrigger>
          <TabsTrigger value="itens">Itens Cadastrados</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="ativas" className="mt-4">
          <RentalsTable rentals={activeRentals} />
        </TabsContent>

        <TabsContent value="itens" className="mt-4">
          <RentalItemsTable items={items} companyId={companyId} />
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <RentalsTable rentals={historyRentals} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
