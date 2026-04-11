'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { RoleBadge } from '@/components/ui/role-badge'
import { useToast } from '@/hooks/use-toast'
import { UserDetailDrawer } from './user-detail-drawer'
import {
  getAdminUserList,
  toggleUserStatus,
  forceLogoutUser,
  type AdminUserRow,
  type AdminUserListFilters,
} from '@/app/actions/admin-user-actions'
import {
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  Search,
  MoreHorizontal,
  Eye,
  Settings,
  LogOut,
  Power,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20

const ONLINE_THRESHOLD_MS = 10 * 60 * 1000 // 10 minutes

const ROLE_OPTIONS = [
  { value: 'all', label: 'Todos os Cargos' },
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'MANAGER', label: 'Gerente' },
  { value: 'ENGINEER', label: 'Engenheiro' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'USER', label: 'Usuario' },
  { value: 'SAFETY_OFFICER', label: 'Tec. Seguranca' },
  { value: 'ACCOUNTANT', label: 'Contador' },
  { value: 'HR_ANALYST', label: 'Analista RH' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'inactive', label: 'Inativos' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string | null, username: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0].substring(0, 2).toUpperCase()
  }
  return username.substring(0, 2).toUpperCase()
}

function isOnline(lastLoginAt: string | null): boolean {
  if (!lastLoginAt) return false
  const diff = Date.now() - new Date(lastLoginAt).getTime()
  return diff < ONLINE_THRESHOLD_MS
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'Nunca'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Agora'
  if (mins < 60) return `${mins}min atras`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h atras`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d atras`
  return new Date(iso).toLocaleDateString('pt-BR')
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface UserManagementPanelProps {
  initialData: {
    users: AdminUserRow[]
    total: number
    page: number
    pageSize: number
    totalPages: number
    stats: {
      total: number
      active: number
      inactive: number
      admins: number
    }
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserManagementPanel({ initialData }: UserManagementPanelProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  // Data state
  const [users, setUsers] = useState<AdminUserRow[]>(initialData.users)
  const [total, setTotal] = useState(initialData.total)
  const [totalPages, setTotalPages] = useState(initialData.totalPages)
  const [stats, setStats] = useState(initialData.stats)

  // Filter state
  const [statusFilter, setStatusFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Drawer state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Fetch users
  const fetchUsers = useCallback(async (filters?: Partial<AdminUserListFilters>) => {
    const params: AdminUserListFilters = {
      status: (filters?.status ?? statusFilter) as 'all' | 'active' | 'inactive',
      role: filters?.role ?? roleFilter,
      search: filters?.search ?? searchTerm,
      page: filters?.page ?? currentPage,
      pageSize: PAGE_SIZE,
      sortBy: filters?.sortBy ?? sortBy,
      sortDir: filters?.sortDir ?? sortDir,
    }

    const result = await getAdminUserList(params)
    if (result.success && result.data) {
      setUsers(result.data.users)
      setTotal(result.data.total)
      setTotalPages(result.data.totalPages)
      setStats(result.data.stats)
    }
  }, [statusFilter, roleFilter, searchTerm, currentPage, sortBy, sortDir])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        fetchUsers({ search: searchTerm, page: 1 })
        setCurrentPage(1)
      })
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  // Filter / sort changes
  const handleStatusChange = (val: string) => {
    setStatusFilter(val)
    setCurrentPage(1)
    startTransition(() => fetchUsers({ status: val as 'all' | 'active' | 'inactive', page: 1 }))
  }

  const handleRoleChange = (val: string) => {
    setRoleFilter(val)
    setCurrentPage(1)
    startTransition(() => fetchUsers({ role: val, page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    startTransition(() => fetchUsers({ page }))
  }

  const handleSort = (field: string) => {
    const newDir = sortBy === field && sortDir === 'asc' ? 'desc' : 'asc'
    setSortBy(field)
    setSortDir(newDir)
    startTransition(() => fetchUsers({ sortBy: field, sortDir: newDir }))
  }

  // Actions
  const handleToggleStatus = (userId: string) => {
    startTransition(async () => {
      const result = await toggleUserStatus(userId)
      if (result.success) {
        toast({
          title: 'Sucesso',
          description: `Usuario ${result.isActive ? 'ativado' : 'desativado'}`,
        })
        fetchUsers()
      } else {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      }
    })
  }

  const handleForceLogout = (userId: string) => {
    startTransition(async () => {
      const result = await forceLogoutUser(userId)
      if (result.success) {
        toast({ title: 'Sucesso', description: 'Logout forcado com sucesso' })
        fetchUsers()
      } else {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      }
    })
  }

  const openDrawer = (userId: string) => {
    setSelectedUserId(userId)
    setDrawerOpen(true)
  }

  // Sort icon helper
  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 text-muted-foreground/50" />
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 ml-1 text-primary" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 ml-1 text-primary" />
    )
  }

  // Online count (estimated from current page data + lastLoginAt)
  const onlineNow = users.filter((u) => u.isActive && isOnline(u.lastLoginAt)).length

  return (
    <>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Cadastrados no sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos Agora</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              {onlineNow > 0 && (
                <span className="text-green-600">{onlineNow} online nesta pagina</span>
              )}
              {onlineNow === 0 && 'Contas ativas'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inativos</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.inactive}</div>
            <p className="text-xs text-muted-foreground">
              Contas desativadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <ShieldCheck className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.admins}</div>
            <p className="text-xs text-muted-foreground">
              Administradores
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={handleRoleChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Cargo" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data table */}
      <Card>
        <CardContent className="p-0">
          {isPending && (
            <div className="flex items-center justify-center py-2 border-b bg-muted/30">
              <Loader2 className="h-4 w-4 animate-spin mr-2 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Carregando...</span>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>
                  <button
                    className="flex items-center hover:text-foreground transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    Nome
                    <SortIcon field="name" />
                  </button>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <button
                    className="flex items-center hover:text-foreground transition-colors"
                    onClick={() => handleSort('email')}
                  >
                    Email
                    <SortIcon field="email" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center hover:text-foreground transition-colors"
                    onClick={() => handleSort('role')}
                  >
                    Cargo
                    <SortIcon field="role" />
                  </button>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">
                  <button
                    className="flex items-center hover:text-foreground transition-colors"
                    onClick={() => handleSort('lastLoginAt')}
                  >
                    Ultimo Acesso
                    <SortIcon field="lastLoginAt" />
                  </button>
                </TableHead>
                <TableHead className="w-[60px]">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Nenhum usuario encontrado
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const online = user.isActive && isOnline(user.lastLoginAt)
                  return (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer"
                      onClick={() => openDrawer(user.id)}
                    >
                      {/* Initials avatar */}
                      <TableCell>
                        <div className="relative">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                            {getInitials(user.name, user.username)}
                          </div>
                          {online && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-background" />
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Name */}
                      <TableCell>
                        <div>
                          <p className="font-medium truncate max-w-[200px]">
                            {user.name || user.username}
                          </p>
                          <p className="text-xs text-muted-foreground md:hidden truncate">
                            {user.email || '---'}
                          </p>
                        </div>
                      </TableCell>

                      {/* Email */}
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground truncate block max-w-[250px]">
                          {user.email || '---'}
                        </span>
                      </TableCell>

                      {/* Role */}
                      <TableCell>
                        <RoleBadge role={user.role} />
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {!user.isActive ? (
                          <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
                            Inativo
                          </Badge>
                        ) : online ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                            <span className="relative flex h-2 w-2 mr-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                            </span>
                            Online
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
                            Offline
                          </Badge>
                        )}
                      </TableCell>

                      {/* Last access */}
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {formatRelativeTime(user.lastLoginAt)}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Acoes</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                openDrawer(user.id)
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                openDrawer(user.id)
                              }}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Editar Permissoes
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleForceLogout(user.id)
                              }}
                            >
                              <LogOut className="h-4 w-4 mr-2" />
                              Forcar Logout
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleToggleStatus(user.id)
                              }}
                              className={user.isActive ? 'text-destructive focus:text-destructive' : ''}
                            >
                              <Power className="h-4 w-4 mr-2" />
                              {user.isActive ? 'Desativar' : 'Ativar'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={total}
              pageSize={PAGE_SIZE}
              onPageChange={handlePageChange}
            />
          )}
        </CardContent>
      </Card>

      {/* Detail drawer */}
      <UserDetailDrawer
        userId={selectedUserId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onUserUpdated={() => startTransition(() => fetchUsers())}
      />
    </>
  )
}
