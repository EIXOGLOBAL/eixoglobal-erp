'use client'
import { useRouter } from 'next/navigation'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
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
import { bulkApproveTimeEntries } from '@/app/actions/timesheet-actions'
import { CheckCheck, Loader2 } from 'lucide-react'

interface BulkApproveButtonProps {
  selectedIds: string[]
  onComplete?: () => void
}

export function BulkApproveButton({
  selectedIds, onComplete }: BulkApproveButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  function handleConfirm() {
    startTransition(async () => {
      const result = await bulkApproveTimeEntries(selectedIds)

      if (result.success) {
        toast({
          title: 'Registros Aprovados',
          description: `${result.data?.count} registro(s) aprovado(s) com sucesso.`,
        })
        setOpen(false)
        onComplete?.()
        router.refresh()
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: result.error,
        })
      }
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={selectedIds.length === 0}
        onClick={() => setOpen(true)}
      >
        <CheckCheck className="mr-2 h-4 w-4" />
        Aprovar Selecionados ({selectedIds.length})
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar Registros em Lote</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja aprovar {selectedIds.length} registro(s) de ponto selecionado(s)?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Aprovação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
