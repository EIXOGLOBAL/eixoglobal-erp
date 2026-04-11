import { CreateUserDialog } from "@/components/users/create-user-dialog"
import { EditUserDialog } from "@/components/users/edit-user-dialog"
import { DeleteUserDialog } from "@/components/users/delete-user-dialog"
import { PermissionDialog } from "@/components/users/permission-dialog"
import { RoleBadge } from "@/components/ui/role-badge"
import { requireAdmin } from "@/lib/route-guard"
import { prisma } from "@/lib/prisma"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Building2, Users, ShieldCheck, UserCheck, KeyRound } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BlockUserDialog } from "@/components/users/block-user-dialog"
import { ResetPasswordDialog } from "@/components/users/reset-password-dialog"
import { UserStatusActions } from "@/components/users/user-status-actions"
import { formatDateTime } from "@/lib/formatters"

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
    const session = await requireAdmin()

    const users = await prisma.user.findMany({
        orderBy: { name: 'asc' },
        select: {
            id: true,
            username: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
            isActive: true,
            isBlocked: true,
            blockedReason: true,
            lastLoginAt: true,
            companyId: true,
            createdAt: true,
            canDelete: true,
            canApprove: true,
            canManageFinancial: true,
            canManageHR: true,
            canManageSystem: true,
            canViewReports: true,
            company: { select: { id: true, name: true } },
        }
    })

    const companies = await prisma.company.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    })

    const totalUsers = users.length
    const totalAdmins = users.filter(u => u.role === 'ADMIN').length
    const totalManagers = users.filter(u => u.role === 'MANAGER').length
    const totalEngineers = users.filter(u => u.role === 'ENGINEER').length

    const kpis = [
        {
            label: 'Total de Usuários',
            value: totalUsers,
            icon: Users,
            color: 'text-blue-600',
            bg: 'bg-blue-50 dark:bg-blue-950/20',
        },
        {
            label: 'Administradores',
            value: totalAdmins,
            icon: ShieldCheck,
            color: 'text-purple-600',
            bg: 'bg-purple-50 dark:bg-purple-950/20',
        },
        {
            label: 'Gerentes',
            value: totalManagers,
            icon: UserCheck,
            color: 'text-blue-500',
            bg: 'bg-blue-50 dark:bg-blue-950/20',
        },
        {
            label: 'Engenheiros',
            value: totalEngineers,
            icon: KeyRound,
            color: 'text-green-600',
            bg: 'bg-green-50 dark:bg-green-950/20',
        },
    ]

    function getInitials(name: string | null, username: string) {
        if (name) {
            return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        }
        return username.slice(0, 2).toUpperCase()
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Gerenciamento de Usuários</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Gerencie usuários, roles e permissões granulares do sistema.
                    </p>
                </div>
                <CreateUserDialog companies={companies} />
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {kpis.map((kpi) => (
                    <Card key={kpi.label}>
                        <CardContent className="p-4">
                            <div className={`inline-flex p-2 rounded-lg ${kpi.bg} mb-3`}>
                                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                            </div>
                            <p className="text-2xl font-bold">{kpi.value}</p>
                            <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Users Table */}
            {users.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed p-8 shadow-xs min-h-[300px]">
                    <div className="flex flex-col items-center gap-2 text-center">
                        <Users className="h-10 w-10 text-muted-foreground" />
                        <h3 className="text-xl font-bold tracking-tight">
                            Nenhum usuário cadastrado
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Comece adicionando usuários ao sistema.
                        </p>
                        <CreateUserDialog companies={companies} />
                    </div>
                </div>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Lista de Usuários</CardTitle>
                        <CardDescription>
                            {totalUsers} {totalUsers === 1 ? 'usuário cadastrado' : 'usuários cadastrados'} no sistema.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Usuário</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Último Acesso</TableHead>
                                    <TableHead>Empresa</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    {user.avatarUrl && (
                                                        <AvatarImage src={user.avatarUrl} alt={user.name ?? user.username} />
                                                    )}
                                                    <AvatarFallback className="text-xs">
                                                        {getInitials(user.name, user.username)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium text-sm">{user.name || '-'}</p>
                                                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <RoleBadge role={user.role} />
                                        </TableCell>
                                        <TableCell>
                                            {!user.isActive ? (
                                                <Badge variant="secondary" className="bg-gray-100 text-gray-600">Inativo</Badge>
                                            ) : user.isBlocked ? (
                                                <Badge variant="destructive">Bloqueado</Badge>
                                            ) : (
                                                <Badge className="bg-green-100 text-green-700 border-green-200">Ativo</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs text-muted-foreground">
                                                {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Nunca'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {user.company ? (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                    {user.company.name}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-1">
                                                <PermissionDialog
                                                    user={user}
                                                    trigger={
                                                        <Button variant="outline" size="sm">
                                                            <ShieldCheck className="h-4 w-4 mr-1" />
                                                            Permissões
                                                        </Button>
                                                    }
                                                />
                                                <UserStatusActions
                                                    userId={user.id}
                                                    username={user.username}
                                                    isActive={user.isActive}
                                                    isBlocked={user.isBlocked}
                                                />
                                                <ResetPasswordDialog userId={user.id} username={user.username} />
                                                <EditUserDialog
                                                    user={{
                                                        id: user.id,
                                                        name: user.name,
                                                        username: user.username,
                                                        email: user.email,
                                                        role: user.role as any,
                                                        companyId: user.companyId
                                                    }}
                                                    companies={companies}
                                                />
                                                <DeleteUserDialog id={user.id} name={user.name || user.username} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
