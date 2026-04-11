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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    BarChart3,
    FileText,
    TrendingUp,
    TrendingDown,
    Users,
    Package,
    DollarSign,
    Ruler,
    Building2,
    ArrowRight,
    Calendar,
    AlertTriangle,
    Clock,
    Percent,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { RelatoriosMedicoesPorStatus } from "@/components/relatorios/relatorios-medicoes-status"
import { RelatoriosFinanceiro } from "@/components/relatorios/relatorios-financeiro"
import { getConsolidatedReports } from "@/app/actions/financial-report-actions"

export const dynamic = 'force-dynamic'

const fmt = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(n)
const fmtCompact = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(n)
const fmtPercent = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n / 100)
const fmtNumber = (n: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n)

const statusLabel: Record<string, string> = {
    IN_PROGRESS: 'Em Andamento',
    PLANNING: 'Planejamento',
    COMPLETED: 'Concluido',
    ON_HOLD: 'Pausado',
    CANCELLED: 'Cancelado',
    BIDDING: 'Licitacao',
    AWARDED: 'Adjudicado',
    HANDOVER: 'Entregue',
}

export default async function RelatoriosPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Dados para o painel de relatórios + relatório consolidado
    const [
        bulletinStats,
        contractStats,
        financialStats,
        inventoryStats,
        employeeStats,
        projectStats,
        consolidatedResult,
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
        // Relatório consolidado
        getConsolidatedReports(),
    ])

    const consolidated = consolidatedResult.data

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

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Relatorios</h1>
                <p className="text-muted-foreground">
                    Visao consolidada de todos os modulos — {now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                </p>
            </div>

            {/* Cards de Resumo Financeiro Consolidado */}
            {consolidated && (
                <div>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Resultado Financeiro do Mes
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                                    <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                                    Receita Total
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-700">{fmt(consolidated.receitaTotal)}</div>
                                <p className="text-xs text-muted-foreground mt-1">Entradas no periodo</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                                    <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                                    Despesa Total
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">{fmt(consolidated.despesaTotal)}</div>
                                <p className="text-xs text-muted-foreground mt-1">Saidas no periodo</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                                    <DollarSign className="h-3.5 w-3.5" />
                                    Lucro
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${consolidated.lucro >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                    {fmt(consolidated.lucro)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Receita - Despesa</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                                    <Percent className="h-3.5 w-3.5" />
                                    Margem
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${consolidated.margemPercent >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                    {fmtPercent(consolidated.margemPercent)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Margem de lucro</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Resumo Executivo (existente) */}
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
                            <p className="text-xs text-muted-foreground">{fmtCompact(valorContratosAtivos)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Boletins Aprovados</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-700">{bulletinByStatus['APPROVED']?.count || 0}</div>
                            <p className="text-xs text-muted-foreground">{fmtCompact(approvedValue)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Aguardando Aprovacao</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">
                                {(bulletinByStatus['PENDING_APPROVAL']?.count || 0) + (bulletinByStatus['DRAFT']?.count || 0)}
                            </div>
                            <p className="text-xs text-muted-foreground">{fmtCompact(pendingValue)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Saldo do Mes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${saldoMes >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                {fmtCompact(saldoMes)}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Funcionarios Ativos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{funcionariosAtivos}</div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Projetos por Faturamento + Funcionários com mais Horas */}
            {consolidated && (
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Tabela de Projetos por Faturamento */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Building2 className="h-4 w-4 text-indigo-600" />
                                Top Projetos por Faturamento
                            </CardTitle>
                            <CardDescription>Projetos com maior movimentacao financeira no mes</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {consolidated.topProjects.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Projeto</TableHead>
                                            <TableHead className="text-right">Receita</TableHead>
                                            <TableHead className="text-right">Despesa</TableHead>
                                            <TableHead className="text-right">Lucro</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {consolidated.topProjects.map((project) => (
                                            <TableRow key={project.id}>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <Link
                                                            href={`/projects/${project.id}`}
                                                            className="font-medium hover:underline"
                                                        >
                                                            {project.name}
                                                        </Link>
                                                        <Badge variant="outline" className="w-fit mt-1 text-[10px]">
                                                            {statusLabel[project.status] || project.status}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right text-green-700 font-medium">
                                                    {fmtCompact(project.totalRevenue)}
                                                </TableCell>
                                                <TableCell className="text-right text-red-600">
                                                    {fmtCompact(project.totalExpense)}
                                                </TableCell>
                                                <TableCell className={`text-right font-semibold ${project.profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                                    {fmtCompact(project.profit)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-6">
                                    Nenhuma movimentacao financeira vinculada a projetos neste mes.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Funcionários com mais horas */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Clock className="h-4 w-4 text-orange-600" />
                                Funcionarios com Mais Horas
                            </CardTitle>
                            <CardDescription>Ranking de horas registradas no mes</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {consolidated.topEmployeesByHours.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Funcionario</TableHead>
                                            <TableHead>Cargo</TableHead>
                                            <TableHead className="text-right">Horas</TableHead>
                                            <TableHead className="text-right">Projetos</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {consolidated.topEmployeesByHours.map((emp) => (
                                            <TableRow key={emp.id}>
                                                <TableCell className="font-medium">{emp.name}</TableCell>
                                                <TableCell className="text-muted-foreground">{emp.jobTitle}</TableCell>
                                                <TableCell className="text-right font-semibold">
                                                    {fmtNumber(emp.totalHours)}h
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant="secondary">{emp.projectCount}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-6">
                                    Nenhum registro de horas encontrado neste mes.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Seção de Alertas */}
            {consolidated && (consolidated.expiringContracts.length > 0 || consolidated.lowStockMaterials.length > 0) && (
                <div>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Alertas
                    </h2>
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Contratos Vencendo */}
                        {consolidated.expiringContracts.length > 0 && (
                            <Card className="border-amber-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <FileText className="h-4 w-4 text-amber-600" />
                                        Contratos Proximos do Vencimento
                                    </CardTitle>
                                    <CardDescription>Contratos que vencem nos proximos 30 dias</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Contrato</TableHead>
                                                <TableHead>Projeto</TableHead>
                                                <TableHead className="text-right">Valor</TableHead>
                                                <TableHead className="text-right">Vencimento</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {consolidated.expiringContracts.map((contract) => (
                                                <TableRow key={contract.id}>
                                                    <TableCell>
                                                        <Link
                                                            href={`/contratos/${contract.id}`}
                                                            className="font-medium hover:underline"
                                                        >
                                                            {contract.identifier}
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {contract.projectName}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {fmtCompact(contract.value)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge
                                                            variant={contract.daysRemaining <= 7 ? "destructive" : "outline"}
                                                            className={contract.daysRemaining <= 7 ? '' : 'border-amber-300 text-amber-700'}
                                                        >
                                                            {contract.daysRemaining} dias
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}

                        {/* Estoque Baixo */}
                        {consolidated.lowStockMaterials.length > 0 && (
                            <Card className="border-amber-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Package className="h-4 w-4 text-amber-600" />
                                        Estoque Abaixo do Minimo
                                    </CardTitle>
                                    <CardDescription>Materiais que precisam de reposicao</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Material</TableHead>
                                                <TableHead className="text-right">Estoque Atual</TableHead>
                                                <TableHead className="text-right">Minimo</TableHead>
                                                <TableHead className="text-right">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {consolidated.lowStockMaterials.map((material) => {
                                                const ratio = material.minStock > 0
                                                    ? material.currentStock / material.minStock
                                                    : 0
                                                return (
                                                    <TableRow key={material.id}>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">{material.name}</span>
                                                                <span className="text-xs text-muted-foreground">{material.code}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium">
                                                            {fmtNumber(material.currentStock)} {material.unit}
                                                        </TableCell>
                                                        <TableCell className="text-right text-muted-foreground">
                                                            {fmtNumber(material.minStock)} {material.unit}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Badge
                                                                variant={ratio <= 0.25 ? "destructive" : "outline"}
                                                                className={ratio <= 0.25 ? '' : 'border-amber-300 text-amber-700'}
                                                            >
                                                                {ratio <= 0 ? 'Zerado' : ratio <= 0.25 ? 'Critico' : 'Baixo'}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            )}

            {/* Relatórios Detalhados por Módulo */}
            <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Relatorios por Modulo
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

                    {/* Boletins */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Ruler className="h-4 w-4 text-blue-600" />
                                    Medicoes
                                </CardTitle>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href="/measurements">
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                            <CardDescription>Boletins de medicao por status</CardDescription>
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
                                    <span className="font-semibold">{fmtCompact(totalBulletinValue)}</span>
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
                            <CardDescription>Lancamentos do mes corrente</CardDescription>
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
                                             s.status === 'COMPLETED' ? 'Concluido' :
                                             s.status === 'DRAFT' ? 'Rascunho' : 'Cancelado'}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-medium">{s._count.id}</span>
                                        <span className="text-muted-foreground ml-2 text-xs">{fmtCompact(Number(s._sum.value || 0))}</span>
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
                            <CardDescription>Quadro de funcionarios</CardDescription>
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
                            <CardDescription>Status do portfolio de projetos</CardDescription>
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
                                             s.status === 'COMPLETED' ? 'Concluido' :
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
                            <CardDescription>Custo por m2 entre projetos</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Compare o custo realizado e orcado por m2 entre obras em andamento e concluidas.</p>
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
