'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { CheckCircle, XCircle, Clock, ClipboardList, MessageSquare } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { approveRequest, rejectRequest } from '@/app/actions/approval-workflow-actions'
import { useRouter } from 'next/navigation'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApprovalHistory {
  id: string
  level: number
  action: string
  userId: string
  user: { id: string; name: string | null } | null
  comments: string | null
  createdAt: string | Date
}

interface ApprovalRequestItem {
  id: string
  entityType: string
  entityId: string
  currentLevel: number
  status: string
  requestedById: string
  requestedBy: { id: string; name: string | null } | null
  history: ApprovalHistory[]
  createdAt: string | Date
  updatedAt: string | Date
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENTITY_TYPE_LABELS: Record<string, string> = {
  MEASUREMENT: 'Medicao',
  BILLING: 'Faturamento',
  CONTRACT: 'Contrato',
  PURCHASE_ORDER: 'Ordem de Compra',
  BUDGET: 'Orcamento',
  EXPENSE: 'Despesa',
  DAILY_REPORT: 'RDO',
  DOCUMENT: 'Documento',
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDING: { label: 'Pendente', variant: 'default' },
  IN_REVIEW: { label: 'Em Revisao', variant: 'secondary' },
  APPROVED: { label: 'Aprovado', variant: 'outline' },
  REJECTED: { label: 'Rejeitado', variant: 'destructive' },
  CANCELLED: { label: 'Cancelado', variant: 'secondary' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ApprovalPanelProps {
  initialApprovals: ApprovalRequestItem[]
}

export function ApprovalPanel({ initialApprovals }: ApprovalPanelProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectComments, setRejectComments] = useState('')

  const handleApprove = (requestId: string) => {
    startTransition(async () => {
      const result = await approveRequest(requestId)
      if (result.success) {
        toast({ title: 'Solicitacao aprovada com sucesso' })
        router.refresh()
      } else {
        toast({ title: 'Erro ao aprovar', description: result.error, variant: 'destructive' })
      }
    })
  }

  const handleReject = () => {
    if (!rejectId) return
    if (!rejectComments.trim()) {
      toast({ title: 'Informe o motivo da rejeicao', variant: 'destructive' })
      return
    }

    startTransition(async () => {
      const result = await rejectRequest(rejectId, rejectComments)
      if (result.success) {
        toast({ title: 'Solicitacao rejeitada' })
        setRejectId(null)
        setRejectComments('')
        router.refresh()
      } else {
        toast({ title: 'Erro ao rejeitar', description: result.error, variant: 'destructive' })
      }
    })
  }

  const openRejectDialog = (requestId: string) => {
    setRejectId(requestId)
    setRejectComments('')
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Aprovacoes Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {initialApprovals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma aprovacao pendente no momento.
            </div>
          ) : (
            <div className="space-y-3">
              {initialApprovals.map((approval) => {
                const statusCfg = STATUS_CONFIG[approval.status] || STATUS_CONFIG.PENDING

                return (
                  <div
                    key={approval.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {ENTITY_TYPE_LABELS[approval.entityType] || approval.entityType}
                        </Badge>
                        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                        <span className="text-xs text-muted-foreground">
                          Nivel {approval.currentLevel}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Solicitante: </span>
                        <span className="font-medium">
                          {approval.requestedBy?.name || 'Desconhecido'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(approval.createdAt), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
                      </div>
                      {/* Last history entry */}
                      {approval.history.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <MessageSquare className="h-3 w-3" />
                          {approval.history[0].user?.name || 'Sistema'}:{' '}
                          {approval.history[0].comments || approval.history[0].action}
                        </div>
                      )}
                    </div>

                    {approval.status === 'PENDING' && (
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-300 hover:bg-green-50"
                          onClick={() => handleApprove(approval.id)}
                          disabled={isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                          onClick={() => openRejectDialog(approval.id)}
                          disabled={isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Confirmation */}
      <AlertDialog open={!!rejectId} onOpenChange={() => setRejectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar Solicitacao</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da rejeicao. Este comentario sera registrado no historico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input
              placeholder="Motivo da rejeicao..."
              value={rejectComments}
              onChange={(e) => setRejectComments(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isPending || !rejectComments.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? 'Rejeitando...' : 'Confirmar Rejeicao'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
