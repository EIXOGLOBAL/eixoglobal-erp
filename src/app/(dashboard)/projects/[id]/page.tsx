import { getProjectById } from "@/app/actions/project-actions"
import { getClients } from "@/app/actions/client-actions"
import { getSession } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ProjectDialog } from "@/components/projects/project-dialog"
import { AllocationDialog } from "@/components/projects/allocation-dialog"
import { CreateBulletinDialog } from "@/components/bulletins/create-bulletin-dialog"
import { SCurveChart } from "@/components/projects/scurve-chart"
import { buildSCurveData } from "@/lib/scurve"
import { calculateEVM } from "@/lib/evm"
import { EVMDashboard } from "@/components/projects/evm-dashboard"
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
    Ruler,
    CheckCircle2,
    XCircle,
    AlertCircle,
} from "lucide-react"
import { StatusHistory } from "@/components/projects/status-history"
import { BudgetComparison } from "@/components/projects/budget-comparison"

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    PLANNING: "outline",
    IN_PROGRESS: "default",
    COMPLETED: "secondary",
    CANCELLED: "destructive",
    ON_HOLD: "outline",
}

const statusLabels: Record<string, string> = {
    PLANNING: "Planejamento",
    IN_PROGRESS: "Em Andamento",
    COMPLETED: "Concluído",
    CANCELLED: "Cancelado",
    ON_HOLD: "Em Espera",
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
        const { id } = await params
const session = await getSession()
    if (!session) redirect("/login")

    const result = await getProjectById(id)

    if (!result.success || !result.data) {
        notFound()
    }

    const project = result.data

    const companyId = session.user?.companyId || ''
    const [companies, bulletins, employees, tasks, statusHistory, clientsResult] = await Promise.all([
        prisma.company.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        }),
        prisma.measurementBulletin.findMany({
            where: { projectId: id },
            include: {
                contract: { select: { identifier: true } },
            },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.employee.findMany({
            where: { companyId, status: 'ACTIVE' },
            select: { id: true, name: true, jobTitle: true },
            orderBy: { name: 'asc' }
        }),
        prisma.projectTask.findMany({
            where: { projectId: id },
            orderBy: { startDate: 'asc' },
        }),
        prisma.projectStatusHistory.findMany({
            where: { projectId: id },
            orderBy: { createdAt: 'desc' },
        }),
        getClients(companyId),
    ])

    const clients = clientsResult.success
        ? (clientsResult.data ?? []).filter((c) => c.status === 'ACTIVE').map((c) => ({
              id: c.id,
              displayName: c.displayName,
          }))
        : []

    // Calculate metrics from bulletins
    const totalMeasurements = bulletins.length
    const approvedMeasurements = bulletins.filter(b => b.status === 'APPROVED' || b.status === 'BILLED').length
    const totalMeasuredValue = bulletins
        .filter(b => b.status === 'APPROVED' || b.status === 'BILLED')
        .reduce((acc, b) => acc + Number(b.totalValue || 0), 0)

    // Budget comparison (Feature 5)
    const totalApproved = bulletins
        .filter(b => ['APPROVED', 'BILLED'].includes(b.status))
        .reduce((sum, b) => sum + Number(b.totalValue || 0), 0)
    const budget = Number(project.budget || 0)
    const percentUsed = budget > 0 ? (totalApproved / budget) * 100 : 0

    // Calculate EVM metrics
    const evmMetrics = calculateEVM(
        project,
        tasks.map(t => ({
            percentDone: t.percentDone,
            plannedEnd: t.plannedEnd,
        })),
        bulletins.map(b => ({
            status: b.status,
            totalValue: Number(b.totalValue ?? 0),
        })),
    )

    // Build S-Curve data
    const projectStartDate = new Date(project.startDate)
    const projectEndDate = project.endDate ? new Date(project.endDate) : new Date()
    const scurveData = buildSCurveData(
        tasks.map(t => ({
            id: t.id,
            name: t.name,
            startDate: t.startDate,
            endDate: t.endDate,
            plannedStart: t.plannedStart,
            plannedEnd: t.plannedEnd,
            percentDone: t.percentDone,
            status: t.status,
        })),
        projectStartDate,
        projectEndDate,
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/projects">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                    <p className="text-muted-foreground">
                        {project.description || 'Sem descrição'}
                    </p>
                </div>
                <Badge variant={statusVariants[project.status]}>
                    {statusLabels[project.status]}
                </Badge>
                <ProjectDialog companies={companies} clients={clients} project={project} />
            </div>

            {/* Project Info Cards */}
            <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Empresa</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">{project.company.name}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            CNPJ: {project.company.cnpj}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Período</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-medium">
                            {new Date(project.startDate).toLocaleDateString('pt-BR')}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            até {project.endDate
                                ? new Date(project.endDate).toLocaleDateString('pt-BR')
                                : 'Indefinido'
                            }
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Orçamento</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">
                            {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                            }).format(Number(project.budget || 0))}
                        </div>
                        {Number(project.budget || 0) > 0 && (
                            <div className="mt-2">
                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                    <span>Executado</span>
                                    <span>{Math.round((totalMeasuredValue / Number(project.budget)) * 100)}%</span>
                                </div>
                                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${totalMeasuredValue > Number(project.budget) ? 'bg-red-500' : totalMeasuredValue / Number(project.budget) > 0.8 ? 'bg-orange-400' : 'bg-blue-500'}`}
                                        style={{ width: `${Math.min(100, (totalMeasuredValue / Number(project.budget)) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                            Executado: {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                            }).format(totalMeasuredValue)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Medições</CardTitle>
                        <Ruler className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">{totalMeasurements}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {approvedMeasurements} aprovadas
                        </p>
                    </CardContent>
                </Card>

                {project.client && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Cliente da Obra</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm font-bold truncate">{project.client.displayName}</div>
                            {project.client.cnpj && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    CNPJ: {project.client.cnpj}
                                </p>
                            )}
                            {project.client.phone && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Tel: {project.client.phone}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Readiness Checklist — Prerequisite flow for measurement */}
            {(() => {
                const hasContracts = (project.contracts?.length || 0) > 0
                const hasContractWithItems = project.contracts?.some(c => (c.items?.length || 0) > 0) ?? false
                const canMeasure = hasContracts && hasContractWithItems

                const steps = [
                    {
                        done: true,
                        label: 'Projeto criado',
                        hint: null,
                    },
                    {
                        done: hasContracts,
                        label: 'Contrato vinculado ao projeto',
                        hint: !hasContracts ? (
                            <Link href="/contratos" className="text-xs text-blue-600 underline hover:text-blue-700">
                                Criar contrato →
                            </Link>
                        ) : null,
                    },
                    {
                        done: hasContractWithItems,
                        label: 'Itens na planilha orçamentária do contrato',
                        hint: !hasContractWithItems && hasContracts ? (
                            <Link href={`/contratos/${project.contracts[0]?.id}`} className="text-xs text-blue-600 underline hover:text-blue-700">
                                Adicionar itens ao contrato →
                            </Link>
                        ) : null,
                    },
                    {
                        done: canMeasure,
                        label: 'Pronto para gerar Boletim de Medição',
                        hint: null,
                    },
                ]

                return (
                    <Card className={canMeasure ? 'border-green-200 bg-green-50/30' : 'border-orange-200 bg-orange-50/20'}>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                {canMeasure
                                    ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    : <AlertCircle className="h-4 w-4 text-orange-600" />
                                }
                                {canMeasure
                                    ? 'Projeto pronto para medições'
                                    : 'Pré-requisitos para Boletim de Medição'
                                }
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-6 flex-wrap">
                                {steps.map((step, i) => (
                                    <div key={i} className="flex items-center gap-1.5">
                                        {step.done
                                            ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                            : <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                                        }
                                        <div>
                                            <span className={`text-sm ${step.done ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                {step.label}
                                            </span>
                                            {step.hint && <div className="mt-0.5">{step.hint}</div>}
                                        </div>
                                        {i < steps.length - 1 && (
                                            <span className="mx-2 text-muted-foreground/40 hidden sm:block">→</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )
            })()}

            {/* Tabs */}
            <Tabs defaultValue="measurements" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="measurements">Medições</TabsTrigger>
                    <TabsTrigger value="contracts">Contratos</TabsTrigger>
                    <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
                    <TabsTrigger value="scurve">Curva S</TabsTrigger>
                    <TabsTrigger value="evm">EVM</TabsTrigger>
                    <TabsTrigger value="team">Equipe</TabsTrigger>
                    <TabsTrigger value="historico">Histórico</TabsTrigger>
                </TabsList>

                <TabsContent value="measurements" className="space-y-4">
                    {budget > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Comparativo Orçado vs Realizado</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <BudgetComparison budget={budget} spent={totalApproved} percentUsed={percentUsed} />
                            </CardContent>
                        </Card>
                    )}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Boletins de Medição</CardTitle>
                                    <CardDescription>
                                        Todos os boletins registrados neste projeto
                                    </CardDescription>
                                </div>
                                <CreateBulletinDialog
                                    userId={session.user?.id || ''}
                                    defaultProjectId={project.id}
                                    projects={[{
                                        id: project.id,
                                        name: project.name,
                                        contracts: project.contracts.map(c => ({
                                            id: c.id,
                                            identifier: c.identifier,
                                        }))
                                    }]}
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {bulletins.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Número</TableHead>
                                            <TableHead>Contrato</TableHead>
                                            <TableHead>Competência</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Valor</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bulletins.map((b) => (
                                            <TableRow key={b.id}>
                                                <TableCell className="font-mono">
                                                    <Link href={`/measurements/${b.id}`} className="text-blue-600 hover:underline font-medium">
                                                        {b.number}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{b.contract.identifier}</TableCell>
                                                <TableCell>{b.referenceMonth}</TableCell>
                                                <TableCell>
                                                    <Badge variant={
                                                        b.status === 'APPROVED' || b.status === 'BILLED' ? 'secondary' :
                                                        b.status === 'REJECTED' ? 'destructive' :
                                                        b.status === 'PENDING_APPROVAL' ? 'default' : 'outline'
                                                    }>
                                                        {b.status === 'DRAFT' ? 'Rascunho' :
                                                         b.status === 'PENDING_APPROVAL' ? 'Ag. Aprovação' :
                                                         b.status === 'APPROVED' ? 'Aprovado' :
                                                         b.status === 'REJECTED' ? 'Rejeitado' : 'Faturado'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(b.totalValue || 0))}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    Nenhum boletim registrado ainda.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="contracts" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Contratos do Projeto</CardTitle>
                                    <CardDescription>
                                        Contratos e itens vinculados
                                    </CardDescription>
                                </div>
                                <Link href="/contratos">
                                    <Button variant="outline" size="sm">
                                        <FileText className="h-4 w-4 mr-2" />
                                        Novo Contrato
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {project.contracts && project.contracts.length > 0 ? (
                                <div className="space-y-3">
                                    {project.contracts.map((contract) => {
                                        const contractStatusLabels: Record<string, string> = {
                                            DRAFT: "Rascunho",
                                            ACTIVE: "Ativo",
                                            COMPLETED: "Concluído",
                                            CANCELLED: "Cancelado",
                                        }
                                        const contractStatusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
                                            DRAFT: "outline",
                                            ACTIVE: "default",
                                            COMPLETED: "secondary",
                                            CANCELLED: "destructive",
                                        }
                                        return (
                                            <div key={contract.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <Link href={`/contratos/${contract.id}`} className="font-semibold text-blue-600 hover:underline">
                                                            {contract.identifier}
                                                        </Link>
                                                        {contract.description && (
                                                            <p className="text-sm text-muted-foreground mt-0.5">
                                                                {contract.description}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {contract.items?.length || 0} itens na planilha
                                                        </p>
                                                    </div>
                                                    <Badge variant={contractStatusVariants[contract.status] || 'outline'}>
                                                        {contractStatusLabels[contract.status] || contract.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p>Nenhum contrato vinculado ainda.</p>
                                    <p className="text-sm mt-1">Use o botão acima para criar um novo contrato.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Cronograma Tab */}
                <TabsContent value="cronograma" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Cronograma de Tarefas</CardTitle>
                                    <CardDescription>Tarefas planejadas para este projeto</CardDescription>
                                </div>
                                <Link href="/cronograma">
                                    <Button variant="outline" size="sm">Gerenciar Cronograma</Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {tasks.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tarefa</TableHead>
                                            <TableHead>Etapa</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Início</TableHead>
                                            <TableHead>Fim</TableHead>
                                            <TableHead className="text-right">Progresso</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tasks.map((task) => {
                                            const statusLabelsMap: Record<string, string> = {
                                                TODO: 'A Fazer', IN_PROGRESS: 'Em Andamento',
                                                COMPLETED: 'Concluído', ON_HOLD: 'Em Espera', CANCELLED: 'Cancelado'
                                            }
                                            return (
                                                <TableRow key={task.id}>
                                                    <TableCell className="font-medium text-sm">{task.name}</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">{task.phase || '—'}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={task.status === 'COMPLETED' ? 'secondary' : task.status === 'CANCELLED' ? 'destructive' : 'outline'}>
                                                            {statusLabelsMap[task.status] || task.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm">{new Date(task.startDate).toLocaleDateString('pt-BR')}</TableCell>
                                                    <TableCell className="text-sm">{new Date(task.endDate).toLocaleDateString('pt-BR')}</TableCell>
                                                    <TableCell className="text-right">
                                                        <span className="text-sm font-mono">{task.percentDone.toFixed(0)}%</span>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p>Nenhuma tarefa no cronograma deste projeto.</p>
                                    <p className="text-sm mt-1">
                                        <Link href="/cronograma" className="text-blue-600 hover:underline">
                                            Acesse o Cronograma
                                        </Link>{' '}para criar tarefas.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Curva S Tab */}
                <TabsContent value="scurve" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Curva S — Progresso Físico</CardTitle>
                            <CardDescription>Progresso planejado vs realizado ao longo do tempo</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {scurveData.length > 0 ? (
                                <SCurveChart data={scurveData} projectName={project.name} />
                            ) : (
                                <div className="text-center py-10 text-muted-foreground">
                                    <p>Adicione tarefas com datas planejadas para visualizar a Curva S.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* EVM Tab */}
                <TabsContent value="evm" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>EVM — Gestão pelo Valor Agregado</CardTitle>
                            <CardDescription>
                                Análise de desempenho de custo e prazo baseada em Earned Value Management
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <EVMDashboard metrics={evmMetrics} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="team" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Equipe Alocada</CardTitle>
                                    <CardDescription>
                                        Funcionários trabalhando neste projeto
                                    </CardDescription>
                                </div>
                                <AllocationDialog projectId={project.id} employees={employees} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {project.allocations && project.allocations.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>Cargo</TableHead>
                                            <TableHead>Início</TableHead>
                                            <TableHead>Fim</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {project.allocations.map((allocation) => (
                                            <TableRow key={allocation.id}>
                                                <TableCell className="font-medium">
                                                    <Link
                                                        href={`/rh/funcionarios/${allocation.employee.id}`}
                                                        className="text-blue-600 hover:underline"
                                                    >
                                                        {allocation.employee.name}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>{allocation.employee.jobTitle}</TableCell>
                                                <TableCell>
                                                    {new Date(allocation.startDate).toLocaleDateString('pt-BR')}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {allocation.endDate
                                                        ? new Date(allocation.endDate).toLocaleDateString('pt-BR')
                                                        : 'Em andamento'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p>Nenhum funcionário alocado ainda.</p>
                                    <p className="text-sm mt-1">Use o botão acima para alocar funcionários.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="historico" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Status</CardTitle>
                            <CardDescription>Linha do tempo de alterações de status do projeto</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <StatusHistory history={statusHistory} />
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </div>
    )
}
