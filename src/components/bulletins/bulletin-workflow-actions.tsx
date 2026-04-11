'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Send, CheckCircle2, XCircle, MessageSquare } from "lucide-react"
import {
    submitBulletinForApproval,
    approveByEngineer,
    approveByManager,
    rejectBulletin,
} from "@/app/actions/bulletin-actions"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"

interface BulletinWorkflowActionsProps {
    bulletin: { id: string; status: string; createdById: string; engineerId?: string | null }
    userId: string
    userRole?: string
}

export function BulletinWorkflowActions({ bulletin, userId, userRole }: BulletinWorkflowActionsProps) {
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()
    const router = useRouter()

    const [rejectOpen, setRejectOpen] = useState(false)
    const [approveOpen, setApproveOpen] = useState(false)
    const [comment, setComment] = useState("")
    const [rejectionReason, setRejectionReason] = useState("")

    const isAuthor = bulletin.createdById === userId
    const isAdmin = userRole === 'ADMIN'
    const isEngineer = userRole === 'ENGINEER'
    const isManager = userRole === 'MANAGER'

    async function handleSubmit() {
        setLoading(true)
        try {
            const result = await submitBulletinForApproval(bulletin.id)
            if (result.success) {
                toast({ title: "Sucesso", description: "Boletim enviado para aprovação." })
                router.refresh()
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        } finally {
            setLoading(false)
        }
    }

    async function handleApprove() {
        setLoading(true)
        try {
            // Decide qual ação chamar baseado no status atual
            const action = bulletin.status === 'SUBMITTED' ? approveByEngineer : approveByManager
            const result = await action({ bulletinId: bulletin.id, comment })

            if (result.success) {
                toast({ title: "Aprovado!", description: "Aprovação registrada." })
                setApproveOpen(false)
                setComment("")
                router.refresh()
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        } finally {
            setLoading(false)
        }
    }

    async function handleReject() {
        if (rejectionReason.length < 10) {
            toast({ variant: "destructive", title: "Erro", description: "Forneça um motivo com pelo menos 10 caracteres" })
            return
        }
        setLoading(true)
        try {
            const result = await rejectBulletin({ bulletinId: bulletin.id, reason: rejectionReason })
            if (result.success) {
                toast({ title: "Rejeitado", description: "Boletim devolvido para correção." })
                setRejectOpen(false)
                setRejectionReason("")
                router.refresh()
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        } finally {
            setLoading(false)
        }
    }

    // DRAFT/REJECTED — apenas autor (ou admin) pode submeter
    if (bulletin.status === 'DRAFT' || bulletin.status === 'REJECTED') {
        if (!isAuthor && !isAdmin) {
            return <Badge variant="outline" className="text-xs">{bulletin.status === 'REJECTED' ? 'Rejeitado' : 'Rascunho'}</Badge>
        }
        return (
            <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={loading} className="gap-2 bg-blue-600 hover:bg-blue-700" size="sm">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Enviar para Aprovação
                </Button>
                {bulletin.status === 'REJECTED' && (
                    <Badge variant="destructive" className="text-xs">Corrigir</Badge>
                )}
            </div>
        )
    }

    // SUBMITTED — engenheiro precisa aprovar
    if (bulletin.status === 'SUBMITTED') {
        const canApprove = (isEngineer || isAdmin) && !isAuthor
        if (!canApprove) {
            return <Badge variant="outline" className="text-xs">Aguardando engenheiro</Badge>
        }
        return renderApproveReject()
    }

    // ENGINEER_APPROVED — gerente precisa aprovar
    if (bulletin.status === 'ENGINEER_APPROVED') {
        const canApprove = (isManager || isAdmin) && !isAuthor && bulletin.engineerId !== userId
        if (!canApprove) {
            return <Badge variant="outline" className="text-xs">Aguardando gerente</Badge>
        }
        return renderApproveReject()
    }

    // MANAGER_APPROVED ou APPROVED ou BILLED
    if (bulletin.status === 'MANAGER_APPROVED' || bulletin.status === 'APPROVED') {
        return <Badge variant="secondary" className="text-xs">Aprovado</Badge>
    }
    if (bulletin.status === 'BILLED') {
        return <Badge variant="secondary" className="text-xs">Faturado</Badge>
    }
    return null

    function renderApproveReject() {
        return (
            <div className="flex gap-2">
                <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" disabled={loading} size="sm" className="border-red-200 text-red-600 hover:bg-red-50">
                            <XCircle className="mr-2 h-4 w-4" />
                            Rejeitar
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Rejeitar Boletim</DialogTitle>
                            <DialogDescription>
                                Explique detalhadamente o motivo da rejeição para que o responsável possa corrigir.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="reason" className="mb-2 block">Motivo da Rejeição *</Label>
                                <Textarea
                                    id="reason"
                                    placeholder="Ex: Quantidade do item 3 não bate com a documentação fotográfica..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    minLength={10}
                                    rows={4}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Mínimo 10 caracteres ({rejectionReason.length}/10)
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancelar</Button>
                            <Button variant="destructive" onClick={handleReject} disabled={loading || rejectionReason.length < 10}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Rejeitar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
                    <DialogTrigger asChild>
                        <Button disabled={loading} size="sm" className="bg-green-600 hover:bg-green-700">
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Aprovar
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Aprovar Boletim</DialogTitle>
                            <DialogDescription>
                                Confirme a aprovação. Você pode adicionar um comentário (opcional).
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="comment" className="mb-2 flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    Comentário (opcional)
                                </Label>
                                <Textarea
                                    id="comment"
                                    placeholder="Ex: Aprovado conforme especificações do contrato..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancelar</Button>
                            <Button onClick={handleApprove} disabled={loading} className="bg-green-600 hover:bg-green-700">
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Confirmar Aprovação
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        )
    }
}
