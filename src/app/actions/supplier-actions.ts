'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"
import { assertAuthenticated, assertCompanyAccess } from "@/lib/auth-helpers"
import { logAudit } from "@/lib/audit"
import { logCreate, logUpdate, logDelete, logAction } from '@/lib/audit-logger'
import { toNumber } from "@/lib/formatters"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { getPaginationArgs, paginatedResponse, type PaginationParams } from "@/lib/pagination"
import { buildWhereClause, type FilterParams } from "@/lib/filters"

const supplierSchema = z.object({
    name: z.string().min(2, "Razão social é obrigatória"),
    tradeName: z.string().optional().nullable(),
    cnpj: z.string().optional().nullable(),
    email: z.string().email("Email inválido").optional().nullable().or(z.literal("")),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    zipCode: z.string().optional().nullable(),
    category: z.enum(['MATERIALS', 'SERVICES', 'UTILITIES', 'RENT', 'TRANSPORT', 'TECHNOLOGY', 'OTHER']).optional(),
    isActive: z.boolean().optional(),
    notes: z.string().optional().nullable(),
    companyId: z.string().uuid(),
})

export async function createSupplier(data: z.infer<typeof supplierSchema>) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Verify company access
        if (data.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const validated = supplierSchema.parse(data)

        const supplier = await prisma.supplier.create({
            data: {
                name: validated.name,
                tradeName: validated.tradeName || null,
                cnpj: validated.cnpj || null,
                email: validated.email || null,
                phone: validated.phone || null,
                address: validated.address || null,
                city: validated.city || null,
                state: validated.state || null,
                zipCode: validated.zipCode || null,
                category: validated.category || 'OTHER',
                isActive: validated.isActive ?? true,
                notes: validated.notes || null,
                companyId: validated.companyId,
            }
        })

        await logCreate('Supplier', supplier.id, supplier.name, validated)

        revalidatePath('/fornecedores')
        revalidatePath('/financeiro/fornecedores')
        return { success: true, data: supplier }
    } catch (error) {
        console.error("Erro ao criar fornecedor:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar fornecedor"
        }
    }
}

export async function updateSupplier(id: string, data: z.infer<typeof supplierSchema>) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Verify supplier belongs to user's company
        const oldData = await prisma.supplier.findUnique({
            where: { id },
        })
        if (!oldData || oldData.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const validated = supplierSchema.parse(data)

        const updated = await prisma.supplier.update({
            where: { id },
            data: {
                name: validated.name,
                tradeName: validated.tradeName || null,
                cnpj: validated.cnpj || null,
                email: validated.email || null,
                phone: validated.phone || null,
                address: validated.address || null,
                city: validated.city || null,
                state: validated.state || null,
                zipCode: validated.zipCode || null,
                category: validated.category || 'OTHER',
                isActive: validated.isActive ?? true,
                notes: validated.notes || null,
            }
        })

        await logUpdate('Supplier', id, updated.name, oldData, updated)

        revalidatePath('/fornecedores')
        revalidatePath('/financeiro/fornecedores')
        return { success: true, data: updated }
    } catch (error) {
        console.error("Erro ao atualizar fornecedor:", error)
        return { success: false, error: "Erro ao atualizar fornecedor" }
    }
}

export async function deleteSupplier(id: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Check delete permission
        if (session.user.role !== "ADMIN" && !session.user.canDelete) {
            return { success: false, error: "Sem permissão para excluir" }
        }

        // Verify supplier belongs to user's company
        const old = await prisma.supplier.findUnique({
            where: { id },
        })
        if (!old || old.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        // Check if supplier has fiscal notes linked
        const count = await prisma.fiscalNote.count({ where: { supplierId: id } })
        if (count > 0) {
            return {
                success: false,
                error: `Este fornecedor possui ${count} documento(s) vinculado(s). Remova os vínculos antes de excluir.`
            }
        }

        await prisma.supplier.delete({ where: { id } })

        await logDelete('Supplier', id, old.name, old)

        revalidatePath('/fornecedores')
        revalidatePath('/financeiro/fornecedores')
        return { success: true }
    } catch (error) {
        console.error("Erro ao deletar fornecedor:", error)
        return { success: false, error: "Erro ao deletar fornecedor" }
    }
}

export async function getSuppliers(params?: {
    companyId?: string
    pagination?: PaginationParams
    filters?: FilterParams
}) {
    try {
        const session = await getSession()
        if (!session?.user) return { success: true, data: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } }

        const { skip, take, page, pageSize } = getPaginationArgs(params?.pagination)
        const filterWhere = buildWhereClause(params?.filters || {}, ['name', 'tradeName', 'cnpj'])
        const where = {
            companyId: params?.companyId || (session.user as any).companyId,
            ...filterWhere
        }

        const [suppliers, total] = await Promise.all([
            prisma.supplier.findMany({
                where,
                skip,
                take,
                include: {
                    _count: { select: { fiscalNotes: true } }
                },
                orderBy: { name: 'asc' }
            }),
            prisma.supplier.count({ where })
        ])

        return { success: true, data: suppliers, pagination: paginatedResponse(suppliers, total, page, pageSize).pagination }
    } catch (error) {
        console.error("Erro ao buscar fornecedores:", error)
        return { success: false, data: [], error: "Erro ao buscar fornecedores", pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } }
    }
}

export async function getActiveSuppliers(companyId: string) {
    try {
        const suppliers = await prisma.supplier.findMany({
            where: { companyId, isActive: true },
            select: { id: true, name: true, tradeName: true, cnpj: true, category: true },
            orderBy: { name: 'asc' }
        })
        return suppliers
    } catch (error) {
        console.error("Erro ao buscar fornecedores ativos:", error)
        return []
    }
}

export async function getSuppliersWithScore(companyId: string) {
    try {
        const suppliers = await prisma.supplier.findMany({
            where: { companyId, isActive: true },
            select: {
                id: true,
                name: true,
                evaluations: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { score: true },
                },
            },
            orderBy: { name: 'asc' },
        })

        const result = suppliers
            .map(s => ({
                id: s.id,
                name: s.name,
                lastScore: s.evaluations.length > 0
                    ? Number(s.evaluations[0]!.score)
                    : null,
            }))
            .sort((a, b) => {
                // Fornecedores com score primeiro, ordenados do maior para o menor
                if (a.lastScore !== null && b.lastScore !== null) return b.lastScore - a.lastScore
                if (a.lastScore !== null) return -1
                if (b.lastScore !== null) return 1
                return a.name.localeCompare(b.name)
            })

        return result
    } catch (error) {
        console.error("Erro ao buscar fornecedores com score:", error)
        return []
    }
}

export async function toggleSupplierStatus(id: string, isActive: boolean) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Verify supplier belongs to user's company
        const supplier = await prisma.supplier.findUnique({
            where: { id },
            select: { companyId: true, name: true }
        })
        if (!supplier || supplier.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const updated = await prisma.supplier.update({
            where: { id },
            data: { isActive }
        })

        await logAction(isActive ? 'ACTIVATE' : 'DEACTIVATE', 'Supplier', id, supplier.name, `Status alterado para ${isActive ? 'ativo' : 'inativo'}`)

        revalidatePath('/fornecedores')
        revalidatePath('/financeiro/fornecedores')
        return { success: true, data: updated }
    } catch (error) {
        return { success: false, error: "Erro ao alterar status do fornecedor" }
    }
}

// ============================================================
// SRM Lite — Contacts
// ============================================================

export async function addSupplierContact(
    supplierId: string,
    data: { name: string; role?: string; email?: string; phone?: string; isPrimary?: boolean }
) {
    try {
        const session = await getSession()
        if (!session) return { success: false, error: "Sessão expirada" }

        // Verify supplier belongs to user's company
        const supplierCheck = await prisma.supplier.findUnique({
            where: { id: supplierId },
            select: { companyId: true }
        })
        if (!supplierCheck || supplierCheck.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        // If this contact is primary, unset any existing primary contacts
        if (data.isPrimary) {
            await prisma.supplierContact.updateMany({
                where: { supplierId, isPrimary: true },
                data: { isPrimary: false },
            })
        }

        const contact = await prisma.supplierContact.create({
            data: {
                supplierId,
                name: data.name,
                role: data.role || null,
                email: data.email || null,
                phone: data.phone || null,
                isPrimary: data.isPrimary ?? false,
            },
        })

        const supplier = await prisma.supplier.findUnique({ where: { id: supplierId }, select: { name: true, companyId: true } })
        if (supplier) {
            await logAudit({
                action: "CREATE",
                entity: "SupplierContact",
                entityId: contact.id,
                entityName: `${data.name} (${supplier.name})`,
                userId: session.user?.id ?? "",
                companyId: supplier.companyId,
            })
        }

        revalidatePath(`/fornecedores/${supplierId}`)
        return { success: true, data: contact }
    } catch (error) {
        console.error("Erro ao adicionar contato:", error)
        return { success: false, error: "Erro ao adicionar contato do fornecedor" }
    }
}

export async function removeSupplierContact(contactId: string) {
    try {
        const session = await getSession()
        if (!session) return { success: false, error: "Sessão expirada" }

        const contact = await prisma.supplierContact.findUnique({
            where: { id: contactId },
            include: { supplier: { select: { id: true, name: true, companyId: true } } },
        })
        if (!contact) return { success: false, error: "Contato não encontrado" }

        await prisma.supplierContact.delete({ where: { id: contactId } })

        await logAudit({
            action: "DELETE",
            entity: "SupplierContact",
            entityId: contactId,
            entityName: `${contact.name} (${contact.supplier.name})`,
            userId: session.user?.id ?? "",
            companyId: contact.supplier.companyId,
        })

        revalidatePath(`/fornecedores/${contact.supplierId}`)
        return { success: true }
    } catch (error) {
        console.error("Erro ao remover contato:", error)
        return { success: false, error: "Erro ao remover contato do fornecedor" }
    }
}

// ============================================================
// SRM Lite — Documents
// ============================================================

export async function uploadSupplierDocument(formData: FormData) {
    try {
        const session = await getSession()
        if (!session) return { success: false, error: "Sessão expirada" }

        const supplierId = formData.get("supplierId") as string
        const type = formData.get("type") as string
        const file = formData.get("file") as File
        const expiresAtStr = formData.get("expiresAt") as string | null

        if (!supplierId || !type || !file) {
            return { success: false, error: "Dados incompletos para upload" }
        }

        const supplier = await prisma.supplier.findUnique({
            where: { id: supplierId },
            select: { name: true, companyId: true },
        })
        if (!supplier) return { success: false, error: "Fornecedor não encontrado" }

        // Ensure upload directory
        const uploadDir = path.join(process.cwd(), "public", "uploads", "suppliers", supplierId)
        await mkdir(uploadDir, { recursive: true })

        // Save file
        const buffer = Buffer.from(await file.arrayBuffer())
        const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`
        const filePath = path.join(uploadDir, safeName)
        await writeFile(filePath, buffer)

        const relativePath = `/uploads/suppliers/${supplierId}/${safeName}`

        const doc = await prisma.supplierDocument.create({
            data: {
                supplierId,
                type: type as any,
                filename: file.name,
                filePath: relativePath,
                expiresAt: expiresAtStr ? new Date(expiresAtStr) : null,
                uploadedBy: session.user?.name ?? session.user?.email ?? "Sistema",
            },
        })

        await logAudit({
            action: "CREATE",
            entity: "SupplierDocument",
            entityId: doc.id,
            entityName: `${file.name} (${supplier.name})`,
            userId: session.user?.id ?? "",
            companyId: supplier.companyId,
        })

        revalidatePath(`/fornecedores/${supplierId}`)
        return { success: true, data: doc }
    } catch (error) {
        console.error("Erro ao fazer upload de documento:", error)
        return { success: false, error: "Erro ao fazer upload do documento" }
    }
}

// ============================================================
// SRM Lite — Evaluations
// ============================================================

export async function evaluateSupplier(
    supplierId: string,
    data: { quality: number; delivery: number; price: number; support: number; comment?: string }
) {
    try {
        const session = await getSession()
        if (!session) return { success: false, error: "Sessão expirada" }

        const score = (data.quality + data.delivery + data.price + data.support) / 4

        const evaluation = await prisma.supplierEvaluation.create({
            data: {
                supplierId,
                evaluatedBy: session.user?.id ?? "",
                score: Math.round(score * 100) / 100,
                quality: data.quality,
                delivery: data.delivery,
                price: data.price,
                support: data.support,
                comment: data.comment || null,
            },
        })

        // Update supplier rating = average of ALL evaluations
        const allEvals = await prisma.supplierEvaluation.findMany({
            where: { supplierId },
            select: { score: true },
        })
        const avgRating = allEvals.reduce((sum, e) => sum + toNumber(e.score), 0) / allEvals.length
        await prisma.supplier.update({
            where: { id: supplierId },
            data: { rating: Math.round(avgRating * 100) / 100 },
        })

        const supplier = await prisma.supplier.findUnique({
            where: { id: supplierId },
            select: { name: true, companyId: true },
        })
        if (supplier) {
            await logAudit({
                action: "CREATE",
                entity: "SupplierEvaluation",
                entityId: evaluation.id,
                entityName: `Avaliação ${supplier.name} (${score.toFixed(1)})`,
                userId: session.user?.id ?? "",
                companyId: supplier.companyId,
            })
        }

        await logCreate('SupplierEvaluation', evaluation.id, `Avaliação ${supplier?.name || 'N/A'} (${score.toFixed(1)})`, data)

        revalidatePath(`/fornecedores/${supplierId}`)
        revalidatePath('/fornecedores')
        return { success: true, data: evaluation }
    } catch (error) {
        console.error("Erro ao avaliar fornecedor:", error)
        return { success: false, error: "Erro ao registrar avaliação" }
    }
}

// ============================================================
// SRM Lite — Detail
// ============================================================

export async function getSupplierDetail(supplierId: string) {
    try {
        const session = await assertAuthenticated()

        const supplier = await prisma.supplier.findUnique({
            where: { id: supplierId },
            include: {
                contacts: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
                documents: { orderBy: { uploadedAt: 'desc' } },
                evaluations: {
                    orderBy: { createdAt: 'desc' },
                    include: { evaluator: { select: { id: true, name: true, email: true } } },
                },
                _count: { select: { fiscalNotes: true, purchaseOrders: true } },
            },
        })
        if (!supplier) return { success: false, error: "Fornecedor não encontrado" }

        if (supplier.companyId) {
            await assertCompanyAccess(session, supplier.companyId)
        }

        // Purchase orders summary
        const purchaseOrders = await prisma.purchaseOrder.findMany({
            where: { supplierId },
            select: { totalValue: true, status: true },
        })
        const poTotal = purchaseOrders.reduce((s, po) => s + toNumber(po.totalValue), 0)

        // Financial records via fiscal notes
        const fiscalNotes = await prisma.fiscalNote.findMany({
            where: { supplierId },
            select: { id: true, value: true },
        })
        const fnIds = fiscalNotes.map(fn => fn.id)
        const financialRecords = fnIds.length > 0
            ? await prisma.financialRecord.findMany({
                where: { fiscalNoteId: { in: fnIds } },
                select: { amount: true, status: true, paidDate: true },
            })
            : []
        const totalPaid = financialRecords
            .filter(fr => fr.status === 'PAID')
            .reduce((s, fr) => s + Number(fr.amount), 0)

        return {
            success: true,
            data: {
                ...supplier,
                financialSummary: {
                    purchaseOrdersCount: purchaseOrders.length,
                    purchaseOrdersTotal: poTotal,
                    financialRecordsCount: financialRecords.length,
                    totalPaid,
                },
            },
        }
    } catch (error) {
        console.error("Erro ao buscar detalhes do fornecedor:", error)
        return { success: false, error: "Erro ao buscar detalhes do fornecedor" }
    }
}

// ============================================================
// SRM Lite — Financial History
// ============================================================

export async function getSupplierFinancialHistory(supplierId: string) {
    try {
        // Purchase orders
        const purchaseOrders = await prisma.purchaseOrder.findMany({
            where: { supplierId },
            select: { id: true, number: true, totalValue: true, status: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        })

        // Financial records via fiscal notes
        const fiscalNotes = await prisma.fiscalNote.findMany({
            where: { supplierId },
            select: { id: true },
        })
        const fnIds = fiscalNotes.map(fn => fn.id)
        const financialRecords = fnIds.length > 0
            ? await prisma.financialRecord.findMany({
                where: { fiscalNoteId: { in: fnIds } },
                orderBy: { dueDate: 'desc' },
            })
            : []

        // Build monthly data (last 12 months)
        const now = new Date()
        const monthlyMap: Record<string, number> = {}
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            monthlyMap[key] = 0
        }

        // Add purchase orders to monthly data
        for (const po of purchaseOrders) {
            const d = new Date(po.createdAt)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            if (key in monthlyMap) {
                monthlyMap[key]! += toNumber(po.totalValue)
            }
        }

        // Add financial records to monthly data
        for (const fr of financialRecords) {
            if (fr.paidDate) {
                const d = new Date(fr.paidDate)
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                if (key in monthlyMap) {
                    monthlyMap[key]! += Number(fr.amount)
                }
            }
        }

        const monthlyData = Object.entries(monthlyMap).map(([month, total]) => ({
            month,
            label: formatMonthLabel(month),
            total,
        }))

        // Totals
        const allValues = [
            ...purchaseOrders.map(po => toNumber(po.totalValue)),
            ...financialRecords.filter(fr => fr.status === 'PAID').map(fr => toNumber(fr.amount)),
        ]
        const totalPaid = allValues.reduce((s, v) => s + v, 0)
        const nonZeroMonths = monthlyData.filter(m => m.total > 0)
        const averageMonthly = nonZeroMonths.length > 0 ? totalPaid / nonZeroMonths.length : 0
        const largestPurchase = allValues.length > 0 ? Math.max(...allValues) : 0

        // Build records list for the table
        const records = [
            ...purchaseOrders.map(po => ({
                id: po.id,
                date: po.createdAt,
                description: `Pedido de Compra #${po.number}`,
                value: toNumber(po.totalValue),
                status: po.status,
                source: 'PO' as const,
            })),
            ...financialRecords.map(fr => ({
                id: fr.id,
                date: fr.paidDate ?? fr.dueDate,
                description: fr.description,
                value: toNumber(fr.amount),
                status: fr.status,
                source: 'FR' as const,
            })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        return {
            success: true,
            data: {
                monthlyData,
                records,
                totals: { totalPaid, averageMonthly, largestPurchase },
            },
        }
    } catch (error) {
        console.error("Erro ao buscar histórico financeiro:", error)
        return { success: false, error: "Erro ao buscar histórico financeiro" }
    }
}

function formatMonthLabel(yearMonth: string): string {
    const [year, month] = yearMonth.split('-')
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const idx = parseInt(month!, 10) - 1
    return `${months[idx]!}/${year!.slice(2)}`
}

// ============================================================
// SRM Lite — Expiring Documents
// ============================================================

export async function getSuppliersWithExpiringDocuments(companyId: string, days: number = 30) {
    try {
        const now = new Date()
        const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

        const documents = await prisma.supplierDocument.findMany({
            where: {
                expiresAt: { lte: futureDate },
                supplier: { companyId },
            },
            include: {
                supplier: { select: { id: true, name: true } },
            },
            orderBy: { expiresAt: 'asc' },
        })

        const result = documents.map(doc => {
            const expiresAt = doc.expiresAt!
            const diffMs = expiresAt.getTime() - now.getTime()
            const daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
            return {
                id: doc.id,
                supplierId: doc.supplier.id,
                supplierName: doc.supplier.name,
                documentType: doc.type,
                filename: doc.filename,
                expiresAt,
                daysUntilExpiry,
                isExpired: daysUntilExpiry < 0,
            }
        })

        return { success: true, data: result }
    } catch (error) {
        console.error("Erro ao buscar documentos vencendo:", error)
        return { success: false, data: [], error: "Erro ao buscar documentos vencendo" }
    }
}

// ============================================================
// SRM Lite — Enhanced List Data
// ============================================================

export async function getSuppliersEnhanced(params?: { companyId?: string }) {
    try {
        const session = await getSession()
        if (!session?.user?.companyId) {
            return { success: false, data: [], kpis: null, error: "Não autenticado" }
        }

        const companyId = params?.companyId || session.user.companyId

        const suppliers = await prisma.supplier.findMany({
            where: { companyId },
            include: {
                _count: { select: { fiscalNotes: true, documents: true, evaluations: true } },
                documents: {
                    where: { expiresAt: { not: null } },
                    select: { expiresAt: true },
                },
            },
            orderBy: { name: 'asc' },
        })

        const now = new Date()
        const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

        const enhancedSuppliers = suppliers.map(s => {
            const expiringDocs = s.documents.filter(d => d.expiresAt && d.expiresAt <= thirtyDays).length
            const expiredDocs = s.documents.filter(d => d.expiresAt && d.expiresAt < now).length
            return {
                id: s.id,
                name: s.name,
                tradeName: s.tradeName,
                cnpj: s.cnpj,
                email: s.email,
                phone: s.phone,
                address: s.address,
                city: s.city,
                state: s.state,
                zipCode: s.zipCode,
                category: s.category,
                isActive: s.isActive,
                notes: s.notes,
                rating: s.rating,
                _count: s._count,
                expiringDocs,
                expiredDocs,
            }
        })

        // KPI: total paid this month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

        const supplierIds = suppliers.map(s => s.id)

        // Get fiscal note IDs for all company suppliers
        const fiscalNotes = supplierIds.length > 0
            ? await prisma.fiscalNote.findMany({
                where: { supplierId: { in: supplierIds } },
                select: { id: true },
            })
            : []
        const fnIds = fiscalNotes.map(fn => fn.id)

        const paidThisMonth = fnIds.length > 0
            ? await prisma.financialRecord.aggregate({
                where: {
                    fiscalNoteId: { in: fnIds },
                    status: 'PAID',
                    paidDate: { gte: startOfMonth, lte: endOfMonth },
                },
                _sum: { amount: true },
            })
            : { _sum: { amount: null } }

        // Expiring docs count
        const expiringDocsTotal = await prisma.supplierDocument.count({
            where: {
                supplier: { companyId },
                expiresAt: { lte: thirtyDays, gte: now },
            },
        })

        // Best rated
        const bestRated = suppliers
            .filter(s => s.rating !== null && s.isActive)
            .sort((a, b) => toNumber(b.rating ?? 0) - toNumber(a.rating ?? 0))
            .slice(0, 3)
            .map(s => ({ name: s.name, rating: s.rating }))

        return {
            success: true,
            data: enhancedSuppliers,
            kpis: {
                totalActive: suppliers.filter(s => s.isActive).length,
                expiringDocs: expiringDocsTotal,
                bestRated,
                totalPaidMonth: Number(paidThisMonth._sum.amount ?? 0),
            },
        }
    } catch (error) {
        console.error("Erro ao buscar fornecedores:", error)
        return { success: false, data: [], kpis: null, error: "Erro ao buscar fornecedores" }
    }
}
