import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, CheckCircle, Users, FolderOpen } from "lucide-react"
import { getDailyReports } from "@/app/actions/daily-report-actions"
import { DailyReportsTable } from "@/components/rdo/daily-reports-table"
import { DailyReportDialog } from "@/components/rdo/daily-report-dialog"

export default async function RdoPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const [reports, projects] = await Promise.all([
        getDailyReports(companyId),
        prisma.project.findMany({
            where: { companyId },
            select: { id: true, name: true, latitude: true, longitude: true },
            orderBy: { name: 'asc' }
        }),
    ])

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const reportsThisMonth = reports.filter(r => {
        const d = new Date(r.createdAt)
        return d >= startOfMonth && d <= endOfMonth
    })

    const pendingApproval = reports.filter(r => r.status === 'SUBMITTED')

    // Total workforce today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayReport = reports.find(r => {
        const d = new Date(r.date)
        d.setHours(0, 0, 0, 0)
        return d.getTime() === today.getTime()
    })

    // We need total workers for today. The reports list has _count.workforce,
    // but we need the actual sum. Let's fetch the workers for today's report if it exists.
    let totalWorkforceToday = 0
    if (todayReport) {
        const workers = await prisma.dailyReportWorker.findMany({
            where: { reportId: todayReport.id }
        })
        totalWorkforceToday = workers.reduce((sum, w) => sum + w.count, 0)
    }

    // Projects with RDO this month
    const projectsWithRdo = new Set(reportsThisMonth.map(r => r.projectId)).size

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">RDO</h2>
                    <p className="text-muted-foreground">
                        Relatórios Diários de Obra
                    </p>
                </div>
                <DailyReportDialog
                    companyId={companyId}
                    projects={projects}
                />
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">RDOs do Mês</CardTitle>
                        <BookOpen className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reportsThisMonth.length}</div>
                        <p className="text-xs text-muted-foreground">Criados neste mês</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pendentes de Aprovação</CardTitle>
                        <CheckCircle className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-700">{pendingApproval.length}</div>
                        <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Efetivo Hoje</CardTitle>
                        <Users className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">{totalWorkforceToday}</div>
                        <p className="text-xs text-muted-foreground">Total de trabalhadores hoje</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Projetos com RDO</CardTitle>
                        <FolderOpen className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{projectsWithRdo}</div>
                        <p className="text-xs text-muted-foreground">Com RDO no mês atual</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabela */}
            <Card>
                <CardHeader>
                    <CardTitle>Todos os RDOs</CardTitle>
                </CardHeader>
                <CardContent>
                    <DailyReportsTable
                        reports={reports}
                        projects={projects}
                        companyId={companyId}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
