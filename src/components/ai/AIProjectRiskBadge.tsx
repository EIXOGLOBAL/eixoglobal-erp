'use client'

import { useState, useEffect } from 'react'
import type { ProjectRiskReport } from '@/lib/ai-analytics'

interface AIProjectRiskBadgeProps {
  projectId: string
}

export default function AIProjectRiskBadge({ projectId }: AIProjectRiskBadgeProps) {
  const [report, setReport] = useState<ProjectRiskReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    fetchRisk()
  }, [projectId])

  async function fetchRisk() {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'project-risk', companyId: '_', projectId }),
      })

      if (!res.ok) {
        setLoading(false)
        return
      }

      const json = await res.json()
      setReport(json.data as ProjectRiskReport)
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  function getIndexColor(value: number): string {
    if (value < 0.7) return 'text-red-600 dark:text-red-400'
    if (value < 0.9) return 'text-amber-600 dark:text-amber-400'
    return 'text-green-600 dark:text-green-400'
  }

  function getIndexBgColor(value: number): string {
    if (value < 0.7) return 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
    if (value < 0.9) return 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
    return 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
  }

  // Skeleton while loading
  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md border bg-muted/50">
        <div className="h-3 w-16 bg-muted animate-pulse rounded" />
        <div className="h-3 w-16 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  if (!report) return null

  const worstIndex = Math.min(report.cpi, report.spi)
  const badgeBg = getIndexBgColor(worstIndex)

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Badge */}
      <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs font-medium cursor-default ${badgeBg}`}>
        <span className={getIndexColor(report.cpi)}>
          CPI {report.cpi.toFixed(2)}
        </span>
        <span className="text-muted-foreground/50">|</span>
        <span className={getIndexColor(report.spi)}>
          SPI {report.spi.toFixed(2)}
        </span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-lg border bg-popover text-popover-foreground shadow-lg text-xs">
          <div className="space-y-2">
            <p className="font-medium text-sm">Analise de Risco (IA)</p>

            <div className="grid grid-cols-2 gap-2">
              <div className={`p-1.5 rounded text-center ${getIndexBgColor(report.cpi)}`}>
                <p className="text-[10px] text-muted-foreground">CPI (Custo)</p>
                <p className={`font-bold ${getIndexColor(report.cpi)}`}>{report.cpi.toFixed(2)}</p>
              </div>
              <div className={`p-1.5 rounded text-center ${getIndexBgColor(report.spi)}`}>
                <p className="text-[10px] text-muted-foreground">SPI (Prazo)</p>
                <p className={`font-bold ${getIndexColor(report.spi)}`}>{report.spi.toFixed(2)}</p>
              </div>
            </div>

            <div className="space-y-1 border-t pt-2">
              <p>
                <span className="text-muted-foreground">Tendencia: </span>
                <span className="font-medium">{report.trend}</span>
              </p>
              {report.estimatedCompletionDate !== '-' && (
                <p>
                  <span className="text-muted-foreground">Conclusao estimada: </span>
                  <span className="font-medium">{report.estimatedCompletionDate}</span>
                </p>
              )}
              {report.costAtCompletion > 0 && (
                <p>
                  <span className="text-muted-foreground">Custo final estimado: </span>
                  <span className="font-medium">
                    {report.costAtCompletion.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                </p>
              )}
            </div>

            {report.risks.length > 0 && (
              <div className="space-y-1 border-t pt-2">
                <p className="font-medium">Riscos ({report.risks.length})</p>
                {report.risks.slice(0, 3).map((risk, i) => (
                  <p key={i} className="text-muted-foreground">
                    - {risk.title} ({risk.severity})
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="w-2.5 h-2.5 bg-popover border-b border-r rotate-45 -translate-y-1.5" />
          </div>
        </div>
      )}
    </div>
  )
}
