'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, MoonStar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const themes = [
    {
        value: 'light',
        label: 'Claro',
        description: 'Interface clara padrão',
        icon: Sun,
    },
    {
        value: 'dark-dim',
        label: 'Noturno Médio',
        description: 'Escuro suave — confortável',
        icon: Moon,
    },
    {
        value: 'dark',
        label: 'Noturno Tradicional',
        description: 'Escuro profundo — alto contraste',
        icon: MoonStar,
    },
] as const

export function ThemeToggle({ className }: { className?: string }) {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <Button variant="ghost" size="sm" className={cn('w-full justify-start gap-2', className)}>
                <Sun className="h-4 w-4" />
                <span className="text-sm">Tema</span>
            </Button>
        )
    }

    const current = themes.find(t => t.value === theme) ?? themes[0]
    const Icon = current.icon

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        'w-full justify-start gap-2 text-muted-foreground hover:text-foreground',
                        className
                    )}
                >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="text-sm">{current.label}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56">
                <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Aparência
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {themes.map(t => {
                    const TIcon = t.icon
                    const isActive = theme === t.value
                    return (
                        <DropdownMenuItem
                            key={t.value}
                            onClick={() => setTheme(t.value)}
                            className={cn(
                                'flex items-start gap-3 py-2.5 cursor-pointer',
                                isActive && 'bg-accent'
                            )}
                        >
                            <TIcon className={cn('h-4 w-4 mt-0.5 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                            <div className="flex flex-col gap-0.5">
                                <span className={cn('text-sm font-medium leading-none', isActive && 'text-accent-foreground')}>
                                    {t.label}
                                </span>
                                <span className="text-xs text-muted-foreground leading-snug">
                                    {t.description}
                                </span>
                            </div>
                            {isActive && (
                                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                            )}
                        </DropdownMenuItem>
                    )
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
