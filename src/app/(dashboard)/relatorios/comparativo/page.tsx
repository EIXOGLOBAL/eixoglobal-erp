import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, TrendingUp, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ComparativoChart } from "@/components/relatorios/comparativo-client"

export const dynamic = 'force-dynamic'

export default async function RelatorioComparativoPage() {
    const session = await getSession()
    if (!session) redirect("/login")
    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const projects = await prisma.project.findMany({
        where: { companyId, status: { in: ["IN_PROGRESS", "COMPLETED"] } },
        select: {
            id: true, name: true, status: true, budget: true, startDate: true, endDate: true,
            bulletins: { where: { status: { in: ["APPROVED", "BILLED"] } }, select: { totalValue: true } },
            tasks: { select: { status: true, percentDone: true } },
        },
        orderBy: { name: "asc" },
    })

    const now = new Date()

    interface ProjectRow {
        id: string
        name: string
        status: string
        budget: number
        totalMeasured: number
        executionPercent: number
        avgTaskCompletion: number
        durationDays: number
        taskCount: number
    }

    const rows: ProjectRow[] = projects.map(p => {
        const budget = Number(p.budget || 0)
        const totalMeasured = p.bulletins.reduce((s, b) => s + Number(b.totalValue || 0), 0)
        const executionPercent = budget > 0 ? (totalMeasured / budget) * 100 : 0
        const validTasks = p.tasks.filter(t => t.status !== "CANCELLED")
        const avgTaskCompletion = validTasks.length > 0
            ? validTasks.reduce((s, t) => s + (t.percentDone ?? 0), 0) / validTasks.length
            : 0
        const endDate = p.endDate ? new Date(p.endDate) : now
        const durationDays = Math.max(0, Math.round((endDate.getTime() - new Date(p.startDate).getTime()) / 86400000))
        return { id: p.id, name: p.name, status: p.status, budget, totalMeasured, executionPercent, avgTaskCompletion, durationDays, taskCount: p.tasks.length }
    })

    const byRentabilidade = [...rows].sort((a, b) => a.executionPercent - b.executionPercent)
    const byAndamento = [...rows].sort((a, b) => b.avgTaskCompletion - a.avgTaskCompletion)
    const chartData = rows.map(r => ({
        name: r.name.length > 20 ? r.name.slice(0, 18) + "..." : r.name,
        orcamento: r.budget,
        medido: r.totalMeasured,
    }))

    const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(n)
    const statusColor: Record<string, string> = {
        IN_PROGRESS: "bg-green-100 text-green-800",
        COMPLETED: "bg-blue-100 text-blue-800",
    }
    const statusLabel: Record<string, string> = {
        IN_PROGRESS: "Em Andamento",
        COMPLETED: "Concluido",
    }
    const widthStyle = (pct: number) => ({ width: Math.min(pct, 100).toFixed(1) + "%" })

    return (
        <div className="space-y-8">
            <div>
                <Button variant="ghost" size="sm" asChild className="mb-2">
                    <Link href="/relatorios"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight">Comparativo entre Obras</h1>
                <p className="text-muted-foreground">Analise comparativa de projetos em andamento e concluidos</p>
            </div>
            {rows.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">Nenhum projeto em andamento ou concluido encontrado.</p>
                    </CardContent>
                </Card>
            )}
            {rows.length > 0 && (
                <>
                    <section>
                        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-indigo-600" />Ranking por Rentabilidade
                        </h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Projetos com menor percentual executado tem mais orcamento restante.
                        </p>
                        <Card>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="text-left p-3 font-medium">#</th>
                                                <th className="text-left p-3 font-medium">Projeto</th>
                                                <th className="text-left p-3 font-medium">Status</th>
                                                <th className="text-right p-3 font-medium">Orcamento</th>
                                                <th className="text-right p-3 font-medium">Medido</th>
                                                <th className="text-right p-3 font-medium">% Exec.</th>
                                                <th className="text-right p-3 font-medium">Duracao</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {byRentabilidade.map((r, i) => (
                                                <tr key={r.id} className="border-b hover:bg-muted/30 transition-colors">
                                                    <td className="p-3 text-muted-foreground font-mono">{i + 1}</td>
                                                    <td className="p-3 font-medium">{r.name}</td>
                                                    <td className="p-3">
                                                        <span className={"inline-flex px-2 py-0.5 rounded text-xs font-medium " + (statusColor[r.status] ?? "bg-gray-100 text-gray-800")}>
                                                            {statusLabel[r.status] ?? r.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-right font-mono">{fmt(r.budget)}</td>
                                                    <td className="p-3 text-right font-mono">{fmt(r.totalMeasured)}</td>
                                                    <td className="p-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                                                <div className="h-2 bg-indigo-500" style={widthStyle(r.executionPercent)} />
                                                            </div>
                                                            <span className="font-mono w-12 text-right">{r.executionPercent.toFixed(1)}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-right text-muted-foreground">{r.durationDays}d</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </section>
                    <section>
                        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-green-600" />Ranking por Andamento (Tarefas)
                        </h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Baseado na conclusao media das tarefas de cada projeto.
                        </p>
                        <Card>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="text-left p-3 font-medium">#</th>
                                                <th className="text-left p-3 font-medium">Projeto</th>
                                                <th className="text-right p-3 font-medium">Nr. Tarefas</th>
                                                <th className="text-right p-3 font-medium">Conclusao Media</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {byAndamento.map((r, i) => (
                                                <tr key={r.id} className="border-b hover:bg-muted/30 transition-colors">
                                                    <td className="p-3 text-muted-foreground font-mono">{i + 1}</td>
                                                    <td className="p-3 font-medium">{r.name}</td>
                                                    <td className="p-3 text-right">{r.taskCount}</td>
                                                    <td className="p-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                                                <div className="h-2 bg-green-500" style={widthStyle(r.avgTaskCompletion)} />
                                                            </div>
                                                            <span className="font-mono w-12 text-right">{r.avgTaskCompletion.toFixed(1)}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </section>
                    <section>
                        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-purple-600" />Comparativo Visual: Orcamento vs Medido
                        </h2>
                        <Card>
                            <CardContent className="pt-6">
                                <ComparativoChart data={chartData} />
                            </CardContent>
                        </Card>
                    </section>
                </>
            )}
        </div>
    )
}
