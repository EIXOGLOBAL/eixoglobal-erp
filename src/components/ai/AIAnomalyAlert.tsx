'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, X, Loader2, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AnomalyReport } from '@/lib/ai-analytics'

interface AIAnomalyAlertProps {
  companyId: string
}

const DISMISS_KEY = 'ai-anomaly-dismissed-date'

export default function AIAnomalyAlert({ companyId }: AIAnomalyAlertProps) {
  const [anomalies, setAnomalies] = useState<AnomalyReport['anomalies']>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if dismissed today
    try {
      const dismissedDate = sessionStorage.getItem(DISMISS_KEY)
      if (dismissedDate === new Date().toISOString().slice(0, 10)) {
        setDismissed(true)
        setLoading(false)
        return
      }
    } catch {
      // sessionStorage not available
    }

    fetchAnomalies()
  }, [companyId])

  async function fetchAnomalies() {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'anomalies', companyId }),
      })

      if (!res.ok) {
        setLoading(false)
        return
      }

      const json = await res.json()
      const data = json.data as AnomalyReport
      setAnomalies(data.anomalies || [])
    } catch {
      // Silently fail - anomaly detection is non-critical
    } finally {
      setLoading(false)
    }
  }

  function handleDismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, new Date().toISOString().slice(0, 10))
    } catch {
      // sessionStorage not available
    }
    setDismissed(true)
  }

  function getSeverityStyles(severity: string) {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50 dark:bg-red-950/40',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-800 dark:text-red-300',
          badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
          label: 'Critico',
        }
      case 'high':
        return {
          bg: 'bg-red-50 dark:bg-red-950/30',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-700 dark:text-red-400',
          badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
          label: 'Alto',
        }
      case 'medium':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/30',
          border: 'border-amber-200 dark:border-amber-800',
          text: 'text-amber-700 dark:text-amber-400',
          badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
          label: 'Medio',
        }
      default:
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/30',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-700 dark:text-blue-400',
          badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
          label: 'Baixo',
        }
    }
  }

  // Don't render anything while loading, dismissed, or no anomalies
  if (loading) {
    return null
  }

  if (dismissed || anomalies.length === 0) {
    return null
  }

  // Determine banner severity (highest found)
  const severityOrder = ['critical', 'high', 'medium', 'low']
  const highestSeverity = severityOrder.find((s) => anomalies.some((a) => a.severity === s)) || 'low'
  const bannerStyles = getSeverityStyles(highestSeverity)

  return (
    <div className={`rounded-lg border ${bannerStyles.border} ${bannerStyles.bg} p-4`}>
      {/* Banner header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-md ${bannerStyles.badge}`}>
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <p className={`font-medium ${bannerStyles.text}`}>
              {anomalies.length === 1
                ? '1 anomalia detectada pela IA'
                : `${anomalies.length} anomalias detectadas pela IA`}
            </p>
            <p className="text-xs text-muted-foreground">
              Padroes incomuns identificados nos ultimos 7 dias
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setExpanded(!expanded)}
            className={bannerStyles.text}
          >
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleDismiss}
            className={bannerStyles.text}
            title="Ignorar por hoje"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: 'inherit' }}>
          {anomalies.map((anomaly, i) => {
            const styles = getSeverityStyles(anomaly.severity)
            return (
              <div
                key={i}
                className={`p-3 rounded-md border ${styles.border} ${styles.bg}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Shield className={`size-4 shrink-0 ${styles.text}`} />
                    <span className={`text-sm font-medium ${styles.text}`}>{anomaly.type}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${styles.badge}`}>
                    {styles.label}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 ml-6">{anomaly.description}</p>
                <p className="text-xs text-muted-foreground ml-6 mt-1">
                  Entidade: {anomaly.affectedEntity}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
