'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, HardDrive, Database, FolderOpen, Image, FileText, File, FileQuestion } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StorageData {
  disk: {
    total: number
    used: number
    available: number
    percentUsed: number
    totalFormatted: string
    usedFormatted: string
    availableFormatted: string
  }
  database: {
    size: number
    sizeFormatted: string
  }
  uploads: {
    size: number
    sizeFormatted: string
    fileCount: number
    byType: {
      images: number
      pdfs: number
      documents: number
      other: number
    }
  }
  timestamp: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function usageColor(percent: number) {
  if (percent >= 85) return { bar: 'bg-red-500', text: 'text-red-600', badge: 'bg-red-500/10 text-red-500 border-red-500/20' }
  if (percent >= 70) return { bar: 'bg-amber-500', text: 'text-amber-600', badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20' }
  return { bar: 'bg-green-500', text: 'text-green-600', badge: 'bg-green-500/10 text-green-500 border-green-500/20' }
}

// ---------------------------------------------------------------------------
// Donut chart (pure CSS)
// ---------------------------------------------------------------------------

function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-sm text-muted-foreground">Sem arquivos</p>
      </div>
    )
  }

  // Build conic-gradient stops
  let cumulative = 0
  const stops: string[] = []
  for (const seg of segments) {
    const start = cumulative
    cumulative += (seg.value / total) * 360
    stops.push(`${seg.color} ${start}deg ${cumulative}deg`)
  }

  return (
    <div className="flex items-center gap-6">
      {/* Donut */}
      <div
        className="relative shrink-0 w-32 h-32 rounded-full"
        style={{ background: `conic-gradient(${stops.join(', ')})` }}
      >
        {/* Inner hole */}
        <div className="absolute inset-3 rounded-full bg-card flex items-center justify-center">
          <span className="text-lg font-semibold">{total}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-1.5 text-sm">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-muted-foreground">{seg.label}</span>
            <span className="font-medium">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function StorageUsage() {
  const [data, setData] = useState<StorageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/system/storage', { cache: 'no-store' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      setData(await res.json())
    } catch (err: any) {
      setError(err.message ?? 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ---- Loading state ----
  if (loading && !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
          <span className="text-muted-foreground">Carregando dados de armazenamento...</span>
        </CardContent>
      </Card>
    )
  }

  // ---- Error state ----
  if (error && !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <p className="text-destructive text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchData}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const diskColors = usageColor(data.disk.percentUsed)

  const donutSegments = [
    { label: 'Imagens', value: data.uploads.byType.images, color: '#3b82f6' },
    { label: 'PDFs', value: data.uploads.byType.pdfs, color: '#ef4444' },
    { label: 'Documentos', value: data.uploads.byType.documents, color: '#f59e0b' },
    { label: 'Outros', value: data.uploads.byType.other, color: '#6b7280' },
  ]

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Armazenamento
          </CardTitle>
          <CardAction>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ---- Disk usage ---- */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Disco</span>
              </div>
              <Badge variant="outline" className={diskColors.badge}>
                {data.disk.percentUsed}% usado
              </Badge>
            </div>

            {/* Progress bar */}
            <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${diskColors.bar}`}
                style={{ width: `${Math.min(data.disk.percentUsed, 100)}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Usado: {data.disk.usedFormatted}</span>
              <span>Disponivel: {data.disk.availableFormatted}</span>
              <span>Total: {data.disk.totalFormatted}</span>
            </div>
          </div>

          {/* ---- Database + Uploads summary ---- */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Database */}
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Database className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Banco de Dados</p>
                <p className="text-sm font-semibold">{data.database.sizeFormatted}</p>
              </div>
            </div>

            {/* Uploads size */}
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <FolderOpen className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Arquivos Enviados</p>
                <p className="text-sm font-semibold">{data.uploads.sizeFormatted}</p>
              </div>
            </div>

            {/* Total files */}
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <File className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total de Arquivos</p>
                <p className="text-sm font-semibold">{data.uploads.fileCount}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File type breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="h-4 w-4" />
            Arquivos por Tipo
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <DonutChart segments={donutSegments} />

          {/* Detailed list */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Image className="h-4 w-4 text-blue-500" />
              <span className="text-muted-foreground">Imagens</span>
              <span className="ml-auto font-medium">{data.uploads.byType.images}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-red-500" />
              <span className="text-muted-foreground">PDFs</span>
              <span className="ml-auto font-medium">{data.uploads.byType.pdfs}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <File className="h-4 w-4 text-amber-500" />
              <span className="text-muted-foreground">Documentos</span>
              <span className="ml-auto font-medium">{data.uploads.byType.documents}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileQuestion className="h-4 w-4 text-gray-500" />
              <span className="text-muted-foreground">Outros</span>
              <span className="ml-auto font-medium">{data.uploads.byType.other}</span>
            </div>
          </div>

          {/* Timestamp */}
          <p className="text-xs text-muted-foreground text-right pt-2">
            Atualizado em {new Date(data.timestamp).toLocaleString('pt-BR')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
