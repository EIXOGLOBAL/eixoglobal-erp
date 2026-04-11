'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScheduleTable } from '@/components/relatorios/schedule-table'
import { ScheduleDialog } from '@/components/relatorios/schedule-dialog'

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

interface SchedulePageClientProps {
  initialReports: ScheduledReportRow[]
  error?: string
}

export function SchedulePageClient({ initialReports, error }: SchedulePageClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingReport, setEditingReport] = useState<ScheduledReportRow | null>(null)

  function handleCreate() {
    setEditingReport(null)
    setDialogOpen(true)
  }

  function handleEdit(report: ScheduledReportRow) {
    setEditingReport(report)
    setDialogOpen(true)
  }

  function handleDialogChange(open: boolean) {
    setDialogOpen(open)
    if (!open) setEditingReport(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/relatorios">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CalendarClock className="h-6 w-6" />
              Agendamento de Relatórios
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Configure o envio automático de relatórios por email
            </p>
          </div>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Relatórios Agendados</CardTitle>
          <CardDescription>
            Gerencie os relatórios enviados automaticamente por email para os destinatários configurados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScheduleTable reports={initialReports} onEdit={handleEdit} />
        </CardContent>
      </Card>

      <ScheduleDialog
        key={editingReport?.id ?? 'new'}
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        editData={editingReport}
      />
    </div>
  )
}
