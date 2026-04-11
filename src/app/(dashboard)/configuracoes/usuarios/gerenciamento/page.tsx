import { requireAdmin } from '@/lib/route-guard'
import { getAdminUserList } from '@/app/actions/admin-user-actions'
import { UserManagementPanel } from '@/components/admin/user-management-panel'
import { Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function GerenciamentoUsuariosPage() {
  await requireAdmin()

  const result = await getAdminUserList({ page: 1, pageSize: 20, sortBy: 'name', sortDir: 'asc' })

  const initialData = result.success && result.data
    ? result.data
    : {
        users: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
        stats: { total: 0, active: 0, inactive: 0, admins: 0 },
      }

  return (
    <div className="flex-1 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-8 w-8" />
          Gerenciamento de Usuarios
        </h2>
        <p className="text-muted-foreground">
          Gerencie usuarios, permissoes, status e acesso aos modulos do sistema
        </p>
      </div>

      <UserManagementPanel initialData={initialData} />
    </div>
  )
}
