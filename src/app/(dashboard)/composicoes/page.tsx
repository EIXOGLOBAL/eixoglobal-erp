import { Building2, Calculator, TrendingUp, FolderKanban } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCostCompositions } from "@/app/actions/cost-composition-actions"
import { getProjects } from "@/app/actions/project-actions"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { CompositionDialog } from "@/components/compositions/composition-dialog"
import { CompositionsListClient } from "@/components/compositions/compositions-list-client"

export const dynamic = 'force-dynamic'

export default async function ComposicoesPage() {
    const session = await getSession()
    if (!session) {
        redirect("/login")
    }

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const compositions = await getCostCompositions(companyId)
    const projectsResult = await getProjects(companyId)
    const projects = projectsResult.success ? (projectsResult.data || []) : []

    // KPIs
    const totalCompositions = compositions?.length || 0
    const globalCompositions = compositions?.filter(c => !c.projectId).length || 0
    const projectCompositions = compositions?.filter(c => c.projectId).length || 0
    const totalCost = compositions?.reduce((acc, c) => acc + Number(c.salePrice || 0), 0) || 0
    const averageCost = compositions && compositions.length > 0 ? totalCost / compositions.length : 0

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Composições de Custos</h2>
                    <p className="text-muted-foreground">
                        Gerencie suas composições analíticas de preços
                    </p>
                </div>
                <CompositionDialog companyId={companyId} projects={projects} />
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total de Composições
                        </CardTitle>
                        <Calculator className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalCompositions}</div>
                        <p className="text-xs text-muted-foreground">
                            Composições cadastradas
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Composições Globais
                        </CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{globalCompositions}</div>
                        <p className="text-xs text-muted-foreground">
                            Compartilhadas entre projetos
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Por Projeto
                        </CardTitle>
                        <FolderKanban className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{projectCompositions}</div>
                        <p className="text-xs text-muted-foreground">
                            Específicas de projetos
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Preço Médio
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                            }).format(averageCost)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Preço de venda médio
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Biblioteca de Composições */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle>Biblioteca de Composições</CardTitle>
                </CardHeader>
                <CardContent>
                    <CompositionsListClient
                        compositions={compositions || []}
                        projects={projects}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
