import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getTasksByCompany } from "@/app/actions/schedule-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScheduleClient } from "@/components/schedule/schedule-client"
import { ClipboardList, Clock, CheckCircle2, AlertTriangle } from "lucide-react"

export default async function CronogramaPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const [projects, tasks] = await Promise.all([
        prisma.project.findMany({
            where: { companyId },
            select: {
                id: true,
                name: true,
                status: true,
                startDate: true,
                endDate: true,
            },
            orderBy: { name: "asc" },
        }),
        getTasksByCompany(companyId),
    ])

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const totalTasks = tasks.length
    const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS").length
    const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length
    const completedPercent =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    const overdueTasks = tasks.filter(
        (t) =>
            t.endDate < today &&
            t.status !== "COMPLETED" &&
            t.status !== "CANCELLED"
    ).length

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Cronograma de Obra</h2>
                    <p className="text-muted-foreground">
                        Planejamento e acompanhamento de tarefas dos projetos
                    </p>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
                        <ClipboardList className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalTasks}</div>
                        <p className="text-xs text-muted-foreground">Em todos os projetos</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
                        <Clock className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{inProgressTasks}</div>
                        <p className="text-xs text-muted-foreground">Tarefas em execução</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Concluidas</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{completedPercent}%</div>
                        <p className="text-xs text-muted-foreground">
                            {completedTasks} de {totalTasks} concluidas
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{overdueTasks}</div>
                        <p className="text-xs text-muted-foreground">Prazo vencido</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main client component */}
            <ScheduleClient tasks={tasks} projects={projects} />
        </div>
    )
}
