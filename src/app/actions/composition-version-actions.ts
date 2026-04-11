'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { assertAuthenticated } from "@/lib/auth-helpers"

const compositionVersionSchema = z.object({
    compositionId: z.string().uuid("ID da composição inválido"),
    createdBy: z.string().min(1, "Criador é obrigatório"),
})

export async function createCompositionVersion(data: z.infer<typeof compositionVersionSchema>) {
    try {
        await assertAuthenticated()
        const validated = compositionVersionSchema.parse(data)

        // Verify composition exists
        const composition = await prisma.costComposition.findUnique({
            where: { id: validated.compositionId }
        })

        if (!composition) {
            return { success: false, error: "Composição não encontrada" }
        }

        // Get the next version number
        const lastVersion = await prisma.compositionVersion.findFirst({
            where: { compositionId: validated.compositionId },
            orderBy: { version: 'desc' },
            select: { version: true }
        })

        const nextVersion = (lastVersion?.version ?? 0) + 1

        const version = await prisma.compositionVersion.create({
            data: {
                compositionId: validated.compositionId,
                version: nextVersion,
                createdBy: validated.createdBy,
            },
            include: {
                composition: { select: { id: true, code: true, description: true } }
            }
        })

        revalidatePath('/composicoes')
        return { success: true, data: version }
    } catch (error) {
        console.error("Erro ao criar versão de composição:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar versão de composição",
        }
    }
}

export async function deleteCompositionVersion(id: string) {
    try {
        await assertAuthenticated()
        const version = await prisma.compositionVersion.findUnique({
            where: { id },
            select: { compositionId: true }
        })

        if (!version) {
            return { success: false, error: "Versão não encontrada" }
        }

        // Check if this is the only version for the composition
        const versionCount = await prisma.compositionVersion.count({
            where: { compositionId: version.compositionId }
        })

        if (versionCount === 1) {
            return { success: false, error: "Não é possível deletar a única versão da composição" }
        }

        await prisma.compositionVersion.delete({ where: { id } })
        revalidatePath('/composicoes')
        return { success: true }
    } catch (error) {
        console.error("Erro ao deletar versão de composição:", error)
        return { success: false, error: "Erro ao deletar versão de composição" }
    }
}

export async function getCompositionVersions(compositionId: string) {
    try {
        await assertAuthenticated()
        // Verify composition exists
        const composition = await prisma.costComposition.findUnique({
            where: { id: compositionId }
        })

        if (!composition) {
            return { success: false, error: "Composição não encontrada" }
        }

        const versions = await prisma.compositionVersion.findMany({
            where: { compositionId },
            include: {
                composition: { select: { id: true, code: true, description: true } }
            },
            orderBy: { version: 'desc' }
        })

        return { success: true, data: versions }
    } catch (error) {
        console.error("Erro ao buscar versões de composição:", error)
        return { success: false, error: "Erro ao buscar versões de composição" }
    }
}

export async function getCompositionVersionById(id: string) {
    try {
        await assertAuthenticated()
        const version = await prisma.compositionVersion.findUnique({
            where: { id },
            include: {
                composition: { select: { id: true, code: true, description: true } }
            }
        })

        if (!version) {
            return { success: false, error: "Versão de composição não encontrada" }
        }

        return { success: true, data: version }
    } catch (error) {
        console.error("Erro ao buscar versão de composição:", error)
        return { success: false, error: "Erro ao buscar versão de composição" }
    }
}

export async function getLatestCompositionVersion(compositionId: string) {
    try {
        await assertAuthenticated()
        // Verify composition exists
        const composition = await prisma.costComposition.findUnique({
            where: { id: compositionId }
        })

        if (!composition) {
            return { success: false, error: "Composição não encontrada" }
        }

        const version = await prisma.compositionVersion.findFirst({
            where: { compositionId },
            orderBy: { version: 'desc' },
            include: {
                composition: { select: { id: true, code: true, description: true } }
            }
        })

        if (!version) {
            return { success: false, error: "Nenhuma versão encontrada para esta composição" }
        }

        return { success: true, data: version }
    } catch (error) {
        console.error("Erro ao buscar última versão de composição:", error)
        return { success: false, error: "Erro ao buscar última versão de composição" }
    }
}

export async function getCompositionVersionByNumber(compositionId: string, versionNumber: number) {
    try {
        await assertAuthenticated()
        // Verify composition exists
        const composition = await prisma.costComposition.findUnique({
            where: { id: compositionId }
        })

        if (!composition) {
            return { success: false, error: "Composição não encontrada" }
        }

        const version = await prisma.compositionVersion.findFirst({
            where: {
                compositionId,
                version: versionNumber
            },
            include: {
                composition: { select: { id: true, code: true, description: true } }
            }
        })

        if (!version) {
            return { success: false, error: "Versão não encontrada" }
        }

        return { success: true, data: version }
    } catch (error) {
        console.error("Erro ao buscar versão de composição:", error)
        return { success: false, error: "Erro ao buscar versão de composição" }
    }
}

export async function getCompositionVersionCount(compositionId: string) {
    try {
        await assertAuthenticated()
        const count = await prisma.compositionVersion.count({
            where: { compositionId }
        })

        return { success: true, data: count }
    } catch (error) {
        console.error("Erro ao contar versões de composição:", error)
        return { success: false, error: "Erro ao contar versões de composição" }
    }
}
