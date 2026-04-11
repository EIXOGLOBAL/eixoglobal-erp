'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { assertAuthenticated } from "@/lib/auth-helpers"

const bdiConfigSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    companyId: z.string().uuid("ID da empresa inválido"),
    percentage: z.number().min(0).max(999.99, "Percentual inválido"),
    isDefault: z.boolean().optional(),
})

export async function createBDIConfig(data: z.infer<typeof bdiConfigSchema>) {
    try {
        await assertAuthenticated()
        const validated = bdiConfigSchema.parse(data)

        // If setting as default, unset any previous default for this company
        if (validated.isDefault) {
            await prisma.bDIConfig.updateMany({
                where: { companyId: validated.companyId, isDefault: true },
                data: { isDefault: false }
            })
        }

        const bdiConfig = await prisma.bDIConfig.create({
            data: {
                name: validated.name,
                companyId: validated.companyId,
                percentage: validated.percentage,
                isDefault: validated.isDefault ?? false,
            },
            include: { company: true }
        })

        revalidatePath('/configuracoes')
        return { success: true, data: bdiConfig }
    } catch (error) {
        console.error("Erro ao criar configuração BDI:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar configuração BDI",
        }
    }
}

export async function updateBDIConfig(id: string, data: z.infer<typeof bdiConfigSchema>) {
    try {
        await assertAuthenticated()
        const validated = bdiConfigSchema.parse(data)

        // If setting as default, unset any previous default for this company
        if (validated.isDefault) {
            await prisma.bDIConfig.updateMany({
                where: { companyId: validated.companyId, isDefault: true, id: { not: id } },
                data: { isDefault: false }
            })
        }

        const bdiConfig = await prisma.bDIConfig.update({
            where: { id },
            data: {
                name: validated.name,
                companyId: validated.companyId,
                percentage: validated.percentage,
                isDefault: validated.isDefault ?? false,
            },
            include: { company: true }
        })

        revalidatePath('/configuracoes')
        return { success: true, data: bdiConfig }
    } catch (error) {
        console.error("Erro ao atualizar configuração BDI:", error)
        return { success: false, error: "Erro ao atualizar configuração BDI" }
    }
}

export async function deleteBDIConfig(id: string) {
    try {
        await assertAuthenticated()
        await prisma.bDIConfig.delete({ where: { id } })
        revalidatePath('/configuracoes')
        return { success: true }
    } catch (error) {
        console.error("Erro ao deletar configuração BDI:", error)
        return { success: false, error: "Erro ao deletar configuração BDI" }
    }
}

export async function getBDIConfigs(companyId: string) {
    try {
        await assertAuthenticated()
        const bdiConfigs = await prisma.bDIConfig.findMany({
            where: { companyId },
            include: { company: { select: { id: true, name: true } } },
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }]
        })
        return { success: true, data: bdiConfigs }
    } catch (error) {
        console.error("Erro ao buscar configurações BDI:", error)
        return { success: false, error: "Erro ao buscar configurações BDI" }
    }
}

export async function getBDIConfigById(id: string) {
    try {
        await assertAuthenticated()
        const bdiConfig = await prisma.bDIConfig.findUnique({
            where: { id },
            include: { company: true }
        })

        if (!bdiConfig) {
            return { success: false, error: "Configuração BDI não encontrada" }
        }

        return { success: true, data: bdiConfig }
    } catch (error) {
        console.error("Erro ao buscar configuração BDI:", error)
        return { success: false, error: "Erro ao buscar configuração BDI" }
    }
}

export async function getDefaultBDIConfig(companyId: string) {
    try {
        await assertAuthenticated()
        const bdiConfig = await prisma.bDIConfig.findFirst({
            where: { companyId, isDefault: true },
            include: { company: { select: { id: true, name: true } } }
        })

        if (!bdiConfig) {
            return { success: false, error: "Nenhuma configuração BDI padrão encontrada" }
        }

        return { success: true, data: bdiConfig }
    } catch (error) {
        console.error("Erro ao buscar configuração BDI padrão:", error)
        return { success: false, error: "Erro ao buscar configuração BDI padrão" }
    }
}
