'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"
import { logCreate, logUpdate, logAction } from '@/lib/audit-logger'
import { BillingStatus } from "@/lib/generated/prisma/client"
import { billingService } from "@/services/billing"

// ============================================================================
// SCHEMAS
// ============================================================================

const createBillingSchema = z.object({
    description: z.string().min(3, "Descrição deve ter pelo menos 3 caracteres"),
    value: z.number().min(0.01, "Valor deve ser maior que zero"),
    dueDate: z.string().min(1, "Data de vencimento é obrigatória"),
    projectId: z.string().uuid().optional().nullable(),
    contractId: z.string().uuid().optional().nullable(),
    clientId: z.string().uuid().optional().nullable(),
    measurementBulletinId: z.string().uuid().optional().nullable(),
    notes: z.string().optional().nullable(),
})

const updateStatusSchema = z.object({
    id: z.string().uuid(),
    status: z.enum(['DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'CANCELLED']),
    paidAmount: z.number().optional(),
})

// ============================================================================
// HELPERS
// ============================================================================

async function generateBillingNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear()
    const count = await prisma.billing.count({
        where: {
            companyId,
            createdAt: {
                gte: new Date(`${year}-01-01`),
                lt: new Date(`${year + 1}-01-01`),
            }
        }
    })
    const seq = String(count + 1).padStart(3, '0')
    return `FAT-${seq}/${year}`
}

// ============================================================================
// CRUD
// ============================================================================

export async function createBilling(data: z.infer<typeof createBillingSchema>) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }
        const companyId = (session.user as any).companyId as string
        if (!companyId) return { success: false, error: "Sem empresa vinculada" }

        const parsed = createBillingSchema.safeParse(data)
        if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
        const v = parsed.data

        const number = await generateBillingNumber(companyId)

        const billing = await prisma.billing.create({
            data: {
                number,
                description: v.description,
                value: v.value,
                status: 'DRAFT',
                dueDate: new Date(v.dueDate),
                companyId,
                createdById: session.user.id,
                projectId: v.projectId || null,
                contractId: v.contractId || null,
                clientId: v.clientId || null,
                measurementBulletinId: v.measurementBulletinId || null,
                notes: v.notes || null,
            }
        })

        // If linked to a measurement bulletin, update its billedAt
        if (v.measurementBulletinId) {
            await prisma.measurementBulletin.update({
                where: { id: v.measurementBulletinId },
                data: { billedAt: new Date() },
            })
        }

        await logCreate('Billing', billing.id, billing.number, v)

        revalidatePath('/financeiro/faturamento')
        return { success: true, data: billing }
    } catch (error) {
        console.error("Erro ao criar faturamento:", error)
        return { success: false, error: error instanceof Error ? error.message : "Erro ao criar faturamento" }
    }
}

export async function updateBillingStatus(data: z.infer<typeof updateStatusSchema>) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }
        const companyId = (session.user as any).companyId as string

        const parsed = updateStatusSchema.safeParse(data)
        if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
        const v = parsed.data

        const existing = await prisma.billing.findUnique({ where: { id: v.id } })
        if (!existing) return { success: false, error: "Faturamento não encontrado" }
        if (existing.companyId !== companyId) return { success: false, error: "Acesso negado" }

        // Validate status transitions
        const validTransitions: Record<string, string[]> = {
            DRAFT: ['ISSUED', 'CANCELLED'],
            ISSUED: ['PAID', 'OVERDUE', 'CANCELLED'],
            OVERDUE: ['PAID', 'CANCELLED'],
            PAID: [],
            CANCELLED: [],
        }

        const allowed = validTransitions[existing.status] || []
        if (!allowed.includes(v.status)) {
            return { success: false, error: `Transição de ${existing.status} para ${v.status} não é permitida` }
        }

        const updateData: Record<string, any> = {
            status: v.status as BillingStatus,
        }

        if (v.status === 'ISSUED') {
            updateData.issuedDate = new Date()
        } else if (v.status === 'PAID') {
            updateData.paidDate = new Date()
            updateData.paidAmount = v.paidAmount ?? Number(existing.value)
        }

        const updated = await prisma.billing.update({
            where: { id: v.id },
            data: updateData,
        })

        await logUpdate('Billing', v.id, existing.number, existing, updated)

        revalidatePath('/financeiro/faturamento')
        return { success: true, data: updated }
    } catch (error) {
        console.error("Erro ao atualizar status:", error)
        return { success: false, error: "Erro ao atualizar status do faturamento" }
    }
}

// ============================================================================
// QUERIES
// ============================================================================

export async function getBillingRecords(companyId: string) {
    try {
        const session = await getSession()
        if (!session?.user) return { success: true, data: [] }

        // Auto-update overdue records
        const now = new Date()
        await prisma.billing.updateMany({
            where: {
                companyId,
                status: 'ISSUED',
                dueDate: { lt: now },
            },
            data: { status: 'OVERDUE' },
        })

        const records = await prisma.billing.findMany({
            where: { companyId },
            include: {
                project: { select: { id: true, name: true } },
                contract: { select: { id: true, identifier: true } },
                client: { select: { id: true, displayName: true } },
                measurementBulletin: { select: { id: true, number: true, totalValue: true } },
                createdBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        })

        return {
            success: true,
            data: records.map(r => ({
                ...r,
                value: Number(r.value),
                paidAmount: r.paidAmount ? Number(r.paidAmount) : null,
                measurementBulletin: r.measurementBulletin ? {
                    ...r.measurementBulletin,
                    totalValue: Number(r.measurementBulletin.totalValue),
                } : null,
            })),
        }
    } catch (error) {
        console.error("Erro ao buscar faturamentos:", error)
        return { success: false, data: [], error: "Erro ao buscar faturamentos" }
    }
}

export async function getBillingSummary(companyId: string) {
    try {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

        const records = await prisma.billing.findMany({
            where: { companyId },
        })

        // Faturado no mês (ISSUED or PAID with issuedDate in current month)
        const billedThisMonth = records
            .filter(r => {
                const d = r.issuedDate || r.createdAt
                return (r.status === 'ISSUED' || r.status === 'PAID' || r.status === 'OVERDUE') &&
                    d >= startOfMonth && d <= endOfMonth
            })
            .reduce((sum, r) => sum + Number(r.value), 0)

        // A receber (ISSUED)
        const receivable = records
            .filter(r => r.status === 'ISSUED')
            .reduce((sum, r) => sum + Number(r.value), 0)

        // Vencido (OVERDUE)
        const overdue = records
            .filter(r => r.status === 'OVERDUE')
            .reduce((sum, r) => sum + Number(r.value), 0)

        // Inadimplencia rate
        const totalIssuedEver = records
            .filter(r => r.status !== 'DRAFT' && r.status !== 'CANCELLED')
            .reduce((sum, r) => sum + Number(r.value), 0)
        const defaultRate = totalIssuedEver > 0 ? (overdue / totalIssuedEver) * 100 : 0

        // Total recebido (PAID)
        const totalPaid = records
            .filter(r => r.status === 'PAID')
            .reduce((sum, r) => sum + Number(r.paidAmount ?? r.value), 0)

        return {
            success: true,
            data: {
                billedThisMonth,
                receivable,
                overdue,
                defaultRate,
                totalPaid,
                overdueCount: records.filter(r => r.status === 'OVERDUE').length,
            }
        }
    } catch (error) {
        console.error("Erro ao calcular resumo de faturamento:", error)
        return { success: false, error: "Erro ao calcular resumo" }
    }
}

export async function getBillingFormData(companyId: string) {
    try {
        const [projects, clients, contracts, bulletins] = await Promise.all([
            prisma.project.findMany({
                where: { companyId, isDeleted: false },
                select: { id: true, name: true, clientId: true },
                orderBy: { name: 'asc' },
            }),
            prisma.client.findMany({
                where: { companyId, isDeleted: false, status: 'ACTIVE' },
                select: { id: true, displayName: true },
                orderBy: { displayName: 'asc' },
            }),
            prisma.contract.findMany({
                where: { companyId, isDeleted: false, status: 'ACTIVE' },
                select: { id: true, identifier: true, projectId: true, value: true },
                orderBy: { identifier: 'asc' },
            }),
            prisma.measurementBulletin.findMany({
                where: {
                    contract: { companyId },
                    status: 'APPROVED',
                    billedAt: null,
                },
                select: { id: true, number: true, totalValue: true, projectId: true, contractId: true },
                orderBy: { createdAt: 'desc' },
            }),
        ])

        return {
            success: true,
            data: {
                projects,
                clients,
                contracts: contracts.map(c => ({ ...c, value: c.value ? Number(c.value) : null })),
                bulletins: bulletins.map(b => ({ ...b, totalValue: Number(b.totalValue) })),
            }
        }
    } catch (error) {
        console.error("Erro ao buscar dados do formulário:", error)
        return { success: false, error: "Erro ao buscar dados" }
    }
}

export async function deleteBilling(id: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }
        const companyId = (session.user as any).companyId as string

        if ((session.user as any).role !== "ADMIN" && !(session.user as any).canDelete) {
            return { success: false, error: "Sem permissão para excluir" }
        }

        const billing = await prisma.billing.findUnique({ where: { id } })
        if (!billing || billing.companyId !== companyId) {
            return { success: false, error: "Acesso negado" }
        }

        if (billing.status !== 'DRAFT') {
            return { success: false, error: "Apenas faturamentos em rascunho podem ser excluídos" }
        }

        // Unlink measurement bulletin if needed
        if (billing.measurementBulletinId) {
            await prisma.measurementBulletin.update({
                where: { id: billing.measurementBulletinId },
                data: { billedAt: null },
            })
        }

        await prisma.billing.delete({ where: { id } })

        await logAction('DELETE', 'Billing', id, billing.number, 'Faturamento excluído')

        revalidatePath('/financeiro/faturamento')
        return { success: true }
    } catch (error) {
        console.error("Erro ao excluir faturamento:", error)
        return { success: false, error: "Erro ao excluir faturamento" }
    }
}

// ============================================================================
// LEGACY: Billing via Measurements (old workflow)
// ============================================================================

const CloseBillingSchema = z.object({
    measurementIds: z.array(z.string().uuid()),
})

const EmitNoteSchema = z.object({
    noteId: z.string().uuid(),
})

export async function closeBillingAction(data: z.infer<typeof CloseBillingSchema>) {
    const session = await getSession()
    if (!session?.user) return { success: false, error: 'Não autenticado' }
    const user = session.user as { id: string; role: string; companyId: string }
    const companyId = user.companyId

    try {
        const fiscalNote = await billingService.closeBilling(data.measurementIds, user.id, companyId)

        await logAction('CLOSE_BILLING', 'FiscalNote', fiscalNote.id, fiscalNote.number || 'N/A', `Medicoes: ${data.measurementIds.join(', ')}`)

        revalidatePath("/dashboard/financeiro/faturamento")
        return { success: true, data: fiscalNote }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function emitFiscalNoteAction(data: z.infer<typeof EmitNoteSchema>) {
    const session = await getSession()
    if (!session?.user) return { success: false, error: 'Não autenticado' }
    const user = session.user as { id: string; role: string; companyId: string }
    const companyId = user.companyId

    if (user.role !== 'MANAGER') {
        return { success: false, error: "Permissao insuficiente." }
    }

    try {
        const result = await billingService.emitFiscalNote(data.noteId, companyId)

        await logAction('EMIT', 'FiscalNote', data.noteId, result.note?.number || 'N/A', 'Nota fiscal emitida')

        revalidatePath("/billing")
        return { success: true, data: result }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
