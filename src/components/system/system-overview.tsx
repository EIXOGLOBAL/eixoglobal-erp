'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  RefreshCw,
  MemoryStick,
  HardDrive,
  Cpu,
  Database,
  Clock,
  Container,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types (mirrors /api/system/info response)
// ---------------------------------------------------------------------------

interface SystemInfo {
  aplicacao: {
    nome: string
    versao: string
    ambiente: string
    nodeVersion: string
    nextVersion: string
    prismaVersion: string
    reactVersion: string
  }
  servidor: {
    uptime: { seconds: number; formatted: string }
    memoria: {
      rss: { bytes: number; formatted: string }
      heapUsed: { bytes: number; formatted: string }
      heapTotal: { bytes: number; formatted: string }
      percentUsed: number
    }
    cpu: {
      user: number
      system: number
      userFormatted: string
      systemFormatted: string
    }
    disco: {
      total: string
      used: string
      available: string
      percentUsed: number
      raw: string
    } | null
    docker: {
      isDocker: boolean
      containerId: string | null
      hostname: string | null
    }
  }
  bancoDeDados: {
    conectividade: { ok: boolean; latencyMs: number; error?: string }
    tamanho: { bytes: number; formatted: string }
    totalUsuarios: number
    totalEmpresas: number
    sessoesAtivas: number
  }
  timestamp: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusColor(percent: number) {
  if (percent >= 85) return { bar: 'bg-red-500', text: 'text-red-600', badge: 'bg-red-500/10 text-red-500 border-red-500/20' }
  if (percent >= 70) return { bar: 'bg-amber-500', text: 'text-amber-600', badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20' }
  return { bar: 'bg-green-500', text: 'text-green-600', badge: 'bg-green-500/10 text-green-500 border-green-500/20' }
}

function latencyColor(ms: number) {
  if (ms >= 500) return 'bg-red-500/10 text-red-500 border-red-500/20'
  if (ms >= 200) return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
  return 'bg-green-500/10 text-green-500 border-green-500/20'
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressBar({ percent, colorClass }: { percent: number; colorClass: string }) {
  return (
    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  )
}

function MetricCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SystemOverview() {
  const [data, setData] = useState<SystemInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/system/info', { cache: 'no-store' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      setData(await res.json())
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ---- Loading ----
  if (loading && !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
          <span className="text-muted-foreground">Carregando informações do sistema...</span>
        </CardContent>
      </Card>
    )
  }

  // ---- Error ----
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

  const mem = data.servidor.memoria
  const memColors = statusColor(mem.percentUsed)
  const disco = data.servidor.disco
  const discoColors = disco ? statusColor(disco.percentUsed) : statusColor(0)
  const db = data.bancoDeDados

  return (
    <div className="space-y-4">
      {/* Header with refresh */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Cpu className="h-5 w-5" />
            Visao Geral do Sistema
          </CardTitle>
          <CardAction>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {/* App info row */}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{data.aplicacao.nome} v{data.aplicacao.versao}</Badge>
            <Badge variant="outline">Node {data.aplicacao.nodeVersion}</Badge>
            <Badge variant="outline">Next {data.aplicacao.nextVersion}</Badge>
            <Badge variant="outline">React {data.aplicacao.reactVersion}</Badge>
            <Badge variant="outline">Prisma {data.aplicacao.prismaVersion}</Badge>
            <Badge variant="outline" className="capitalize">{data.aplicacao.ambiente}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Metric grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* RAM */}
        <MetricCard icon={MemoryStick} title="Memoria RAM">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{mem.percentUsed}%</span>
              <Badge variant="outline" className={memColors.badge}>
                {mem.heapUsed.formatted} / {mem.heapTotal.formatted}
              </Badge>
            </div>
            <ProgressBar percent={mem.percentUsed} colorClass={memColors.bar} />
            <p className="text-xs text-muted-foreground">
              RSS: {mem.rss.formatted}
            </p>
          </div>
        </MetricCard>

        {/* Disco */}
        <MetricCard icon={HardDrive} title="Disco">
          {disco ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{disco.percentUsed}%</span>
                <Badge variant="outline" className={discoColors.badge}>
                  {disco.used} / {disco.total}
                </Badge>
              </div>
              <ProgressBar percent={disco.percentUsed} colorClass={discoColors.bar} />
              <p className="text-xs text-muted-foreground">
                Disponivel: {disco.available}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Dados de disco indisponiveis</p>
          )}
        </MetricCard>

        {/* CPU */}
        <MetricCard icon={Cpu} title="CPU">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-muted-foreground">User</p>
                <p className="text-xl font-bold">{data.servidor.cpu.userFormatted}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">System</p>
                <p className="text-xl font-bold">{data.servidor.cpu.systemFormatted}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Tempo acumulado de CPU desde o inicio do processo
            </p>
          </div>
        </MetricCard>

        {/* Database */}
        <MetricCard icon={Database} title="Banco de Dados">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{db.tamanho.formatted}</span>
              <Badge variant="outline" className={latencyColor(db.conectividade.latencyMs)}>
                {db.conectividade.latencyMs}ms
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={db.conectividade.ok
                  ? 'bg-green-500/10 text-green-500 border-green-500/20'
                  : 'bg-red-500/10 text-red-500 border-red-500/20'}
              >
                {db.conectividade.ok ? 'Conectado' : 'Erro'}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 text-xs text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">{db.totalUsuarios}</p>
                <p>Usuários</p>
              </div>
              <div>
                <p className="font-medium text-foreground">{db.totalEmpresas}</p>
                <p>Empresas</p>
              </div>
              <div>
                <p className="font-medium text-foreground">{db.sessoesAtivas}</p>
                <p>Sessoes 24h</p>
              </div>
            </div>
          </div>
        </MetricCard>

        {/* Uptime */}
        <MetricCard icon={Clock} title="Uptime">
          <div className="space-y-1">
            <p className="text-2xl font-bold">{data.servidor.uptime.formatted}</p>
            <p className="text-xs text-muted-foreground">
              {data.servidor.uptime.seconds.toLocaleString('pt-BR')} segundos
            </p>
          </div>
        </MetricCard>

        {/* Docker */}
        <MetricCard icon={Container} title="Docker">
          <div className="space-y-2">
            <Badge
              variant="outline"
              className={data.servidor.docker.isDocker
                ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                : 'bg-muted text-muted-foreground'}
            >
              {data.servidor.docker.isDocker ? 'Container Docker' : 'Sem Docker'}
            </Badge>
            {data.servidor.docker.containerId && (
              <p className="text-xs text-muted-foreground font-mono">
                ID: {data.servidor.docker.containerId}
              </p>
            )}
            {data.servidor.docker.hostname && (
              <p className="text-xs text-muted-foreground font-mono">
                Host: {data.servidor.docker.hostname}
              </p>
            )}
          </div>
        </MetricCard>
      </div>

      {/* Timestamp */}
      <p className="text-xs text-muted-foreground text-right">
        Atualizado em {new Date(data.timestamp).toLocaleString('pt-BR')}
      </p>
    </div>
  )
}
