import { getContracts } from "@/app/actions/contract-actions"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ContractDialog } from "@/components/contracts/contract-dialog"
import { ContractsTable } from "@/components/contracts/contracts-table"
import { CreateShortcut } from '@/components/ui/page-keyboard-shortcuts'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { FileText, DollarSign, Clock, FileEdit, AlertTriangle } from "lucide-react"
import { formatDate } from "@/lib/formatters"

export const dynamic = 'force-dynamic'

export default async function ContractsPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const userRole = session.user?.role as string
    const canWrite = userRole !== 'USER'

    const contractsRes = await getContracts({ companyId })
    const contracts = contractsRes.success ? contractsRes.data : []

    // Buscar projects e contractors para o dialog (filtrados por empresa)
    const projects = await prisma.project.findMany({
        where: { companyId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    })

    const contractors = await prisma.contractor.findMany({
        where: { companyId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    })

    // KPIs
    const activeContracts = contracts?.filter(c => c.status === 'ACTIVE').length || 0
    const totalValue = contracts?.filter(c => c.status === 'ACTIVE').reduce((acc, c) => acc + Number(c.value || 0), 0) || 0

    // Contratos próximos ao vencimento (30 dias)
    const today = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(today.getDate() + 30)

    const expiringContractsList = contracts?.filter(c => {
        if (!c.endDate || c.status !== 'ACTIVE') return false
        const endDate = new Date(c.endDate)
        return endDate >= today && endDate <= thirtyDaysFromNow
    }) || []
    const expiringContracts = expiringContractsList.length

    // Valor total de aditivos
    const totalAmendmentsValue = contracts?.reduce((acc, c) => {
        return acc + (c._count?.amendments || 0)
    }, 0) || 0

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Contratos</h1>
                    <p className="text-muted-foreground">
                        Gerencie contratos, aditivos e reajustes.
                    </p>
                </div>
                {canWrite && (
                    <CreateShortcut label="Novo Contrato">
                        {({ open, onOpenChange }) => (
                            <ContractDialog
                                projects={projects}
                                contractors={contractors}
                                companyId={companyId}
                                open={open}
                                onOpenChange={onOpenChange}
                            />
                        )}
                    </CreateShortcut>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Contratos Ativos
                        </CardTitle>
                        <FileText className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeContracts}</div>
                        <p className="text-xs text-muted-foreground">
                            Em vigência
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Valor Total
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                                minimumFractionDigits: 0,
                            }).format(totalValue)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Contratos ativos
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Próximos ao Vencimento
                        </CardTitle>
                        <Clock className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{expiringContracts}</div>
                        <p className="text-xs text-muted-foreground">
                            Vencem em 30 dias
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total de Aditivos
                        </CardTitle>
                        <FileEdit className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalAmendmentsValue}</div>
                        <p className="text-xs text-muted-foreground">
                            Termos aditivos registrados
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Expiring Contracts Alert */}
            {expiringContractsList.length > 0 && (
                <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-amber-800 dark:text-amber-400 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            {expiringContractsList.length} contrato(s) vencendo nos próximos 30 dias
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            {expiringContractsList.map(c => (
                                <div key={c.id} className="flex items-center justify-between text-sm">
                                    <Link href={`/contratos/${c.id}`} className="text-amber-700 hover:underline font-medium">
                                        {c.identifier} — {c.project?.name}
                                    </Link>
                                    <span className="text-amber-600 text-xs">
                                        Vence em {formatDate(c.endDate!)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Contracts Table */}
            <ContractsTable
                data={contracts || []}
                projects={projects}
                contractors={contractors}
                companyId={companyId}
            />
        </div>
    )
}
