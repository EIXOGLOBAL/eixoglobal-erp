import { requireAdmin } from '@/lib/route-guard'
import { Shield } from 'lucide-react'
import { AuditPanel } from '@/components/audit/audit-panel'

export default async function AuditoriaPage() {
  const session = await requireAdmin()
  const user = session.user as { id: string; role: string; companyId: string }
  if (!user.companyId) return null

  return (
    <div className="flex-1 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Log de Auditoria
        </h2>
        <p className="text-muted-foreground">
          Registro detalhado de todas as ações realizadas no sistema
        </p>
      </div>
      <AuditPanel companyId={user.companyId} />
    </div>
  )
}
