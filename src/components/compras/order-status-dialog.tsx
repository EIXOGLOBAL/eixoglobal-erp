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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { updateOrderStatus } from "@/app/actions/purchase-actions"
import { Loader2, ArrowRightLeft } from "lucide-react"

const STATUS_LABELS: Record<string, string> = {
    DRAFT: "Rascunho",
    PENDING_APPROVAL: "Aguardando Aprovação",
    APPROVED: "Aprovado",
    ORDERED: "Pedido Realizado",
    PARTIALLY_RECEIVED: "Recebimento Parcial",
    RECEIVED: "Recebido",
    CANCELLED: "Cancelado",
}

const STATUS_DESCRIPTIONS: Record<string, string> = {
    DRAFT: "Pedido em rascunho, ainda nao enviado para aprovacao.",
    PENDING_APPROVAL: "Aguardando aprovacao do responsavel.",
    APPROVED: "Pedido aprovado, pronto para ser enviado ao fornecedor.",
    ORDERED: "Pedido enviado ao fornecedor, aguardando recebimento.",
    PARTIALLY_RECEIVED: "Parte dos itens foi recebida.",
    RECEIVED: "Todos os itens foram recebidos.",
    CANCELLED: "Pedido cancelado.",
}

interface OrderStatusDialogProps {
    orderId: string
    currentStatus: string
    nextStatuses: string[]
}

export function OrderStatusDialog({ orderId, currentStatus, nextStatuses }: OrderStatusDialogProps) {
    const [open, setOpen] = useState(false)
    const [selectedStatus, setSelectedStatus] = useState<string>("")
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    async function handleConfirm() {
        if (!selectedStatus) {
            toast({ variant: "destructive", title: "Selecione um status", description: "Por favor, selecione o novo status." })
            return
        }

        setLoading(true)
        try {
            const result = await updateOrderStatus(orderId, selectedStatus as any)

            if (result.success) {
                toast({
                    title: "Status Atualizado",
                    description: `Status alterado para "${STATUS_LABELS[selectedStatus]}".`,
                })
                setOpen(false)
                setSelectedStatus("")
                window.location.reload()
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        } catch {
            toast({ variant: "destructive", title: "Erro inesperado", description: "Tente novamente." })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Alterar Status
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle>Alterar Status do Pedido</DialogTitle>
                    <DialogDescription>
                        Status atual: <strong>{STATUS_LABELS[currentStatus]}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div>
                        <label className="text-sm font-medium">Novo Status</label>
                        <Select
                            value={selectedStatus}
                            onValueChange={setSelectedStatus}
                        >
                            <SelectTrigger className="mt-1.5">
                                <SelectValue placeholder="Selecione o proximo status..." />
                            </SelectTrigger>
                            <SelectContent>
                                {nextStatuses.map(s => (
                                    <SelectItem key={s} value={s}>
                                        {STATUS_LABELS[s] || s}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedStatus && (
                        <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                            {STATUS_DESCRIPTIONS[selectedStatus]}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            setOpen(false)
                            setSelectedStatus("")
                        }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={loading || !selectedStatus}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
