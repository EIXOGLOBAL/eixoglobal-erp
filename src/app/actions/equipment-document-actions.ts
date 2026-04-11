'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { assertAuthenticated } from "@/lib/auth-helpers"
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'equipment-document' })

// ============================================================================
// SCHEMAS
// ============================================================================

const documentTypeEnum = z.enum(['LICENSE', 'INSURANCE', 'MANUAL', 'CERTIFICATE'])

const documentSchema = z.object({
    type: documentTypeEnum,
    filename: z.string().min(1, "Nome do arquivo é obrigatório"),
    filePath: z.string().min(1, "Caminho do arquivo é obrigatório"),
    expiresAt: z.string().optional().nullable(),
})

// ============================================================================
// EQUIPMENT DOCUMENTS
// ============================================================================

export async function createEquipmentDocument(
    equipmentId: string,
    data: z.infer<typeof documentSchema>
) {
    try {
        await assertAuthenticated()
        const validated = documentSchema.parse(data)

        const document = await prisma.equipmentDocument.create({
            data: {
                equipmentId,
                type: validated.type,
                filename: validated.filename,
                filePath: validated.filePath,
                expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
            }
        })

        revalidatePath('/equipamentos')
        revalidatePath(`/equipamentos/${equipmentId}`)
        return { success: true, data: document }
    } catch (error) {
        log.error({ err: error }, "Erro ao criar documento do equipamento")
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar documento do equipamento"
        }
    }
}

export async function updateEquipmentDocument(
    documentId: string,
    data: Partial<z.infer<typeof documentSchema>>
) {
    try {
        await assertAuthenticated()
        const document = await prisma.equipmentDocument.findUnique({
            where: { id: documentId }
        })

        if (!document) {
            return { success: false, error: "Documento não encontrado" }
        }

        const updated = await prisma.equipmentDocument.update({
            where: { id: documentId },
            data: {
                ...(data.type && { type: data.type }),
                ...(data.filename && { filename: data.filename }),
                ...(data.filePath && { filePath: data.filePath }),
                ...(data.expiresAt !== undefined && {
                    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null
                }),
            }
        })

        revalidatePath('/equipamentos')
        revalidatePath(`/equipamentos/${document.equipmentId}`)
        return { success: true, data: updated }
    } catch (error) {
        log.error({ err: error }, "Erro ao atualizar documento do equipamento")
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao atualizar documento do equipamento"
        }
    }
}

export async function deleteEquipmentDocument(documentId: string) {
    try {
        await assertAuthenticated()
        const document = await prisma.equipmentDocument.findUnique({
            where: { id: documentId }
        })

        if (!document) {
            return { success: false, error: "Documento não encontrado" }
        }

        await prisma.equipmentDocument.delete({ where: { id: documentId } })

        revalidatePath('/equipamentos')
        revalidatePath(`/equipamentos/${document.equipmentId}`)
        return { success: true }
    } catch (error) {
        log.error({ err: error }, "Erro ao deletar documento do equipamento")
        return {
            success: false,
            error: "Erro ao deletar documento do equipamento"
        }
    }
}

export async function getEquipmentDocuments(equipmentId: string, type?: string) {
    try {
        await assertAuthenticated()
        const documents = await prisma.equipmentDocument.findMany({
            where: {
                equipmentId,
                ...(type ? { type } : {}),
            },
            orderBy: { uploadedAt: 'desc' }
        })

        return documents
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar documentos do equipamento")
        return []
    }
}

export async function getEquipmentDocumentById(documentId: string) {
    try {
        await assertAuthenticated()
        const document = await prisma.equipmentDocument.findUnique({
            where: { id: documentId }
        })

        return document
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar documento do equipamento")
        return null
    }
}

export async function getExpiredDocuments(equipmentId: string) {
    try {
        await assertAuthenticated()
        const now = new Date()

        const expiredDocuments = await prisma.equipmentDocument.findMany({
            where: {
                equipmentId,
                expiresAt: {
                    lt: now,
                    not: null,
                }
            },
            orderBy: { expiresAt: 'asc' }
        })

        return expiredDocuments
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar documentos expirados")
        return []
    }
}
