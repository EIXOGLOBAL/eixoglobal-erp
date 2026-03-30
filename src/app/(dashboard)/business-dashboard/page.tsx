import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Building2,
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Zap,
} from "lucide-react"

export const dynamic = 'force-dynamic'

/**
 * BUS-01: Business Dashboard - Overview of all business metrics
 */
export default async function BusinessDashboardPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const companyId = session.user?.companyId
  if (!companyId) redirect("/login")

  // Get overview data
  const [projects, contracts, bulletins, financialRecords, employees] = await Promise.all([
    prisma.project.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        status: true,
        budget: true,
      },
    }),
    prisma.contract.findMany({
      where: { companyId },
      select: {
        id: true,
        identifier: true,
        status: true,
        value: true,
      },
    }),
    prisma.measurementBulletin.findMany({
      where: {
        project: { companyId },
      },
      select: {
        id: true,
        status: true,
        totalValue: true,
      },
    }),
    prisma.financialRecord.findMany({
      where: { companyId },
      select: {
        id: true,
        type: true,
        amount: true,
        status: true,
      },
    }),
    prisma.employee.findMany({
      where: { companyId, status: 'ACTIVE' },
      select: { id: true },
    }),
  ])

  // Calculate KPIs
  const activeProjects = projects.filter(p => p.status !== 'COMPLETED').length
  const totalProjectBudget = projects.reduce((sum, p) => sum + Number(p.budget || 0), 0)

  const activeContracts = contracts.filter(c => c.status === 'ACTIVE').length
  const totalContractValue = contracts.reduce((sum, c) => sum + Number(c.value || 0), 0)

  const approvedBulletins = bulletins.filter(b => b.status === 'APPROVED').length
  const totalMeasuredValue = bulletins.reduce((sum, b) => sum + Number(b.totalValue || 0), 0)

  const revenue = financialRecords
    .filter(f => f.type === 'INCOME' && f.status === 'PAID')
    .reduce((sum, f) => sum + Number(f.amount || 0), 0)

  const expenses = financialRecords
    .filter(f => f.type === 'EXPENSE' && f.status === 'PAID')
    .reduce((sum, f) => sum + Number(f.amount || 0), 0)

  const profit = revenue - expenses
  const activeEmployees = employees.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel de Negócios</h1>
        <p className="text-muted-foreground">
          Visão consolidada de todos os indicadores de negócios
        </p>
      </div>

      {/* KPI Cards - 4 columns */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos Ativos</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjects}</div>
            <p className="text-xs text-muted-foreground">
              de {projects.length} projetos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orçamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 0,
              }).format(totalProjectBudget)}
            </div>
            <p className="text-xs text-muted-foreground">
              em projetos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 0,
              }).format(profit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Receita - Despesa
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Colaboradores</CardTitle>
            <Users className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEmployees}</div>
            <p className="text-xs text-muted-foreground">
              equipe ativa
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics Tabs */}
      <Tabs defaultValue="contratos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contratos">Contratos</TabsTrigger>
          <TabsTrigger value="medicoes">Medições</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        </TabsList>

        {/* BUS-02: Contract Management Metrics */}
        <TabsContent value="contratos">
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Contratos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Contratos Ativos</p>
                  <p className="text-3xl font-bold">{activeContracts}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
                  <p className="text-3xl font-bold">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      minimumFractionDigits: 0,
                    }).format(totalContractValue)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Valor Médio</p>
                  <p className="text-3xl font-bold">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      minimumFractionDigits: 0,
                    }).format(activeContracts > 0 ? totalContractValue / activeContracts : 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BUS-03: Measurement & Billing Metrics */}
        <TabsContent value="medicoes">
          <Card>
            <CardHeader>
              <CardTitle>Medições e Faturamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Boletins Aprovados</p>
                  <p className="text-3xl font-bold">{approvedBulletins}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Valor Medido</p>
                  <p className="text-3xl font-bold">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      minimumFractionDigits: 0,
                    }).format(totalMeasuredValue)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Taxa de Faturamento</p>
                  <p className="text-3xl font-bold">
                    {totalContractValue > 0 ? ((totalMeasuredValue / totalContractValue) * 100).toFixed(1) : '0'}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BUS-04: Financial Health Metrics */}
        <TabsContent value="financeiro">
          <Card>
            <CardHeader>
              <CardTitle>Saúde Financeira</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Receita</p>
                  <p className="text-2xl font-bold text-green-600">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      minimumFractionDigits: 0,
                    }).format(revenue)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Despesas</p>
                  <p className="text-2xl font-bold text-red-600">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      minimumFractionDigits: 0,
                    }).format(expenses)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Lucro</p>
                  <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      minimumFractionDigits: 0,
                    }).format(profit)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Margem</p>
                  <p className={`text-2xl font-bold ${((profit / revenue) * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0'}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
