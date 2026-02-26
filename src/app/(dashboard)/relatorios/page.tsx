import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    BarChart3,
    FileText,
    TrendingUp,
    Users,
    Package,
    DollarSign,
    Ruler,
    Building2,
    ArrowRight,
    Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { RelatoriosMedicoesPorStatus } from "@/components/relatorios/relatorios-medicoes-status"
import { RelatoriosFinanceiro } from "@/components/relatorios/relatorios-financeiro"

export default async function RelatoriosPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Dados para o painel de relatórios
    const [
        bulletinStats,
        contractStats,
        financialStats,
        inventoryStats,
        employeeStats,
        projectStats,
    ] = await Promise.all([
        // Boletins por status
        prisma.measurementBulletin.groupBy({
            by: ['status'],
            where: { project: { companyId } },
            _count: { id: true },
            _sum: { totalValue: true },
        }),
        // Contratos por status
        prisma.contract.groupBy({
            by: ['status'],
            where: { companyId },
            _count: { id: true },
            _sum: { value: true },
        }),
        // Financeiro do mês
        prisma.financialRecord.groupBy({
            by: ['type'],
            where: {
                companyId,
                dueDate: { gte: startOfMonth, lte: endOfMonth }
            },
            _sum: { amount: true },
            _count: { id: true },
        }),
        // Estoque (total de materiais por categoria)
        prisma.material.groupBy({
            by: ['category'],
            where: { companyId },
            _count: { id: true },
            _sum: { currentStock: true },
        }),
        // Funcionários por status
        prisma.employee.groupBy({
            by: ['status'],
            where: { companyId },
            _count: { id: true },
        }),
        // Projetos por status
        prisma.project.groupBy({
            by: ['status'],
            where: { companyId },
            _count: { id: true },
        }),
    ])

    // Processar dados de boletins
    const bulletinByStatus = Object.fromEntries(
        bulletinStats.map(s => [s.status, { count: s._count.id, value: Number(s._sum.totalValue || 0) }])
    )
    const totalBulletinValue = bulletinStats.reduce((acc, s) => acc + Number(s._sum.totalValue || 0), 0)
    const approvedValue = bulletinByStatus['APPROVED']?.value || 0
    const pendingValue = (bulletinByStatus['PENDING_APPROVAL']?.value || 0) + (bulletinByStatus['DRAFT']?.value || 0)

    // Processar dados financeiros
    const receita = financialStats.find(f => f.type === 'INCOME')
    const despesa = financialStats.find(f => f.type === 'EXPENSE')
    const saldoMes = Number(receita?._sum.amount || 0) - Number(despesa?._sum.amount || 0)

    // Projetos ativos
    const projetosAtivos = projectStats
        .filter(p => p.status === 'IN_PROGRESS' || p.status === 'PLANNING')
        .reduce((acc, p) => acc + p._count.id, 0)

    // Funcionários ativos
    const funcionariosAtivos = employeeStats.find(e => e.status === 'ACTIVE')?._count.id || 0

    // Contratos ativos
    const contratosAtivos = contractStats.find(c => c.status === 'ACTIVE')?._count.id || 0
    const valorContratosAtivos = Number(contractStats.find(c => c.status === 'ACTIVE')?._sum.value || 0)

    const fmt = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(n)

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
                <p className="text-muted-foreground">
                    Visão consolidada de todos os módulos — {now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                </p>
            </div>

            {/* Resumo Executivo */}
            <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Resumo Executivo
                </h2>
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Projetos Ativos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{projetosAtivos}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Contratos Ativos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{contratosAtivos}</div>
                            <p className="text-xs text-muted-foreground">{fmt(valorContratosAtivos)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Boletins Aprovados</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-700">{bulletinByStatus['APPROVED']?.count || 0}</div>
                            <p className="text-xs text-muted-foreground">{fmt(approvedValue)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Aguardando Aprovação</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">
                                {(bulletinByStatus['PENDING_APPROVAL']?.count || 0) + (bulletinByStatus['DRAFT']?.count || 0)}
                            </div>
                            <p className="text-xs text-muted-foreground">{fmt(pendingValue)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Saldo do Mês</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${saldoMes >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                {fmt(saldoMes)}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Funcionários Ativos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{funcionariosAtivos}</div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Relatórios Detalhados por Módulo */}
            <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Relatórios por Módulo
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

                    {/* Boletins */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Ruler className="h-4 w-4 text-blue-600" />
                                    Medições
                                </CardTitle>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href="/measurements">
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                            <CardDescription>Boletins de medição por status</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RelatoriosMedicoesPorStatus stats={bulletinStats.map(s => ({
                                status: s.status,
                                count: s._count.id,
                                value: Number(s._sum.totalValue || 0)
                            }))} />
                            <div className="mt-3 pt-3 border-t">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Total Medido</span>
                                    <span className="font-semibold">{fmt(totalBulletinValue)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Financeiro */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <DollarSign className="h-4 w-4 text-green-600" />
                                    Financeiro
                                </CardTitle>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href="/financeiro/faturamento">
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                            <CardDescription>Lançamentos do mês corrente</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RelatoriosFinanceiro
                                receita={Number(receita?._sum.amount || 0)}
                                despesa={Number(despesa?._sum.amount || 0)}
                                saldo={saldoMes}
                            />
                        </CardContent>
                    </Card>

                    {/* Contratos */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <FileText className="h-4 w-4 text-purple-600" />
                                    Contratos
                                </CardTitle>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href="/contratos">
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                            <CardDescription>Status da carteira de contratos</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {contractStats.map(s => (
                                <div key={s.status} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${
                                            s.status === 'ACTIVE' ? 'bg-green-500' :
                                            s.status === 'COMPLETED' ? 'bg-blue-500' :
                                            s.status === 'DRAFT' ? 'bg-gray-400' : 'bg-red-500'
                                        }`} />
                                        <span className="text-muted-foreground capitalize">
                                            {s.status === 'ACTIVE' ? 'Ativo' :
                                             s.status === 'COMPLETED' ? 'Concluído' :
                                             s.status === 'DRAFT' ? 'Rascunho' : 'Cancelado'}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-medium">{s._count.id}</span>
                                        <span className="text-muted-foreground ml-2 text-xs">{fmt(Number(s._sum.value || 0))}</span>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* RH */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Users className="h-4 w-4 text-orange-600" />
                                    Recursos Humanos
                                </CardTitle>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href="/rh/funcionarios">
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                            <CardDescription>Quadro de funcionários</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {employeeStats.map(s => (
                                <div key={s.status} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${
                                            s.status === 'ACTIVE' ? 'bg-green-500' :
                                            s.status === 'ON_LEAVE' ? 'bg-yellow-500' : 'bg-gray-400'
                                        }`} />
                                        <span className="text-muted-foreground">
                                            {s.status === 'ACTIVE' ? 'Ativo' :
                                             s.status === 'ON_LEAVE' ? 'Afastado' : 'Inativo'}
                                        </span>
                                    </div>
                                    <span className="font-medium">{s._count.id}</span>
                                </div>
                            ))}
                            <div className="pt-2 border-t mt-2">
                                <Button variant="outline" size="sm" className="w-full" asChild>
                                    <Link href="/rh/folha">
                                        <Calendar className="h-4 w-4 mr-2" />
                                        Ver Folha de Pagamento
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Estoque */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Package className="h-4 w-4 text-cyan-600" />
                                    Estoque
                                </CardTitle>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href="/estoque">
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                            <CardDescription>Materiais por categoria</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-1.5">
                            {inventoryStats.slice(0, 5).map(s => (
                                <div key={s.category} className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground truncate">{s.category}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{s._count.id} itens</span>
                                    </div>
                                </div>
                            ))}
                            {inventoryStats.length === 0 && (
                                <p className="text-sm text-muted-foreground">Nenhum material cadastrado.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Projetos */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Building2 className="h-4 w-4 text-indigo-600" />
                                    Projetos
                                </CardTitle>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href="/projects">
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                            <CardDescription>Status do portfólio de projetos</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {projectStats.map(s => (
                                <div key={s.status} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${
                                            s.status === 'IN_PROGRESS' ? 'bg-green-500' :
                                            s.status === 'COMPLETED' ? 'bg-blue-500' :
                                            s.status === 'ON_HOLD' ? 'bg-yellow-500' :
                                            s.status === 'PLANNING' ? 'bg-purple-500' : 'bg-gray-400'
                                        }`} />
                                        <span className="text-muted-foreground">
                                            {s.status === 'IN_PROGRESS' ? 'Em Andamento' :
                                             s.status === 'COMPLETED' ? 'Concluído' :
                                             s.status === 'ON_HOLD' ? 'Pausado' :
                                             s.status === 'PLANNING' ? 'Planejamento' : 'Cancelado'}
                                        </span>
                                    </div>
                                    <span className="font-medium">{s._count.id}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Benchmark de Obras */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                                    Benchmark de Obras
                                </CardTitle>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href="/relatorios/benchmark">
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                            <CardDescription>Custo por m² entre projetos</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Compare o custo realizado e orçado por m² entre obras em andamento e concluídas.</p>
                            <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                                <Link href="/relatorios/benchmark">
                                    <TrendingUp className="h-4 w-4 mr-2" />
                                    Ver Benchmark
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>


                    {/* Executivo */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <BarChart3 className="h-4 w-4 text-slate-600" />
                                    Relatorio Executivo
                                </CardTitle>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href="/relatorios/executivo"><ArrowRight className="h-4 w-4" /></Link>
                                </Button>
                            </div>
                            <CardDescription>Visao executiva consolidada em uma pagina</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Resumo completo de obras, financeiro, equipe e alertas para decisoes rapidas.</p>
                            <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                                <Link href="/relatorios/executivo">
                                    <BarChart3 className="h-4 w-4 mr-2" />Ver Relatorio Executivo
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Comparativo */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <TrendingUp className="h-4 w-4 text-violet-600" />
                                    Comparativo entre Obras
                                </CardTitle>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href="/relatorios/comparativo"><ArrowRight className="h-4 w-4" /></Link>
                                </Button>
                            </div>
                            <CardDescription>Analise comparativa de projetos ativos e concluidos</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Ranking de rentabilidade, andamento e grafico comparativo orcamento vs medido.</p>
                            <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                                <Link href="/relatorios/comparativo">
                                    <TrendingUp className="h-4 w-4 mr-2" />Ver Comparativo
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Capacidade */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Users className="h-4 w-4 text-teal-600" />
                                    Projecao de Capacidade
                                </CardTitle>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href="/relatorios/capacidade"><ArrowRight className="h-4 w-4" /></Link>
                                </Button>
                            </div>
                            <CardDescription>Capacidade disponivel da equipe e equipamentos</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Quantos projetos a equipe atual pode absorver e status dos equipamentos.</p>
                            <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                                <Link href="/relatorios/capacidade">
                                    <Users className="h-4 w-4 mr-2" />Ver Capacidade
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>


                </div>
            </div>
        </div>
    )
}
