'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileEdit, TrendingUp, Calendar, AlertCircle } from 'lucide-react'
import { formatDate } from "@/lib/formatters"

interface Amendment {
  id: string
  number: string
  description: string
  type: string
  oldValue?: number | null
  newValue?: number | null
  oldEndDate?: string | null
  newEndDate?: string | null
  createdAt: Date
}

interface AmendmentsTimelineProps {
  amendments: Amendment[]
}

const typeLabels: Record<string, string> = {
  VALUE_CHANGE: 'Alteração de Valor',
  DEADLINE_CHANGE: 'Alteração de Prazo',
  SCOPE_CHANGE: 'Alteração de Escopo',
  MIXED: 'Múltiplas Alterações',
}

const typeColors: Record<string, string> = {
  VALUE_CHANGE: 'bg-green-50 dark:bg-green-950/30 border-green-200',
  DEADLINE_CHANGE: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200',
  SCOPE_CHANGE: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200',
  MIXED: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200',
}

const typeIconColor: Record<string, string> = {
  VALUE_CHANGE: 'text-green-600',
  DEADLINE_CHANGE: 'text-blue-600',
  SCOPE_CHANGE: 'text-purple-600',
  MIXED: 'text-orange-600',
}

export function AmendmentsTimeline({ amendments }: AmendmentsTimelineProps) {
  if (!amendments || amendments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Aditivos</CardTitle>
          <CardDescription>Nenhum termo aditivo registrado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileEdit className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum termo aditivo foi adicionado a este contrato.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const sortedAmendments = [...amendments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Aditivos</CardTitle>
        <CardDescription>
          Timeline de alterações contratuais
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {sortedAmendments.map((amendment, index) => (
            <div key={amendment.id} className="relative">
              {/* Timeline connector */}
              {index < sortedAmendments.length - 1 && (
                <div className="absolute left-[11px] top-12 h-6 w-0.5 bg-muted" />
              )}

              {/* Timeline item */}
              <div className="flex gap-4">
                {/* Timeline dot */}
                <div className="relative flex h-6 w-6 items-center justify-center">
                  <div className={`h-6 w-6 rounded-full border-2 border-background bg-blue-500 flex items-center justify-center ${typeIconColor[amendment.type] || 'text-blue-600'}`}>
                    {amendment.type === 'VALUE_CHANGE' && (
                      <TrendingUp className="h-3 w-3 text-white" />
                    )}
                    {amendment.type === 'DEADLINE_CHANGE' && (
                      <Calendar className="h-3 w-3 text-white" />
                    )}
                    {(amendment.type === 'SCOPE_CHANGE' || amendment.type === 'MIXED') && (
                      <AlertCircle className="h-3 w-3 text-white" />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className={`flex-1 rounded-lg border p-4 ${typeColors[amendment.type] || 'bg-muted'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">Aditivo {amendment.number}</h4>
                        <Badge variant="outline" className="text-xs">
                          {typeLabels[amendment.type] || amendment.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {amendment.description}
                      </p>

                      {/* Changes summary */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {amendment.type.includes('VALUE') && (
                          <>
                            <div>
                              <span className="text-muted-foreground">Valor Anterior:</span>
                              <p className="font-medium">
                                {amendment.oldValue !== null
                                  ? new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                  }).format(amendment.oldValue || 0)
                                  : '-'}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Novo Valor:</span>
                              <p className="font-medium text-green-700">
                                {amendment.newValue !== null
                                  ? new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                  }).format(amendment.newValue || 0)
                                  : '-'}
                              </p>
                            </div>
                          </>
                        )}
                        {amendment.type.includes('DEADLINE') && (
                          <>
                            <div>
                              <span className="text-muted-foreground">Prazo Anterior:</span>
                              <p className="font-medium">
                                {amendment.oldEndDate
                                  ? formatDate(amendment.oldEndDate)
                                  : '-'}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Novo Prazo:</span>
                              <p className="font-medium text-blue-700">
                                {amendment.newEndDate
                                  ? formatDate(amendment.newEndDate)
                                  : '-'}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Date */}
                    <div className="text-right text-xs">
                      <p className="text-muted-foreground">
                        {formatDate(amendment.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
