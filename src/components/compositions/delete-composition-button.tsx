'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
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
import { Trash2, Loader2 } from "lucide-react"
import { deleteCostComposition } from "@/app/actions/cost-composition-actions"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface DeleteCompositionButtonProps {
    compositionId: string
}

export function DeleteCompositionButton({ compositionId }: DeleteCompositionButtonProps) {
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()
    const router = useRouter()

    async function handleDelete() {
        setLoading(true)
        try {
            const result = await deleteCostComposition(compositionId)

            if (result.success) {
                toast({
                    title: "Composição Deletada",
                    description: "A composição foi removida com sucesso.",
                })
                router.push("/composicoes")
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro",
                    description: result.error,
                })
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro inesperado",
                description: "Não foi possível deletar a composição.",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Deletar
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja deletar esta composição?
                        <br />
                        <br />
                        <strong className="text-red-600">Esta ação não pode ser desfeita.</strong>
                        <br />
                        <br />
                        Todos os insumos (materiais, mão de obra e equipamentos) também serão removidos.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Deletar Composição
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
