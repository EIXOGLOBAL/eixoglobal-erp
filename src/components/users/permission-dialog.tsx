'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Shield, ShieldCheck, Info } from 'lucide-react'
import { updateUserPermissions } from '@/app/actions/user-actions'
import { useToast } from '@/hooks/use-toast'
import { UserPermissions } from '@/lib/permissions'

type PermissionUser = {
  id: string
  name: string | null
  email: string
  role: string
  canDelete: boolean
  canApprove: boolean
  canManageFinancial: boolean
  canManageHR: boolean
  canManageSystem: boolean
  canViewReports: boolean
}

type PermissionDialogProps = {
  user: PermissionUser
  trigger?: React.ReactNode
}

const PERMISSION_ITEMS: {
  key: keyof UserPermissions
  label: string
  description: string
}[] = [
  {
    key: 'canDelete',
    label: 'Pode excluir registros',
    description: 'Permite deletar projetos, funcionários, equipamentos e materiais',
  },
  {
    key: 'canApprove',
    label: 'Pode aprovar boletins/contratos',
    description: 'Permite aprovar boletins de medição e contratos',
  },
  {
    key: 'canManageFinancial',
    label: 'Acesso ao módulo financeiro',
    description: 'Permite visualizar e gerenciar registros financeiros',
  },
  {
    key: 'canManageHR',
    label: 'Acesso a dados de RH e salários',
    description: 'Permite visualizar e editar folha de pagamento e salários',
  },
  {
    key: 'canManageSystem',
    label: 'Acesso às configurações do sistema',
    description: 'Permite gerenciar empresas, usuários e configurações',
  },
  {
    key: 'canViewReports',
    label: 'Visualizar relatórios e dashboards',
    description: 'Permite acessar relatórios e dashboards gerenciais',
  },
]

export function PermissionDialog({ user, trigger }: PermissionDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const isAdmin = user.role === 'ADMIN'

  const [permissions, setPermissions] = useState<UserPermissions>({
    canDelete: user.canDelete,
    canApprove: user.canApprove,
    canManageFinancial: user.canManageFinancial,
    canManageHR: user.canManageHR,
    canManageSystem: user.canManageSystem,
    canViewReports: user.canViewReports,
  })

  function handleCheck(key: keyof UserPermissions, checked: boolean) {
    setPermissions((prev) => ({ ...prev, [key]: checked }))
  }

  async function handleSave() {
    setLoading(true)
    try {
      const result = await updateUserPermissions(user.id, permissions)
      if (result.success) {
        toast({
          title: 'Permissões atualizadas',
          description: `As permissões de ${user.name || user.email} foram salvas com sucesso.`,
        })
        setOpen(false)
      } else {
        toast({
          title: 'Erro',
          description: result.error ?? 'Não foi possível atualizar as permissões.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erro inesperado',
        description: 'Ocorreu um erro ao salvar as permissões.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Shield className="h-4 w-4 mr-1" />
            Permissões
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-purple-600" />
            Permissões de {user.name || user.email}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1">
            Role atual:{' '}
            <Badge
              variant="outline"
              className="ml-1 text-xs"
            >
              {user.role}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        {isAdmin ? (
          <div className="rounded-md border border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-5 w-5 text-purple-600" />
              <span className="font-semibold text-purple-700 dark:text-purple-400">
                Acesso Total
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Administradores têm acesso completo ao sistema independentemente das
              configurações de permissão individuais.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {PERMISSION_ITEMS.map(({ key, label, description }) => (
              <div key={key} className="flex items-start gap-3">
                <Checkbox
                  id={`perm-${key}`}
                  checked={permissions[key]}
                  onCheckedChange={(checked) => handleCheck(key, checked === true)}
                  disabled={loading}
                />
                <div className="grid gap-0.5">
                  <Label
                    htmlFor={`perm-${key}`}
                    className="cursor-pointer text-sm font-medium"
                  >
                    {label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-3 mt-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            ADMINs têm acesso total independente das configurações acima.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          {!isAdmin && (
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Permissões'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
