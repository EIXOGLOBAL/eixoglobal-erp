'use client'

import { useState, useTransition } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Pencil, Trash2, Clock, Calendar } from 'lucide-react'
import { toggleScheduledReport, deleteScheduledReport } from '@/app/actions/scheduled-report-actions'
import { toast } from '@/hooks/use-toast'

interface ScheduledReportRow {
  id: string
  name: string
  type: string
  frequency: string
  dayOfWeek: number | null
  dayOfMonth: number | null
  hour: number
  recipients: string
  filters: string | null
  isActive: boolean
  lastRun: string | Date | null
  nextRun: string | Date | null
  createdAt: string | Date
  createdBy: { id: string; name: string | null; username: string }
}

interface ScheduleTableProps {
  reports: ScheduledReportRow[]
  onEdit: (report: ScheduledReportRow) => void
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  DRE: 'DRE',
  FLUXO_CAIXA: 'Fluxo de Caixa',
  EXECUTIVO: 'Executivo',
  BENCHMARK: 'Benchmark',
  CAPACIDADE: 'Capacidade',
  COMPARATIVO: 'Comparativo',
}

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: 'Diário',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
}

const DAY_OF_WEEK_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
}

function formatDateTime(date: string | Date | null): string {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatFrequencyDetail(report: ScheduledReportRow): string {
  const freq = FREQUENCY_LABELS[report.frequency] ?? report.frequency
  if (report.frequency === 'WEEKLY' && report.dayOfWeek != null) {
    return `${freq} (${DAY_OF_WEEK_LABELS[report.dayOfWeek] ?? ''}) às ${String(report.hour).padStart(2, '0')}h`
  }
  if (report.frequency === 'MONTHLY' && report.dayOfMonth != null) {
    return `${freq} (dia ${report.dayOfMonth}) às ${String(report.hour).padStart(2, '0')}h`
  }
  return `${freq} às ${String(report.hour).padStart(2, '0')}h`
}

function parseRecipients(recipients: string): string[] {
  try {
    return JSON.parse(recipients) as string[]
  } catch {
    return []
  }
}

export function ScheduleTable({ reports, onEdit }: ScheduleTableProps) {
  const [isPending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  function handleToggle(id: string) {
    setLoadingId(id)
    startTransition(async () => {
      const result = await toggleScheduledReport(id)
      setLoadingId(null)
      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Atualizado', description: 'Status do agendamento alterado' })
      }
    })
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Deseja realmente excluir o agendamento "${name}"?`)) return

    setLoadingId(id)
    startTransition(async () => {
      const result = await deleteScheduledReport(id)
      setLoadingId(null)
      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Excluído', description: 'Agendamento removido com sucesso' })
      }
    })
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Calendar className="mx-auto h-12 w-12 mb-3 opacity-50" />
        <p className="text-lg font-medium">Nenhum relatório agendado</p>
        <p className="text-sm mt-1">Crie um agendamento para receber relatórios periodicamente por email.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Frequência</TableHead>
            <TableHead>Destinatários</TableHead>
            <TableHead>Próximo Envio</TableHead>
            <TableHead>Último Envio</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => {
            const recipients = parseRecipients(report.recipients)
            return (
              <TableRow key={report.id}>
                <TableCell className="font-medium">{report.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {REPORT_TYPE_LABELS[report.type] ?? report.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {formatFrequencyDetail(report)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {recipients.length > 0 ? (
                      <span title={recipients.join(', ')}>
                        {recipients.length === 1
                          ? recipients[0]
                          : `${recipients[0]} +${recipients.length - 1}`}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {report.isActive ? formatDateTime(report.nextRun) : '-'}
                </TableCell>
                <TableCell className="text-sm">
                  {formatDateTime(report.lastRun)}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={report.isActive}
                    onCheckedChange={() => handleToggle(report.id)}
                    disabled={isPending && loadingId === report.id}
                    aria-label={report.isActive ? 'Desativar' : 'Ativar'}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(report)}
                      disabled={isPending && loadingId === report.id}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(report.id, report.name)}
                      disabled={isPending && loadingId === report.id}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
