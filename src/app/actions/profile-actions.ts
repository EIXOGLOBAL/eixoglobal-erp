'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

const updateProfileSchema = z.object({
    userId: z.string().uuid(),
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("Email inválido"),
})

const changePasswordSchema = z.object({
    userId: z.string().uuid(),
    currentPassword: z.string().min(1, "Senha atual obrigatória"),
    newPassword: z.string().min(8, "Nova senha deve ter pelo menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirmação obrigatória"),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
})

export async function updateProfile(data: { userId: string; name: string; email: string }) {
    try {
        const validated = updateProfileSchema.parse(data)

        // Verificar se email já está em uso por outro usuário
        const existing = await prisma.user.findFirst({
            where: { email: validated.email, NOT: { id: validated.userId } }
        })
        if (existing) {
            return { success: false, error: "Este email já está em uso por outro usuário" }
        }

        await prisma.user.update({
            where: { id: validated.userId },
            data: {
                name: validated.name,
                email: validated.email,
            }
        })

        revalidatePath('/configuracoes/perfil')
        return { success: true }
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.issues[0]?.message }
        }
        return { success: false, error: "Erro ao atualizar perfil" }
    }
}

export async function changePassword(data: {
    userId: string
    currentPassword: string
    newPassword: string
    confirmPassword: string
}) {
    try {
        const validated = changePasswordSchema.parse(data)

        const user = await prisma.user.findUnique({
            where: { id: validated.userId },
            select: { password: true }
        })

        if (!user) {
            return { success: false, error: "Usuário não encontrado" }
        }

        const isValid = await bcrypt.compare(validated.currentPassword, user.password)
        if (!isValid) {
            return { success: false, error: "Senha atual incorreta" }
        }

        const hashed = await bcrypt.hash(validated.newPassword, 12)

        await prisma.user.update({
            where: { id: validated.userId },
            data: { password: hashed }
        })

        return { success: true }
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.issues[0]?.message }
        }
        return { success: false, error: "Erro ao alterar senha" }
    }
}
