import { getFinancialRecords } from "@/app/actions/financial-actions"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { ReceiveisTable } from "@/components/financeiro/recebiveis-table"

export const dynamic = 'force-dynamic'

export default async function ReceiveisPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const records = await getFinancialRecords(companyId, 'INCOME')

    const totalReceivable = records
        .filter(r => r.status === 'PENDING' || r.status === 'SCHEDULED')
        .reduce((sum, r) => sum + r.amount, 0)

    const totalReceived = records
        .filter(r => r.status === 'PAID')
        .reduce((sum, r) => sum + (r.paidAmount || r.amount), 0)

    const now = new Date()
    const overdueRecords = records.filter(r =>
        (r.status === 'PENDING' || r.status === 'SCHEDULED') &&
        new Date(r.dueDate) < now
    )
    const totalOverdue = overdueRecords.reduce((sum, r) => sum + r.amount, 0)

    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Recebíveis</h2>
                <p className="text-muted-foreground">Controle de contas a receber</p>
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">A Receber</CardTitle>
                        <Clock className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{fmt(totalReceivable)}</div>
                        <p className="text-xs text-muted-foreground">
                            {records.filter(r => r.status === 'PENDING' || r.status === 'SCHEDULED').length} títulos em aberto
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Recebido</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{fmt(totalReceived)}</div>
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
                        <CardTitle className="text-sm font-medium">Total de Receitas</CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{records.length}</div>
                        <p className="text-xs text-muted-foreground">Lançamentos de receita</p>
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
                    <CardTitle>Contas a Receber</CardTitle>
                </CardHeader>
                <CardContent>
                    <ReceiveisTable records={records} />
                </CardContent>
            </Card>
        </div>
    )
}
