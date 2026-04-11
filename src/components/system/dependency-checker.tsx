'use client'

import { useCallback, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Package,
  RefreshCw,
  CheckCircle2,
  ArrowUpCircle,
  AlertCircle,
  Clock,
  Server,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UpdateStatus = 'UP_TO_DATE' | 'PATCH' | 'MINOR' | 'MAJOR' | 'ERROR'

interface DependencyInfo {
  name: string
  category: string
  installed: string
  latest: string | null
  status: UpdateStatus
}

interface NodeInfo {
  installed: string
  latestLts: string | null
  status: UpdateStatus
}

interface CheckResult {
  dependencies: DependencyInfo[]
  node: NodeInfo
  summary: {
    total: number
    upToDate: number
    patch: number
    minor: number
    major: number
    error: number
  }
  checkedAt: string
}

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: UpdateStatus }) {
  switch (status) {
    case 'UP_TO_DATE':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Atualizado
        </Badge>
      )
    case 'PATCH':
      return (
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800">
          <ArrowUpCircle className="h-3 w-3 mr-1" />
          Patch
        </Badge>
      )
    case 'MINOR':
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800">
          <ArrowUpCircle className="h-3 w-3 mr-1" />
          Minor
        </Badge>
      )
    case 'MAJOR':
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800">
          <AlertCircle className="h-3 w-3 mr-1" />
          Major
        </Badge>
      )
    case 'ERROR':
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Erro
        </Badge>
      )
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DependencyChecker() {
  const [result, setResult] = useState<CheckResult | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // -------------------------------------------------------------------------
  // Fetch updates from NPM registry via API
  // -------------------------------------------------------------------------

  const checkUpdates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/system/dependencies', { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Falha ao verificar atualizacoes')
      }
      const data: CheckResult = await res.json()
      setResult(data)

      const cacheHit = res.headers.get('X-Cache') === 'HIT'
      toast({
        title: 'Verificacao concluida',
        description: cacheHit
          ? 'Resultado do cache (valido por 1 hora)'
          : `${data.summary.total} pacotes verificados`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message ?? 'Falha ao verificar atualizacoes',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header action */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Verificador de Dependencias</h3>
          <p className="text-sm text-muted-foreground">
            Verifica versoes instaladas contra o registro NPM
          </p>
        </div>
        <Button onClick={checkUpdates} disabled={loading}>
          {loading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Package className="h-4 w-4 mr-2" />
          )}
          Buscar Atualizacoes
        </Button>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Atualizados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {result.summary.upToDate}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ArrowUpCircle className="h-4 w-4 text-amber-500" />
                  Minor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {result.summary.minor}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Major
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {result.summary.major}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{result.summary.total}</p>
              </CardContent>
            </Card>
          </div>

          {/* Node.js version */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Server className="h-4 w-4" />
                Node.js
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Instalado</p>
                    <p className="font-mono font-medium">{result.node.installed}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ultimo LTS</p>
                    <p className="font-mono font-medium">
                      {result.node.latestLts ?? 'N/A'}
                    </p>
                  </div>
                </div>
                <StatusBadge status={result.node.status} />
              </div>
            </CardContent>
          </Card>

          {/* Dependencies table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Pacotes NPM</CardTitle>
              {result.checkedAt && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDate(result.checkedAt)}
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Pacote</th>
                      <th className="pb-2 font-medium">Categoria</th>
                      <th className="pb-2 font-medium text-right">Instalado</th>
                      <th className="pb-2 font-medium text-right">Ultimo</th>
                      <th className="pb-2 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.dependencies.map((dep) => (
                      <tr
                        key={dep.name}
                        className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-2.5 font-mono text-sm">{dep.name}</td>
                        <td className="py-2.5 text-muted-foreground">{dep.category}</td>
                        <td className="py-2.5 font-mono text-right">{dep.installed}</td>
                        <td className="py-2.5 font-mono text-right">
                          {dep.latest ?? 'N/A'}
                        </td>
                        <td className="py-2.5 text-right">
                          <StatusBadge status={dep.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                Clique em &quot;Buscar Atualizacoes&quot; para verificar as versoes dos
                pacotes no registro NPM.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {loading && !result && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin" />
              <p className="text-sm">Consultando registro NPM e Node.js...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
