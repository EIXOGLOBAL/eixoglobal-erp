import { getProjects } from "@/app/actions/project-actions"
import { getClients } from "@/app/actions/client-actions"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ProjectDialog } from "@/components/projects/project-dialog"
import { ProjectsTable } from "@/components/projects/projects-table"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { FolderKanban, TrendingUp, Clock, CheckCircle2 } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId

    const projectsRes = await getProjects({ companyId })
    const projects = projectsRes.success ? projectsRes.data : []

    const [companies, clientsResult] = await Promise.all([
        prisma.company.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        }),
        getClients({ companyId }),
    ])

    const clients = clientsResult.success
        ? (clientsResult.data ?? []).filter((c) => c.status === 'ACTIVE').map((c) => ({
              id: c.id,
              displayName: c.displayName,
          }))
        : []

    // KPIs - FIXED: Using correct enum values
    const activeProjects = projects?.filter(p => p.status === 'IN_PROGRESS').length || 0
    const completedProjects = projects?.filter(p => p.status === 'COMPLETED').length || 0
    const totalBudget = projects?.reduce((acc, p) => acc + Number(p.budget || 0), 0) || 0
    const onHoldProjects = projects?.filter(p => p.status === 'ON_HOLD').length || 0

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Projetos</h1>
                    <p className="text-muted-foreground">
                        Gerencie todos os projetos e acompanhe seu progresso.
                    </p>
                </div>
                <ProjectDialog companies={companies} clients={clients} />
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Projetos Ativos
                        </CardTitle>
                        <FolderKanban className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeProjects}</div>
                        <p className="text-xs text-muted-foreground">
                            Em andamento
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Concluídos
                        </CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{completedProjects}</div>
                        <p className="text-xs text-muted-foreground">
                            Finalizados com sucesso
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Orçamento Total
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                            }).format(totalBudget)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Valor total planejado
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Em Espera
                        </CardTitle>
                        <Clock className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{onHoldProjects}</div>
                        <p className="text-xs text-muted-foreground">
                            Aguardando início
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Projects Table */}
            <ProjectsTable data={projects || []} companies={companies} clients={clients} />
        </div>
    )
}
