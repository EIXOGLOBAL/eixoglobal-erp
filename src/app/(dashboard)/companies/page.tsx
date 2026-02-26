import { getCompanies } from "@/app/actions/company-actions"
import { requireAdmin } from "@/lib/route-guard"
import { CompanyDialog } from "@/components/companies/company-dialog"
import { CompaniesTable } from "@/components/companies/companies-table"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Building2, Briefcase, FolderKanban } from "lucide-react"

export default async function CompaniesPage() {
    await requireAdmin()

    const companiesRes = await getCompanies()
    const companies = companiesRes.success ? companiesRes.data : []

    // KPIs
    const totalCompanies = companies?.length || 0
    const companiesWithProjects = companies?.filter(c => c._count.projects > 0).length || 0
    const totalProjects = companies?.reduce((acc, c) => acc + c._count.projects, 0) || 0

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Empresas Clientes</h1>
                    <p className="text-muted-foreground">
                        Gerencie o cadastro de empresas clientes.
                    </p>
                </div>
                <CompanyDialog />
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total de Empresas
                        </CardTitle>
                        <Building2 className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalCompanies}</div>
                        <p className="text-xs text-muted-foreground">
                            Clientes cadastrados
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Clientes Ativos
                        </CardTitle>
                        <Briefcase className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{companiesWithProjects}</div>
                        <p className="text-xs text-muted-foreground">
                            Com projetos em andamento
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total de Projetos
                        </CardTitle>
                        <FolderKanban className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalProjects}</div>
                        <p className="text-xs text-muted-foreground">
                            Vinculados aos clientes
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Companies Table */}
            <CompaniesTable data={companies || []} />
        </div>
    )
}
