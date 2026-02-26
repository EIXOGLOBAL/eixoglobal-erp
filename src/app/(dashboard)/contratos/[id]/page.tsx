import { getContractById } from "@/app/actions/contract-actions"
import { getSession } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ContractDialog } from "@/components/contracts/contract-dialog"
import { ContractItemsTable } from "@/components/contracts/contract-items-table"
import { AmendmentDialog } from "@/components/contracts/amendment-dialog"
import { AdjustmentDialog } from "@/components/contracts/adjustment-dialog"
import { AmendmentsTable } from "@/components/contracts/amendments-table"
import { AdjustmentsTable } from "@/components/contracts/adjustments-table"
import { SignaturePanel } from "@/components/signatures/SignaturePanel"
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
    DollarSign,
    FileText,
    Users,
    Printer,
    FileSignature,
} from "lucide-react"

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
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/contratos">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">{contract.identifier}</h1>
                    <p className="text-muted-foreground">
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
                <ContractDialog
                    projects={projects}
                    contractors={contractors}
                    companyId={contract.companyId}
                    contract={contract}
                />
            </div>

            {/* Info Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Projeto</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold">
                            <Link
                                href={`/projects/${contract.project.id}`}
                                className="hover:underline"
                            >
                                {contract.project.name}
                            </Link>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Projeto vinculado
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Contratada</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold">
                            {contract.contractor?.name || 'Não informada'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Empresa contratada
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valor do Contrato</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold">
                            {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                                minimumFractionDigits: 0,
                            }).format(Number(totalValue))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {totalItems} itens cadastrados
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Período de Vigência</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-medium">
                            {new Date(contract.startDate).toLocaleDateString('pt-BR')}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            até {contract.endDate
                                ? new Date(contract.endDate).toLocaleDateString('pt-BR')
                                : 'Indefinido'
                            }
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="dados" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="dados">
                        <FileText className="h-4 w-4 mr-2" />
                        Dados Gerais
                    </TabsTrigger>
                    <TabsTrigger value="itens">
                        Itens do Contrato
                        <Badge variant="secondary" className="ml-2">{totalItems}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="aditivos">
                        Termos Aditivos
                        <Badge variant="secondary" className="ml-2">{totalAmendments}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="reajustes">
                        Reajustes
                        <Badge variant="secondary" className="ml-2">{totalAdjustments}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="boletins">
                        Boletins de Medição
                        <Badge variant="secondary" className="ml-2">
                            {contract.bulletins?.length || 0}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="assinatura">
                        <FileSignature className="h-4 w-4 mr-2" />
                        Assinatura Digital
                    </TabsTrigger>
                </TabsList>

                {/* Tab: Dados Gerais */}
                <TabsContent value="dados" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informações do Contrato</CardTitle>
                            <CardDescription>Dados cadastrais e informações gerais</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">
                                        Identificador
                                    </label>
                                    <p className="text-base font-medium">{contract.identifier}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">
                                        Status
                                    </label>
                                    <div className="mt-1">
                                        <Badge variant={statusVariants[contract.status]}>
                                            {statusLabels[contract.status]}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                    Descrição
                                </label>
                                <p className="text-base">{contract.description || 'Sem descrição'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">
                                        Projeto
                                    </label>
                                    <p className="text-base font-medium">
                                        <Link
                                            href={`/projects/${contract.project.id}`}
                                            className="hover:underline text-primary"
                                        >
                                            {contract.project.name}
                                        </Link>
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">
                                        Contratada
                                    </label>
                                    <p className="text-base">{contract.contractor?.name || 'Não informada'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">
                                        Data de Início
                                    </label>
                                    <p className="text-base">
                                        {new Date(contract.startDate).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">
                                        Data de Término
                                    </label>
                                    <p className="text-base">
                                        {contract.endDate
                                            ? new Date(contract.endDate).toLocaleDateString('pt-BR')
                                            : 'Não definido'
                                        }
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">
                                        Valor Total
                                    </label>
                                    <p className="text-base font-bold text-green-700">
                                        {new Intl.NumberFormat('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL',
                                        }).format(Number(totalValue))}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                                    <div>
                                        <span>Criado em: </span>
                                        <span className="font-medium">
                                            {new Date(contract.createdAt).toLocaleString('pt-BR')}
                                        </span>
                                    </div>
                                    <div>
                                        <span>Última atualização: </span>
                                        <span className="font-medium">
                                            {new Date(contract.updatedAt).toLocaleString('pt-BR')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Execução Financeira</CardTitle>
                            <CardDescription>Comparativo entre valor do contrato e total medido aprovado</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                                    <p className="text-xs text-muted-foreground mb-1">Valor do Contrato</p>
                                    <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contractValue)}
                                    </p>
                                </div>
                                <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                                    <p className="text-xs text-muted-foreground mb-1">Total Medido (aprovado)</p>
                                    <p className="text-lg font-bold text-orange-700 dark:text-orange-400">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalMeasured)}
                                    </p>
                                </div>
                                <div className={`text-center p-3 rounded-lg ${totalMeasured > contractValue ? 'bg-red-50 dark:bg-red-950/30' : 'bg-green-50 dark:bg-green-950/30'}`}>
                                    <p className="text-xs text-muted-foreground mb-1">{totalMeasured > contractValue ? 'Estouro' : 'Saldo a Medir'}</p>
                                    <p className={`text-lg font-bold ${totalMeasured > contractValue ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(contractValue - totalMeasured))}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                    <span>Execução Financeira</span>
                                    <span className={executionPercent > 100 ? 'text-red-600 font-medium' : ''}>{executionPercent.toFixed(1)}%</span>
                                </div>
                                <div className="h-3 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${executionPercent > 100 ? 'bg-red-500' : executionPercent > 80 ? 'bg-orange-500' : 'bg-blue-500'}`}
                                        style={{ width: `${Math.min(executionPercent, 100)}%` }}
                                    />
                                </div>
                                {totalMeasured > contractValue && (
                                    <p className="text-xs text-red-600 mt-1 font-medium">Contrato acima do valor em {(executionPercent - 100).toFixed(1)}%</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                </TabsContent>

                {/* Tab: Itens do Contrato */}
                <TabsContent value="itens" className="space-y-4">
                    <ContractItemsTable
                        contractId={contract.id}
                        items={contract.items || []}
                    />
                </TabsContent>

                {/* Tab: Termos Aditivos */}
                <TabsContent value="aditivos" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Termos Aditivos</CardTitle>
                                    <CardDescription>
                                        Histórico de alterações contratuais (valor, prazo, escopo)
                                    </CardDescription>
                                </div>
                                <AmendmentDialog
                                    contractId={contract.id}
                                    currentValue={totalValue}
                                    currentEndDate={contract.endDate ? new Date(contract.endDate).toISOString().split('T')[0] : undefined}
                                />
                            </div>
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
            </Tabs>
        </div>
    )
}
