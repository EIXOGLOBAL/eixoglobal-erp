import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { UpdateProfileForm } from "@/components/configuracoes/update-profile-form"
import { formatDate } from "@/lib/formatters"

export const dynamic = 'force-dynamic'

const roleLabels: Record<string, string> = {
    ADMIN: 'Administrador',
    MANAGER: 'Gerente',
    ENGINEER: 'Engenheiro',
    USER: 'Usuário',
}

export default async function PerfilPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const user = await prisma.user.findUnique({
        where: { id: session.user!.id },
        include: { company: { select: { name: true } } }
    })

    if (!user) redirect("/login")

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/configuracoes">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Meu Perfil</h1>
                    <p className="text-muted-foreground text-sm">Gerencie suas informações pessoais</p>
                </div>
            </div>

            {/* Info atual */}
            <Card>
                <CardHeader>
                    <CardTitle>Informações da Conta</CardTitle>
                    <CardDescription>Dados vinculados ao seu acesso no sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-muted-foreground">Função</p>
                            <Badge className="mt-1">{roleLabels[user.role] || user.role}</Badge>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Empresa</p>
                            <p className="font-medium mt-1">{user.company?.name || '—'}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Conta criada em</p>
                            <p className="font-medium mt-1">{formatDate(user.createdAt)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Última atualização</p>
                            <p className="font-medium mt-1">{formatDate(user.updatedAt)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Form de edição */}
            <Card>
                <CardHeader>
                    <CardTitle>Editar Dados</CardTitle>
                    <CardDescription>Atualize seu nome e endereço de email</CardDescription>
                </CardHeader>
                <CardContent>
                    <UpdateProfileForm
                        currentName={user.name || ''}
                        currentEmail={user.email || ''}
                    />
                </CardContent>
            </Card>

            <Separator />

            <div className="text-center">
                <Button variant="outline" asChild>
                    <Link href="/configuracoes/seguranca">
                        Alterar Senha
                    </Link>
                </Button>
            </div>
        </div>
    )
}
