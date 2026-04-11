'use client'

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import * as z from "zod"
import { login, devLogin } from "@/app/actions/auth-actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Zap } from "lucide-react"

const loginSchema = z.object({
    username: z.string().min(3, "Usuário deve ter pelo menos 3 caracteres"),
    password: z.string().min(1, "Senha obrigatória"),
})

export function LoginForm() {
    const [isPending, startTransition] = useTransition()
    const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
    })

    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [isDevLoginPending, setIsDevLoginPending] = useState(false)

    async function onSubmit(data: z.infer<typeof loginSchema>) {
        setError(null)
        startTransition(async () => {
            const formData = new FormData()
            formData.append("username", data.username)
            formData.append("password", data.password)

            try {
                const result = await login({}, formData)
                if (result?.success) {
                    router.push('/dashboard')
                    router.refresh()
                } else if (result?.message) {
                    setError(result.message)
                }
            } catch (e: any) {
                if (!e?.digest?.startsWith('NEXT_REDIRECT')) {
                    setError('Erro ao tentar realizar login.')
                }
            }
        })
    }

    async function handleDevLogin() {
        setError(null)
        setIsDevLoginPending(true)
        try {
            const result = await devLogin()
            if (result.success) {
                router.push('/dashboard')
                router.refresh()
            } else {
                setError(result.error || 'Erro ao fazer login de desenvolvimento')
                setIsDevLoginPending(false)
            }
        } catch (e: any) {
            setError('Erro ao fazer login de desenvolvimento')
            setIsDevLoginPending(false)
        }
    }

    return (
        <div className="grid gap-6">
            <form onSubmit={handleSubmit(onSubmit)}>
                {error && (
                    <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive mb-4">
                        <p>{error}</p>
                    </div>
                )}
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <label htmlFor="username">Usuário</label>
                        <Input
                            id="username"
                            placeholder="seu.usuario"
                            type="text"
                            autoCapitalize="none"
                            autoComplete="username"
                            autoCorrect="off"
                            disabled={isPending}
                            {...register("username")}
                        />
                        {errors.username && (
                            <p className="text-sm text-red-500">{errors.username.message}</p>
                        )}
                    </div>
                    <div className="grid gap-2">
                        <label htmlFor="password">Senha</label>
                        <Input
                            id="password"
                            placeholder="******"
                            type="password"
                            autoComplete="current-password"
                            disabled={isPending}
                            {...register("password")}
                        />
                        {errors.password && (
                            <p className="text-sm text-red-500">{errors.password.message}</p>
                        )}
                    </div>
                    <Button disabled={isPending}>
                        {isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Entrar
                    </Button>
                </div>
            </form>

            {process.env.NODE_ENV === 'development' && (
                <>
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Desenvolvimento
                            </span>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleDevLogin}
                        disabled={isDevLoginPending || isPending}
                        className="border-orange-500 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                    >
                        {isDevLoginPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {!isDevLoginPending && (
                            <Zap className="mr-2 h-4 w-4" />
                        )}
                        Login Automático (DEV)
                    </Button>
                </>
            )}
        </div>
    )
}
