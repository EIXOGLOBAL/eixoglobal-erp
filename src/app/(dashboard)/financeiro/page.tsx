import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DollarSign,
  TrendingDown,
  Wallet,
  ArrowUpCircle,
  ArrowRight,
  CreditCard,
  TrendingUp,
  BarChart3,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency, toNumber } from '@/lib/formatters'

export const dynamic = 'force-dynamic'

export default async function FinanceiroPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const companyId = session.user?.companyId
  if (!companyId) redirect('/login')

  let kpis = {
    receitaTotal: 0,
    despesas: 0,
    saldoContas: 0,
    contasReceber: 0,
  }

  try {
    const [revenueAgg, expenseAgg, receivablesAgg, payablesAgg] =
      await Promise.all([
        prisma.financialRecord.aggregate({
          _sum: { amount: true },
          where: { companyId, type: 'INCOME', status: 'PAID' },
        }),
        prisma.financialRecord.aggregate({
          _sum: { amount: true },
          where: { companyId, type: 'EXPENSE', status: 'PAID' },
        }),
        prisma.financialRecord.aggregate({
          _sum: { amount: true },
          where: { companyId, type: 'INCOME', status: 'PENDING' },
        }),
        prisma.financialRecord.aggregate({
          _sum: { amount: true },
          where: { companyId, type: 'EXPENSE', status: 'PENDING' },
        }),
      ])

    const receitaTotal = toNumber(revenueAgg._sum.amount)
    const despesas = toNumber(expenseAgg._sum.amount)

    kpis = {
      receitaTotal,
      despesas,
      saldoContas: receitaTotal - despesas,
      contasReceber: toNumber(receivablesAgg._sum.amount),
    }
  } catch {
    // fallback to zeros on error
  }

  const subModules = [
    {
      title: 'Fluxo de Caixa',
      description: 'Visualize o fluxo de caixa projetado e realizado',
      href: '/financeiro/fluxo-de-caixa',
      icon: TrendingUp,
    },
    {
      title: 'DRE',
      description: 'Demonstração de Resultado do Exercício',
      href: '/financeiro/dre',
      icon: BarChart3,
    },
    {
      title: 'Faturamento',
      description: 'Controle de vendas e faturamento',
      href: '/financeiro/faturamento',
      icon: DollarSign,
    },
    {
      title: 'Recebíveis',
      description: 'Contas a receber e cobranças',
      href: '/financeiro/recebiveis',
      icon: ArrowUpCircle,
    },
    {
      title: 'Despesas',
      description: 'Gestão de despesas operacionais',
      href: '/financeiro/despesas',
      icon: TrendingDown,
    },
    {
      title: 'Documentos Fiscais',
      description: 'Notas fiscais e documentação',
      href: '/financeiro/notas',
      icon: CreditCard,
    },
    {
      title: 'Fornecedores',
      description: 'Gestão de fornecedores e pagamentos',
      href: '/financeiro/fornecedores',
      icon: ArrowRight,
    },
    {
      title: 'Centros de Custo',
      description: 'Análise por centros de custo',
      href: '/financeiro/centros-de-custo',
      icon: BarChart3,
    },
    {
      title: 'Conciliação',
      description: 'Conciliação bancária',
      href: '/financeiro/conciliacao',
      icon: AlertCircle,
    },
    {
      title: 'Inadimplência',
      description: 'Monitoramento de contas vencidas',
      href: '/financeiro/inadimplencia',
      icon: AlertCircle,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Módulo Financeiro</h1>
        <p className="text-muted-foreground">
          Gestão completa das finanças da empresa
        </p>
      </div>

      {/* KPI Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Indicadores Principais
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Receita Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-700">
                    {formatCurrency(kpis.receitaTotal)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Este mês
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Despesas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-700">
                    {formatCurrency(kpis.despesas)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Este mês
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Saldo em Contas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-700">
                    {formatCurrency(kpis.saldoContas)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Disponível
                  </p>
                </div>
                <Wallet className="h-8 w-8 text-blue-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Contas a Receber
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-700">
                    {formatCurrency(kpis.contasReceber)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Em aberto
                  </p>
                </div>
                <ArrowUpCircle className="h-8 w-8 text-orange-600/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sub-modules Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Funcionalidades
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subModules.map((module) => {
            const Icon = module.icon
            return (
              <Card
                key={module.href}
                className="hover:shadow-md transition-shadow cursor-pointer"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-blue-600" />
                      <CardTitle className="text-base">{module.title}</CardTitle>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={module.href}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
