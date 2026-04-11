import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, Users, Building2, Wrench, AlertTriangle, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/formatters"

export const dynamic = 'force-dynamic'

export default async function RelatorioCapacidadePage() {
    const session = await getSession()
    if (!session) redirect("/login")
    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const now = new Date()

    const [projects, employees, allocations, equipment] = await Promise.all([
        prisma.project.findMany({ where: { companyId }, select: { id: true, status: true, name: true } }),
        prisma.employee.findMany({ where: { companyId }, select: { id: true, status: true } }),
        prisma.allocation.findMany({ where: { project: { companyId } }, select: { id: true, endDate: true, projectId: true } }),
        prisma.equipment.findMany({ where: { companyId }, select: { id: true, status: true } }),
    ])

    const activeProjects = projects.filter(p => p.status === "IN_PROGRESS")
    const totalEmployees = employees.filter(e => e.status === "ACTIVE").length
    const allocatedEmployees = allocations.filter(a => !a.endDate || new Date(a.endDate) > now).length
    const availableEmployees = Math.max(0, totalEmployees - allocatedEmployees)
    const avgTeamPerProject = activeProjects.length > 0 ? allocatedEmployees / activeProjects.length : 0
    const capacityForMoreProjects = avgTeamPerProject > 0 ? Math.floor(availableEmployees / avgTeamPerProject) : 0

    const equipmentAvailable = equipment.filter(e => e.status === "AVAILABLE").length
    const equipmentInUse = equipment.filter(e => e.status === "IN_USE").length
    const equipmentInMaintenance = equipment.filter(e => e.status === "MAINTENANCE").length

    const allocationRate = totalEmployees > 0 ? (allocatedEmployees / totalEmployees) * 100 : 0
    const isFullyOccupied = allocationRate >= 95

    const widthStyle = (pct: number) => ({ width: Math.min(pct, 100).toFixed(1) + "%" })
    const barClass = isFullyOccupied ? "h-2 rounded-full bg-red-500" : "h-2 rounded-full bg-orange-500"
    const availClass = availableEmployees > 0 ? "text-3xl font-bold text-green-600" : "text-3xl font-bold text-red-600"
    const capClass = capacityForMoreProjects > 0 ? "text-2xl font-bold text-green-700" : "text-2xl font-bold text-red-600"
    const eqMaintClass = equipmentInMaintenance > 0 ? "text-3xl font-bold text-orange-600" : "text-3xl font-bold text-muted-foreground"

    return (
        <div className="space-y-8">
            <div>
                <Button variant="ghost" size="sm" asChild className="mb-2">
                    <Link href="/relatorios"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight">Projecao de Capacidade</h1>
                <p className="text-muted-foreground">
                    Visao atual de ocupacao da equipe e equipamentos &mdash; {formatDate(now)}
                </p>
            </div>
            <section>
                <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />Ocupacao Atual
                </h2>
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Projetos Ativos</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-700">{activeProjects.length}</div>
                            <p className="text-xs text-muted-foreground">{projects.length} total no portfolio</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Funcionarios Ativos</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{totalEmployees}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Alocados</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-orange-600">{allocatedEmployees}</div>
                            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                                <div className={barClass} style={widthStyle(allocationRate)} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{allocationRate.toFixed(0)}% da equipe</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Disponiveis</CardTitle></CardHeader>
                        <CardContent>
                            <div className={availClass}>{availableEmployees}</div>
                        </CardContent>
                    </Card>
                </div>
            </section>
            <section>
                <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />Capacidade Disponivel
                </h2>
                <Card className={isFullyOccupied ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
                    <CardContent className="pt-6">
                        {isFullyOccupied ? (
                            <div className="flex items-start gap-4">
                                <AlertTriangle className="h-8 w-8 text-red-600 shrink-0 mt-1" />
                                <div>
                                    <p className="font-semibold text-red-700 text-lg">Equipe 100% ocupada</p>
                                    <p className="text-red-600 text-sm mt-1">
                                        Todos os funcionarios estao alocados. Para absorver novos projetos, sera necessario contratar ou encerrar alocacoes existentes.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start gap-4">
                                <TrendingUp className="h-8 w-8 text-green-600 shrink-0 mt-1" />
                                <div>
                                    <p className="font-semibold text-green-700 text-lg">
                                        {capacityForMoreProjects > 0
                                            ? "Com a equipe atual, pode absorver mais " + capacityForMoreProjects + " projeto(s) simultaneamente"
                                            : "Capacidade disponivel, mas equipe pequena para novo projeto"
                                        }
                                    </p>
                                    <p className="text-green-600 text-sm mt-1">
                                        {availableEmployees} funcionario(s) disponivel(is).
                                        {avgTeamPerProject > 0
                                            ? " Media de " + avgTeamPerProject.toFixed(1) + " pessoas por projeto ativo."
                                            : " Nenhum projeto ativo ainda."
                                        }
                                    </p>
                                </div>
                            </div>
                        )}
                        <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-current/10">
                            <div className="text-center">
                                <div className="text-2xl font-bold">{avgTeamPerProject.toFixed(1)}</div>
                                <p className="text-xs text-muted-foreground">Media equipe / projeto</p>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold">{availableEmployees}</div>
                                <p className="text-xs text-muted-foreground">Disponiveis</p>
                            </div>
                            <div className="text-center">
                                <div className={capClass}>+{capacityForMoreProjects}</div>
                                <p className="text-xs text-muted-foreground">Projetos absorviveis</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>
            <section>
                <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-gray-600" />Equipamentos
                </h2>
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Disponiveis</CardTitle></CardHeader>
                        <CardContent><div className="text-3xl font-bold text-green-600">{equipmentAvailable}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Em Uso</CardTitle></CardHeader>
                        <CardContent><div className="text-3xl font-bold text-blue-600">{equipmentInUse}</div></CardContent>
                    </Card>
                    <Card className={equipmentInMaintenance > 0 ? "border-orange-200 bg-orange-50" : ""}>
                        <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Em Manutencao</CardTitle></CardHeader>
                        <CardContent><div className={eqMaintClass}>{equipmentInMaintenance}</div></CardContent>
                    </Card>
                </div>
                {equipment.length > 0 && (
                    <Card className="mt-4">
                        <CardContent className="pt-4">
                            <div className="flex flex-wrap gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                    <span>Disponivel: {equipmentAvailable} ({equipment.length > 0 ? ((equipmentAvailable / equipment.length) * 100).toFixed(0) : 0}%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                                    <span>Em Uso: {equipmentInUse} ({equipment.length > 0 ? ((equipmentInUse / equipment.length) * 100).toFixed(0) : 0}%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                                    <span>Manutencao: {equipmentInMaintenance} ({equipment.length > 0 ? ((equipmentInMaintenance / equipment.length) * 100).toFixed(0) : 0}%)</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </section>
            {isFullyOccupied && (
                <section>
                    <Card className="border-red-200 bg-red-50">
                        <CardHeader>
                            <CardTitle className="text-red-700 flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5" />Atencao: Capacidade Maxima
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-red-600 text-sm">
                                Sua equipe esta operando na capacidade maxima. Para garantir a qualidade das entregas e evitar sobrecarga, considere:
                            </p>
                            <ul className="mt-3 space-y-1 text-sm text-red-600 list-disc list-inside">
                                <li>Revisar as alocacoes e redistribuir tarefas</li>
                                <li>Contratar novos funcionarios antes de assumir novos projetos</li>
                                <li>Avaliar terceirizacao de parte das atividades</li>
                                <li>Adiar projetos de menor prioridade</li>
                            </ul>
                        </CardContent>
                    </Card>
                </section>
            )}
        </div>
    )
}
