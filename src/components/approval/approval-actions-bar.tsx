'use client'

import { useEffect, useState, useCallback, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, XCircle, MessageSquare, Loader2 } from 'lucide-react'
import {
  canUserApprove,
  approveRequest,
  rejectRequest,
  addApprovalComment,
} from '@/app/actions/approval-workflow-actions'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type DialogMode = 'approve' | 'reject' | 'comment' | null

interface ApprovalActionsBarProps {
  entityType: string
  entityId: string
  className?: string
  /** Called after a successful action (approve, reject, comment) */
  onActionComplete?: () => void
}

export function ApprovalActionsBar({
  entityType,
  entityId,
  className,
  onActionComplete,
}: ApprovalActionsBarProps) {
  const [canApprove, setCanApprove] = useState(false)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [comments, setComments] = useState('')
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const checkPermission = useCallback(async () => {
    try {
      const result = await canUserApprove(entityType, entityId)
      if (result.success && result.canApprove) {
        setCanApprove(true)
        setRequestId(result.requestId ?? null)
      } else {
        setCanApprove(false)
        setRequestId(null)
      }
    } catch {
      setCanApprove(false)
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    checkPermission()
  }, [checkPermission])

  const handleOpenDialog = (mode: DialogMode) => {
    setDialogMode(mode)
    setComments('')
  }

  const handleCloseDialog = () => {
    if (!isPending) {
      setDialogMode(null)
      setComments('')
    }
  }

  const handleApprove = () => {
    if (!requestId) return
    startTransition(async () => {
      const result = await approveRequest(requestId, comments || undefined)
      if (result.success) {
        toast({
          title: 'Aprovado',
          description: 'Solicitacao aprovada com sucesso.',
        })
        handleCloseDialog()
        setCanApprove(false)
        onActionComplete?.()
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Erro ao aprovar solicitacao.',
          variant: 'destructive',
        })
      }
    })
  }

  const handleReject = () => {
    if (!requestId) return
    if (!comments.trim()) {
      toast({
        title: 'Observacao obrigatoria',
        description: 'Informe o motivo da rejeicao.',
        variant: 'destructive',
      })
      return
    }
    startTransition(async () => {
      const result = await rejectRequest(requestId, comments)
      if (result.success) {
        toast({
          title: 'Rejeitado',
          description: 'Solicitacao rejeitada.',
        })
        handleCloseDialog()
        setCanApprove(false)
        onActionComplete?.()
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Erro ao rejeitar solicitacao.',
          variant: 'destructive',
        })
      }
    })
  }

  const handleComment = () => {
    if (!comments.trim()) {
      toast({
        title: 'Comentario vazio',
        description: 'Escreva um comentario antes de enviar.',
        variant: 'destructive',
      })
      return
    }
    startTransition(async () => {
      const result = await addApprovalComment(entityType, entityId, comments)
      if (result.success) {
        toast({
          title: 'Comentario adicionado',
          description: 'Seu comentario foi registrado.',
        })
        handleCloseDialog()
        onActionComplete?.()
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Erro ao adicionar comentario.',
          variant: 'destructive',
        })
      }
    })
  }

  const handleConfirm = () => {
    switch (dialogMode) {
      case 'approve':
        handleApprove()
        break
      case 'reject':
        handleReject()
        break
      case 'comment':
        handleComment()
        break
    }
  }

  // Don't render if loading or user can't approve
  if (loading || !canApprove) {
    return null
  }

  const dialogConfig = {
    approve: {
      title: 'Confirmar Aprovacao',
      description: 'Tem certeza que deseja aprovar esta solicitacao?',
      confirmLabel: 'Aprovar',
      confirmClass: 'bg-green-600 hover:bg-green-700 text-white',
      commentRequired: false,
      commentPlaceholder: 'Observacoes (opcional)',
    },
    reject: {
      title: 'Confirmar Rejeicao',
      description: 'Informe o motivo da rejeicao. Esta acao nao pode ser desfeita.',
      confirmLabel: 'Rejeitar',
      confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
      commentRequired: true,
      commentPlaceholder: 'Motivo da rejeicao (obrigatorio)',
    },
    comment: {
      title: 'Adicionar Comentario',
      description: 'Adicione um comentario a esta solicitacao de aprovacao.',
      confirmLabel: 'Enviar Comentario',
      confirmClass: '',
      commentRequired: true,
      commentPlaceholder: 'Escreva seu comentario...',
    },
  }

  const currentConfig = dialogMode ? dialogConfig[dialogMode] : null

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border bg-muted/50 p-3',
          className
        )}
      >
        <span className="mr-2 text-sm font-medium text-muted-foreground">
          Aprovacao pendente:
        </span>
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={() => handleOpenDialog('approve')}
        >
          <CheckCircle2 className="size-4" />
          Aprovar
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => handleOpenDialog('reject')}
        >
          <XCircle className="size-4" />
          Rejeitar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleOpenDialog('comment')}
        >
          <MessageSquare className="size-4" />
          Comentar
        </Button>
      </div>

      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && handleCloseDialog()}>
        {currentConfig && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{currentConfig.title}</DialogTitle>
              <DialogDescription>{currentConfig.description}</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                placeholder={currentConfig.commentPlaceholder}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                disabled={isPending}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCloseDialog}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isPending || (currentConfig.commentRequired && !comments.trim())}
                className={currentConfig.confirmClass}
              >
                {isPending && <Loader2 className="size-4 animate-spin" />}
                {currentConfig.confirmLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}

export type { ApprovalActionsBarProps }
