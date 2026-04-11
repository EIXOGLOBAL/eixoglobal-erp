'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RoleBadge } from '@/components/ui/role-badge'
import { useToast } from '@/hooks/use-toast'
import {
  getUserDetail,
  toggleUserStatus,
  forceLogoutUser,
  updateUserModules,
  type AdminUserDetail,
  type ModuleAccessMap,
} from '@/app/actions/admin-user-actions'
import {
  User,
  Mail,
  Building2,
  Calendar,
  Clock,
  LogOut,
  Power,
  Shield,
  Loader2,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Module definition
// ---------------------------------------------------------------------------

const MODULE_LABELS: { key: keyof ModuleAccessMap; label: string }[] = [
  { key: 'moduleClients', label: 'Clientes' },
  { key: 'moduleSuppliers', label: 'Fornecedores' },
  { key: 'moduleProjects', label: 'Projetos' },
  { key: 'moduleContracts', label: 'Contratos' },
  { key: 'moduleFinancial', label: 'Financeiro' },
  { key: 'moduleBudgets', label: 'Orcamentos' },
  { key: 'moduleMeasurements', label: 'Medicoes' },
  { key: 'modulePurchases', label: 'Compras' },
  { key: 'moduleInventory', label: 'Estoque' },
  { key: 'moduleEquipment', label: 'Equipamentos' },
  { key: 'moduleRentals', label: 'Locacoes' },
  { key: 'moduleEmployees', label: 'Funcionarios' },
  { key: 'moduleTimesheet', label: 'Ponto' },
  { key: 'moduleDocuments', label: 'Documentos' },
  { key: 'moduleQuality', label: 'Qualidade' },
  { key: 'moduleSafety', label: 'Seguranca' },
  { key: 'moduleDailyReports', label: 'Diarios de Obra' },
  { key: 'moduleTraining', label: 'Treinamentos' },
  { key: 'moduleBilling', label: 'Faturamento' },
  { key: 'moduleCostCenters', label: 'Centros de Custo' },
]

// ---------------------------------------------------------------------------
// Audit action translations
// ---------------------------------------------------------------------------

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Criou',
  UPDATE: 'Atualizou',
  DELETE: 'Excluiu',
  LOGIN_SUCCESS: 'Login realizado',
  LOGIN_FAILED: 'Falha de login',
  LOGOUT: 'Logout',
  APPROVE: 'Aprovou',
  REJECT: 'Rejeitou',
  USER_ACTIVATED: 'Ativado',
  USER_DEACTIVATED: 'Desativado',
  FORCE_LOGOUT: 'Logout forcado',
  UPDATE_USER_MODULES: 'Modulos atualizados',
}

function getActionLabel(action: string) {
  return ACTION_LABELS[action] ?? action
}

function getActionColor(action: string) {
  if (action.includes('DELETE') || action.includes('FAILED') || action.includes('REJECT') || action.includes('DEACTIVATED'))
    return 'bg-red-500/10 text-red-600 border-red-500/20'
  if (action.includes('CREATE') || action.includes('APPROVE') || action.includes('ACTIVATED') || action.includes('LOGIN_SUCCESS'))
    return 'bg-green-500/10 text-green-600 border-green-500/20'
  return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
}

// ---------------------------------------------------------------------------
// Helper: initials
// ---------------------------------------------------------------------------

function getInitials(name: string | null, username: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0].substring(0, 2).toUpperCase()
  }
  return username.substring(0, 2).toUpperCase()
}

// ---------------------------------------------------------------------------
// Helper: format date
// ---------------------------------------------------------------------------

function formatDate(iso: string | null): string {
  if (!iso) return '---'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface UserDetailDrawerProps {
  userId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserUpdated?: () => void
}

export function UserDetailDrawer({
  userId,
  open,
  onOpenChange,
  onUserUpdated,
}: UserDetailDrawerProps) {
  const { toast } = useToast()
  const [detail, setDetail] = useState<AdminUserDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Fetch detail when opened
  const fetchDetail = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const result = await getUserDetail(userId)
    if (result.success && result.data) {
      setDetail(result.data)
    } else {
      toast({ title: 'Erro', description: result.error || 'Erro ao carregar detalhes', variant: 'destructive' })
    }
    setLoading(false)
  }, [userId, toast])

  useEffect(() => {
    if (open && userId) {
      fetchDetail()
    } else {
      setDetail(null)
    }
  }, [open, userId, fetchDetail])

  // Toggle status
  const handleToggleStatus = () => {
    if (!userId) return
    startTransition(async () => {
      const result = await toggleUserStatus(userId)
      if (result.success) {
        toast({
          title: 'Sucesso',
          description: `Usuario ${result.isActive ? 'ativado' : 'desativado'} com sucesso`,
        })
        fetchDetail()
        onUserUpdated?.()
      } else {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      }
    })
  }

  // Force logout
  const handleForceLogout = () => {
    if (!userId) return
    startTransition(async () => {
      const result = await forceLogoutUser(userId)
      if (result.success) {
        toast({ title: 'Sucesso', description: 'Logout forcado com sucesso' })
        fetchDetail()
        onUserUpdated?.()
      } else {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      }
    })
  }

  // Toggle module
  const handleModuleToggle = (key: keyof ModuleAccessMap, value: boolean) => {
    if (!userId) return
    startTransition(async () => {
      const result = await updateUserModules(userId, { [key]: value })
      if (result.success) {
        toast({ title: 'Sucesso', description: 'Permissao de modulo atualizada' })
        fetchDetail()
        onUserUpdated?.()
      } else {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>Detalhes do Usuario</SheetTitle>
          <SheetDescription>Informacoes completas e gerenciamento</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : detail ? (
          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="p-6 space-y-6">
              {/* User header */}
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
                  {getInitials(detail.name, detail.username)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold truncate">
                    {detail.name || detail.username}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">@{detail.username}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <RoleBadge role={detail.role} />
                    {detail.isActive ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                        Inativo
                      </Badge>
                    )}
                    {detail.isBlocked && (
                      <Badge variant="destructive">Bloqueado</Badge>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Info grid */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Informacoes
                </h4>
                <div className="grid gap-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Email:</span>
                    <span className="truncate">{detail.email || '---'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Empresa:</span>
                    <span className="truncate">{detail.companyName || '---'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Criado em:</span>
                    <span>{formatDate(detail.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Ultimo login:</span>
                    <span>{formatDate(detail.lastLoginAt)}</span>
                  </div>
                  {detail.blockedAt && (
                    <div className="flex items-center gap-3 text-sm">
                      <Shield className="h-4 w-4 text-red-500 shrink-0" />
                      <span className="text-muted-foreground">Bloqueado em:</span>
                      <span className="text-red-600">{formatDate(detail.blockedAt)}</span>
                    </div>
                  )}
                  {detail.blockedReason && (
                    <div className="flex items-start gap-3 text-sm">
                      <Shield className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Motivo:</span>
                      <span className="text-red-600">{detail.blockedReason}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Quick actions */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Acoes Rapidas
                </h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={detail.isActive ? 'destructive' : 'default'}
                    size="sm"
                    onClick={handleToggleStatus}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Power className="h-4 w-4 mr-2" />
                    )}
                    {detail.isActive ? 'Desativar' : 'Ativar'} Usuario
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleForceLogout}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4 mr-2" />
                    )}
                    Forcar Logout
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Module access toggles */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Acesso a Modulos
                </h4>
                <div className="grid gap-2">
                  {MODULE_LABELS.map((mod) => (
                    <div
                      key={mod.key}
                      className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50"
                    >
                      <span className="text-sm">{mod.label}</span>
                      <Switch
                        checked={(detail as Record<string, unknown>)[mod.key] as boolean}
                        onCheckedChange={(val) => handleModuleToggle(mod.key, val)}
                        disabled={isPending}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Activity timeline */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Atividade Recente
                </h4>
                {detail.recentAuditLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma atividade registrada</p>
                ) : (
                  <div className="relative space-y-0">
                    {/* Timeline vertical line */}
                    <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
                    {detail.recentAuditLogs.map((log) => (
                      <div key={log.id} className="relative flex gap-3 pb-4">
                        <div className="relative z-10 mt-1.5">
                          <div className="h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className={`text-xs ${getActionColor(log.action)}`}
                            >
                              {getActionLabel(log.action)}
                            </Badge>
                            {log.entity && (
                              <span className="text-xs text-muted-foreground">
                                {log.entity}
                              </span>
                            )}
                          </div>
                          {log.entityName && (
                            <p className="text-sm truncate mt-0.5">{log.entityName}</p>
                          )}
                          {log.details && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {log.details}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(log.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Selecione um usuario para ver detalhes
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
