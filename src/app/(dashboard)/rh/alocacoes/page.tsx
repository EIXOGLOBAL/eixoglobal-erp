import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getAllocations } from "@/app/actions/allocation-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserCog, FolderKanban, Users, Calendar } from "lucide-react"
import { AllocationsClient } from "@/components/rh/allocations-client"

export const dynamic = 'force-dynamic'

export default async function AlocacoesPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const [allocations, employees, projects] = await Promise.all([
        getAllocations(companyId),
        prisma.employee.findMany({
            where: { companyId, status: 'ACTIVE' },
            select: { id: true, name: true, jobTitle: true },
            orderBy: { name: 'asc' },
        }),
        prisma.project.findMany({
            where: { companyId, status: { not: 'CANCELLED' } },
            select: { id: true, name: true, status: true },
            orderBy: { name: 'asc' },
        }),
    ])

    const today = new Date()
    const activeAllocations = allocations.filter(a => !a.endDate || new Date(a.endDate) >= today)
    const uniqueProjects = new Set(activeAllocations.map(a => a.projectId)).size
    const uniqueEmployees = new Set(activeAllocations.map(a => a.employeeId)).size

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Alocações</h2>
                    <p className="text-muted-foreground">Gestão de funcionários alocados por projeto</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Alocações Ativas</CardTitle>
                        <UserCog className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{activeAllocations.length}</div>
                        <p className="text-xs text-muted-foreground">Vínculos ativos hoje</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Funcionários Alocados</CardTitle>
                        <Users className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{uniqueEmployees}</div>
                        <p className="text-xs text-muted-foreground">Colaboradores em projetos</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Projetos com Equipe</CardTitle>
                        <FolderKanban className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">{uniqueProjects}</div>
                        <p className="text-xs text-muted-foreground">Projetos ativos</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Histórico</CardTitle>
                        <Calendar className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{allocations.length}</div>
                        <p className="text-xs text-muted-foreground">Todas as alocações</p>
                    </CardContent>
                </Card>
            </div>

            <AllocationsClient
                allocations={allocations}
                employees={employees}
                projects={projects}
            />
        </div>
    )
}
