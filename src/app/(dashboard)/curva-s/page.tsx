import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, TrendingUp, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CurvaSChart } from "@/components/curva-s/curva-s-chart"

export default async function CurvaSPage() {
    const session = await getSession()
    if (!session) redirect("/login")
    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const projects = await prisma.project.findMany({
        where: { companyId, status: { in: ["IN_PROGRESS", "PLANNING", "COMPLETED"] } },
        select: {
            id: true,
            name: true,
            status: true,
            startDate: true,
            endDate: true,
            budget: true,
            tasks: {
                select: {
                    id: true,
                    name: true,
                    startDate: true,
                    endDate: true,
                    percentDone: true,
                    status: true,
                },
                orderBy: { startDate: "asc" },
            },
        },
        orderBy: { name: "asc" },
    })

    // Build Curva S data for the first project with tasks (or all projects)
    const projectsWithTasks = projects.filter(p => p.tasks.length > 0)

    // Compute monthly S-curve data per project
    function buildCurvaS(project: typeof projects[0]) {
        if (project.tasks.length === 0) return []
        const start = new Date(project.startDate)
        const end = project.endDate ? new Date(project.endDate) : new Date()
        const months: { month: string; planejado: number; realizado: number }[] = []

        // Generate monthly intervals
        const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000))
        let current = new Date(start.getFullYear(), start.getMonth(), 1)
        const endMonth = new Date(end.getFullYear(), end.getMonth(), 1)

        while (current <= endMonth) {
            const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0)
            const monthLabel = current.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })

            // Planned: tasks that should be done by this month
            const plannedDone = project.tasks.filter(t => {
                const taskEnd = new Date(t.endDate)
                return taskEnd <= monthEnd
            }).length
            const planejado = project.tasks.length > 0 ? (plannedDone / project.tasks.length) * 100 : 0

            // Realized: tasks actually done (percentDone weighted) by month
            const realizadoTasks = project.tasks.filter(t => {
                const taskEnd = new Date(t.endDate)
                return taskEnd <= monthEnd
            })
            const realizado = project.tasks.length > 0
                ? realizadoTasks.reduce((s, t) => s + (t.percentDone ?? 0), 0) / project.tasks.length
                : 0

            months.push({
                month: monthLabel,
                planejado: Math.round(planejado * 10) / 10,
                realizado: Math.round(realizado * 10) / 10,
            })

            current = new Date(current.getFullYear(), current.getMonth() + 1, 1)
            if (months.length > 36) break // safety limit
        }

        return months
    }

    const statusLabel: Record<string, string> = {
        IN_PROGRESS: "Em Andamento",
        PLANNING: "Planejamento",
        COMPLETED: "Concluido",
        ON_HOLD: "Pausado",
        CANCELLED: "Cancelado",
    }
    const statusColor: Record<string, string> = {
        IN_PROGRESS: "bg-green-100 text-green-800",
        PLANNING: "bg-purple-100 text-purple-800",
        COMPLETED: "bg-blue-100 text-blue-800",
        ON_HOLD: "bg-yellow-100 text-yellow-800",
    }

    const firstProject = projectsWithTasks[0] ?? null
    const chartData = firstProject ? buildCurvaS(firstProject) : []
    const allProjectsData = projectsWithTasks.map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        taskCount: p.tasks.length,
        avgCompletion: p.tasks.length > 0
            ? p.tasks.reduce((s, t) => s + (t.percentDone ?? 0), 0) / p.tasks.length
            : 0,
        chartData: buildCurvaS(p),
    }))

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/cronograma">
                        <ArrowLeft className="h-4 w-4 mr-2" />Cronograma
                    </Link>
                </Button>
            </div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <TrendingUp className="h-7 w-7 text-blue-600" />
                    Curva S
                </h1>
                <p className="text-muted-foreground">
                    Acompanhamento do progresso planejado vs realizado por projeto
                </p>
            </div>

            {projectsWithTasks.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground font-medium">Nenhum projeto com tarefas encontrado.</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Cadastre tarefas no cronograma de obra para visualizar a Curva S.
                        </p>
                        <Button variant="outline" className="mt-4" asChild>
                            <Link href="/cronograma">Ir para Cronograma</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Summary cards */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                                    Projetos com Tarefas
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-blue-700">{projectsWithTasks.length}</div>
                                <p className="text-xs text-muted-foreground">{projects.length} total no portfolio</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                                    Total de Tarefas
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    {projectsWithTasks.reduce((s, p) => s + p.tasks.length, 0)}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                                    Conclusao Media Geral
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    {allProjectsData.length > 0
                                        ? (allProjectsData.reduce((s, p) => s + p.avgCompletion, 0) / allProjectsData.length).toFixed(1)
                                        : "0"}%
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Charts per project */}
                    {allProjectsData.map(proj => (
                        <Card key={proj.id}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base">{proj.name}</CardTitle>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-muted-foreground">
                                            {proj.taskCount} tarefa(s) — {proj.avgCompletion.toFixed(1)}% concluido
                                        </span>
                                        <Badge className={statusColor[proj.status] ?? "bg-gray-100 text-gray-800"}>
                                            {statusLabel[proj.status] ?? proj.status}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {proj.chartData.length > 1 ? (
                                    <CurvaSChart data={proj.chartData} />
                                ) : (
                                    <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                                        Dados insuficientes para gerar a Curva S. Adicione mais tarefas com datas ao projeto.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}

                    {/* Table summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Resumo por Projeto</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-muted-foreground">
                                            <th className="text-left py-2 pr-4">Projeto</th>
                                            <th className="text-right py-2 pr-4">Tarefas</th>
                                            <th className="text-right py-2 pr-4">Concluidas</th>
                                            <th className="text-right py-2 pr-4">Progresso</th>
                                            <th className="text-left py-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allProjectsData.map(proj => {
                                            const done = projectsWithTasks.find(p => p.id === proj.id)?.tasks.filter(t => t.status === "COMPLETED" || t.percentDone >= 100).length ?? 0
                                            return (
                                                <tr key={proj.id} className="border-b last:border-0 hover:bg-muted/30">
                                                    <td className="py-2 pr-4 font-medium">{proj.name}</td>
                                                    <td className="py-2 pr-4 text-right">{proj.taskCount}</td>
                                                    <td className="py-2 pr-4 text-right">{done}</td>
                                                    <td className="py-2 pr-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-2 bg-blue-500 rounded-full"
                                                                    style={{ width: Math.min(proj.avgCompletion, 100).toFixed(1) + "%" }}
                                                                />
                                                            </div>
                                                            <span className="w-10 text-right font-mono">{proj.avgCompletion.toFixed(0)}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2">
                                                        <Badge className={statusColor[proj.status] ?? "bg-gray-100 text-gray-800"}>
                                                            {statusLabel[proj.status] ?? proj.status}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
