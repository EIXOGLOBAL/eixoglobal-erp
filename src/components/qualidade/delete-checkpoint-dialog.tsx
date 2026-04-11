'use client'

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
import { deleteCheckpoint } from '@/app/actions/quality-actions'
import { Loader2 } from 'lucide-react'

interface DeleteCheckpointDialogProps {
  checkpoint: { id: string; name: string }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteCheckpointDialog({
  checkpoint,
  open,
  onOpenChange,
}: DeleteCheckpointDialogProps) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  function handleDelete() {
    startTransition(async () => {
      try {
        const result = await deleteCheckpoint(checkpoint.id)

        if (result.success) {
          toast({
            title: 'Checkpoint Excluido',
            description: `"${checkpoint.name}" foi excluido com sucesso.`,
          })
          onOpenChange(false)
          window.location.reload()
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
          <AlertDialogTitle>Excluir Checkpoint</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir &quot;{checkpoint.name}&quot;? Esta acao
            nao pode ser desfeita e todas as nao conformidades associadas serao
            removidas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
