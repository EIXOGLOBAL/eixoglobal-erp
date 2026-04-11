'use client'

import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createWorkflow, updateWorkflow } from '@/app/actions/approval-workflow-actions'
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

interface LevelForm {
  level: number
  roleRequired: string
  specificUserId?: string
  minAmount?: number
  maxAmount?: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENTITY_TYPES = [
  { value: 'MEASUREMENT', label: 'Medicao' },
  { value: 'BILLING', label: 'Faturamento' },
  { value: 'CONTRACT', label: 'Contrato' },
  { value: 'PURCHASE_ORDER', label: 'Ordem de Compra' },
  { value: 'BUDGET', label: 'Orcamento' },
  { value: 'EXPENSE', label: 'Despesa' },
  { value: 'DAILY_REPORT', label: 'RDO' },
  { value: 'DOCUMENT', label: 'Documento' },
]

const ROLES = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'MANAGER', label: 'Gerente' },
  { value: 'USER', label: 'Usuario' },
  { value: 'ENGINEER', label: 'Engenheiro' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'SAFETY_OFFICER', label: 'Tec. Seguranca' },
  { value: 'ACCOUNTANT', label: 'Contador' },
  { value: 'HR_ANALYST', label: 'Analista RH' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface WorkflowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflow: Workflow | null
}

export function WorkflowDialog({ open, onOpenChange, workflow }: WorkflowDialogProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEditing = !!workflow

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [entityType, setEntityType] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [levels, setLevels] = useState<LevelForm[]>([{ level: 1, roleRequired: 'MANAGER' }])

  // Reset form when dialog opens/closes or workflow changes
  useEffect(() => {
    if (open && workflow) {
      setName(workflow.name)
      setDescription(workflow.description || '')
      setEntityType(workflow.entityType)
      setIsActive(workflow.isActive)
      setLevels(
        workflow.levels.length > 0
          ? workflow.levels.map((l) => ({
              level: l.level,
              roleRequired: l.roleRequired || '',
              specificUserId: l.specificUserId || undefined,
              minAmount: l.minAmount ?? undefined,
              maxAmount: l.maxAmount ?? undefined,
            }))
          : [{ level: 1, roleRequired: 'MANAGER' }]
      )
    } else if (open && !workflow) {
      setName('')
      setDescription('')
      setEntityType('')
      setIsActive(true)
      setLevels([{ level: 1, roleRequired: 'MANAGER' }])
    }
  }, [open, workflow])

  const addLevel = () => {
    setLevels((prev) => [
      ...prev,
      { level: prev.length + 1, roleRequired: 'MANAGER' },
    ])
  }

  const removeLevel = (index: number) => {
    setLevels((prev) => {
      const updated = prev.filter((_, i) => i !== index)
      return updated.map((l, i) => ({ ...l, level: i + 1 }))
    })
  }

  const updateLevel = (index: number, field: keyof LevelForm, value: string | number | undefined) => {
    setLevels((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l))
    )
  }

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ title: 'Nome e obrigatorio', variant: 'destructive' })
      return
    }
    if (!entityType) {
      toast({ title: 'Selecione um modulo', variant: 'destructive' })
      return
    }
    if (levels.length === 0) {
      toast({ title: 'Adicione pelo menos um nivel de aprovacao', variant: 'destructive' })
      return
    }

    type RoleEnum = "ADMIN" | "MANAGER" | "USER" | "ENGINEER" | "SUPERVISOR" | "SAFETY_OFFICER" | "ACCOUNTANT" | "HR_ANALYST"
    const validLevels = levels.map((l) => ({
      level: l.level,
      roleRequired: (l.roleRequired as RoleEnum) || undefined,
      specificUserId: l.specificUserId || undefined,
      minAmount: l.minAmount,
      maxAmount: l.maxAmount,
    }))

    startTransition(async () => {
      const result = isEditing
        ? await updateWorkflow(workflow.id, {
            name,
            description: description || undefined,
            entityType,
            levels: validLevels,
          })
        : await createWorkflow({
            name,
            description: description || undefined,
            entityType,
            levels: validLevels,
          })

      if (result.success) {
        toast({ title: isEditing ? 'Workflow atualizado' : 'Workflow criado com sucesso' })
        onOpenChange(false)
        router.refresh()
      } else {
        toast({ title: 'Erro ao salvar workflow', description: result.error, variant: 'destructive' })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Workflow' : 'Novo Workflow de Aprovacao'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Altere as configuracoes do workflow de aprovacao'
              : 'Configure um novo fluxo de aprovacao para um modulo do sistema'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="wf-name">Nome *</Label>
            <Input
              id="wf-name"
              placeholder="Ex: Aprovacao de Medicao"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="wf-desc">Descricao</Label>
            <Input
              id="wf-desc"
              placeholder="Descricao opcional do workflow"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Entity Type */}
          <div className="space-y-2">
            <Label>Modulo *</Label>
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o modulo" />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((et) => (
                  <SelectItem key={et.value} value={et.value}>
                    {et.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active toggle (only for editing) */}
          {isEditing && (
            <div className="flex items-center justify-between">
              <Label>Workflow ativo</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          )}

          {/* Levels Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Niveis de Aprovacao</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLevel}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Nivel
              </Button>
            </div>

            {levels.map((level, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
              >
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
                  {level.level}
                </div>

                <div className="flex-1">
                  <Select
                    value={level.roleRequired}
                    onValueChange={(val) => updateLevel(index, 'roleRequired', val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {levels.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLevel(index)}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {isEditing ? 'Salvar Alteracoes' : 'Criar Workflow'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
