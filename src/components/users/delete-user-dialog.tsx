'use client'

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"
import { useState, useTransition } from "react"
import { deleteUser } from "@/app/actions/users"
import { useToast } from "@/hooks/use-toast"

interface DeleteUserDialogProps {
    id: string
    name: string
}

export function DeleteUserDialog({ id, name }: DeleteUserDialogProps) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const { toast } = useToast()

    const handleDelete = () => {
        startTransition(async () => {
            const result = await deleteUser(id)
            if (result.success) {
                toast({
                    title: "Sucesso",
                    description: result.message
                })
                setOpen(false)
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro",
                    description: result.message
                })
            }
        })
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja excluir o usuário <strong>{name}</strong>?
                        <br />
                        Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={(e: React.MouseEvent) => { e.preventDefault(); handleDelete(); }} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Excluir
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
