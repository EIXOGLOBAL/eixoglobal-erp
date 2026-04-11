'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Switch } from '@/components/ui/switch'
import { Plus, Pencil, Trash2, Layers } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { deleteWorkflow, toggleWorkflowActive } from '@/app/actions/approval-workflow-actions'
import { WorkflowDialog } from '@/components/configuracoes/workflow-dialog'
import { useRouter } from 'next/navigation'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApprovalLevel {
  id: string
  level: number
  roleRequired: string | null
  specificUserId: string | null
  specificUser: { id: string; name: string | null } | null
  minAmount: number | null
  maxAmount: number | null
}

interface Workflow {
  id: string
  name: string
  description: string | null
  entityType: string
  isActive: boolean
  levels: ApprovalLevel[]
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

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  USER: 'Usuario',
  ENGINEER: 'Engenheiro',
  SUPERVISOR: 'Supervisor',
  SAFETY_OFFICER: 'Tec. Seguranca',
  ACCOUNTANT: 'Contador',
  HR_ANALYST: 'Analista RH',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface WorkflowTableProps {
  initialWorkflows: Workflow[]
}

export function WorkflowTable({ initialWorkflows }: WorkflowTableProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleToggleActive = (id: string) => {
    startTransition(async () => {
      const result = await toggleWorkflowActive(id)
      if (result.success) {
        toast({ title: 'Status atualizado com sucesso' })
        router.refresh()
      } else {
        toast({ title: 'Erro ao atualizar status', description: result.error, variant: 'destructive' })
      }
    })
  }

  const handleDelete = () => {
    if (!deleteId) return
    startTransition(async () => {
      const result = await deleteWorkflow(deleteId)
      if (result.success) {
        toast({ title: 'Workflow excluido com sucesso' })
        setDeleteId(null)
        router.refresh()
      } else {
        toast({ title: 'Erro ao excluir workflow', description: result.error, variant: 'destructive' })
      }
    })
  }

  const handleEdit = (workflow: Workflow) => {
    setEditingWorkflow(workflow)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingWorkflow(null)
    setDialogOpen(true)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingWorkflow(null)
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Workflows de Aprovacao
          </CardTitle>
          <Button onClick={handleCreate} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Novo Workflow
          </Button>
        </CardHeader>
        <CardContent>
          {initialWorkflows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum workflow cadastrado. Crie o primeiro workflow de aprovacao.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Modulo</TableHead>
                  <TableHead>Niveis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialWorkflows.map((workflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{workflow.name}</div>
                        {workflow.description && (
                          <div className="text-xs text-muted-foreground">{workflow.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ENTITY_TYPE_LABELS[workflow.entityType] || workflow.entityType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {workflow.levels.map((level) => (
                          <span key={level.id} className="text-xs text-muted-foreground">
                            Nivel {level.level}:{' '}
                            {level.specificUser
                              ? level.specificUser.name || 'Usuario especifico'
                              : level.roleRequired
                                ? ROLE_LABELS[level.roleRequired] || level.roleRequired
                                : 'Qualquer aprovador'}
                          </span>
                        ))}
                        {workflow.levels.length === 0 && (
                          <span className="text-xs text-muted-foreground">Sem niveis</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={workflow.isActive}
                          onCheckedChange={() => handleToggleActive(workflow.id)}
                          disabled={isPending}
                          size="sm"
                        />
                        <span className="text-xs">
                          {workflow.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(workflow)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(workflow.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <WorkflowDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        workflow={editingWorkflow}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusao</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este workflow? Esta acao nao pode ser desfeita.
              Todas as configuracoes de niveis serao removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
              {isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
