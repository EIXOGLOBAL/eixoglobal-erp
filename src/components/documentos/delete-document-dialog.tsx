'use client'
import { useRouter } from 'next/navigation'

import { useTransition } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { deleteDocument } from '@/app/actions/document-actions'
import { Loader2 } from 'lucide-react'

interface DeleteDocumentDialogProps {
  documentId: string
  documentName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteDocumentDialog({
  documentId,
  documentName,
  open,
  onOpenChange,
}: DeleteDocumentDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  function handleDelete() {
    startTransition(async () => {
      try {
        const result = await deleteDocument(documentId)

        if (result.success) {
          toast({
            title: 'Documento Excluido',
            description: `O documento "${documentName}" foi excluido com sucesso.`,
          })
          onOpenChange(false)
          router.refresh()
        } else {
          toast({
            variant: 'destructive',
            title: 'Erro',
            description: result.error,
          })
        }
      } catch {
        toast({
          variant: 'destructive',
          title: 'Erro inesperado',
          description: 'Tente novamente mais tarde.',
        })
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Documento</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o documento &quot;{documentName}&quot;?
            Esta acao nao pode ser desfeita. Todas as versoes do documento tambem
            serao removidas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
