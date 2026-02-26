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
import { NotificationBell } from "./notification-bell"

interface HeaderProps {
    user: {
        name: string | null
        email: string
        role: string
    } | null
}

export function Header({ user }: HeaderProps) {
    return (
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <Sheet>
                <SheetTrigger asChild>
                    <Button size="icon" variant="outline" className="sm:hidden">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle Menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[240px] sm:max-w-xs">
                    <Sidebar />
                </SheetContent>
            </Sheet>
            <div className="relative ml-auto flex-1 md:grow-0">
                {/* Search or breadcrumbs could go here */}
            </div>
            {user && (
                <div className="flex items-center gap-2">
                    <NotificationBell />
                    <div className="hidden flex-col items-end md:flex">
                        <span className="text-sm font-medium">{user.name || user.email}</span>
                        <span className="text-xs text-muted-foreground">{user.role}</span>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" className="rounded-full">
                                <User className="h-5 w-5" />
                                <span className="sr-only">Toggle user menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/configuracoes/perfil" className="cursor-pointer flex items-center">
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
