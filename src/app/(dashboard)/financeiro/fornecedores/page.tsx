import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getSuppliers } from "@/app/actions/supplier-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, CheckCircle, XCircle, FileText } from "lucide-react"
import { SuppliersClient } from "@/components/financeiro/suppliers-client"

export const dynamic = 'force-dynamic'

export default async function FornecedoresPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const suppliersResult = await getSuppliers({ companyId })
    const suppliers = suppliersResult.data ?? []

    const total = suppliers.length
    const active = suppliers.filter((s) => s.isActive).length
    const inactive = suppliers.filter((s) => !s.isActive).length
    const totalDocuments = suppliers.reduce((sum, s) => sum + s._count.fiscalNotes, 0)

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Fornecedores</h2>
                    <p className="text-muted-foreground">
                        Gestão de fornecedores e parceiros comerciais
                    </p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Fornecedores</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{total}</div>
                        <p className="text-xs text-muted-foreground">Fornecedores cadastrados</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ativos</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{active}</div>
                        <p className="text-xs text-muted-foreground">Fornecedores ativos</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Inativos</CardTitle>
                        <XCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{inactive}</div>
                        <p className="text-xs text-muted-foreground">Fornecedores inativados</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
                        <FileText className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{totalDocuments}</div>
                        <p className="text-xs text-muted-foreground">Notas fiscais vinculadas</p>
                    </CardContent>
                </Card>
            </div>

            {/* Suppliers Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Fornecedores</CardTitle>
                </CardHeader>
                <CardContent>
                    <SuppliersClient companyId={companyId} suppliers={suppliers} />
                </CardContent>
            </Card>
        </div>
    )
}
