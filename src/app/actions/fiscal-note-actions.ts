'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"
import { logCreate, logUpdate, logDelete, logAction } from '@/lib/audit-logger'
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'fiscal-note' })

const fiscalNoteSchema = z.object({
    number: z.string().min(1, "Número é obrigatório"),
    series: z.string().optional().nullable(),
    type: z.enum([
        'NFE', 'NFSE', 'CTE',
        'FATURA', 'RECIBO',
        'CONTA_ENERGIA', 'CONTA_AGUA', 'CONTA_TELEFONE', 'CONTA_INTERNET',
        'ALUGUEL', 'OUTRO'
    ]),
    description: z.string().optional().nullable(),
    issuedDate: z.string(),
    dueDate: z.string().optional().nullable(),
    value: z.number().min(0, "Valor não pode ser negativo"),
    status: z.enum(['DRAFT', 'ISSUED', 'CANCELLED', 'DENIED']).optional(),
    accessKey: z.string().optional().nullable(),
    supplierId: z.string().uuid().optional().nullable(),
    companyId: z.string().uuid(),
    projectId: z.string().uuid().optional().nullable(),
    costCenterId: z.string().uuid().optional().nullable(),
})

export async function createFiscalNote(data: z.infer<typeof fiscalNoteSchema>) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Verify company access
        if (data.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const validated = fiscalNoteSchema.parse(data)

        const note = await prisma.fiscalNote.create({
            data: {
                number: validated.number,
                series: validated.series || null,
                type: validated.type,
                description: validated.description || null,
                issuedDate: new Date(validated.issuedDate),
                dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
                value: validated.value,
                status: validated.status || 'ISSUED',
                accessKey: validated.accessKey || null,
                supplierId: validated.supplierId || null,
                companyId: validated.companyId,
                projectId: validated.projectId || null,
                costCenterId: validated.costCenterId || null,
            },
            include: {
                supplier: { select: { id: true, name: true } }
            }
        })

        await logCreate('FiscalNote', note.id, note.number || 'N/A', validated)

        revalidatePath('/financeiro/notas')
        return { success: true, data: { ...note, value: Number(note.value) } }
    } catch (error) {
        log.error({ err: error }, "Erro ao criar nota fiscal")
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar nota fiscal"
        }
    }
}

export async function updateFiscalNote(id: string, data: z.infer<typeof fiscalNoteSchema>) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Verify note belongs to user's company
        const note = await prisma.fiscalNote.findUnique({
            where: { id },
        })
        if (!note || note.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const validated = fiscalNoteSchema.parse(data)

        const updatedNote = await prisma.fiscalNote.update({
            where: { id },
            data: {
                number: validated.number,
                series: validated.series || null,
                type: validated.type,
                description: validated.description || null,
                issuedDate: new Date(validated.issuedDate),
                dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
                value: validated.value,
                status: validated.status || 'ISSUED',
                accessKey: validated.accessKey || null,
                supplierId: validated.supplierId || null,
                projectId: validated.projectId || null,
                costCenterId: validated.costCenterId || null,
            },
            include: {
                supplier: { select: { id: true, name: true } }
            }
        })

        await logUpdate('FiscalNote', id, updatedNote.number || 'N/A', note, updatedNote)

        revalidatePath('/financeiro/notas')
        return { success: true, data: { ...updatedNote, value: Number(updatedNote.value) } }
    } catch (error) {
        log.error({ err: error }, "Erro ao atualizar nota fiscal")
        return { success: false, error: "Erro ao atualizar nota fiscal" }
    }
}

export async function updateFiscalNoteStatus(id: string, status: 'DRAFT' | 'ISSUED' | 'CANCELLED' | 'DENIED') {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Verify note belongs to user's company
        const note = await prisma.fiscalNote.findUnique({
            where: { id },
        })
        if (!note || note.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const updated = await prisma.fiscalNote.update({
            where: { id },
            data: { status }
        })

        await logAction('STATUS_CHANGE', 'FiscalNote', id, updated.number || 'N/A', `${note.status} -> ${status}`)

        revalidatePath('/financeiro/notas')
        return { success: true, data: { ...updated, value: Number(updated.value) } }
    } catch (error) {
        log.error({ err: error }, "Erro ao atualizar status da nota")
        return { success: false, error: "Erro ao atualizar nota fiscal" }
    }
}

export async function deleteFiscalNote(id: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Check delete permission
        if (session.user.role !== "ADMIN" && !session.user.canDelete) {
            return { success: false, error: "Sem permissão para excluir" }
        }

        const note = await prisma.fiscalNote.findUnique({ where: { id } })
        if (!note) return { success: false, error: "Nota não encontrada" }

        // Verify company access
        if (note.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        if (note.status === 'ISSUED') return {
            success: false,
            error: "Não é possível excluir um documento emitido. Cancele primeiro."
        }

        await prisma.fiscalNote.delete({ where: { id } })

        await logDelete('FiscalNote', id, note.number || 'N/A', note)

        revalidatePath('/financeiro/notas')
        return { success: true }
    } catch (error) {
        log.error({ err: error }, "Erro ao deletar nota fiscal")
        return { success: false, error: "Erro ao deletar nota fiscal" }
    }
}

export async function getFiscalNotes(companyId: string) {
    try {
        const notes = await prisma.fiscalNote.findMany({
            where: { companyId },
            include: {
                supplier: { select: { id: true, name: true } }
            },
            orderBy: { issuedDate: 'desc' },
            take: 300,
        })

        return notes.map(n => ({ ...n, value: Number(n.value) }))
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar notas fiscais")
        return []
    }
}

export async function getFiscalNoteSummary(companyId: string) {
    try {
        const notes = await prisma.fiscalNote.findMany({ where: { companyId } })

        const totalIssued = notes.filter(n => n.status === 'ISSUED').length
        const totalValue = notes
            .filter(n => n.status === 'ISSUED')
            .reduce((sum, n) => sum + Number(n.value), 0)
        const totalCancelled = notes.filter(n => n.status === 'CANCELLED').length
        const totalDraft = notes.filter(n => n.status === 'DRAFT').length

        // Group by type
        const byType: Record<string, number> = {}
        notes.filter(n => n.status === 'ISSUED').forEach(n => {
            byType[n.type] = (byType[n.type] || 0) + 1
        })

        return {
            success: true,
            data: { totalIssued, totalValue, totalCancelled, totalDraft, total: notes.length, byType }
        }
    } catch (error) {
        return { success: false, error: "Erro ao calcular resumo" }
    }
}

export async function getFiscalNoteById(id: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        const note = await prisma.fiscalNote.findUnique({
            where: { id },
            include: {
                supplier: { select: { id: true, name: true, cnpj: true } },
                project: { select: { id: true, name: true } },
                costCenter: { select: { id: true, code: true, name: true } },
                measurements: { select: { id: true, quantity: true, date: true, status: true } },
            },
        })
        if (!note) return { success: false, error: "Nota fiscal não encontrada" }

        // Verify company access
        if (note.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        return { success: true, data: { ...note, value: Number(note.value) } }
    } catch (error) {
        log.error({ err: error }, "Erro ao buscar nota fiscal")
        return { success: false, error: "Erro ao buscar nota fiscal" }
    }
}
