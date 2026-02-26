import { Badge } from '@/components/ui/badge'

const ROLE_CONFIG = {
  ADMIN: { label: 'Administrador', variant: 'default' as const, className: 'bg-purple-600 hover:bg-purple-700 text-white' },
  MANAGER: { label: 'Gerente', variant: 'default' as const, className: 'bg-blue-600 hover:bg-blue-700 text-white' },
  ENGINEER: { label: 'Engenheiro', variant: 'default' as const, className: 'bg-green-600 hover:bg-green-700 text-white' },
  USER: { label: 'Usuário', variant: 'secondary' as const, className: '' },
}

export function RoleBadge({ role }: { role: string }) {
  const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] ?? {
    label: role,
    variant: 'secondary' as const,
    className: '',
  }
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}
