'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { X } from 'lucide-react'
import { createScheduledReport, updateScheduledReport } from '@/app/actions/scheduled-report-actions'
import { toast } from '@/hooks/use-toast'

interface ScheduledReportData {
  id?: string
  name: string
  type: string
  frequency: string
  dayOfWeek: number | null
  dayOfMonth: number | null
  hour: number
  recipients: string
  filters: string | null
  isActive: boolean
}

interface ScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editData?: ScheduledReportData | null
}

const REPORT_TYPES = [
  { value: 'DRE', label: 'DRE' },
  { value: 'FLUXO_CAIXA', label: 'Fluxo de Caixa' },
  { value: 'EXECUTIVO', label: 'Executivo' },
  { value: 'BENCHMARK', label: 'Benchmark' },
  { value: 'CAPACIDADE', label: 'Capacidade' },
  { value: 'COMPARATIVO', label: 'Comparativo' },
]

const FREQUENCIES = [
  { value: 'DAILY', label: 'Diário' },
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'MONTHLY', label: 'Mensal' },
]

const DAYS_OF_WEEK = [
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Segunda-feira' },
  { value: '2', label: 'Terça-feira' },
  { value: '3', label: 'Quarta-feira' },
  { value: '4', label: 'Quinta-feira' },
  { value: '5', label: 'Sexta-feira' },
  { value: '6', label: 'Sábado' },
]

function parseRecipients(recipients: string): string[] {
  try {
    return JSON.parse(recipients) as string[]
  } catch {
    return []
  }
}

export function ScheduleDialog({ open, onOpenChange, editData }: ScheduleDialogProps) {
  const isEditing = !!editData?.id

  const [name, setName] = useState(editData?.name ?? '')
  const [type, setType] = useState(editData?.type ?? '')
  const [frequency, setFrequency] = useState(editData?.frequency ?? '')
  const [dayOfWeek, setDayOfWeek] = useState<string>(
    editData?.dayOfWeek != null ? String(editData.dayOfWeek) : '1'
  )
  const [dayOfMonth, setDayOfMonth] = useState<string>(
    editData?.dayOfMonth != null ? String(editData.dayOfMonth) : '1'
  )
  const [hour, setHour] = useState<string>(
    editData?.hour != null ? String(editData.hour) : '8'
  )
  const [recipientInput, setRecipientInput] = useState('')
  const [recipients, setRecipients] = useState<string[]>(
    editData?.recipients ? parseRecipients(editData.recipients) : []
  )
  const [isActive, setIsActive] = useState(editData?.isActive ?? true)
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string>>({})

  function addRecipient() {
    const email = recipientInput.trim().toLowerCase()
    if (!email) return

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setErrors((prev) => ({ ...prev, recipients: 'Email inválido' }))
      return
    }

    if (recipients.includes(email)) {
      setErrors((prev) => ({ ...prev, recipients: 'Email já adicionado' }))
      return
    }

    setRecipients((prev) => [...prev, email])
    setRecipientInput('')
    setErrors((prev) => {
      const next = { ...prev }
      delete next.recipients
      return next
    })
  }

  function removeRecipient(email: string) {
    setRecipients((prev) => prev.filter((r) => r !== email))
  }

  function handleRecipientKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addRecipient()
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) newErrors.name = 'Nome é obrigatório'
    if (!type) newErrors.type = 'Tipo é obrigatório'
    if (!frequency) newErrors.frequency = 'Frequência é obrigatória'
    if (recipients.length === 0) newErrors.recipients = 'Pelo menos um destinatário'

    const hourNum = parseInt(hour, 10)
    if (isNaN(hourNum) || hourNum < 0 || hourNum > 23) {
      newErrors.hour = 'Hora inválida (0-23)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit() {
    if (!validate()) return

    startTransition(async () => {
      const payload = {
        name: name.trim(),
        type: type as 'DRE' | 'FLUXO_CAIXA' | 'EXECUTIVO' | 'BENCHMARK' | 'CAPACIDADE' | 'COMPARATIVO',
        frequency: frequency as 'DAILY' | 'WEEKLY' | 'MONTHLY',
        dayOfWeek: frequency === 'WEEKLY' ? parseInt(dayOfWeek, 10) : null,
        dayOfMonth: frequency === 'MONTHLY' ? parseInt(dayOfMonth, 10) : null,
        hour: parseInt(hour, 10),
        recipients,
        filters: null,
        isActive,
      }

      const result = isEditing
        ? await updateScheduledReport(editData!.id!, payload)
        : await createScheduledReport(payload)

      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      } else {
        toast({
          title: isEditing ? 'Atualizado' : 'Criado',
          description: isEditing
            ? 'Agendamento atualizado com sucesso'
            : 'Agendamento criado com sucesso',
        })
        onOpenChange(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Agendamento' : 'Novo Agendamento de Relatório'}
          </DialogTitle>
          <DialogDescription>
            Configure o envio automático de relatórios por email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="schedule-name">Nome</Label>
            <Input
              id="schedule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: DRE Mensal Diretoria"
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          {/* Tipo + Frequência */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Relatório</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((rt) => (
                    <SelectItem key={rt.value} value={rt.value}>
                      {rt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && <p className="text-sm text-destructive">{errors.type}</p>}
            </div>

            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.frequency && <p className="text-sm text-destructive">{errors.frequency}</p>}
            </div>
          </div>

          {/* Dia da semana (WEEKLY) */}
          {frequency === 'WEEKLY' && (
            <div className="space-y-2">
              <Label>Dia da Semana</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Dia do mês (MONTHLY) */}
          {frequency === 'MONTHLY' && (
            <div className="space-y-2">
              <Label htmlFor="schedule-day-of-month">Dia do Mês</Label>
              <Input
                id="schedule-day-of-month"
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
              />
            </div>
          )}

          {/* Hora */}
          <div className="space-y-2">
            <Label htmlFor="schedule-hour">Hora de Envio</Label>
            <Input
              id="schedule-hour"
              type="number"
              min={0}
              max={23}
              value={hour}
              onChange={(e) => setHour(e.target.value)}
            />
            {errors.hour && <p className="text-sm text-destructive">{errors.hour}</p>}
          </div>

          {/* Destinatários */}
          <div className="space-y-2">
            <Label>Destinatários</Label>
            <div className="flex gap-2">
              <Input
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={handleRecipientKeyDown}
                placeholder="email@exemplo.com"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={addRecipient}>
                Adicionar
              </Button>
            </div>
            {errors.recipients && <p className="text-sm text-destructive">{errors.recipients}</p>}

            {recipients.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {recipients.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-secondary text-secondary-foreground"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => removeRecipient(email)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Ativo */}
          <div className="flex items-center gap-3">
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              id="schedule-active"
            />
            <Label htmlFor="schedule-active">Agendamento ativo</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Agendamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
