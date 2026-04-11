import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { UserCircle } from 'lucide-react'
import { ProfileForm } from '@/components/profile/profile-form'

export const dynamic = 'force-dynamic'

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  ENGINEER: 'Engenheiro',
  USER: 'Usuario',
}

export default async function PerfilPage() {
  const session = await getSession()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      company: { select: { name: true } },
    },
  })

  if (!user) redirect('/login')

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-3xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <UserCircle className="h-8 w-8" />
          Meu Perfil
        </h2>
        <p className="text-muted-foreground">
          Gerencie suas informacoes pessoais e preferencias
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informacoes da Conta</CardTitle>
          <CardDescription>Dados vinculados ao seu acesso no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Usuario</p>
              <p className="font-medium mt-1">{user.username}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Funcao</p>
              <Badge className="mt-1">{roleLabels[user.role] || user.role}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Empresa</p>
              <p className="font-medium mt-1">{user.company?.name || '\u2014'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Ultimo acesso</p>
              <p className="font-medium mt-1">
                {user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '\u2014'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <ProfileForm
        currentName={user.name || ''}
        currentEmail={user.email || ''}
      />
    </div>
  )
}
