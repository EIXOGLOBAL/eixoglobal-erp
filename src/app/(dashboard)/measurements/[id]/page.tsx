import { getBulletinById } from "@/app/actions/bulletin-actions"
import { getSession } from "@/lib/auth"
import { notFound } from "next/navigation"
import Link from "next/link"
import {
    ArrowLeft,
    FileText,
    Paperclip,
    MessageSquare,
    Printer
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
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/measurements">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                        {bulletin.number}
                        <Badge variant={statusVariants[bulletin.status]} className="text-sm">
                            {statusLabels[bulletin.status]}
                        </Badge>
                    </h1>
                    <p className="text-muted-foreground flex items-center gap-2 text-sm mt-1">
                        <FileText className="h-3 w-3" />
                        Projeto: <span className="font-medium text-foreground">{bulletin.project.name}</span>
                        <span className="mx-2">•</span>
                        Contrato: <span className="font-medium text-foreground">{bulletin.contract.identifier}</span>
                    </p>
                </div>

                {/* Actions (Right Side) */}
                <div className="ml-auto flex items-center gap-2">
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

            {/* Main Info Cards */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Valor deste Boletim</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">
                            {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                            }).format(totalValue)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Calculado automaticamente
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Período de Medição</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-medium">
                            {bulletin.referenceMonth}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {new Date(bulletin.periodStart).toLocaleDateString('pt-BR')} até {new Date(bulletin.periodEnd).toLocaleDateString('pt-BR')}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Responsáveis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Criado por:</span>
                            <span className="font-medium">{bulletin.createdBy?.name || 'Sistema'}</span>
                        </div>
                        {bulletin.engineerId && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Analista:</span>
                                <span className="font-medium">{bulletin.engineer?.name}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
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
                                    : "Visualização das quantidades medidas e aprovadas."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <BulletinItemsEditor
                                items={bulletin.items}
                                bulletinStatus={bulletin.status}
                            />
                        </CardContent>
                    </Card>
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
