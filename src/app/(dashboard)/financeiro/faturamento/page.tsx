import { getFinancialRecords, getFinancialSummary, getBankAccounts } from "@/app/actions/financial-actions"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from "lucide-react"
import { FinancialRecordDialog } from "@/components/financeiro/financial-record-dialog"
import { FinancialRecordsTable } from "@/components/financeiro/financial-records-table"
import { CreateBankAccountDialog } from "@/components/settings/create-bank-account-dialog"

export const dynamic = 'force-dynamic'

export default async function FaturamentoPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const [records, summaryResult, bankAccounts] = await Promise.all([
        getFinancialRecords(companyId),
        getFinancialSummary(companyId),
        getBankAccounts(companyId),
    ])

    const summary = summaryResult.success ? summaryResult.data : null

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Faturamento</h2>
                    <p className="text-muted-foreground">
                        Controle de receitas, despesas e fluxo de caixa
                    </p>
                </div>
                <div className="flex gap-2">
                    <CreateBankAccountDialog companyId={companyId} />
                    <FinancialRecordDialog companyId={companyId} bankAccounts={bankAccounts} />
                </div>
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Receitas Pagas</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary?.totalIncome || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            A receber: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary?.pendingIncome || 0)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Despesas Pagas</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary?.totalExpense || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            A pagar: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary?.pendingExpense || 0)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Saldo</CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${(summary?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary?.balance || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Receitas - Despesas</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {summary?.overdueRecords || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Lançamentos em atraso</p>
                    </CardContent>
                </Card>
            </div>

            {/* Contas Bancárias */}
            {bankAccounts.length > 0 && (
                <div className="grid gap-4 md:grid-cols-3">
                    {bankAccounts.map(account => (
                        <Card key={account.id}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
                                <p className="text-xs text-muted-foreground">{account.bankName} — Ag. {account.agency} / C. {account.accountNumber}</p>
                            </CardHeader>
                            <CardContent>
                                <div className={`text-xl font-bold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.balance)}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Tabela de Lançamentos */}
            <Card>
                <CardHeader>
                    <CardTitle>Lançamentos Financeiros</CardTitle>
                </CardHeader>
                <CardContent>
                    <FinancialRecordsTable
                        records={records}
                        companyId={companyId}
                        bankAccounts={bankAccounts}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
