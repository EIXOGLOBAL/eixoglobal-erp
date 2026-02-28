import { getContractors } from "@/app/actions/contractor-actions"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ContractorDialog } from "@/components/contractors/contractor-dialog"
import { ContractorsTable } from "@/components/contractors/contractors-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, FileText } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function EmpreiteirasPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const result = await getContractors(companyId)
    const contractors = result.success ? (result.data || []) : []

    const totalContractors = contractors.length
    const pjContractors = contractors.filter(c => c.type === 'COMPANY').length
    const pfContractors = contractors.filter(c => c.type === 'INDIVIDUAL').length
    const withContracts = contractors.filter(c => c._count.contracts > 0).length

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Empreiteiras</h1>
                    <p className="text-muted-foreground">
                        Gerencie empreiteiras e subcontratadas vinculadas aos contratos
                    </p>
                </div>
                <ContractorDialog companyId={companyId} />
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Cadastradas</CardTitle>
                        <Building2 className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalContractors}</div>
                        <p className="text-xs text-muted-foreground">Empreiteiras e subcontratadas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pessoa Jurídica</CardTitle>
                        <Building2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pjContractors}</div>
                        <p className="text-xs text-muted-foreground">Empresas (CNPJ)</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pessoa Física</CardTitle>
                        <Users className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pfContractors}</div>
                        <p className="text-xs text-muted-foreground">Autônomos (CPF)</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Com Contratos</CardTitle>
                        <FileText className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{withContracts}</div>
                        <p className="text-xs text-muted-foreground">Com vínculos ativos</p>
                    </CardContent>
                </Card>
            </div>

            {/* Contractors Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Empreiteiras</CardTitle>
                </CardHeader>
                <CardContent>
                    <ContractorsTable data={contractors} companyId={companyId} />
                </CardContent>
            </Card>
        </div>
    )
}
