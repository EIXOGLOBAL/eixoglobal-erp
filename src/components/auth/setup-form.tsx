'use client'

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { setupAdmin } from "@/app/actions/auth-actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

const setupSchema = z.object({
    name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
    username: z.string().min(3, "Usuário deve ter pelo menos 3 caracteres").regex(/^[a-zA-Z0-9._-]+$/, "Apenas letras, números, pontos, hífens e underscores"),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
})

export function SetupForm() {
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof setupSchema>>({
        resolver: zodResolver(setupSchema),
    })

    async function onSubmit(data: z.infer<typeof setupSchema>) {
        setError(null)
        startTransition(async () => {
            const formData = new FormData()
            formData.append("name", data.name)
            formData.append("username", data.username)
            if (data.email) formData.append("email", data.email)
            formData.append("password", data.password)

            const result = await setupAdmin({}, formData)

            if (result.errors) {
                setError(Object.values(result.errors).flat().join(", "))
            } else if (result.message) {
                setError(result.message)
            } else if (result.success) {
                router.push("/login")
            }
        })
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
                        <label htmlFor="name">Nome do Administrador</label>
                        <Input
                            id="name"
                            placeholder="Seu nome completo"
                            disabled={isPending}
                            {...register("name")}
                        />
                        {errors.name && (
                            <p className="text-sm text-red-500">{errors.name.message}</p>
                        )}
                    </div>
                    <div className="grid gap-2">
                        <label htmlFor="username">Usuário de Login</label>
                        <Input
                            id="username"
                            placeholder="admin"
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
                        <label htmlFor="email">Email (opcional)</label>
                        <Input
                            id="email"
                            placeholder="admin@eixoglobal.com"
                            type="email"
                            autoCapitalize="none"
                            autoComplete="email"
                            autoCorrect="off"
                            disabled={isPending}
                            {...register("email")}
                        />
                        {errors.email && (
                            <p className="text-sm text-red-500">{errors.email.message}</p>
                        )}
                    </div>
                    <div className="grid gap-2">
                        <label htmlFor="password">Senha</label>
                        <Input
                            id="password"
                            placeholder="******"
                            type="password"
                            autoComplete="new-password"
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
                        Criar Conta Administrativa
                    </Button>
                </div>
            </form>
        </div>
    )
}
