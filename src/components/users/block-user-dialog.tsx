'use client'

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ShieldBan } from "lucide-react"
import { blockUser } from "@/app/actions/user-actions"

interface BlockUserDialogProps {
    userId: string
    username: string
}

export function BlockUserDialog({ userId, username }: BlockUserDialogProps) {
    const [open, setOpen] = useState(false)
    const [reason, setReason] = useState('')
    const [isPending, startTransition] = useTransition()
    const { toast } = useToast()

    function handleBlock() {
        if (!reason.trim()) {
            toast({ variant: 'destructive', title: 'Motivo obrigatório', description: 'Informe o motivo do bloqueio.' })
            return
        }
        startTransition(async () => {
            const result = await blockUser(userId, reason.trim())
            if (result.success) {
                toast({ title: result.message || 'Usuário bloqueado.' })
                setOpen(false)
                setReason('')
            } else {
                toast({ variant: 'destructive', title: 'Erro', description: result.error })
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                    <ShieldBan className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Bloquear Usuário</DialogTitle>
                    <DialogDescription>
                        Bloquear o usuário <strong>@{username}</strong>. O usuário não poderá acessar o sistema até ser desbloqueado.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Motivo do bloqueio</label>
                    <Textarea
                        placeholder="Informe o motivo..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button variant="destructive" onClick={handleBlock} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Bloquear
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
