import { requireAuth } from "@/lib/route-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Building2, Users, Lock, UserCircle, BarChart3, Shield, FileText, Brain } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default async function ConfiguracoesPage() {
    const session = await requireAuth()

    const user = session.user as { id: string; username: string; name?: string; email?: string; role?: string }

    const configSections = [
        {
            title: "Meu Perfil",
            description: "Editar nome, email e informações pessoais da conta",
            icon: UserCircle,
            href: "/configuracoes/perfil",
            color: "text-blue-600",
            adminOnly: false,
        },
        {
            title: "Segurança",
            description: "Alterar senha e configurações de autenticação da conta",
            icon: Lock,
            href: "/configuracoes/seguranca",
            color: "text-orange-600",
            adminOnly: false,
        },
        {
            title: "Empresas Clientes",
            description: "Gerenciar cadastro de empresas e clientes do sistema",
            icon: Building2,
            href: "/companies",
            color: "text-green-600",
            adminOnly: false,
        },
        {
            title: "Usuários e Permissões",
            description: "Gerenciar usuários, funções e níveis de acesso ao sistema",
            icon: Users,
            href: "/users",
            color: "text-purple-600",
            adminOnly: false,
        },
        {
            title: "Relatórios",
            description: "Visualizar relatórios consolidados de todos os módulos",
            icon: BarChart3,
            href: "/relatorios",
            color: "text-cyan-600",
            adminOnly: false,
        },
        {
            title: "Inteligência Artificial",
            description: "Gerenciar permissões e níveis de acesso à IA dos usuários",
            icon: Brain,
            href: "/configuracoes/ia",
            color: "text-violet-600",
            adminOnly: true,
        },
        {
            title: "Log de Auditoria",
            description: "Histórico de ações realizadas no sistema por todos os usuários",
            icon: Shield,
            href: "/configuracoes/auditoria",
            color: "text-red-600",
            adminOnly: true,
        },
    ]

    const isAdmin = user.role === 'ADMIN'
    const visibleSections = configSections.filter(s => !s.adminOnly || isAdmin)

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Settings className="h-8 w-8" />
                    Configurações
                </h2>
                <p className="text-muted-foreground">
                    Configure o sistema conforme as necessidades da sua empresa
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {visibleSections.map((section) => {
                    const Icon = section.icon
                    return (
                        <Link key={section.title} href={section.href}>
                            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                                <CardHeader className="flex flex-row items-center gap-4">
                                    <div className={`p-2 rounded-lg bg-muted ${section.color}`}>
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">{section.title}</CardTitle>
                                        <CardDescription>{section.description}</CardDescription>
                                    </div>
                                </CardHeader>
                            </Card>
                        </Link>
                    )
                })}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Informações do Sistema</CardTitle>
                    <CardDescription>Versão atual do Eixo Global ERP</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Versão</span>
                            <span className="font-medium">1.0.0</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Usuário</span>
                            <span className="font-medium">{user.name || user.username}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Função</span>
                            <span className="font-medium">{user.role || 'USER'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Banco de Dados</span>
                            <span className="font-medium">SQLite (Desenvolvimento)</span>
                        </div>
                    </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
              <Link href="/termos" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <FileText className="h-4 w-4" />
                Termos de Uso
              </Link>
              <span className="hidden sm:inline text-muted-foreground">&bull;</span>
              <Link href="/termos/privacidade" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Shield className="h-4 w-4" />
                Política de Privacidade (LGPD)
              </Link>
            </div>
                </CardContent>
            </Card>
        </div>
    )
}
