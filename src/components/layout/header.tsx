"use client"

import { Menu, User, LogOut, Settings } from "lucide-react"
import { logout } from "@/app/actions/auth-actions"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar } from "./sidebar"
import type { ModulePermissions } from "./sidebar"
import { NotificationBell } from "./notification-bell"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { GlobalSearch } from "@/components/search/global-search"
import { DateTimeDisplay } from "@/components/ui/datetime-display"
import { PingMonitor } from "@/components/ui/ping-monitor"

interface HeaderProps {
    user: {
        name?: string | null
        username: string
        email?: string | null
        role?: string | null
    } | null
    modulePermissions?: ModulePermissions
}

export function Header({ user, modulePermissions = {} }: HeaderProps) {
    return (
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 sm:gap-4 border-b bg-background px-3 sm:px-4 md:static md:h-auto md:border-0 md:bg-transparent md:px-6">
            <Sheet>
                <SheetTrigger asChild>
                    <Button size="icon" variant="outline" className="md:hidden" aria-label="Menu">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Alternar menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] sm:max-w-xs p-0 overflow-y-auto">
                    <Sidebar userRole={user?.role ?? 'USER'} modulePermissions={modulePermissions} />
                </SheetContent>
            </Sheet>
            <div className="hidden md:block">
                <Breadcrumb />
            </div>
            <div className="relative ml-auto flex-1 md:grow-0 md:w-72">
                <GlobalSearch />
            </div>
            {user && (
                <div className="flex items-center gap-2">
                    <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground">
                        <DateTimeDisplay mode="compact" className="text-xs" />
                        <PingMonitor />
                    </div>
                    <NotificationBell />
                    <div className="hidden flex-col items-end md:flex">
                        <span className="text-sm font-medium">{user.name || user.username}</span>
                        <span className="text-xs text-muted-foreground">{user.role}</span>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" className="rounded-full" aria-label="Usuário">
                                <User className="h-5 w-5" />
                                <span className="sr-only">Menu do usuário</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/perfil" className="cursor-pointer flex items-center">
                                    <User className="mr-2 h-4 w-4" />
                                    Meu Perfil
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/configuracoes" className="cursor-pointer flex items-center">
                                    <Settings className="mr-2 h-4 w-4" />
                                    Configurações
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive cursor-pointer"
                                onClick={() => logout()}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Sair
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}
        </header>
    )
}
