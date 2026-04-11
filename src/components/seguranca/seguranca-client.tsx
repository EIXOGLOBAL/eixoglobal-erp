'use client'

import { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/formatters'
import {
  Shield,
  AlertTriangle,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { IncidentDialog } from './incident-dialog'
import { CloseIncidentDialog } from './close-incident-dialog'
import { InspectionDialog } from './inspection-dialog'
import { CompleteInspectionDialog } from './complete-inspection-dialog'

const INCIDENT_TYPE_MAP: Record<string, string> = {
  ACCIDENT: 'Acidente',
  NEAR_MISS: 'Quase-Acidente',
  UNSAFE_CONDITION: 'Condicao Insegura',
  UNSAFE_ACT: 'Ato Inseguro',
  ENVIRONMENTAL: 'Ambiental',
  FIRST_AID: 'Primeiros Socorros',
  PPE_VIOLATION: 'Violacao EPI',
}

const SEVERITY_MAP: Record<string, { label: string; className: string }> = {
  LOW: { label: 'Baixa', className: 'bg-green-100 text-green-800' },
  MEDIUM: { label: 'Media', className: 'bg-yellow-100 text-yellow-800' },
  HIGH: { label: 'Alta', className: 'bg-orange-100 text-orange-800' },
  CRITICAL: { label: 'Critica', className: 'bg-red-100 text-red-800' },
}

const INCIDENT_STATUS_MAP: Record<string, { label: string; className: string }> = {
  OPEN: { label: 'Aberto', className: 'bg-red-100 text-red-800' },
  IN_PROGRESS: { label: 'Em Andamento', className: 'bg-blue-100 text-blue-800' },
  CLOSED: { label: 'Encerrado', className: 'bg-green-100 text-green-800' },
}

interface Incident {
  id: string
  description: string
  type: string
  severity: string
  status: string
  location: string | null
  date: Date | string
  project?: { name: string } | null
  reportedBy?: { name: string | null } | null
  injuredEmployee?: { name: string | null } | null
}

interface Inspection {
  id: string
  type: string
  status: string
  overallScore: number | null
  findings: string | null
  date: Date | string
  project?: { name: string } | null
  inspector?: { name: string | null } | null
}

interface SegurancaClientProps {
  incidents: Incident[]
  inspections: Inspection[]
  projects: { id: string; name: string }[]
}

export function SegurancaClient({
  incidents,
  inspections,
  projects,
}: SegurancaClientProps) {
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null)

  // Filters
  const [filterIncType, setFilterIncType] = useState<string>('ALL')
  const [filterIncSeverity, setFilterIncSeverity] = useState<string>('ALL')
  const [filterIncProject, setFilterIncProject] = useState<string>('ALL')
  const [filterIncStatus, setFilterIncStatus] = useState<string>('ALL')

  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      if (filterIncType !== 'ALL' && inc.type !== filterIncType) return false
      if (filterIncSeverity !== 'ALL' && inc.severity !== filterIncSeverity) return false
      if (filterIncProject !== 'ALL' && inc.project?.name !== filterIncProject) return false
      if (filterIncStatus !== 'ALL' && inc.status !== filterIncStatus) return false
      return true
    })
  }, [incidents, filterIncType, filterIncSeverity, filterIncProject, filterIncStatus])

  const incidentProjectNames = useMemo(() => {
    const names = new Set<string>()
    incidents.forEach(inc => { if (inc.project?.name) names.add(inc.project.name) })
    return Array.from(names).sort()
  }, [incidents])

  const activeIncFilters = [filterIncType !== 'ALL', filterIncSeverity !== 'ALL', filterIncProject !== 'ALL', filterIncStatus !== 'ALL'].filter(Boolean).length

  function handleCloseIncident(incident: Incident) {
    setSelectedIncident(incident)
    setCloseDialogOpen(true)
  }

  function handleCompleteInspection(inspection: Inspection) {
    setSelectedInspection(inspection)
    setCompleteDialogOpen(true)
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <IncidentDialog projects={projects} />
        <InspectionDialog projects={projects} />
      </div>

      {incidents.length === 0 && inspections.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <EmptyState
              icon={Shield}
              title="Nenhum dado registrado"
              description="Comece a registrar informações de segurança do trabalho, acidentes e inspeções."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {incidents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Incidentes Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Incident Filters */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <Select value={filterIncType} onValueChange={setFilterIncType}>
                    <SelectTrigger className="w-[170px] h-9">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos os tipos</SelectItem>
                      {Object.entries(INCIDENT_TYPE_MAP).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterIncSeverity} onValueChange={setFilterIncSeverity}>
                    <SelectTrigger className="w-[150px] h-9">
                      <SelectValue placeholder="Severidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todas</SelectItem>
                      {Object.entries(SEVERITY_MAP).map(([value, info]) => (
                        <SelectItem key={value} value={value}>{info.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterIncProject} onValueChange={setFilterIncProject}>
                    <SelectTrigger className="w-[170px] h-9">
                      <SelectValue placeholder="Projeto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos os projetos</SelectItem>
                      {incidentProjectNames.map(name => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterIncStatus} onValueChange={setFilterIncStatus}>
                    <SelectTrigger className="w-[150px] h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos os status</SelectItem>
                      {Object.entries(INCIDENT_STATUS_MAP).map(([value, info]) => (
                        <SelectItem key={value} value={value}>{info.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {activeIncFilters > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9"
                      onClick={() => { setFilterIncType('ALL'); setFilterIncSeverity('ALL'); setFilterIncProject('ALL'); setFilterIncStatus('ALL') }}
                    >
                      Limpar filtros
                      <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center">{activeIncFilters}</Badge>
                    </Button>
                  )}
                </div>

                {filteredIncidents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum incidente encontrado com os filtros aplicados.
                  </div>
                ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 pr-4">Tipo</th>
                        <th className="text-left py-2 pr-4">Descricao</th>
                        <th className="text-left py-2 pr-4">Projeto</th>
                        <th className="text-left py-2 pr-4">Local</th>
                        <th className="text-center py-2 pr-4">Severidade</th>
                        <th className="text-center py-2 pr-4">Status</th>
                        <th className="text-left py-2 pr-4">Reportado por</th>
                        <th className="text-right py-2 pr-4">Data</th>
                        <th className="text-center py-2">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIncidents.map((inc) => {
                        const sevInfo = SEVERITY_MAP[inc.severity] || {
                          label: inc.severity,
                          className: 'bg-gray-100 text-gray-800',
                        }
                        const statusInfo = INCIDENT_STATUS_MAP[inc.status] || {
                          label: inc.status,
                          className: 'bg-gray-100 text-gray-800',
                        }
                        return (
                          <tr key={inc.id} className="border-b last:border-0">
                            <td className="py-2 pr-4">
                              <Badge variant="outline" className="text-xs">
                                {INCIDENT_TYPE_MAP[inc.type] || inc.type}
                              </Badge>
                            </td>
                            <td className="py-2 pr-4">
                              <span className="font-medium truncate max-w-[250px] block">
                                {inc.description}
                              </span>
                            </td>
                            <td className="py-2 pr-4 text-muted-foreground text-xs">
                              {inc.project?.name || '\u2014'}
                            </td>
                            <td className="py-2 pr-4 text-muted-foreground text-xs">
                              {inc.location || '\u2014'}
                            </td>
                            <td className="py-2 pr-4 text-center">
                              <Badge className={`${sevInfo.className} text-xs`}>
                                {sevInfo.label}
                              </Badge>
                            </td>
                            <td className="py-2 pr-4 text-center">
                              <Badge className={`${statusInfo.className} text-xs`}>
                                {statusInfo.label}
                              </Badge>
                            </td>
                            <td className="py-2 pr-4 text-muted-foreground text-xs">
                              {inc.reportedBy?.name || '\u2014'}
                            </td>
                            <td className="py-2 pr-4 text-right text-muted-foreground text-xs">
                              {formatDate(inc.date)}
                            </td>
                            <td className="py-2 text-center">
                              {inc.status !== 'CLOSED' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCloseIncident(inc)}
                                  title="Encerrar incidente"
                                >
                                  <XCircle className="h-4 w-4 text-red-600" />
                                </Button>
                              )}
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
          )}

          {inspections.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  Inspeções de Segurança
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 pr-4">Tipo</th>
                        <th className="text-left py-2 pr-4">Projeto</th>
                        <th className="text-left py-2 pr-4">Inspetor</th>
                        <th className="text-center py-2 pr-4">Pontuacao</th>
                        <th className="text-center py-2 pr-4">Status</th>
                        <th className="text-left py-2 pr-4">Achados</th>
                        <th className="text-right py-2 pr-4">Data</th>
                        <th className="text-center py-2">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspections.map((insp) => (
                        <tr key={insp.id} className="border-b last:border-0">
                          <td className="py-2 pr-4">
                            <Badge variant="outline" className="text-xs">
                              {insp.type}
                            </Badge>
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground text-xs">
                            {insp.project?.name || '\u2014'}
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground text-xs">
                            {insp.inspector?.name || '\u2014'}
                          </td>
                          <td className="py-2 pr-4 text-center font-medium">
                            {insp.overallScore != null
                              ? `${Number(insp.overallScore).toFixed(0)}%`
                              : '\u2014'}
                          </td>
                          <td className="py-2 pr-4 text-center">
                            <Badge
                              className={
                                insp.status === 'COMPLETED'
                                  ? 'bg-green-100 text-green-800 text-xs'
                                  : insp.status === 'DRAFT'
                                    ? 'bg-gray-100 text-gray-800 text-xs'
                                    : 'bg-blue-100 text-blue-800 text-xs'
                              }
                            >
                              {insp.status === 'COMPLETED'
                                ? 'Concluido'
                                : insp.status === 'DRAFT'
                                  ? 'Rascunho'
                                  : insp.status}
                            </Badge>
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground text-xs max-w-[200px] truncate">
                            {insp.findings || '\u2014'}
                          </td>
                          <td className="py-2 pr-4 text-right text-muted-foreground text-xs">
                            {formatDate(insp.date)}
                          </td>
                          <td className="py-2 text-center">
                            {insp.status !== 'COMPLETED' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCompleteInspection(insp)}
                                title="Completar inspecao"
                              >
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {selectedIncident && (
        <CloseIncidentDialog
          incidentId={selectedIncident.id}
          incidentDescription={selectedIncident.description}
          open={closeDialogOpen}
          onOpenChange={(open) => {
            setCloseDialogOpen(open)
            if (!open) setSelectedIncident(null)
          }}
        />
      )}

      {selectedInspection && (
        <CompleteInspectionDialog
          inspectionId={selectedInspection.id}
          inspectionType={selectedInspection.type}
          open={completeDialogOpen}
          onOpenChange={(open) => {
            setCompleteDialogOpen(open)
            if (!open) setSelectedInspection(null)
          }}
        />
      )}
    </>
  )
}
