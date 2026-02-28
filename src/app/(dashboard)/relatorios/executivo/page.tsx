import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, Building2, DollarSign, Users, AlertTriangle, CheckSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PrintButton } from "@/components/relatorios/print-button"

export const dynamic = 'force-dynamic'

export default async function RelatorioExecutivoPage() {
    const session = await getSession()
    if (!session) redirect("/login")
    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const [company, projects, employees, financialsCurrent, financialsPrev,
        allocations, trainings, tasks, contracts, equipment, workTasks] = await Promise.all([
        prisma.company.findUnique({ where: { id: companyId }, select: { name: true } }),
        prisma.project.findMany({
            where: { companyId },
            select: {
                id: true, name: true, status: true, budget: true,
                bulletins: { where: { status: { in: ["APPROVED", "BILLED"] } }, select: { totalValue: true } },
            },
        }),
        prisma.employee.findMany({ where: { companyId }, select: { id: true, status: true } }),
        prisma.financialRecord.findMany({
            where: { companyId, dueDate: { gte: startOfMonth, lte: endOfMonth } },
            select: { type: true, amount: true, status: true },
        }),
        prisma.financialRecord.findMany({
            where: { companyId, dueDate: { gte: startOfPrevMonth, lte: endOfPrevMonth } },
            select: { type: true, amount: true },
        }),
        prisma.allocation.findMany({ where: { project: { companyId } }, select: { id: true, endDate: true } }),
        prisma.training.findMany({
            where: { companyId, status: "SCHEDULED", startDate: { gte: now } },
            select: { id: true },
        }),
        prisma.projectTask.findMany({
            where: { project: { companyId } },
            select: { id: true, name: true, status: true, endDate: true, project: { select: { name: true } } },
        }),
        prisma.contract.findMany({
            where: { companyId, status: "ACTIVE", endDate: { lte: in30Days, gte: now } },
            select: { id: true, identifier: true, endDate: true, project: { select: { name: true } } },
        }),
        prisma.equipment.findMany({ where: { companyId }, select: { id: true, status: true } }),
        prisma.workTask.findMany({ where: { companyId }, select: { id: true, status: true, dueDate: true, title: true } }),
    ])

    const activeProjects = projects.filter(p => p.status === "IN_PROGRESS")
    const totalBudgetActive = activeProjects.reduce((sum, p) => sum + Number(p.budget || 0), 0)
    const avgCompletion = activeProjects.length > 0
        ? activeProjects.reduce((sum, p) => {
            const measured = p.bulletins.reduce((s, b) => s + Number(b.totalValue || 0), 0)
            const budget = Number(p.budget || 0)
            return sum + (budget > 0 ? Math.min((measured / budget) * 100, 100) : 0)
        }, 0) / activeProjects.length : 0

    const currentIncome = financialsCurrent.filter(f => f.type === "INCOME").reduce((s, f) => s + Number(f.amount), 0)
    const currentExpense = financialsCurrent.filter(f => f.type === "EXPENSE").reduce((s, f) => s + Number(f.amount), 0)
    const currentNet = currentIncome - currentExpense
    const prevIncome = financialsPrev.filter(f => f.type === "INCOME").reduce((s, f) => s + Number(f.amount), 0)
    const prevExpense = financialsPrev.filter(f => f.type === "EXPENSE").reduce((s, f) => s + Number(f.amount), 0)
    const prevNet = prevIncome - prevExpense
    const netChange = prevNet !== 0 ? ((currentNet - prevNet) / Math.abs(prevNet)) * 100 : 0

    const activeEmployees = employees.filter(e => e.status === "ACTIVE").length
    const activeAllocations = allocations.filter(a => !a.endDate || new Date(a.endDate) > now).length
    const scheduledTrainings = trainings.length

    const overdueTasks = tasks.filter(t => t.status !== "COMPLETED" && t.status !== "CANCELLED" && new Date(t.endDate) < now)
    const equipmentInMaintenance = equipment.filter(e => e.status === "MAINTENANCE").length
    const overduePayments = financialsCurrent.filter(f => f.type === "EXPENSE" && f.status === "PENDING")
    const overduePaymentAmount = overduePayments.reduce((s, f) => s + Number(f.amount), 0)

    const workTasksByStatus = workTasks.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1
        return acc
    }, {} as Record<string, number>)
    const overdueWorkTasks = workTasks.filter(
        t => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE" && t.status !== "CANCELLED"
    ).slice(0, 5)

    const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(n)
    const fmtDate = (d: Date | string | null | undefined) => d ? new Date(d).toLocaleDateString("pt-BR") : "-"
    const statusLabel: Record<string, string> = {
        BACKLOG: "Backlog", TODO: "A Fazer", IN_PROGRESS: "Em Andamento",
        IN_REVIEW: "Em Revisao", DONE: "Concluido", CANCELLED: "Cancelado",
    }
    const widthStyle = (pct: number) => ({ width: Math.min(pct, 100).toFixed(1) + "%" })
    const netClass = currentNet >= 0 ? "text-2xl font-bold text-green-700" : "text-2xl font-bold text-red-600"
    const netChangeClass = netChange >= 0 ? "text-2xl font-bold text-green-700" : "text-2xl font-bold text-red-600"

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between print:hidden">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/relatorios"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Link>
                </Button>
                <PrintButton />
            </div>
            <div className="border-b pb-4">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Building2 className="h-7 w-7" />
                    Relatorio Executivo &mdash; {company?.name ?? "Empresa"}
                </h1>
                <p className="text-muted-foreground mt-1">
                    Gerado em {now.toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
            </div>
            <section>
                <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />Obras em Andamento
                </h2>
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Obras Ativas</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-700">{activeProjects.length}</div>
                            <p className="text-xs text-muted-foreground">{projects.length} total no portfolio</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Orcamento Total Ativo</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold">{fmt(totalBudgetActive)}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Conclusao Media</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{avgCompletion.toFixed(1)}%</div>
                            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-2 bg-blue-600" style={widthStyle(avgCompletion)} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>
            <section>
                <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />Financeiro do Mes
                </h2>
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Receitas</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold text-green-700">{fmt(currentIncome)}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Despesas</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold text-red-600">{fmt(currentExpense)}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Saldo Liquido</CardTitle></CardHeader>
                        <CardContent><div className={netClass}>{fmt(currentNet)}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">vs. Mes Anterior</CardTitle></CardHeader>
                        <CardContent>
                            <div className={netChangeClass}>{netChange >= 0 ? "+" : ""}{netChange.toFixed(1)}%</div>
                            <p className="text-xs text-muted-foreground">Saldo anterior: {fmt(prevNet)}</p>
                        </CardContent>
                    </Card>
                </div>
            </section>
            <section>
                <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-5 w-5 text-orange-600" />Equipe
                </h2>
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Funcionarios Ativos</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{activeEmployees}</div>
                            <p className="text-xs text-muted-foreground">{employees.length} total cadastrados</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Alocacoes Ativas</CardTitle></CardHeader>
                        <CardContent><div className="text-3xl font-bold">{activeAllocations}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Treinamentos Agendados</CardTitle></CardHeader>
                        <CardContent><div className="text-3xl font-bold">{scheduledTrainings}</div></CardContent>
                    </Card>
                </div>
            </section>
            <section>
                <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />Alertas
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                    <Card className={overdueTasks.length > 0 ? "border-red-200 bg-red-50" : ""}>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tarefas de Obra Vencidas</CardTitle></CardHeader>
                        <CardContent>
                            <div className={overdueTasks.length > 0 ? "text-3xl font-bold text-red-600" : "text-3xl font-bold text-green-600"}>{overdueTasks.length}</div>
                            {overdueTasks.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {overdueTasks.slice(0, 3).map(t => (
                                        <p key={t.id} className="text-xs text-muted-foreground">{t.name} &mdash; {t.project.name} ({fmtDate(t.endDate)})</p>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card className={contracts.length > 0 ? "border-yellow-200 bg-yellow-50" : ""}>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Contratos Vencendo em 30 dias</CardTitle></CardHeader>
                        <CardContent>
                            <div className={contracts.length > 0 ? "text-3xl font-bold text-yellow-600" : "text-3xl font-bold text-green-600"}>{contracts.length}</div>
                            {contracts.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {contracts.map(c => (
                                        <p key={c.id} className="text-xs text-muted-foreground">{c.identifier} &mdash; {c.project.name} ({fmtDate(c.endDate)})</p>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card className={equipmentInMaintenance > 0 ? "border-orange-200 bg-orange-50" : ""}>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Equipamentos em Manutencao</CardTitle></CardHeader>
                        <CardContent>
                            <div className={equipmentInMaintenance > 0 ? "text-3xl font-bold text-orange-600" : "text-3xl font-bold text-green-600"}>{equipmentInMaintenance}</div>
                        </CardContent>
                    </Card>
                    <Card className={overduePayments.length > 0 ? "border-red-200 bg-red-50" : ""}>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pagamentos Pendentes</CardTitle></CardHeader>
                        <CardContent>
                            <div className={overduePayments.length > 0 ? "text-3xl font-bold text-red-600" : "text-3xl font-bold text-green-600"}>{overduePayments.length}</div>
                            {overduePayments.length > 0 && (
                                <p className="text-xs text-muted-foreground">Total: {fmt(overduePaymentAmount)}</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </section>
            <section>
                <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-purple-600" />Tarefas (Kanban)
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Por Status</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {Object.entries(workTasksByStatus).map(([status, count]) => (
                                <div key={status} className="flex items-center justify-between text-sm">
                                    <Badge variant="secondary">{statusLabel[status] ?? status}</Badge>
                                    <span className="font-semibold">{count}</span>
                                </div>
                            ))}
                            {Object.keys(workTasksByStatus).length === 0 && (
                                <p className="text-sm text-muted-foreground">Nenhuma tarefa cadastrada.</p>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tarefas Vencidas (top 5)</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {overdueWorkTasks.length === 0 ? (
                                <p className="text-sm text-green-600">Nenhuma tarefa vencida.</p>
                            ) : (
                                overdueWorkTasks.map(t => (
                                    <div key={t.id} className="flex items-center justify-between text-sm">
                                        <span className="truncate text-muted-foreground">{t.title}</span>
                                        <span className="text-xs text-red-600 ml-2 shrink-0">{fmtDate(t.dueDate)}</span>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </section>
            <div className="pt-4 border-t text-xs text-muted-foreground text-center print:hidden">
                Relatorio gerado automaticamente pelo ERP Eixo Global em {now.toLocaleString("pt-BR")}
            </div>
        </div>
    )
}
