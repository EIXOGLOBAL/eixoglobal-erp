import { getContractById } from "@/app/actions/contract-actions"
import { getSession } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ContractDialog } from "@/components/contracts/contract-dialog"
import { ContractItemsTable } from "@/components/contracts/contract-items-table"
import { ContractItemsTableEnhanced } from "@/components/contracts/contract-items-table-enhanced"
import { ContractExecutionChart } from "@/components/contracts/contract-execution-chart"
import { ContractExecutiveSummary } from "@/components/contracts/contract-executive-summary"
import { ContractFinancialSummary } from "@/components/contracts/contract-financial-summary"
import { AmendmentsTimeline } from "@/components/contracts/amendments-timeline"
import { AmendmentDialog } from "@/components/contracts/amendment-dialog"
import { AdjustmentDialog } from "@/components/contracts/adjustment-dialog"
import { AmendmentsTable } from "@/components/contracts/amendments-table"
import { AdjustmentsTable } from "@/components/contracts/adjustments-table"
import { ContractFinancialSchedule } from "@/components/contracts/contract-financial-schedule"
import { ContractDetailsSection } from "@/components/contracts/contract-details-section"
import { SignaturePanel } from "@/components/signatures/SignaturePanel"
import { GenerateBudgetButton } from "@/components/contracts/generate-budget-button"
import { prisma } from "@/lib/prisma"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    ArrowLeft,
    Building2,
    Calendar,
    CalendarDays,
    DollarSign,
    FileText,
    Users,
    Printer,
    FileSignature,
} from "lucide-react"
import { EntityAuditTrail } from "@/components/audit/entity-audit-trail"
import { CopyableValue } from '@/components/ui/copy-button'
import { formatDate, formatDateTime } from "@/lib/formatters"

export const dynamic = 'force-dynamic'

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    DRAFT: "outline",
    ACTIVE: "default",
    COMPLETED: "secondary",
    CANCELLED: "destructive",
}

const statusLabels: Record<string, string> = {
    DRAFT: "Rascunho",
    ACTIVE: "Ativo",
    COMPLETED: "Concluído",
    CANCELLED: "Cancelado",
}

const bulletinStatusLabels: Record<string, string> = {
    DRAFT: "Rascunho",
    PENDING_APPROVAL: "Aguardando Aprovação",
    APPROVED: "Aprovado",
    REJECTED: "Rejeitado",
    BILLED: "Faturado",
}

const bulletinStatusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    DRAFT: "outline",
    PENDING_APPROVAL: "default",
    APPROVED: "secondary",
    REJECTED: "destructive",
    BILLED: "secondary",
}

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
        const { id } = await params
const [result, session] = await Promise.all([
        getContractById(id),
        getSession(),
    ])

    if (!session) redirect("/login")

    if (!result.success || !result.data) {
        notFound()
    }

    const contract = result.data
    const companyId = contract.companyId || session.user?.companyId || ''

    // Buscar dados para o dialog de edição (filtrados por empresa)
    const projects = await prisma.project.findMany({
        where: companyId ? { companyId } : undefined,
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    })

    const contractors = await prisma.contractor.findMany({
        where: companyId ? { companyId } : undefined,
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    })

    // Calcular métricas
    const totalItems = contract.items?.length || 0
    const totalValue = contract.value || 0
    const totalAmendments = contract.amendments?.length || 0
    const totalAdjustments = contract.adjustments?.length || 0

    // Feature 8: Execução financeira
    const totalMeasured = contract.bulletins
        ?.filter(b => ['APPROVED', 'BILLED'].includes(b.status))
        .reduce((sum, b) => sum + Number(b.totalValue || 0), 0) ?? 0
    const contractValue = Number(contract.value || 0)
    const executionPercent = contractValue > 0 ? (totalMeasured / contractValue) * 100 : 0
    const userRole = (session.user as any)?.role || 'USER'

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild aria-label="Voltar">
                    <Link href="/contratos">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">
                        <CopyableValue value={contract.identifier} />
                    </h1>
                    <p className="text-muted-foreground">
                        {contract.contractNumber && (
                            <span className="mr-2">
                                <CopyableValue value={contract.contractNumber} display={`N.º ${contract.contractNumber}`} mono />
                            </span>
                        )}
                        {contract.description || 'Sem descrição'}
                    </p>
                </div>
                <Badge variant={statusVariants[contract.status]}>
                    {statusLabels[contract.status]}
                </Badge>
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/contratos/${contract.id}/print`} target="_blank">
                        <Printer className="h-4 w-4 mr-2" />
                        Imprimir
                    </Link>
                </Button>
                <GenerateBudgetButton
                    contractId={contract.id}
                    hasItems={totalItems > 0}
                />
                <ContractDialog
                    projects={projects}
                    contractors={contractors}
                    companyId={contract.companyId}
                    contract={contract}
                />
            </div>

            {/* Executive Summary */}
            <ContractExecutiveSummary
                identifier={contract.identifier}
                value={Number(contract.value || 0)}
                measuredValue={totalMeasured}
                paidValue={totalMeasured} // You may want to calculate actual paid value from bulletins
                itemsCount={totalItems}
                amendmentsCount={totalAmendments}
                bulletinsCount={contract.bulletins?.length || 0}
                status={contract.status}
            />

            {/* Financial Summary (server component with independent data fetching) */}
            <ContractFinancialSummary contractId={contract.id} />

            {/* Info Cards - Using new component */}
            <ContractDetailsSection
                contract={contract}
                statusVariants={statusVariants}
                statusLabels={statusLabels}
            />

            {/* Tabs */}
            <Tabs defaultValue="geral" className="space-y-4">
                <TabsList className="grid grid-cols-4 md:grid-cols-8 h-auto">
                    <TabsTrigger value="geral" className="text-xs md:text-sm">
                        <FileText className="h-4 w-4 mr-1 md:mr-2" />
                        <span className="hidden sm:inline">Geral</span>
                    </TabsTrigger>
                    <TabsTrigger value="itens" className="text-xs md:text-sm">
                        <span className="hidden sm:inline">Itens</span>
                        <span className="sm:hidden">It.</span>
                        <Badge variant="secondary" className="ml-1 text-xs">{totalItems}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="cronograma" className="text-xs md:text-sm">
                        <CalendarDays className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Cronograma</span>
                        <span className="sm:hidden">Cron.</span>
                        <Badge variant="secondary" className="ml-1 text-xs">
                            {contract.schedule?.length || 0}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="aditivos" className="text-xs md:text-sm">
                        <span className="hidden sm:inline">Aditivos</span>
                        <span className="sm:hidden">Ad.</span>
                        <Badge variant="secondary" className="ml-1 text-xs">{totalAmendments}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="reajustes" className="text-xs md:text-sm">
                        <span className="hidden sm:inline">Reajustes</span>
                        <span className="sm:hidden">Rej.</span>
                        <Badge variant="secondary" className="ml-1 text-xs">{totalAdjustments}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="boletins" className="text-xs md:text-sm">
                        <span className="hidden sm:inline">Medições</span>
                        <span className="sm:hidden">Med.</span>
                        <Badge variant="secondary" className="ml-1 text-xs">
                            {contract.bulletins?.length || 0}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="assinatura" className="text-xs md:text-sm">
                        <FileSignature className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Assinatura</span>
                        <span className="sm:hidden">Ass.</span>
                    </TabsTrigger>
                    <TabsTrigger value="auditoria" className="text-xs md:text-sm">
                        <span className="hidden sm:inline">Auditoria</span>
                        <span className="sm:hidden">Aud.</span>
                    </TabsTrigger>
                </TabsList>

                {/* Tab: Geral */}
                <TabsContent value="geral" className="space-y-4">
                    {/* Financial Execution Chart */}
                    <ContractExecutionChart
                        contractValue={contractValue}
                        measuredValue={totalMeasured}
                        paidValue={totalMeasured}
                    />

                    {/* Informações Principais */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Informações Principais</CardTitle>
                            <CardDescription>Dados cadastrais e informações gerais do contrato</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Linha 1: Identificador e Status */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        Identificador
                                    </label>
                                    <p className="text-lg font-bold">{contract.identifier}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        Status
                                    </label>
                                    <Badge variant={statusVariants[contract.status]} className="w-fit">
                                        {statusLabels[contract.status]}
                                    </Badge>
                                </div>
                            </div>

                            {/* Descrição */}
                            {contract.description && (
                                <div className="space-y-1 pb-4 border-b">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        Descrição
                                    </label>
                                    <p className="text-base leading-relaxed">{contract.description}</p>
                                </div>
                            )}

                            {/* Linha 2: Projeto e Contratada */}
                            <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        Projeto
                                    </label>
                                    <Link
                                        href={`/projects/${contract.project.id}`}
                                        className="text-base font-medium text-primary hover:underline"
                                    >
                                        {contract.project.name}
                                    </Link>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        Contratada
                                    </label>
                                    <p className="text-base font-medium">{contract.contractor?.name || '—'}</p>
                                </div>
                            </div>

                            {/* Linha 3: Datas */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        Data de Início
                                    </label>
                                    <p className="text-base font-medium">
                                        {formatDate(contract.startDate)}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        Data de Término
                                    </label>
                                    <p className="text-base font-medium">
                                        {contract.endDate
                                            ? formatDate(contract.endDate)
                                            : '—'
                                        }
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        Valor Total
                                    </label>
                                    <p className="text-base font-bold text-green-700 dark:text-green-400">
                                        {new Intl.NumberFormat('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL',
                                            minimumFractionDigits: 0,
                                        }).format(Number(totalValue))}
                                    </p>
                                </div>
                            </div>

                            {/* Metadados */}
                            <div className="flex justify-between text-xs text-muted-foreground pt-2">
                                <div>
                                    <span>Criado em: </span>
                                    <span className="font-medium">
                                        {formatDateTime(contract.createdAt)}
                                    </span>
                                </div>
                                <div>
                                    <span>Última atualização: </span>
                                    <span className="font-medium">
                                        {formatDateTime(contract.updatedAt)}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Execução Financeira */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Execução Financeira</CardTitle>
                            <CardDescription>
                                Análise comparativa do contrato versus medições aprovadas
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Cards de Valores */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                                        Valor Contratado
                                    </p>
                                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                                        {new Intl.NumberFormat('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL',
                                            minimumFractionDigits: 0,
                                        }).format(contractValue)}
                                    </p>
                                </div>
                                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-950/30 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                                        Total Medido
                                    </p>
                                    <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                                        {new Intl.NumberFormat('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL',
                                            minimumFractionDigits: 0,
                                        }).format(totalMeasured)}
                                    </p>
                                </div>
                                <div className={`bg-gradient-to-br p-4 rounded-lg border ${totalMeasured > contractValue
                                    ? 'from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-950/30 border-red-200 dark:border-red-800'
                                    : 'from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-950/30 border-green-200 dark:border-green-800'
                                    }`}>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                                        {totalMeasured > contractValue ? 'Estouro' : 'Saldo a Medir'}
                                    </p>
                                    <p className={`text-2xl font-bold ${totalMeasured > contractValue
                                        ? 'text-red-700 dark:text-red-400'
                                        : 'text-green-700 dark:text-green-400'
                                        }`}>
                                        {new Intl.NumberFormat('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL',
                                            minimumFractionDigits: 0,
                                        }).format(Math.abs(contractValue - totalMeasured))}
                                    </p>
                                </div>
                            </div>

                            {/* Barra de Progresso */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-sm font-semibold">Execução Financeira</span>
                                    <span className={`text-sm font-bold ${executionPercent > 100 ? 'text-red-600' : executionPercent > 80 ? 'text-orange-600' : 'text-blue-600'}`}>
                                        {executionPercent.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="h-4 bg-muted rounded-full overflow-hidden shadow-inner">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${executionPercent > 100
                                            ? 'bg-gradient-to-r from-red-500 to-red-600'
                                            : executionPercent > 80
                                                ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                                                : 'bg-gradient-to-r from-blue-500 to-blue-600'
                                            }`}
                                        style={{ width: `${Math.min(executionPercent, 100)}%` }}
                                    />
                                </div>
                                {totalMeasured > contractValue && (
                                    <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
                                        ⚠️ Contrato ultrapassado em {(executionPercent - 100).toFixed(1)}%
                                    </p>
                                )}
                            </div>

                            {/* Estatísticas */}
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                <div className="text-sm">
                                    <p className="text-muted-foreground text-xs mb-1">Itens do Contrato</p>
                                    <p className="text-2xl font-bold">{totalItems}</p>
                                </div>
                                <div className="text-sm">
                                    <p className="text-muted-foreground text-xs mb-1">Boletins de Medição</p>
                                    <p className="text-2xl font-bold">{contract.bulletins?.length || 0}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </TabsContent>

                {/* Tab: Itens do Contrato */}
                <TabsContent value="itens" className="space-y-4">
                    <ContractItemsTableEnhanced
                        items={contract.items || []}
                    />
                </TabsContent>

                {/* Tab: Cronograma Financeiro */}
                <TabsContent value="cronograma" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cronograma Financeiro</CardTitle>
                            <CardDescription>
                                Planejamento de desembolso mensal do contrato
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ContractFinancialSchedule
                                contractId={contract.id}
                                items={contract.schedule ?? []}
                                contractValue={contractValue}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Termos Aditivos */}
                <TabsContent value="aditivos" className="space-y-4">
                    <div className="flex justify-end mb-4">
                        <AmendmentDialog
                            contractId={contract.id}
                            currentValue={totalValue}
                            currentEndDate={contract.endDate ? new Date(contract.endDate).toISOString().split('T')[0] : undefined}
                        />
                    </div>

                    {/* Timeline Visualization */}
                    <AmendmentsTimeline amendments={(contract.amendments ?? []) as any} />

                    {/* Table View */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Lista de Aditivos</CardTitle>
                            <CardDescription>
                                Histórico de alterações contratuais (valor, prazo, escopo)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AmendmentsTable amendments={contract.amendments ?? []} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Reajustes */}
                <TabsContent value="reajustes" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Reajustes de Preço</CardTitle>
                                    <CardDescription>
                                        Histórico de reajustes aplicados (INCC, IPCA, IGP-M)
                                    </CardDescription>
                                </div>
                                <AdjustmentDialog contractId={contract.id} currentValue={totalValue} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <AdjustmentsTable adjustments={contract.adjustments ?? []} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Boletins */}
                <TabsContent value="boletins" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Boletins de Medição</CardTitle>
                                    <CardDescription>
                                        Boletins de medição vinculados a este contrato
                                    </CardDescription>
                                </div>
                                <Link href="/measurements">
                                    <Button variant="outline" size="sm">
                                        <FileText className="h-4 w-4 mr-2" />
                                        Novo Boletim
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {contract.bulletins && contract.bulletins.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Número</TableHead>
                                            <TableHead>Período</TableHead>
                                            <TableHead className="text-right">Valor</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Link</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {contract.bulletins.map((bulletin) => (
                                            <TableRow key={bulletin.id}>
                                                <TableCell className="font-medium">
                                                    {bulletin.number}
                                                </TableCell>
                                                <TableCell>{bulletin.referenceMonth}</TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {new Intl.NumberFormat('pt-BR', {
                                                        style: 'currency',
                                                        currency: 'BRL',
                                                    }).format(bulletin.totalValue)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={bulletinStatusVariants[bulletin.status] ?? "outline"}>
                                                        {bulletinStatusLabels[bulletin.status] ?? bulletin.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Link
                                                        href={`/measurements/${bulletin.id}`}
                                                        className="hover:underline text-primary text-sm"
                                                    >
                                                        Ver boletim
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    Nenhum boletim de medição vinculado.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Assinatura Digital */}
                <TabsContent value="assinatura" className="space-y-4">
                    <SignaturePanel
                        entityType="contract"
                        entityId={contract.id}
                        currentStatus={contract.d4signStatus}
                        userRole={userRole}
                    />
                </TabsContent>

                {/* Tab: Auditoria */}
                <TabsContent value="auditoria" className="space-y-4">
                    <EntityAuditTrail
                        entityType="contract"
                        entityId={contract.id}
                        title="Histórico de Alterações do Contrato"
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
