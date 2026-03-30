import { getBulletinById } from "@/app/actions/bulletin-actions"
import { getSession } from "@/lib/auth"
import { notFound } from "next/navigation"
import Link from "next/link"
import {
    ArrowLeft,
    FileText,
    Paperclip,
    MessageSquare,
    Printer,
    Calendar,
    Users,
    AlertCircle,
    Download,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { BulletinItemsEditor } from "@/components/bulletins/bulletin-items-editor"
import { BulletinActionButtons } from "@/components/bulletins/bulletin-action-buttons"
import { CommentsSection } from "@/components/bulletins/comments-section"
import { AttachmentUploader } from "@/components/bulletins/attachment-uploader"
import { SignaturePanel } from "@/components/signatures/SignaturePanel"
import { WorkflowProgressStepper } from "@/components/bulletins/workflow-progress-stepper"
import { BulletinSummaryCard } from "@/components/bulletins/bulletin-summary-card"
import { BulletinItemsTableEnhanced } from "@/components/bulletins/bulletin-items-table-enhanced"
import { BulletinComparisonPanel } from "@/components/bulletins/bulletin-comparison-panel"
import { BulletinDetailsHeader } from "@/components/bulletins/bulletin-details-header"
import { BulletinMetadataPanel } from "@/components/bulletins/bulletin-metadata-panel"
import { BulletinTimeline } from "@/components/bulletins/bulletin-timeline"
import { ContractExecutionChart } from "@/components/bulletins/contract-execution-chart"
import { BulletinRejectionPanel } from "@/components/bulletins/bulletin-rejection-panel"

export const dynamic = 'force-dynamic'

// Helper for status colors
const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    DRAFT: "outline",
    PENDING_APPROVAL: "default",
    APPROVED: "secondary",
    REJECTED: "destructive",
    BILLED: "secondary",
}

const statusLabels: Record<string, string> = {
    DRAFT: "Rascunho",
    PENDING_APPROVAL: "Aguardando Aprovação",
    APPROVED: "Aprovado",
    REJECTED: "Rejeitado",
    BILLED: "Faturado",
}

export default async function BulletinDetailPage({ params }: { params: Promise<{ id: string }> }) {
        const { id } = await params
const [result, session] = await Promise.all([
        getBulletinById(id),
        getSession(),
    ])

    if (!result.success || !result.data) {
        notFound()
    }

    const bulletin = result.data
    const totalValue = Number(bulletin.totalValue)
    const userId = session?.user?.id || ''
    const userRole = (session?.user as any)?.role || 'USER'
    const canEdit = bulletin.status === 'DRAFT' || bulletin.status === 'REJECTED'
    const showSignature = ['APPROVED', 'BILLED'].includes(bulletin.status) || bulletin.d4signStatus

    return (
        <div className="space-y-6 pb-20">
            {/* Header / Breadcrumbs */}
            <div className="flex items-center gap-4 mb-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/measurements">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-bold tracking-tight">
                            {bulletin.number}
                        </h1>
                        <Badge variant={statusVariants[bulletin.status]} className="text-sm">
                            {statusLabels[bulletin.status]}
                        </Badge>
                        {bulletin.status === 'REJECTED' && bulletin.rejectionReason && (
                            <Badge variant="destructive" className="text-xs flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Rejeição
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{bulletin.project.name}</span>
                        <span>•</span>
                        <span className="font-medium text-foreground">{bulletin.contract.identifier}</span>
                        <span>•</span>
                        <span>{bulletin.referenceMonth}</span>
                    </div>
                </div>

                {/* Actions (Right Side) */}
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/measurements/${bulletin.id}/print`} target="_blank">
                            <Printer className="mr-2 h-4 w-4" />
                            Imprimir
                        </Link>
                    </Button>

                    {/* Workflow Actions Component */}
                    <BulletinActionButtons bulletin={bulletin} userId={userId} />
                </div>
            </div>

            {/* Workflow Progress Stepper */}
            <WorkflowProgressStepper status={bulletin.status as any} />

            {/* Main Info Cards - Enhanced */}
            <div className="grid gap-6 md:grid-cols-3">
                <BulletinSummaryCard
                    totalItems={bulletin.items.length}
                    totalValue={totalValue}
                    contractValue={bulletin.contract.value ? Number(bulletin.contract.value) : undefined}
                />

                <Card className="overflow-hidden">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-sm font-medium text-muted-foreground">Período de Medição</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-medium">
                            {bulletin.referenceMonth}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {new Date(bulletin.periodStart).toLocaleDateString('pt-BR')} até {new Date(bulletin.periodEnd).toLocaleDateString('pt-BR')}
                        </p>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-sm font-medium text-muted-foreground">Responsáveis</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Criado por:</span>
                            <span className="font-medium">{bulletin.createdBy?.name || 'Sistema'}</span>
                        </div>
                        {bulletin.engineerId && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Engenheiro:</span>
                                <span className="font-medium">{bulletin.engineer?.name}</span>
                            </div>
                        )}
                        {bulletin.managerId && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Gerente:</span>
                                <span className="font-medium">{bulletin.manager?.name}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Rejection Alert */}
            {bulletin.status === 'REJECTED' && bulletin.rejectionReason && (
                <BulletinRejectionPanel
                    bulletinId={bulletin.id}
                    rejectionReason={bulletin.rejectionReason}
                    rejectedAt={bulletin.rejectedAt}
                />
            )}

            {/* Comparison Panel & Contract Execution */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Comparison Panel */}
                {bulletin.items.length > 0 && (
                    <BulletinComparisonPanel
                        data={{
                            currentBulletin: {
                                value: totalValue,
                                items: bulletin.items.filter(i => i.currentMeasured > 0).length,
                                percentage: bulletin.contract.value
                                    ? (totalValue / Number(bulletin.contract.value)) * 100
                                    : 0,
                            },
                            accumulated: {
                                value: bulletin.items.reduce((sum, i) => sum + i.accumulatedValue - i.currentValue, 0),
                                items: bulletin.items.filter(i => i.previousMeasured > 0).length,
                                percentage: bulletin.contract.value
                                    ? ((bulletin.items.reduce((sum, i) => sum + i.accumulatedValue - i.currentValue, 0)) / Number(bulletin.contract.value)) * 100
                                    : 0,
                            },
                            balance: {
                                value: bulletin.contract.value
                                    ? Number(bulletin.contract.value) - bulletin.items.reduce((sum, i) => sum + i.accumulatedValue, 0)
                                    : 0,
                                items: bulletin.items.filter(i => i.balanceQuantity > 0).length,
                                percentage: bulletin.contract.value
                                    ? ((Number(bulletin.contract.value) - bulletin.items.reduce((sum, i) => sum + i.accumulatedValue, 0)) / Number(bulletin.contract.value)) * 100
                                    : 0,
                            },
                            totalContract: bulletin.contract.value ? Number(bulletin.contract.value) : 0,
                        }}
                    />
                )}

                {/* Contract Execution Chart */}
                {bulletin.contract.value && bulletin.items.length > 0 && (
                    <ContractExecutionChart
                        contractValue={Number(bulletin.contract.value)}
                        accumulatedValue={bulletin.items.reduce((sum, i) => sum + i.accumulatedValue, 0)}
                        currentValue={totalValue}
                        remainingValue={Number(bulletin.contract.value) - bulletin.items.reduce((sum, i) => sum + i.accumulatedValue, 0)}
                        executionPercentage={
                            bulletin.contract.value
                                ? (bulletin.items.reduce((sum, i) => sum + i.accumulatedValue, 0) / Number(bulletin.contract.value)) * 100
                                : 0
                        }
                    />
                )}
            </div>

            {/* Timeline & Metadata */}
            <div className="grid gap-6 md:grid-cols-2">
                <BulletinTimeline
                    createdAt={bulletin.createdAt}
                    submittedAt={bulletin.submittedAt}
                    approvedByEngineerAt={bulletin.approvedByEngineerAt}
                    rejectedAt={bulletin.rejectedAt}
                    billedAt={bulletin.billedAt}
                    currentStatus={bulletin.status}
                    rejectionReason={bulletin.rejectionReason}
                />

                <BulletinMetadataPanel
                    referenceMonth={bulletin.referenceMonth}
                    periodStart={bulletin.periodStart}
                    periodEnd={bulletin.periodEnd}
                    createdByName={bulletin.createdBy?.name || 'Sistema'}
                    engineerName={bulletin.engineer?.name}
                    managerName={bulletin.manager?.name}
                    submittedAt={bulletin.submittedAt}
                    approvedByEngineerAt={bulletin.approvedByEngineerAt}
                    rejectionReason={bulletin.rejectionReason}
                />
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="items" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="items" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Itens da Medição
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                            {bulletin.items.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="attachments" className="gap-2">
                        <Paperclip className="h-4 w-4" />
                        Anexos
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                            {bulletin.attachments.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="comments" className="gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Comentários
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                            {bulletin.comments.length}
                        </Badge>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="items" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detalhamento dos Serviços</CardTitle>
                            <CardDescription>
                                {bulletin.status === 'DRAFT'
                                    ? "Edite as quantidades medidas na coluna 'Medição Atual'. Os valores são salvos automaticamente."
                                    : "Visualização das quantidades medidas e aprovadas com análise de progresso."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <BulletinItemsTableEnhanced
                                items={bulletin.items}
                                bulletinStatus={bulletin.status}
                            />
                        </CardContent>
                    </Card>
                    {bulletin.status === 'DRAFT' && (
                        <div className="text-sm text-muted-foreground bg-blue-50 border border-blue-200 p-4 rounded-lg">
                            <p>Para editar valores, utilize o editor integrado ou volte para a visualização anterior.</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="attachments">
                    <Card>
                        <CardHeader>
                            <CardTitle>Documentos e Fotos</CardTitle>
                            <CardDescription>
                                Evidências da medição — fotos da obra, memoriais, relatórios (máx. 10MB por arquivo)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AttachmentUploader
                                bulletinId={bulletin.id}
                                attachments={bulletin.attachments as any}
                                canUpload={canEdit}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="comments">
                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico e Observações</CardTitle>
                            <CardDescription>
                                Troca de mensagens e histórico de aprovação do boletim
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <CommentsSection
                                bulletinId={bulletin.id}
                                userId={userId}
                                comments={bulletin.comments as any}
                                bulletinStatus={bulletin.status}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Assinatura Digital — only show when bulletin is APPROVED or later */}
            {showSignature && (
                <div className="space-y-4">
                    <Separator />
                    <SignaturePanel
                        entityType="bulletin"
                        entityId={bulletin.id}
                        currentStatus={bulletin.d4signStatus}
                        userRole={userRole}
                    />
                </div>
            )}
        </div>
    )
}
