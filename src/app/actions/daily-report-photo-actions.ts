'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { assertAuthenticated } from "@/lib/auth-helpers"
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'daily-report-photo' })

// ============================================================================
// SCHEMAS
// ============================================================================

const photoSchema = z.object({
    filename: z.string().min(1, "Nome do arquivo é obrigatório"),
    filePath: z.string().min(1, "Caminho do arquivo é obrigatório"),
    description: z.string().optional().nullable(),
})

// ============================================================================
// DAILY REPORT PHOTOS
// ============================================================================

export async function createDailyReportPhoto(
    reportId: string,
    data: z.infer<typeof photoSchema>
) {
    try {
        await assertAuthenticated()
        const validated = photoSchema.parse(data)

        const photo = await prisma.dailyReportPhoto.create({
            data: {
                reportId,
                filename: validated.filename,
                filePath: validated.filePath,
                description: validated.description ?? null,
            }
        })

        revalidatePath('/rdo')
        revalidatePath(`/rdo/${reportId}`)
        return { success: true, data: photo }
    } catch (error) {
        log.error({ err: error }, "Erro ao criar foto do RDO")
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar foto do RDO"
        }
    }
}

export async function updateDailyReportPhoto(
    photoId: string,
    data: Partial<z.infer<typeof photoSchema>>
) {
    try {
        await assertAuthenticated()
        const photo = await prisma.dailyReportPhoto.findUnique({
            where: { id: photoId }
        })

        if (!photo) {
            return { success: false, error: "Foto não encontrada" }
        }

        const updated = await prisma.dailyReportPhoto.update({
            where: { id: photoId },
            data: {
                ...(data.filename && { filename: data.filename }),
                ...(data.filePath && { filePath: data.filePath }),
                ...(data.description !== undefined && { description: data.description }),
            }
        })

        revalidatePath('/rdo')
        revalidatePath(`/rdo/${photo.reportId}`)
        return { success: true, data: updated }
    } catch (error) {
        log.error({ err: error }, "Erro ao atualizar foto do RDO")
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao atualizar foto do RDO"
        }
    }
}

export async function deleteDailyReportPhoto(photoId: string) {
    try {
        await assertAuthenticated()
        const photo = await prisma.dailyReportPhoto.findUnique({
            where: { id: photoId }
        })

        if (!photo) {
            return { success: false, error: "Foto não encontrada" }
        }

        await prisma.dailyReportPhoto.delete({ where: { id: photoId } })

        revalidatePath('/rdo')
        revalidatePath(`/rdo/${photo.reportId}`)
        return { success: true }
    } catch (error) {
        log.error({ err: error }, "Erro ao deletar foto do RDO")
        return {
            success: false,
            error: "Erro ao deletar foto do RDO"
        }
    }
}

export async function getDailyReportPhotos(reportId: string) {
    try {
        await assertAuthenticated()
        const photos = await prisma.dailyReportPhoto.findMany({
            where: { reportId },
            orderBy: { uploadedAt: 'desc' }
        })

        return photos
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar fotos do RDO")
        return []
    }
}

export async function getDailyReportPhotoById(photoId: string) {
    try {
        await assertAuthenticated()
        const photo = await prisma.dailyReportPhoto.findUnique({
            where: { id: photoId }
        })

        return photo
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar foto do RDO")
        return null
    }
}
