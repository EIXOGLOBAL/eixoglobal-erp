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
import { deleteCompany } from "@/app/actions/company-actions"
import { useToast } from "@/hooks/use-toast"

interface DeleteCompanyDialogProps {
    id: string
    name: string
}

export function DeleteCompanyDialog({ id, name }: DeleteCompanyDialogProps) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const { toast } = useToast()

    const handleDelete = () => {
        startTransition(async () => {
            const result = await deleteCompany(id)
            if (result.success) {
                toast({
                    title: "Sucesso",
                    description: "Empresa excluída com sucesso"
                })
                setOpen(false)
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro",
                    description: result.error || "Erro ao excluir empresa"
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
                    <AlertDialogTitle>Excluir Empresa</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja excluir a empresa <strong>{name}</strong>?
                        <br />
                        Esta ação não pode ser desfeita e removerá todos os dados associados.
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
