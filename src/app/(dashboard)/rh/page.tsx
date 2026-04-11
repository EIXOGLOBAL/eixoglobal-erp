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
  Users,
  GraduationCap,
  UserCog,
  GitBranch,
  LayoutList,
  ArrowRight,
  Users2,
  Calendar,
  BookOpen,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function RHPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const companyId = session.user?.companyId
  if (!companyId) redirect('/login')

  let kpis = {
    totalFuncionarios: 0,
    alocados: 0,
    deFerias: 0,
    treinamentosAtivos: 0,
  }

  try {
    const now = new Date()

    const [totalFuncionarios, alocados, deFerias, treinamentosAtivos] =
      await Promise.all([
        prisma.employee.count({
          where: { companyId, status: 'ACTIVE' },
        }),
        prisma.employee.count({
          where: {
            companyId,
            status: 'ACTIVE',
            allocations: {
              some: {
                startDate: { lte: now },
                OR: [{ endDate: null }, { endDate: { gte: now } }],
              },
            },
          },
        }),
        prisma.vacationRequest.count({
          where: {
            employee: { companyId },
            status: 'APPROVED',
            startDate: { lte: now },
            endDate: { gte: now },
          },
        }),
        prisma.training.count({
          where: {
            companyId,
            status: 'IN_PROGRESS',
          },
        }),
      ])

    kpis = { totalFuncionarios, alocados, deFerias, treinamentosAtivos }
  } catch {
    // fallback to zeros on error
  }

  const subModules = [
    {
      title: 'Funcionários',
      description: 'Gestão de cadastro de funcionários',
      href: '/rh/funcionarios',
      icon: Users,
    },
    {
      title: 'Folha de Pagamento',
      description: 'Controle de folha e contracheques',
      href: '/rh/folha',
      icon: LayoutList,
    },
    {
      title: 'Alocações',
      description: 'Alocação de recursos em projetos',
      href: '/rh/alocacoes',
      icon: UserCog,
    },
    {
      title: 'Treinamentos',
      description: 'Programas de capacitação e desenvolvimento',
      href: '/rh/treinamentos',
      icon: GraduationCap,
    },
    {
      title: 'Organograma',
      description: 'Estrutura organizacional e hierarquia',
      href: '/rh/organograma',
      icon: GitBranch,
    },
    {
      title: 'Tabela Salarial',
      description: 'Gestão de salários e faixas salariais',
      href: '/rh/tabela-salarial',
      icon: TrendingUp,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Recursos Humanos</h1>
        <p className="text-muted-foreground">
          Gestão completa de pessoas e desenvolvimento organizacional
        </p>
      </div>

      {/* KPI Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Indicadores Principais
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Total de Funcionários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-700">
                    {kpis.totalFuncionarios}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Na empresa
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Alocados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-700">
                    {kpis.alocados}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Em projetos
                  </p>
                </div>
                <UserCog className="h-8 w-8 text-green-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                De Férias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-yellow-700">
                    {kpis.deFerias}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Período vigente
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-yellow-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Treinamentos Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-700">
                    {kpis.treinamentosAtivos}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Em andamento
                  </p>
                </div>
                <GraduationCap className="h-8 w-8 text-purple-600/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sub-modules Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
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
                      <Icon className="h-5 w-5 text-orange-600" />
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
