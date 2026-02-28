import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getSuppliersEnhanced } from "@/app/actions/supplier-actions"
import { FornecedoresClient } from "@/components/fornecedores/fornecedores-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Truck, AlertTriangle, Star, DollarSign } from "lucide-react"
import { toNumber, formatCurrency as fmt } from "@/lib/formatters"

export const dynamic = 'force-dynamic'

export default async function FornecedoresPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const result = await getSuppliersEnhanced(companyId)
    const suppliers = result.success ? (result.data ?? []) : []
    const kpis = result.kpis

    // Converter Decimal para number para Client Components
    const serializedSuppliers = suppliers.map(s => ({
        ...s,
        rating: s.rating !== null ? toNumber(s.rating) : null,
    }))

    const bestRatedText = kpis?.bestRated && kpis.bestRated.length > 0
        ? kpis.bestRated.map(s => `${s.name} (${toNumber(s.rating ?? 0).toFixed(1)})`).join(", ")
        : "Nenhuma avaliação"

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Fornecedores</h1>
                    <p className="text-muted-foreground">
                        Gerencie fornecedores e prestadores de servico vinculados a empresa
                    </p>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Ativos</CardTitle>
                        <Truck className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis?.totalActive ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Fornecedores ativos</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Docs Vencendo</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis?.expiringDocs ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Documentos vencendo em 30 dias</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Melhor Avaliados</CardTitle>
                        <Star className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-bold truncate" title={bestRatedText}>
                            {bestRatedText}
                        </div>
                        <p className="text-xs text-muted-foreground">Top fornecedores por nota</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pago no Mes</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{fmt(kpis?.totalPaidMonth ?? 0)}</div>
                        <p className="text-xs text-muted-foreground">Pagamentos no mes atual</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Fornecedores</CardTitle>
                </CardHeader>
                <CardContent>
                    <FornecedoresClient suppliers={serializedSuppliers} companyId={companyId} />
                </CardContent>
            </Card>
        </div>
    )
}
