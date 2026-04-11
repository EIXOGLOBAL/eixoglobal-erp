import { getBillingRecords, getBillingSummary, getBillingFormData } from "@/app/actions/billing-actions"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Clock, AlertTriangle, TrendingDown } from "lucide-react"
import { BillingDialog } from "@/components/financeiro/billing-dialog"
import { BillingTable } from "@/components/financeiro/billing-table"

export const dynamic = 'force-dynamic'

export default async function FaturamentoPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const [recordsResult, summaryResult, formDataResult] = await Promise.all([
        getBillingRecords(companyId),
        getBillingSummary(companyId),
        getBillingFormData(companyId),
    ])

    const records = recordsResult.data || []
    const summary = summaryResult.success ? summaryResult.data : null
    const formData = formDataResult.success ? formDataResult.data : {
        projects: [],
        clients: [],
        contracts: [],
        bulletins: [],
    }

    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Faturamento</h2>
                    <p className="text-muted-foreground">
                        Controle de faturamento, emissao e recebimento
                    </p>
                </div>
                <BillingDialog formData={formData} />
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Faturado no Mes</CardTitle>
                        <FileText className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {fmt(summary?.billedThisMonth || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Total recebido: {fmt(summary?.totalPaid || 0)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">A Receber</CardTitle>
                        <Clock className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            {fmt(summary?.receivable || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Faturamentos emitidos pendentes
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vencido</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {fmt(summary?.overdue || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {summary?.overdueCount || 0} faturamento{(summary?.overdueCount || 0) !== 1 ? 's' : ''} em atraso
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Inadimplencia</CardTitle>
                        <TrendingDown className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {(summary?.defaultRate || 0).toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Percentual de valores vencidos
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Billing Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Faturamentos</CardTitle>
                </CardHeader>
                <CardContent>
                    <BillingTable records={records} />
                </CardContent>
            </Card>
        </div>
    )
}
