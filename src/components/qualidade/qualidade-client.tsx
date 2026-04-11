'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/formatters'
import {
  CheckCircle,
  Clipboard,
  MoreHorizontal,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  Plus,
  CheckSquare,
} from 'lucide-react'
import { CheckpointDialog } from './checkpoint-dialog'
import { InspectionDialog } from './inspection-dialog'
import { NonConformityDialog } from './non-conformity-dialog'
import { ResolveNcDialog } from './resolve-nc-dialog'
import { DeleteCheckpointDialog } from './delete-checkpoint-dialog'

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Pendente', className: 'bg-orange-100 text-orange-800' },
  IN_PROGRESS: { label: 'Em Andamento', className: 'bg-blue-100 text-blue-800' },
  PASSED: { label: 'Aprovado', className: 'bg-green-100 text-green-800' },
  FAILED: { label: 'Reprovado', className: 'bg-red-100 text-red-800' },
  CONDITIONAL: { label: 'Condicional', className: 'bg-yellow-100 text-yellow-800' },
}

const SEVERITY_MAP: Record<string, { label: string; className: string }> = {
  LOW: { label: 'Baixa', className: 'bg-gray-100 text-gray-800' },
  MEDIUM: { label: 'Media', className: 'bg-yellow-100 text-yellow-800' },
  HIGH: { label: 'Alta', className: 'bg-orange-100 text-orange-800' },
  CRITICAL: { label: 'Critica', className: 'bg-red-100 text-red-800' },
}

interface Checkpoint {
  id: string
  name: string
  description: string | null
  category: string | null
  projectId: string
  inspectorId: string | null
  status: string
  inspectionDate: Date | string | null
  createdAt: Date | string
  project: { name: string } | null
  inspector: { name: string } | null
  _count: { nonConformities: number }
}

interface NonConformity {
  id: string
  description: string
  severity: string
  status: string
  correctiveAction: string | null
  checkpointId: string
  checkpoint?: { name: string } | null
  responsible?: { name: string } | null
  dueDate: Date | string | null
  createdAt: Date | string
}

interface QualidadeClientProps {
  companyId: string
  checkpoints: Checkpoint[]
  nonConformities: NonConformity[]
  projects: { id: string; name: string }[]
  users: { id: string; name: string }[]
}

export function QualidadeClient({
  companyId,
  checkpoints,
  nonConformities,
  projects,
  users,
}: QualidadeClientProps) {
  const [editCheckpoint, setEditCheckpoint] = useState<Checkpoint | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [inspectCheckpoint, setInspectCheckpoint] = useState<Checkpoint | null>(null)
  const [inspectOpen, setInspectOpen] = useState(false)
  const [ncCheckpoint, setNcCheckpoint] = useState<Checkpoint | null>(null)
  const [ncOpen, setNcOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Checkpoint | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [resolveNc, setResolveNc] = useState<NonConformity | null>(null)
  const [resolveOpen, setResolveOpen] = useState(false)

  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterProject, setFilterProject] = useState<string>('ALL')
  const [filterCategory, setFilterCategory] = useState<string>('ALL')

  const categories = useMemo(() => {
    const cats = new Set<string>()
    checkpoints.forEach(cp => { if (cp.category) cats.add(cp.category) })
    return Array.from(cats).sort()
  }, [checkpoints])

  const filteredCheckpoints = useMemo(() => {
    return checkpoints.filter(cp => {
      if (filterStatus !== 'ALL' && cp.status !== filterStatus) return false
      if (filterProject !== 'ALL' && cp.projectId !== filterProject) return false
      if (filterCategory !== 'ALL' && cp.category !== filterCategory) return false
      return true
    })
  }, [checkpoints, filterStatus, filterProject, filterCategory])

  const activeQFilters = [filterStatus !== 'ALL', filterProject !== 'ALL', filterCategory !== 'ALL'].filter(Boolean).length

  const openNCs = nonConformities.filter((nc) => nc.status === 'OPEN')

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clipboard className="h-5 w-5" />
              Inspeções de Qualidade
            </CardTitle>
            <CheckpointDialog
              companyId={companyId}
              projects={projects}
              users={users}
            />
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os status</SelectItem>
                {Object.entries(STATUS_MAP).map(([value, info]) => (
                  <SelectItem key={value} value={value}>{info.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os projetos</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {categories.length > 0 && (
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as categorias</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {activeQFilters > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9"
                onClick={() => { setFilterStatus('ALL'); setFilterProject('ALL'); setFilterCategory('ALL') }}
              >
                Limpar filtros
                <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center">{activeQFilters}</Badge>
              </Button>
            )}

            <span className="ml-auto text-sm text-muted-foreground self-center">{filteredCheckpoints.length} inspe&#231;&#227;o(&#245;es)</span>
          </div>

          {checkpoints.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="Nenhuma inspe&#231;&#227;o registrada"
              description="Comece a registrar inspe&#231;&#245;es de qualidade para acompanhar a conformidade dos processos."
            />
          ) : filteredCheckpoints.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma inspe&#231;&#227;o encontrada com os filtros aplicados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4">Nome</th>
                    <th className="text-left py-2 pr-4">Projeto</th>
                    <th className="text-left py-2 pr-4">Categoria</th>
                    <th className="text-left py-2 pr-4">Inspetor</th>
                    <th className="text-center py-2 pr-4">NC</th>
                    <th className="text-center py-2 pr-4">Status</th>
                    <th className="text-right py-2 pr-4">Inspecao</th>
                    <th className="text-right py-2 pr-4">Criado</th>
                    <th className="text-right py-2">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCheckpoints.map((cp) => {
                    const statusInfo = STATUS_MAP[cp.status] || {
                      label: cp.status,
                      className: 'bg-gray-100 text-gray-800',
                    }
                    return (
                      <tr key={cp.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          <span className="font-medium">{cp.name}</span>
                          {cp.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {cp.description}
                            </p>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground text-xs">
                          {cp.project?.name || '\u2014'}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground text-xs">
                          {cp.category || '\u2014'}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground text-xs">
                          {cp.inspector?.name || '\u2014'}
                        </td>
                        <td className="py-2 pr-4 text-center">
                          {cp._count.nonConformities > 0 ? (
                            <Badge className="bg-red-100 text-red-800 text-xs">
                              {cp._count.nonConformities}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-center">
                          <Badge className={`${statusInfo.className} text-xs`}>
                            {statusInfo.label}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4 text-right text-muted-foreground text-xs">
                          {formatDate(cp.inspectionDate)}
                        </td>
                        <td className="py-2 pr-4 text-right text-muted-foreground text-xs">
                          {formatDate(cp.createdAt)}
                        </td>
                        <td className="py-2 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setInspectCheckpoint(cp)
                                  setInspectOpen(true)
                                }}
                              >
                                <Search className="mr-2 h-4 w-4" />
                                Inspecionar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setNcCheckpoint(cp)
                                  setNcOpen(true)
                                }}
                              >
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                Registrar NC
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditCheckpoint(cp)
                                  setEditOpen(true)
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setDeleteTarget(cp)
                                  setDeleteOpen(true)
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {openNCs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Nao Conformidades em Aberto ({openNCs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4">Descricao</th>
                    <th className="text-left py-2 pr-4">Checkpoint</th>
                    <th className="text-center py-2 pr-4">Severidade</th>
                    <th className="text-left py-2 pr-4">Responsavel</th>
                    <th className="text-right py-2 pr-4">Prazo</th>
                    <th className="text-right py-2">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {openNCs.map((nc) => {
                    const sevInfo = SEVERITY_MAP[nc.severity] || {
                      label: nc.severity,
                      className: 'bg-gray-100 text-gray-800',
                    }
                    return (
                      <tr key={nc.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          <span className="text-sm">{nc.description}</span>
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground text-xs">
                          {nc.checkpoint?.name || '\u2014'}
                        </td>
                        <td className="py-2 pr-4 text-center">
                          <Badge className={`${sevInfo.className} text-xs`}>
                            {sevInfo.label}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground text-xs">
                          {nc.responsible?.name || '\u2014'}
                        </td>
                        <td className="py-2 pr-4 text-right text-muted-foreground text-xs">
                          {formatDate(nc.dueDate)}
                        </td>
                        <td className="py-2 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setResolveNc(nc)
                              setResolveOpen(true)
                            }}
                          >
                            <CheckSquare className="mr-1 h-3 w-3" />
                            Resolver
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {editCheckpoint && (
        <CheckpointDialog
          companyId={companyId}
          checkpoint={editCheckpoint}
          projects={projects}
          users={users}
          open={editOpen}
          onOpenChange={(v) => {
            setEditOpen(v)
            if (!v) setEditCheckpoint(null)
          }}
        />
      )}

      {inspectCheckpoint && (
        <InspectionDialog
          checkpoint={inspectCheckpoint}
          open={inspectOpen}
          onOpenChange={(v) => {
            setInspectOpen(v)
            if (!v) setInspectCheckpoint(null)
          }}
        />
      )}

      {ncCheckpoint && (
        <NonConformityDialog
          checkpoint={ncCheckpoint}
          users={users}
          open={ncOpen}
          onOpenChange={(v) => {
            setNcOpen(v)
            if (!v) setNcCheckpoint(null)
          }}
        />
      )}

      {deleteTarget && (
        <DeleteCheckpointDialog
          checkpoint={deleteTarget}
          open={deleteOpen}
          onOpenChange={(v) => {
            setDeleteOpen(v)
            if (!v) setDeleteTarget(null)
          }}
        />
      )}

      {resolveNc && (
        <ResolveNcDialog
          nonConformity={resolveNc}
          open={resolveOpen}
          onOpenChange={(v) => {
            setResolveOpen(v)
            if (!v) setResolveNc(null)
          }}
        />
      )}
    </>
  )
}
