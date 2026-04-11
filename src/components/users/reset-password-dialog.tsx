'use client'

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Loader2, KeyRound } from "lucide-react"
import { adminResetPassword } from "@/app/actions/user-actions"

interface ResetPasswordDialogProps {
    userId: string
    username: string
}

export function ResetPasswordDialog({ userId, username }: ResetPasswordDialogProps) {
    const [open, setOpen] = useState(false)
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [isPending, startTransition] = useTransition()
    const { toast } = useToast()

    function handleReset() {
        if (password.length < 8) {
            toast({ variant: 'destructive', title: 'Senha muito curta', description: 'A senha deve ter pelo menos 8 caracteres.' })
            return
        }
        if (password !== confirm) {
            toast({ variant: 'destructive', title: 'Senhas não conferem' })
            return
        }
        startTransition(async () => {
            const result = await adminResetPassword(userId, password)
            if (result.success) {
                toast({ title: result.message || 'Senha resetada.' })
                setOpen(false)
                setPassword('')
                setConfirm('')
            } else {
                toast({ variant: 'destructive', title: 'Erro', description: result.error })
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <KeyRound className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Resetar Senha</DialogTitle>
                    <DialogDescription>
                        Definir nova senha para o usuário <strong>@{username}</strong>.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Nova senha</label>
                        <Input
                            type="password"
                            placeholder="Mínimo 8 caracteres"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Confirmar senha</label>
                        <Input
                            type="password"
                            placeholder="Repita a senha"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        A senha deve conter: 8+ caracteres, maiúscula, minúscula, número e caractere especial.
                    </p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleReset} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Resetar Senha
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
