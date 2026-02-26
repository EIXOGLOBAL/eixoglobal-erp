import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChangePasswordForm } from "@/components/configuracoes/change-password-form"

export default async function SegurancaPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/configuracoes">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Shield className="h-6 w-6" />
                        Segurança
                    </h1>
                    <p className="text-muted-foreground text-sm">Gerencie sua senha e segurança da conta</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Alterar Senha</CardTitle>
                    <CardDescription>
                        Use uma senha forte com no mínimo 8 caracteres, combinando letras, números e símbolos.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChangePasswordForm userId={session.user!.id} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Informações de Sessão</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Usuário logado</span>
                        <span className="font-medium">{session.user?.name || session.user?.email}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Email</span>
                        <span className="font-medium">{session.user?.email}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Permissão</span>
                        <span className="font-medium">{session.user?.role}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
