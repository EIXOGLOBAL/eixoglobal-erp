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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Pin,
  Eye,
  CheckCheck,
  AlertTriangle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  deleteCommunication,
  markAsRead,
} from '@/app/actions/communication-actions'
import { CommunicationDialog } from './communication-dialog'
import { formatDateTime } from '@/lib/formatters'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ExportButton } from '@/components/ui/export-button'
import type { ExportColumn } from '@/lib/export-utils'

const commExportColumns: ExportColumn[] = [
  { key: 'title', label: 'Titulo' },
  { key: 'priorityPtBr', label: 'Prioridade' },
  { key: 'audiencePtBr', label: 'Publico' },
  { key: 'authorName', label: 'Autor' },
  { key: 'readsCount', label: 'Leituras' },
  { key: 'createdAt', label: 'Data' },
  { key: 'statusPtBr', label: 'Status' },
]

type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

interface CommunicationItem {
  id: string
  title: string
  content: string
  priority: Priority
  isPinned: boolean
  targetAudience: string
  expiresAt: Date | null
  createdAt: Date
  author: { id: string; name: string | null }
  reads: { userId: string; readAt: Date }[]
  _count: { reads: number }
}

interface CommunicationsTableProps {
  communications: CommunicationItem[]
  canManage: boolean
  currentUserId: string
  totalUsers: number
}

const priorityConfig: Record<
  Priority,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  URGENT: { label: 'Urgente', variant: 'destructive' },
  HIGH: { label: 'Alta', variant: 'default' },
  NORMAL: { label: 'Normal', variant: 'secondary' },
  LOW: { label: 'Baixa', variant: 'outline' },
}

const audienceLabels: Record<string, string> = {
  ALL: 'Todos',
  ADMIN: 'Administradores',
  MANAGER: 'Gerentes',
  ENGINEER: 'Engenheiros',
  SUPERVISOR: 'Supervisores',
  SAFETY_OFFICER: 'Seg. Trabalho',
  ACCOUNTANT: 'Contadores',
  HR_ANALYST: 'RH',
  USER: 'Usuários',
}

export function CommunicationsTable({
  communications,
  canManage,
  currentUserId,
  totalUsers,
}: CommunicationsTableProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [editItem, setEditItem] = useState<CommunicationItem | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [viewItem, setViewItem] = useState<CommunicationItem | null>(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL')
  const [audienceFilter, setAudienceFilter] = useState<string>('ALL')

  const filtered = communications.filter((c) => {
    if (
      search &&
      !c.title.toLowerCase().includes(search.toLowerCase()) &&
      !c.content.toLowerCase().includes(search.toLowerCase())
    ) {
      return false
    }
    if (priorityFilter !== 'ALL' && c.priority !== priorityFilter) return false
    if (audienceFilter !== 'ALL' && c.targetAudience !== audienceFilter)
      return false
    return true
  })

  function isRead(comm: CommunicationItem): boolean {
    return comm.reads.some((r) => r.userId === currentUserId)
  }

  function isExpired(comm: CommunicationItem): boolean {
    if (!comm.expiresAt) return false
    return new Date(comm.expiresAt).getTime() < Date.now()
  }

  function handleView(comm: CommunicationItem) {
    setViewItem(comm)
    setViewOpen(true)
    if (!isRead(comm)) {
      startTransition(async () => {
        await markAsRead(comm.id)
      })
    }
  }

  function handleEdit(comm: CommunicationItem) {
    setEditItem(comm)
    setEditDialogOpen(true)
  }

  function handleDeleteConfirm(id: string) {
    startTransition(async () => {
      const result = await deleteCommunication(id)
      if (result.success) {
        toast({ title: 'Comunicado removido com sucesso' })
        setDeleteConfirmId(null)
        window.location.reload()
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: result.error,
        })
      }
    })
  }

  function handleMarkAsRead(id: string) {
    startTransition(async () => {
      const result = await markAsRead(id)
      if (result.success) {
        toast({ title: 'Marcado como lido' })
        window.location.reload()
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
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Lista de Comunicados</CardTitle>
            <div className="flex flex-wrap gap-2 items-center">
              <ExportButton
                data={filtered.map(c => ({
                  ...c,
                  priorityPtBr: priorityConfig[c.priority].label,
                  audiencePtBr: audienceLabels[c.targetAudience] || c.targetAudience,
                  authorName: c.author.name ?? 'Usuario',
                  readsCount: `${c._count.reads}/${totalUsers}`,
                  statusPtBr: c.expiresAt && new Date(c.expiresAt).getTime() < Date.now()
                    ? 'Expirado'
                    : c.reads.some(r => r.userId === currentUserId) ? 'Lido' : 'Novo',
                }))}
                columns={commExportColumns}
                filename="comunicados"
                title="Comunicados"
                sheetName="Comunicados"
                size="sm"
              />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-48"
              />
              <Select
                value={priorityFilter}
                onValueChange={setPriorityFilter}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  <SelectItem value="URGENT">Urgente</SelectItem>
                  <SelectItem value="HIGH">Alta</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="LOW">Baixa</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={audienceFilter}
                onValueChange={setAudienceFilter}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Publico" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {Object.entries(audienceLabels)
                    .filter(([k]) => k !== 'ALL')
                    .map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p>Nenhum comunicado encontrado.</p>
              {communications.length === 0 && (
                <p className="text-sm mt-1">
                  Use o botao &quot;Novo Comunicado&quot; para comecar.
                </p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]" />
                  <TableHead>Titulo</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Publico</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead className="text-center">Leituras</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((comm) => {
                  const read = isRead(comm)
                  const expired = isExpired(comm)
                  const cfg = priorityConfig[comm.priority]
                  return (
                    <TableRow
                      key={comm.id}
                      className={`cursor-pointer hover:bg-muted/50 ${!read ? 'font-medium' : ''} ${expired ? 'opacity-60' : ''}`}
                      onClick={() => handleView(comm)}
                    >
                      <TableCell>
                        {comm.isPinned && (
                          <Pin className="h-4 w-4 text-blue-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              read
                                ? 'text-muted-foreground'
                                : 'text-foreground font-semibold'
                            }
                          >
                            {comm.title}
                          </span>
                          {!read && (
                            <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {audienceLabels[comm.targetAudience] ||
                            comm.targetAudience}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {comm.author.name ?? 'Usuario'}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {comm._count.reads}/{totalUsers}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(comm.createdAt)}
                      </TableCell>
                      <TableCell>
                        {expired ? (
                          <Badge
                            variant="outline"
                            className="text-orange-600 border-orange-200"
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Expirado
                          </Badge>
                        ) : read ? (
                          <Badge
                            variant="outline"
                            className="text-green-600 border-green-200"
                          >
                            <CheckCheck className="h-3 w-3 mr-1" />
                            Lido
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-blue-600 border-blue-200"
                          >
                            Novo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Abrir menu de ações">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acoes</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleView(comm)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizar
                            </DropdownMenuItem>
                            {!read && (
                              <DropdownMenuItem
                                onClick={() => handleMarkAsRead(comm.id)}
                              >
                                <CheckCheck className="mr-2 h-4 w-4" />
                                Marcar como Lido
                              </DropdownMenuItem>
                            )}
                            {canManage && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleEdit(comm)}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => setDeleteConfirmId(comm.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewItem?.isPinned && (
                <Pin className="h-4 w-4 text-blue-500" />
              )}
              {viewItem?.title}
            </DialogTitle>
            <DialogDescription>
              Por {viewItem?.author.name ?? 'Usuario'} -{' '}
              {viewItem ? formatDateTime(viewItem.createdAt) : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {viewItem && (
                <>
                  <Badge variant={priorityConfig[viewItem.priority].variant}>
                    {priorityConfig[viewItem.priority].label}
                  </Badge>
                  <Badge variant="outline">
                    {audienceLabels[viewItem.targetAudience] ||
                      viewItem.targetAudience}
                  </Badge>
                  {viewItem.expiresAt && (
                    <Badge variant="outline">
                      Expira: {formatDateTime(viewItem.expiresAt)}
                    </Badge>
                  )}
                </>
              )}
            </div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {viewItem?.content}
            </div>
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground">
                {viewItem?._count.reads ?? 0} de {totalUsers} pessoas leram
                este comunicado
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editItem && (
        <CommunicationDialog
          communication={editItem}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open)
            if (!open) setEditItem(null)
          }}
        />
      )}

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null)
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusao</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este comunicado? Esta ação não pode
              ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => deleteConfirmId && handleDeleteConfirm(deleteConfirmId)}
            >
              {isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
