import { getFinancialRecords } from "@/app/actions/financial-actions"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingDown, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { DespesasTable } from "@/components/financeiro/despesas-table"

export const dynamic = 'force-dynamic'

export default async function DespesasPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const recordsResult = await getFinancialRecords({ companyId, type: 'EXPENSE' })
    const records = recordsResult.data || []

    const totalPayable = records
        .filter(r => r.status === 'PENDING' || r.status === 'SCHEDULED')
        .reduce((sum, r) => sum + r.amount, 0)

    const totalPaid = records
        .filter(r => r.status === 'PAID')
        .reduce((sum, r) => sum + (r.paidAmount || r.amount), 0)

    const now = new Date()
    const overdueRecords = records.filter(r =>
        (r.status === 'PENDING' || r.status === 'SCHEDULED') &&
        new Date(r.dueDate) < now
    )
    const totalOverdue = overdueRecords.reduce((sum, r) => sum + r.amount, 0)

    const fmt = (v: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Despesas</h2>
                <p className="text-muted-foreground">Controle de contas a pagar</p>
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">A Pagar</CardTitle>
                        <Clock className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{fmt(totalPayable)}</div>
                        <p className="text-xs text-muted-foreground">
                            {records.filter(r => r.status === 'PENDING' || r.status === 'SCHEDULED').length} títulos em aberto
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pago</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{fmt(totalPaid)}</div>
                        <p className="text-xs text-muted-foreground">
                            {records.filter(r => r.status === 'PAID').length} títulos quitados
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{fmt(totalOverdue)}</div>
                        <p className="text-xs text-muted-foreground">
                            {overdueRecords.length} títulos atrasados
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Despesas</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{records.length}</div>
                        <p className="text-xs text-muted-foreground">Lançamentos de despesa</p>
                    </CardContent>
                </Card>
            </div>

            {/* Vencidos Alert */}
            {overdueRecords.length > 0 && (
                <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-red-800 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {overdueRecords.length} título(s) vencido(s) — Total: {fmt(totalOverdue)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {overdueRecords.slice(0, 5).map(r => (
                                <div key={r.id} className="flex justify-between text-sm">
                                    <span className="text-red-800">{r.description}</span>
                                    <span className="font-bold text-red-700">{fmt(r.amount)}</span>
                                </div>
                            ))}
                            {overdueRecords.length > 5 && (
                                <p className="text-xs text-red-600">+{overdueRecords.length - 5} outros...</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tabela */}
            <Card>
                <CardHeader>
                    <CardTitle>Contas a Pagar</CardTitle>
                </CardHeader>
                <CardContent>
                    <DespesasTable records={records} />
                </CardContent>
            </Card>
        </div>
    )
}
