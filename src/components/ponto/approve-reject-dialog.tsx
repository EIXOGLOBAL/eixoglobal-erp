'use client'
import { useRouter } from 'next/navigation'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { approveTimeEntry, rejectTimeEntry } from '@/app/actions/timesheet-actions'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

interface ApproveRejectDialogProps {
  mode: 'approve' | 'reject'
  timeEntryId: string
  employeeName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ApproveRejectDialog({
  mode,
  timeEntryId,
  employeeName,
  open,
  onOpenChange,
}: ApproveRejectDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [text, setText] = useState('')
  const { toast } = useToast()

  const isApprove = mode === 'approve'
  const title = isApprove ? 'Aprovar Registro de Ponto' : 'Rejeitar Registro de Ponto'
  const description = isApprove
    ? `Aprovar o registro de ponto de ${employeeName}.`
    : `Rejeitar o registro de ponto de ${employeeName}. Informe o motivo da rejeição.`

  function handleSubmit() {
    if (!isApprove && !text.trim()) {
      toast({
        variant: 'destructive',
        title: 'Motivo obrigatório',
        description: 'Informe o motivo da rejeição.',
      })
      return
    }

    startTransition(async () => {
      const result = isApprove
        ? await approveTimeEntry(timeEntryId, text || undefined)
        : await rejectTimeEntry(timeEntryId, text)

      if (result.success) {
        toast({
          title: isApprove ? 'Ponto Aprovado' : 'Ponto Rejeitado',
          description: isApprove
            ? `Registro de ${employeeName} aprovado com sucesso.`
            : `Registro de ${employeeName} rejeitado.`,
        })
        onOpenChange(false)
        setText('')
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isApprove ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>
              {isApprove ? 'Comentário (opcional)' : 'Motivo da rejeição *'}
            </Label>
            <Textarea
              placeholder={
                isApprove
                  ? 'Adicione um comentário se necessário...'
                  : 'Informe o motivo da rejeição...'
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            variant={isApprove ? 'default' : 'destructive'}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isApprove ? 'Aprovar' : 'Rejeitar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
