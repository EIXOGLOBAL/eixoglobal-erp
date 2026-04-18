'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Database,
  Download,
  Trash2,
  RefreshCw,
  Plus,
  HardDrive,
  Clock,
  AlertTriangle,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BackupFile {
  filename: string
  size: number
  sizeFormatted: string
  createdAt: string
  ageInDays: number
}

interface BackupStats {
  totalBackups: number
  totalSize: number
  totalSizeFormatted: string
  lastBackupDate: string | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BackupManager() {
  const [backups, setBackups] = useState<BackupFile[]>([])
  const [stats, setStats] = useState<BackupStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deletingFile, setDeletingFile] = useState<string | null>(null)
  const { toast } = useToast()

  // -------------------------------------------------------------------------
  // Fetch backups
  // -------------------------------------------------------------------------

  const fetchBackups = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/system/backup')
      if (!res.ok) throw new Error('Falha ao carregar backups')
      const data = await res.json()
      setBackups(data.backups ?? [])
      setStats(data.stats ?? null)
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message ?? 'Falha ao carregar backups',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchBackups()
  }, [fetchBackups])

  // -------------------------------------------------------------------------
  // Create backup
  // -------------------------------------------------------------------------

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/system/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Falha ao criar backup')
      toast({ title: 'Backup criado', description: `${data.filename} (${data.sizeFormatted})` })
      await fetchBackups()
    } catch (err: any) {
      toast({
        title: 'Erro ao criar backup',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  // -------------------------------------------------------------------------
  // Delete backup
  // -------------------------------------------------------------------------

  const handleDelete = async (filename: string) => {
    if (!confirm(`Deseja realmente excluir o backup "${filename}"?`)) return
    setDeletingFile(filename)
    try {
      const res = await fetch('/api/system/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', filename }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Falha ao excluir')
      toast({ title: 'Backup excluido', description: filename })
      await fetchBackups()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir backup',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setDeletingFile(null)
    }
  }

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

  function timeSince(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return 'menos de 1 hora'
    if (hours < 24) return `${hours}h atras`
    const days = Math.floor(hours / 24)
    return `${days} dia${days > 1 ? 's' : ''} atras`
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Database className="h-4 w-4" />
              Total de Backups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.totalBackups ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Tamanho Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.totalSizeFormatted ?? '0 B'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Ultimo Backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats?.lastBackupDate ? timeSince(stats.lastBackupDate) : 'Nenhum'}
            </p>
            {stats?.lastBackupDate && (
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(stats.lastBackupDate)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Backup list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Backups Disponiveis</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchBackups}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Criar Backup Agora
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Carregando backups...
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
              Nenhum backup encontrado. Crie o primeiro backup acima.
            </div>
          ) : (
            <div className="space-y-2">
              {backups.map((backup) => (
                <div
                  key={backup.filename}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Database className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{backup.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(backup.createdAt)} &middot; {backup.sizeFormatted}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {backup.ageInDays > 5 && (
                      <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-xs">
                        {backup.ageInDays}d
                      </Badge>
                    )}
                    <Button
 variant="outline"
 size="icon" aria-label="Baixar backup" 
 className="h-8 w-8"
 title="Baixar backup"
 asChild
>
                      <a
                        href={`/backups/${encodeURIComponent(backup.filename)}`}
                        download
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon" aria-label="Excluir"
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                      title="Excluir backup"
                      disabled={deletingFile === backup.filename}
                      onClick={() => handleDelete(backup.filename)}
                    >
                      {deletingFile === backup.filename ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
