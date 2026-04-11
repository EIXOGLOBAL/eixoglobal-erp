import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getBudgets } from "@/app/actions/budget-actions"
import { prisma } from "@/lib/prisma"
import { OrcamentosClient } from "@/components/orcamentos/orcamentos-client"
import { BudgetDialog } from "@/components/orcamentos/budget-dialog"
import { CreateShortcut } from "@/components/ui/page-keyboard-shortcuts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileSpreadsheet, Clock, CheckCircle, TrendingUp } from "lucide-react"
import { toNumber, formatCurrency } from "@/lib/formatters"

export const dynamic = 'force-dynamic'

export default async function OrcamentosPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const result = await getBudgets()
    const budgets = result.success ? (result.data ?? []) : []

    const projects = await prisma.project.findMany({
        where: { companyId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
    })

    const totalBudgets = budgets.length
    const draftBudgets = budgets.filter(b => b.status === 'DRAFT').length
    const approvedBudgets = budgets.filter(b => b.status === 'APPROVED').length
    const totalValue = budgets.reduce((sum, b) => sum + toNumber(b.totalValue), 0)

    // Converter Decimal para number para Client Component
    const serializedBudgets = budgets.map(b => ({
        ...b,
        totalValue: toNumber(b.totalValue),
    }))

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Orçamentos</h1>
                    <p className="text-muted-foreground">
                        Gerencie orçamentos de obras e projetos
                    </p>
                </div>
                <CreateShortcut label="Novo Orçamento">
                    {({ open, onOpenChange }) => (
                        <BudgetDialog companyId={companyId} projects={projects} open={open} onOpenChange={onOpenChange} />
                    )}
                </CreateShortcut>
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Orçamentos</CardTitle>
                        <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalBudgets}</div>
                        <p className="text-xs text-muted-foreground">Orçamentos cadastrados</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Em Elaboração</CardTitle>
                        <Clock className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{draftBudgets}</div>
                        <p className="text-xs text-muted-foreground">Orçamentos em rascunho</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{approvedBudgets}</div>
                        <p className="text-xs text-muted-foreground">Orçamentos aprovados</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
                        <p className="text-xs text-muted-foreground">Soma de todos os orçamentos</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Orçamentos</CardTitle>
                </CardHeader>
                <CardContent>
                    <OrcamentosClient budgets={serializedBudgets} projects={projects} companyId={companyId} />
                </CardContent>
            </Card>
        </div>
    )
}
