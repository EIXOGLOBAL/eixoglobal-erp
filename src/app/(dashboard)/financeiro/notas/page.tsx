import { getFiscalNotes, getFiscalNoteSummary } from "@/app/actions/fiscal-note-actions"
import { getActiveSuppliers } from "@/app/actions/supplier-actions"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    FileText,
    CheckCircle,
    XCircle,
    FileClock,
    AlertTriangle,
    Clock,
    DollarSign,
    CalendarDays,
} from "lucide-react"
import { FiscalNotesClient } from "@/components/financeiro/fiscal-notes-client"
import { cn } from "@/lib/utils"

export const dynamic = 'force-dynamic'

export default async function NotasFiscaisPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const [notes, summaryResult, suppliers] = await Promise.all([
        getFiscalNotes(companyId),
        getFiscalNoteSummary(companyId),
        getActiveSuppliers(companyId),
    ])

    const summary = summaryResult.success ? summaryResult.data : null

    // Calculate advanced metrics
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Total issued this month
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    const issuedThisMonth = notes.filter(n => {
        const issued = new Date(n.issuedDate)
        return n.status === 'ISSUED' && issued >= currentMonthStart && issued <= currentMonthEnd
    })
    const issuedThisMonthTotal = issuedThisMonth.reduce((sum, n) => sum + n.value, 0)

    // Due in next 30 days (ISSUED notes with dueDate)
    const dueSoon = notes.filter(n => {
        if (n.status !== 'ISSUED' || !n.dueDate) return false
        const due = new Date(n.dueDate)
        return due >= now && due <= thirtyDaysFromNow
    })
    const dueSoonTotal = dueSoon.reduce((sum, n) => sum + n.value, 0)

    // Overdue (ISSUED notes with past dueDate)
    const overdue = notes.filter(n => {
        if (n.status !== 'ISSUED' || !n.dueDate) return false
        const due = new Date(n.dueDate)
        return due < now
    })
    const overdueTotal = overdue.reduce((sum, n) => sum + n.value, 0)

    // Open value (ISSUED + DRAFT)
    const openNotes = notes.filter(n => n.status === 'ISSUED' || n.status === 'DRAFT')
    const openTotal = openNotes.reduce((sum, n) => sum + n.value, 0)

    // Expiring in 7 days count
    const expiringSoon = notes.filter(n => {
        if (n.status !== 'ISSUED' || !n.dueDate) return false
        const due = new Date(n.dueDate)
        return due >= now && due <= sevenDaysFromNow
    })

    const fmt = (v: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Documentos Fiscais</h2>
                    <p className="text-muted-foreground">
                        NF-e, NFS-e, CT-e, Faturas, Recibos, Contas de Consumo, Aluguel e outros
                    </p>
                </div>
                <FiscalNotesClient
                    companyId={companyId}
                    notes={notes}
                    suppliers={suppliers}
                    mode="create-button"
                />
            </div>

            {/* Enhanced Dashboard KPIs */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Emitidas no M&ecirc;s
                        </CardTitle>
                        <CalendarDays className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {fmt(issuedThisMonthTotal)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {issuedThisMonth.length} documento(s) este m&ecirc;s
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            A Vencer em 30 Dias
                        </CardTitle>
                        <Clock className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            {fmt(dueSoonTotal)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {dueSoon.length} documento(s) pendentes
                            {expiringSoon.length > 0 && (
                                <span className="text-amber-600 font-medium">
                                    {' '}({expiringSoon.length} em 7 dias)
                                </span>
                            )}
                        </p>
                    </CardContent>
                </Card>

                <Card className={cn(overdueTotal > 0 && 'border-red-200 bg-red-50/50')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Vencidas
                        </CardTitle>
                        <AlertTriangle
                            className={cn(
                                'h-4 w-4',
                                overdueTotal > 0 ? 'text-red-600' : 'text-gray-400'
                            )}
                        />
                    </CardHeader>
                    <CardContent>
                        <div
                            className={cn(
                                'text-2xl font-bold',
                                overdueTotal > 0 ? 'text-red-600' : 'text-muted-foreground'
                            )}
                        >
                            {fmt(overdueTotal)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {overdue.length} documento(s) vencido(s)
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Valor em Aberto
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {fmt(openTotal)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {openNotes.length} documento(s) em aberto
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Original KPIs (smaller, secondary) */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Documentos Emitidos</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {summary?.totalIssued || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Documentos ativos</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                        <FileText className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {fmt(summary?.totalValue || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Soma dos emitidos</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rascunhos</CardTitle>
                        <FileClock className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {summary?.totalDraft || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Aguardando emiss&atilde;o</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cancelados</CardTitle>
                        <XCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {summary?.totalCancelled || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Documentos cancelados</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabela */}
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Documentos</CardTitle>
                </CardHeader>
                <CardContent>
                    <FiscalNotesClient
                        companyId={companyId}
                        notes={notes}
                        suppliers={suppliers}
                        mode="table"
                    />
                </CardContent>
            </Card>
        </div>
    )
}
