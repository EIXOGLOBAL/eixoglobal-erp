'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { formatDate, formatTime } from '@/lib/formatters'
import { ApproveRejectDialog } from './approve-reject-dialog'
import { BulkApproveButton } from './bulk-approve-button'
import { CheckCircle, XCircle } from 'lucide-react'
import { ExportButton } from '@/components/ui/export-button'
import type { ExportColumn } from '@/lib/export-utils'
import { formatDate as fmtDateExport } from '@/lib/export-utils'

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Pendente', className: 'bg-orange-100 text-orange-800' },
  APPROVED: { label: 'Aprovado', className: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Rejeitado', className: 'bg-red-100 text-red-800' },
  ADJUSTED: { label: 'Ajustado', className: 'bg-blue-100 text-blue-800' },
}

const pontoExportColumns: ExportColumn[] = [
  { key: '_employeeName', label: 'Funcionário' },
  { key: '_employeeJobTitle', label: 'Cargo' },
  { key: '_projectName', label: 'Projeto' },
  { key: '_clockIn', label: 'Entrada' },
  { key: '_clockOut', label: 'Saída' },
  { key: '_totalHours', label: 'Total (h)' },
  { key: '_overtimeHours', label: 'Extra (h)' },
  { key: '_statusLabel', label: 'Status' },
  { key: 'date', label: 'Data', format: (v) => v ? fmtDateExport(v as string) : '' },
]

function mapPontoForExport(list: TimeEntry[]): Record<string, unknown>[] {
  return list.map(e => ({
    ...e,
    _employeeName: e.employee?.name || '',
    _employeeJobTitle: e.employee?.jobTitle || '',
    _projectName: e.project?.name || '',
    _clockIn: e.clockIn ? new Date(e.clockIn).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
    _clockOut: e.clockOut ? new Date(e.clockOut).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
    _totalHours: e.totalHours != null ? `${e.totalHours.toFixed(1)}h` : '',
    _overtimeHours: e.overtimeHours != null && e.overtimeHours > 0 ? `${e.overtimeHours.toFixed(1)}h` : '',
    _statusLabel: STATUS_MAP[e.status]?.label || e.status,
  }))
}

interface TimeEntry {
  id: string
  status: string
  clockIn: string | Date
  clockOut: string | Date | null
  totalHours: number | null
  overtimeHours: number | null
  date: string | Date
  employee?: { name: string; jobTitle: string | null } | null
  project?: { name: string } | null
  approvedBy?: { name: string } | null
}

interface PontoTableProps {
  entries: TimeEntry[]
}

export function PontoTable({ entries }: PontoTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [dialogState, setDialogState] = useState<{
    open: boolean
    mode: 'approve' | 'reject'
    entryId: string
    employeeName: string
  }>({
    open: false,
    mode: 'approve',
    entryId: '',
    employeeName: '',
  })

  const pendingEntries = entries.filter((e) => e.status === 'PENDING')
  const allPendingSelected =
    pendingEntries.length > 0 && pendingEntries.every((e) => selectedIds.includes(e.id))

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }

  function toggleSelectAll() {
    if (allPendingSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(pendingEntries.map((e) => e.id))
    }
  }

  function openDialog(mode: 'approve' | 'reject', entry: TimeEntry) {
    setDialogState({
      open: true,
      mode,
      entryId: entry.id,
      employeeName: entry.employee?.name || 'Funcionário',
    })
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        {pendingEntries.length > 0 && (
          <>
            <BulkApproveButton
              selectedIds={selectedIds}
              onComplete={() => setSelectedIds([])}
            />
            {selectedIds.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {selectedIds.length} selecionado(s)
              </span>
            )}
          </>
        )}
        <div className="ml-auto">
          <ExportButton
            data={mapPontoForExport(entries)}
            columns={pontoExportColumns}
            filename="folha_de_ponto"
            title="Folha de Ponto"
            sheetName="Ponto"
            size="sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="text-left py-2 pr-2 w-10">
                {pendingEntries.length > 0 && (
                  <Checkbox
                    checked={allPendingSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Selecionar todos pendentes"
                  />
                )}
              </th>
              <th className="text-left py-2 pr-4">Funcionário</th>
              <th className="text-left py-2 pr-4">Cargo</th>
              <th className="text-left py-2 pr-4">Projeto</th>
              <th className="text-right py-2 pr-4">Entrada</th>
              <th className="text-right py-2 pr-4">Saída</th>
              <th className="text-right py-2 pr-4">Total</th>
              <th className="text-right py-2 pr-4">Extra</th>
              <th className="text-center py-2 pr-4">Status</th>
              <th className="text-right py-2 pr-4">Data</th>
              <th className="text-center py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const statusInfo = STATUS_MAP[entry.status] || {
                label: entry.status,
                className: 'bg-gray-100 text-gray-800',
              }
              const isPending = entry.status === 'PENDING'

              return (
                <tr key={entry.id} className="border-b last:border-0">
                  <td className="py-2 pr-2">
                    {isPending && (
                      <Checkbox
                        checked={selectedIds.includes(entry.id)}
                        onCheckedChange={() => toggleSelect(entry.id)}
                        aria-label={`Selecionar registro de ${entry.employee?.name}`}
                      />
                    )}
                  </td>
                  <td className="py-2 pr-4 font-medium">
                    {entry.employee?.name || '—'}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground text-xs">
                    {entry.employee?.jobTitle || '—'}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground text-xs">
                    {entry.project?.name || '—'}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-xs">
                    {formatTime(entry.clockIn)}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-xs">
                    {entry.clockOut ? formatTime(entry.clockOut) : '—'}
                  </td>
                  <td className="py-2 pr-4 text-right font-medium">
                    {entry.totalHours != null
                      ? `${entry.totalHours.toFixed(1)}h`
                      : '—'}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {entry.overtimeHours != null && entry.overtimeHours > 0 ? (
                      <span className="text-red-700 font-medium">
                        {entry.overtimeHours.toFixed(1)}h
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-center">
                    <Badge className={`${statusInfo.className} text-xs`}>
                      {statusInfo.label}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4 text-right text-muted-foreground text-xs">
                    {formatDate(entry.date)}
                  </td>
                  <td className="py-2 text-center">
                    {isPending && (
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="Aprovar"
                          onClick={() => openDialog('approve', entry)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Rejeitar"
                          onClick={() => openDialog('reject', entry)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ApproveRejectDialog
        mode={dialogState.mode}
        timeEntryId={dialogState.entryId}
        employeeName={dialogState.employeeName}
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((prev) => ({ ...prev, open }))}
      />
    </>
  )
}
