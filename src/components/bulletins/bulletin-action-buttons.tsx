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
import { Loader2, Send, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { submitBulletinForApproval, approveByEngineer, rejectBulletin } from "@/app/actions/bulletin-actions"
import { useRouter } from "next/navigation"

interface BulletinActionButtonsProps {
    bulletin: any
    userId: string
}

export function BulletinActionButtons({ bulletin, userId }: BulletinActionButtonsProps) {
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()
    const router = useRouter()

    // Dialog states
    const [rejectOpen, setRejectOpen] = useState(false)
    const [approveOpen, setApproveOpen] = useState(false)
    const [comment, setComment] = useState("")
    const [rejectionReason, setRejectionReason] = useState("")

    async function handleSubmit() {
        setLoading(true)
        try {
            const result = await submitBulletinForApproval(bulletin.id, userId)
            if (result.success) {
                toast({
                    title: "Sucesso",
                    description: "Boletim enviado para aprovação.",
                })
                router.refresh()
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro",
                    description: result.error,
                })
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Erro", description: "Falha na comunicação." })
        } finally {
            setLoading(false)
        }
    }

    async function handleApprove() {
        setLoading(true)
        try {
            const result = await approveByEngineer({
                bulletinId: bulletin.id,
                comment: comment
            }, userId)

            if (result.success) {
                toast({
                    title: "Aprovado!",
                    description: "Boletim aprovado com sucesso.",
                })
                setApproveOpen(false)
                router.refresh()
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro",
                    description: result.error,
                })
            }
        } finally {
            setLoading(false)
        }
    }

    async function handleReject() {
        setLoading(true)
        try {
            const result = await rejectBulletin({
                bulletinId: bulletin.id,
                reason: rejectionReason
            }, userId)

            if (result.success) {
                toast({
                    title: "Rejeitado",
                    description: "Boletim devolvido para correção.",
                })
                setRejectOpen(false)
                router.refresh()
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro",
                    description: result.error,
                })
            }
        } finally {
            setLoading(false)
        }
    }

    if (bulletin.status === 'DRAFT' || bulletin.status === 'REJECTED') {
        return (
            <Button onClick={handleSubmit} disabled={loading} className="ml-2 gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar para Aprovação
            </Button>
        )
    }

    if (bulletin.status === 'PENDING_APPROVAL') {
        return (
            <div className="flex gap-2 ml-2">
                {/* Reject Dialog */}
                <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                    <DialogTrigger asChild>
                        <Button variant="destructive" disabled={loading}>
                            <XCircle className="mr-2 h-4 w-4" />
                            Rejeitar
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Rejeitar Boletim</DialogTitle>
                            <DialogDescription>
                                Informe o motivo da rejeição para que o responsável possa corrigir.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Label htmlFor="reason" className="mb-2 block">Motivo da Rejeição</Label>
                            <Textarea
                                id="reason"
                                placeholder="Ex: Quantidade do item 3 acima do executado..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancelar</Button>
                            <Button
                                variant="destructive"
                                onClick={handleReject}
                                disabled={loading || rejectionReason.length < 10}
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirmar Rejeição
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Approve Dialog */}
                <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
                    <DialogTrigger asChild>
                        <Button variant="default" className="bg-green-600 hover:bg-green-700" disabled={loading}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Aprovar
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Aprovar Boletim</DialogTitle>
                            <DialogDescription>
                                Confirmar a aprovação deste boletim para faturamento?
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Label htmlFor="comment" className="mb-2 block">Observações (Opcional)</Label>
                            <Textarea
                                id="comment"
                                placeholder="Ex: Medição conferida em obra..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancelar</Button>
                            <Button
                                className="bg-green-600 hover:bg-green-700"
                                onClick={handleApprove}
                                disabled={loading}
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirmar Aprovação
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        )
    }

    return null
}
