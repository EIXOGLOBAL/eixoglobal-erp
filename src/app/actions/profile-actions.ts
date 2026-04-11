'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { assertAuthenticated } from "@/lib/auth-helpers"
import { BCRYPT_ROUNDS, validatePassword } from "@/lib/password-policy"

const updateProfileSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
})

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Senha atual obrigatória"),
    newPassword: z.string().min(8, "Nova senha deve ter pelo menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirmação obrigatória"),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
})

export async function getProfileData() {
    try {
        const session = await assertAuthenticated()

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                username: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                createdAt: true,
                updatedAt: true,
                lastLoginAt: true,
                company: { select: { name: true } },
            },
        })

        if (!user) {
            return { success: false as const, error: 'Usuario nao encontrado' }
        }

        return { success: true as const, data: user }
    } catch (error: any) {
        console.error("[getProfileData] error:", error)
        return { success: false as const, error: `Erro ao carregar perfil: ${error?.message ?? "desconhecido"}` }
    }
}

export async function updateProfile(data: { name: string; email?: string }) {
    try {
        const session = await assertAuthenticated()
        const validated = updateProfileSchema.parse(data)

        await prisma.user.update({
            where: { id: session.user.id },
            data: { name: validated.name, email: validated.email || null }
        })

        revalidatePath('/configuracoes/perfil')
        revalidatePath('/perfil')
        return { success: true }
    } catch (error: any) {
        console.error("[updateProfile] error:", error)
        if (error instanceof z.ZodError) {
            return { success: false, error: error.issues[0]?.message }
        }
        return { success: false, error: `Erro ao atualizar perfil: ${error?.message ?? "desconhecido"}` }
    }
}

export async function changePassword(data: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
}) {
    try {
        const session = await assertAuthenticated()
        const validated = changePasswordSchema.parse(data)

        const policy = validatePassword(validated.newPassword)
        if (!policy.valid) {
            return { success: false, error: policy.errors[0] }
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { password: true }
        })

        if (!user) {
            return { success: false, error: "Usuário não encontrado" }
        }

        const isValid = await bcrypt.compare(validated.currentPassword, user.password)
        if (!isValid) {
            return { success: false, error: "Senha atual incorreta" }
        }

        const hashed = await bcrypt.hash(validated.newPassword, BCRYPT_ROUNDS)

        await prisma.user.update({
            where: { id: session.user.id },
            data: { password: hashed }
        })

        return { success: true }
    } catch (error: any) {
        console.error("[changePassword] error:", error)
        if (error instanceof z.ZodError) {
            return { success: false, error: error.issues[0]?.message }
        }
        return { success: false, error: `Erro ao alterar senha: ${error?.message ?? "desconhecido"}` }
    }
}
