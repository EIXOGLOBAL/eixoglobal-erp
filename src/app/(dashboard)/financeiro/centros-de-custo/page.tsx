import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getCostCenters } from "@/app/actions/cost-center-actions"
import { getProjects } from "@/app/actions/project-actions"
import {
    getCostCenterHierarchy,
    getCostCenterBudgetReport,
} from "@/app/actions/cost-center-budget-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Layers, CheckCircle, GitBranch, LayoutGrid, DollarSign } from "lucide-react"
import { CostCentersClient } from "@/components/financeiro/cost-centers-client"
import { CostCenterBudgetClient } from "@/components/financial/cost-center-budget-client"

export const dynamic = 'force-dynamic'

export default async function CentrosDeCustoPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const currentYear = new Date().getFullYear()

    const [costCenters, projectsResult, hierarchyResult, reportResult] = await Promise.all([
        getCostCenters(companyId),
        getProjects(companyId),
        getCostCenterHierarchy(companyId, currentYear),
        getCostCenterBudgetReport(companyId, currentYear),
    ])
    const projects = projectsResult.success && projectsResult.data ? projectsResult.data : []
    const hierarchy = hierarchyResult.success ? hierarchyResult.data : []
    const report = reportResult.success ? reportResult.data : []

    const total = costCenters.length
    const active = costCenters.filter((cc) => cc.isActive).length
    const rootCenters = costCenters.filter((cc) => !cc.parentId).length
    const distinctTypes = new Set(
        costCenters.filter((cc) => cc.isActive).map((cc) => cc.type)
    ).size

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Centros de Custo</h2>
                    <p className="text-muted-foreground">
                        Gestao e hierarquia de centros de custo da empresa
                    </p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Centros</CardTitle>
                        <Layers className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{total}</div>
                        <p className="text-xs text-muted-foreground">Centros de custo cadastrados</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Centros Ativos</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{active}</div>
                        <p className="text-xs text-muted-foreground">Em operacao</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Centros Raiz</CardTitle>
                        <GitBranch className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{rootCenters}</div>
                        <p className="text-xs text-muted-foreground">Sem centro pai</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tipos Distintos</CardTitle>
                        <LayoutGrid className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">{distinctTypes}</div>
                        <p className="text-xs text-muted-foreground">Tipos entre centros ativos</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main tabs: Cadastro vs Orcamento */}
            <Tabs defaultValue="budget" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="budget" className="flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4" />
                        Controle Orcamentario
                    </TabsTrigger>
                    <TabsTrigger value="cadastro" className="flex items-center gap-1.5">
                        <Layers className="h-4 w-4" />
                        Cadastro
                    </TabsTrigger>
                </TabsList>

                {/* Budget control tab */}
                <TabsContent value="budget">
                    <CostCenterBudgetClient
                        hierarchy={hierarchy}
                        report={report}
                        year={currentYear}
                        companyId={companyId}
                    />
                </TabsContent>

                {/* Registration tab (existing) */}
                <TabsContent value="cadastro">
                    <Card>
                        <CardHeader>
                            <CardTitle>Lista de Centros de Custo</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CostCentersClient companyId={companyId} costCenters={costCenters} projects={projects} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
