'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createNotificationForMany, createNotification } from "./notification-actions"
import { notifyUser, notifyUsers } from "@/lib/sse-notifications"
import { getSession } from "@/lib/auth"
import { assertAuthenticated } from "@/lib/auth-helpers"
import { logCreate, logUpdate, logDelete, logAction } from '@/lib/audit-logger'
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'bulletin' })

// ========================================
// SCHEMAS DE VALIDAÇÃO
// ========================================

const bulletinItemSchema = z.object({
    contractItemId: z.string().uuid(),
    currentMeasured: z.number().min(0, "Quantidade deve ser positiva"),
    description: z.string().optional(),
    budgetItemId: z.string().uuid().optional().nullable(),
})

const createBulletinSchema = z.object({
    projectId: z.string().uuid(),
    contractId: z.string().uuid(),
    referenceMonth: z.string(), // "01/2026"
    periodStart: z.string(), // ISO date
    periodEnd: z.string(), // ISO date
    items: z.array(bulletinItemSchema),
    // Additional fields from schema
    weatherConditions: z.string().optional().nullable(),
    workingDays: z.number().optional().nullable(),
    totalDirectCost: z.number().min(0).optional().nullable(),
    retentionAmount: z.number().min(0).optional().nullable(),
    netAmount: z.number().min(0).optional().nullable(),
})

const approveBulletinSchema = z.object({
    bulletinId: z.string().uuid(),
    comment: z.string().optional(),
})

const rejectBulletinSchema = z.object({
    bulletinId: z.string().uuid(),
    reason: z.string().min(10, "Justificativa deve ter no mínimo 10 caracteres"),
})

// ========================================
// HELPER: CALCULAR NÚMERO DO BOLETIM
// ========================================

async function generateBulletinNumber(projectId: string, contractId: string): Promise<string> {
    const count = await prisma.measurementBulletin.count({
        where: {
            projectId,
            contractId,
        }
    })

    const year = new Date().getFullYear()
    const number = String(count + 1).padStart(3, '0')

    return `BM-${number}/${year}`
}

// ========================================
// CREATE BULLETIN - CRIAR BOLETIM
// ========================================

export async function createMeasurementBulletin(
    userId: string,
    data: z.infer<typeof createBulletinSchema>
) {
    try {
        const validated = createBulletinSchema.parse(data)

        // Buscar contrato e itens
        const contract = await prisma.contract.findUnique({
            where: { id: validated.contractId },
            include: {
                items: true,
            }
        })

        if (!contract) {
            return { success: false, error: 'Contrato não encontrado' }
        }

        // Gerar número do boletim
        const bulletinNumber = await generateBulletinNumber(
            validated.projectId,
            validated.contractId
        )

        // LÓGICA AUTO-POPULATE: Se não vier itens, preencher com todos do contrato zerados
        let itemsToProcess = validated.items

        if (itemsToProcess.length === 0) {
            const allContractItems = await prisma.contractItem.findMany({
                where: { contractId: validated.contractId }
            })

            itemsToProcess = allContractItems.map(item => ({
                contractItemId: item.id,
                currentMeasured: 0,
                description: item.description,
            }))
        }

        // Batch: busca todos os contractItems e medições anteriores em 2 queries
        const contractItemIds = itemsToProcess.map(i => i.contractItemId)

        const [contractItemsRaw, previousItemsRaw] = await Promise.all([
            prisma.contractItem.findMany({ where: { id: { in: contractItemIds } } }),
            prisma.measurementBulletinItem.findMany({
                where: {
                    contractItemId: { in: contractItemIds },
                    bulletin: { contractId: validated.contractId, status: { not: 'REJECTED' } },
                },
                select: { contractItemId: true, currentMeasured: true },
            }),
        ])

        const contractItemById = new Map(contractItemsRaw.map(ci => [ci.id, ci]))
        const previousByItem = new Map<string, number>()
        for (const prev of previousItemsRaw) {
            previousByItem.set(
                prev.contractItemId,
                (previousByItem.get(prev.contractItemId) ?? 0) + Number(prev.currentMeasured),
            )
        }

        const bulletinItemsData = itemsToProcess.map(item => {
            const contractItem = contractItemById.get(item.contractItemId)
            if (!contractItem) {
                throw new Error(`Item de contrato ${item.contractItemId} não encontrado`)
            }
            const previousMeasured = previousByItem.get(item.contractItemId) ?? 0
            const currentMeasured = item.currentMeasured
            const accumulatedMeasured = previousMeasured + currentMeasured
            const contractedQuantity = Number(contractItem.quantity)
            const balanceQuantity = contractedQuantity - accumulatedMeasured
            const unitPrice = Number(contractItem.unitPrice)

            const currentValue = currentMeasured * unitPrice
            const accumulatedValue = accumulatedMeasured * unitPrice
            const percentageExecuted = contractedQuantity > 0
                ? (accumulatedMeasured / contractedQuantity) * 100
                : 0

            return {
                contractItemId: item.contractItemId,
                itemCode: item.description || contractItem.description,
                description: contractItem.description,
                unit: contractItem.unit,
                unitPrice,
                contractedQuantity,
                previousMeasured,
                currentMeasured,
                accumulatedMeasured,
                balanceQuantity,
                currentValue,
                accumulatedValue,
                percentageExecuted,
                budgetItemId: item.budgetItemId || null,
            }
        })

        // Calcular valor total do boletim
        const totalValue = bulletinItemsData.reduce(
            (sum, item) => sum + item.currentValue,
            0
        )

        // Criar boletim com todos os itens
        const bulletin = await prisma.measurementBulletin.create({
            data: {
                number: bulletinNumber,
                referenceMonth: validated.referenceMonth,
                periodStart: new Date(validated.periodStart),
                periodEnd: new Date(validated.periodEnd),
                totalValue,
                status: 'DRAFT', // BulletinStatus.DRAFT
                projectId: validated.projectId,
                contractId: validated.contractId,
                createdById: userId,
                items: {
                    create: bulletinItemsData,
                },
                // Additional fields
                weatherConditions: validated.weatherConditions || null,
                workingDays: validated.workingDays || null,
                totalDirectCost: validated.totalDirectCost || null,
                retentionAmount: validated.retentionAmount || null,
                netAmount: validated.netAmount || null,
            },
            include: {
                items: true,
                contract: true,
                project: true,
            }
        })

        await logCreate('MeasurementBulletin', bulletin.id, bulletin.number, validated)

        revalidatePath('/measurements')
        revalidatePath(`/projects/${validated.projectId}`)

        return { success: true, data: bulletin }

    } catch (error: any) {
        log.error({ err: error }, 'Error creating bulletin')
        return { success: false, error: error.message || 'Erro ao criar boletim' }
    }
}

// ========================================
// SUBMIT FOR APPROVAL - ENVIAR PARA APROVAÇÃO
// ========================================

export async function submitBulletinForApproval(bulletinId: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Verifica empresa e que é o autor (apenas o autor pode submeter)
        const existing = await prisma.measurementBulletin.findUnique({
            where: { id: bulletinId },
            select: { createdById: true, status: true, project: { select: { companyId: true } } }
        })
        if (!existing) return { success: false, error: "Boletim não encontrado" }
        if (existing.project.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }
        if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
            return { success: false, error: `Boletim em status ${existing.status} não pode ser submetido` }
        }
        if (existing.createdById !== session.user.id && session.user.role !== 'ADMIN') {
            return { success: false, error: "Apenas o autor (ou ADMIN) pode submeter o boletim" }
        }

        const bulletin = await prisma.measurementBulletin.update({
            where: { id: bulletinId },
            data: {
                status: 'SUBMITTED',
                submittedAt: new Date(),
            },
            select: { id: true, number: true, project: { select: { companyId: true } } }
        })

        await logAction('SUBMIT', 'MeasurementBulletin', bulletinId, bulletin.number, 'Submitted for approval')

        // Notifica engineers, managers e admins (exceto o próprio autor)
        const approvers = await prisma.user.findMany({
            where: {
                companyId: bulletin.project.companyId,
                role: { in: ['ADMIN', 'MANAGER', 'ENGINEER'] },
            },
            select: { id: true },
        })
        const approverIds = approvers.map(a => a.id).filter(id => id !== session.user!.id)
        const notifData = {
            type: 'BULLETIN_SUBMITTED',
            title: 'Boletim enviado para aprovação',
            message: `Boletim ${bulletin.number} aguarda aprovação.`,
            link: `/measurements/${bulletin.id}`,
        }
        if (approverIds.length > 0) {
            await createNotificationForMany(approverIds, notifData)
            notifyUsers(approverIds, notifData)
        }

        revalidatePath('/measurements')
        return { success: true, data: bulletin }

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao enviar para aprovação'
        log.error({ err: error }, '[submitBulletinForApproval]')
        return { success: false, error: message }
    }
}

// ========================================
// APPROVE BY ENGINEER
// ========================================

/**
 * Aprovação por engenheiro. SEMPRE deriva o userId da sessão (não confia em
 * input do cliente) e BLOQUEIA auto-aprovação (o autor do boletim não pode
 * aprová-lo).
 */
export async function approveByEngineer(data: z.infer<typeof approveBulletinSchema>) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Role: ENGINEER ou ADMIN
        if (session.user.role !== "ENGINEER" && session.user.role !== "ADMIN") {
            return { success: false, error: "Role necessária: ENGINEER ou ADMIN" }
        }

        const parsed = approveBulletinSchema.safeParse(data)
        if (!parsed.success) return { success: false, error: "Dados inválidos" }
        const validated = parsed.data

        // Verifica boletim, empresa e autoria
        const existingBulletin = await prisma.measurementBulletin.findUnique({
            where: { id: validated.bulletinId },
            select: {
                createdById: true,
                status: true,
                project: { select: { companyId: true } },
            }
        })
        if (!existingBulletin) return { success: false, error: "Boletim não encontrado" }
        if (existingBulletin.project.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        // BLOQUEIO: autor não pode auto-aprovar (segregação de funções)
        if (existingBulletin.createdById === session.user.id) {
            return {
                success: false,
                error: "Você não pode aprovar um boletim que você mesmo criou. Outro engenheiro deve aprovar.",
            }
        }

        // Status válido para aprovação de engenheiro
        if (existingBulletin.status !== 'SUBMITTED') {
            return {
                success: false,
                error: `Boletim deve estar em status SUBMITTED para aprovação do engenheiro (atual: ${existingBulletin.status})`,
            }
        }

        const userId = session.user.id

        const bulletin = await prisma.measurementBulletin.update({
            where: { id: validated.bulletinId },
            data: {
                approvedByEngineerAt: new Date(),
                engineerId: userId,
                status: 'ENGINEER_APPROVED',
            },
            select: { id: true, number: true, createdById: true, project: { select: { companyId: true } } }
        })

        await logAction('APPROVE_ENGINEER', 'MeasurementBulletin', validated.bulletinId, bulletin.number, 'Approved by engineer')

        if (validated.comment) {
            await prisma.bulletinComment.create({
                data: {
                    bulletinId: validated.bulletinId,
                    authorId: userId,
                    text: validated.comment,
                    commentType: 'APPROVAL',
                }
            })
        }

        const notifData = {
            type: 'BULLETIN_APPROVED',
            title: 'Boletim aprovado pelo engenheiro',
            message: `Boletim ${bulletin.number} foi aprovado pelo engenheiro e aguarda aprovação do gerente.`,
            link: `/measurements/${bulletin.id}`,
        }
        await createNotification({ userId: bulletin.createdById, ...notifData })
        notifyUser(bulletin.createdById, notifData)

        // Notificar gerentes que precisam aprovar
        const managers = await prisma.user.findMany({
            where: { companyId: bulletin.project.companyId, role: { in: ['ADMIN', 'MANAGER'] } },
            select: { id: true },
        })
        const managerIds = managers.map(m => m.id).filter(id => id !== userId)
        if (managerIds.length > 0) {
            await createNotificationForMany(managerIds, {
                type: 'BULLETIN_AWAITING_MANAGER',
                title: 'Boletim aguardando sua aprovação',
                message: `Boletim ${bulletin.number} foi aprovado pelo engenheiro e aguarda sua aprovação.`,
                link: `/measurements/${bulletin.id}`,
            })
            notifyUsers(managerIds, {
                type: 'BULLETIN_AWAITING_MANAGER',
                title: 'Boletim aguardando sua aprovação',
                message: `Boletim ${bulletin.number} foi aprovado pelo engenheiro e aguarda sua aprovação.`,
                link: `/measurements/${bulletin.id}`,
            })
        }

        revalidatePath('/measurements')
        return { success: true, data: bulletin }

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao aprovar boletim'
        log.error({ err: error }, '[approveByEngineer]')
        return { success: false, error: message }
    }
}

// ========================================
// APPROVE BY MANAGER (segunda etapa do workflow)
// ========================================

/**
 * Aprovação final por gerente. Bloqueia auto-aprovação E também impede que
 * o mesmo usuário que aprovou como engenheiro aprove novamente como gerente
 * (segregação de funções).
 */
export async function approveByManager(data: z.infer<typeof approveBulletinSchema>) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
            return { success: false, error: "Role necessária: MANAGER ou ADMIN" }
        }

        const parsed = approveBulletinSchema.safeParse(data)
        if (!parsed.success) return { success: false, error: "Dados inválidos" }
        const validated = parsed.data

        const existingBulletin = await prisma.measurementBulletin.findUnique({
            where: { id: validated.bulletinId },
            select: {
                createdById: true,
                engineerId: true,
                status: true,
                project: { select: { companyId: true } },
            }
        })
        if (!existingBulletin) return { success: false, error: "Boletim não encontrado" }
        if (existingBulletin.project.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        // BLOQUEIO: autor não pode auto-aprovar
        if (existingBulletin.createdById === session.user.id) {
            return {
                success: false,
                error: "Você não pode aprovar um boletim que você mesmo criou.",
            }
        }
        // BLOQUEIO: quem aprovou como engenheiro não pode também aprovar como gerente
        if (existingBulletin.engineerId === session.user.id) {
            return {
                success: false,
                error: "Você já aprovou este boletim como engenheiro. Outro gerente deve aprovar.",
            }
        }

        if (existingBulletin.status !== 'ENGINEER_APPROVED') {
            return {
                success: false,
                error: `Boletim deve estar em status ENGINEER_APPROVED (atual: ${existingBulletin.status})`,
            }
        }

        const userId = session.user.id

        const bulletin = await prisma.measurementBulletin.update({
            where: { id: validated.bulletinId },
            data: {
                approvedByManagerAt: new Date(),
                managerId: userId,
                status: 'MANAGER_APPROVED',
            },
            select: {
                id: true,
                number: true,
                createdById: true,
                totalValue: true,
                projectId: true,
                project: { select: { companyId: true, name: true } },
            }
        })

        await logAction('APPROVE_MANAGER', 'MeasurementBulletin', validated.bulletinId, bulletin.number, 'Approved by manager (final approval)')

        if (validated.comment) {
            await prisma.bulletinComment.create({
                data: {
                    bulletinId: validated.bulletinId,
                    authorId: userId,
                    text: validated.comment,
                    commentType: 'APPROVAL',
                }
            })
        }

        const notifData = {
            type: 'BULLETIN_FULLY_APPROVED',
            title: 'Boletim totalmente aprovado',
            message: `Boletim ${bulletin.number} foi totalmente aprovado e está pronto para faturamento.`,
            link: `/measurements/${bulletin.id}`,
        }
        await createNotification({ userId: bulletin.createdById, ...notifData })
        notifyUser(bulletin.createdById, notifData)

        // ── Auto-create FinancialRecord (Contas a Receber) ──
        // Failure here must NOT revert the approval already persisted above.
        try {
            const dueDate = new Date()
            dueDate.setDate(dueDate.getDate() + 30) // Prazo comercial padrão: 30 dias

            const financialRecord = await prisma.financialRecord.create({
                data: {
                    companyId: bulletin.project.companyId,
                    projectId: bulletin.projectId,
                    description: `Medição ${bulletin.number} - ${bulletin.project.name}`,
                    amount: bulletin.totalValue,
                    type: 'INCOME',
                    status: 'PENDING',
                    category: 'MEDICAO',
                    dueDate,
                },
            })

            await logCreate('FinancialRecord', financialRecord.id, `Medição ${bulletin.number}`, { bulletinId: bulletin.id, amount: bulletin.totalValue })
            revalidatePath('/financeiro')
        } catch (finError) {
            // Log but do not fail – the approval itself was already saved.
            log.error({ err: finError, context: bulletin.number }, '[approveByManager] Failed to create FinancialRecord for bulletin')
        }

        revalidatePath('/measurements')
        return { success: true, data: bulletin }

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao aprovar boletim'
        log.error({ err: error }, '[approveByManager]')
        return { success: false, error: message }
    }
}

// ========================================
// REJECT BULLETIN
// ========================================

export async function rejectBulletin(data: z.infer<typeof rejectBulletinSchema>) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // ENGINEER, MANAGER ou ADMIN podem rejeitar
        if (!['ENGINEER', 'MANAGER', 'ADMIN'].includes(session.user.role || '')) {
            return { success: false, error: "Role necessária: ENGINEER, MANAGER ou ADMIN" }
        }

        const parsed = rejectBulletinSchema.safeParse(data)
        if (!parsed.success) return { success: false, error: "Dados inválidos" }
        const validated = parsed.data

        const existingBulletin = await prisma.measurementBulletin.findUnique({
            where: { id: validated.bulletinId },
            select: { createdById: true, status: true, project: { select: { companyId: true } } }
        })
        if (!existingBulletin) return { success: false, error: "Boletim não encontrado" }
        if (existingBulletin.project.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        // Bloqueio: autor não pode auto-rejeitar (use deletar/editar)
        if (existingBulletin.createdById === session.user.id) {
            return {
                success: false,
                error: "Você não pode rejeitar um boletim que você mesmo criou. Edite ou exclua o rascunho.",
            }
        }

        // Só faz sentido rejeitar boletins em fluxo de aprovação
        if (!['SUBMITTED', 'ENGINEER_APPROVED'].includes(existingBulletin.status)) {
            return {
                success: false,
                error: `Boletim em status ${existingBulletin.status} não pode ser rejeitado`,
            }
        }

        const userId = session.user.id

        const bulletin = await prisma.measurementBulletin.update({
            where: { id: validated.bulletinId },
            data: {
                status: 'REJECTED',
                rejectedAt: new Date(),
                rejectionReason: validated.reason,
            },
            select: { id: true, number: true, createdById: true, project: { select: { companyId: true } } }
        })

        await logAction('REJECT', 'MeasurementBulletin', validated.bulletinId, bulletin.number, `Rejected: ${validated.reason}`)

        await prisma.bulletinComment.create({
            data: {
                bulletinId: validated.bulletinId,
                authorId: userId,
                text: validated.reason,
                commentType: 'REJECTION',
            }
        })

        const notifData = {
            type: 'BULLETIN_REJECTED',
            title: 'Boletim rejeitado',
            message: `Boletim ${bulletin.number} foi rejeitado: ${validated.reason}`,
            link: `/measurements/${bulletin.id}`,
        }
        await createNotification({ userId: bulletin.createdById, ...notifData })
        notifyUser(bulletin.createdById, notifData)

        revalidatePath('/measurements')
        return { success: true, data: bulletin }

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao rejeitar boletim'
        log.error({ err: error }, '[rejectBulletin]')
        return { success: false, error: message }
    }
}

// ========================================
// GET BULLETINS
// ========================================

export async function getMeasurementBulletins(projectId?: string, companyId?: string) {
    try {
        const bulletins = await prisma.measurementBulletin.findMany({
            where: {
                ...(projectId && { projectId }),
                ...(companyId && { project: { companyId } }),
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                contract: {
                    select: {
                        id: true,
                        identifier: true,
                    }
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                _count: {
                    select: {
                        items: true,
                        comments: true,
                        attachments: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return { success: true, data: bulletins }

    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao buscar boletins' }
    }
}

// ========================================
// GET BULLETIN BY ID (DETALHES COMPLETOS)
// ========================================

export async function getBulletinById(bulletinId: string) {
    try {
        const bulletin = await prisma.measurementBulletin.findUnique({
            where: { id: bulletinId },
            include: {
                project: true,
                contract: {
                    include: {
                        items: true,
                    }
                },
                items: {
                    include: {
                        contractItem: true,
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                },
                attachments: {
                    include: {
                        uploadedBy: {
                            select: {
                                name: true,
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                comments: {
                    include: {
                        author: {
                            select: {
                                name: true,
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                createdBy: {
                    select: {
                        name: true,
                    }
                },
                engineer: {
                    select: {
                        name: true,
                    }
                },
                manager: {
                    select: {
                        name: true,
                    }
                }
            }
        })

        if (!bulletin) {
            return { success: false, error: 'Boletim não encontrado' }
        }

        // Converter Decimal para Number para evitar erro em Client Components
        const data = {
            ...bulletin,
            totalValue: Number(bulletin.totalValue),
            items: bulletin.items.map(item => ({
                ...item,
                unitPrice: Number(item.unitPrice),
                contractedQuantity: Number(item.contractedQuantity),
                previousMeasured: Number(item.previousMeasured),
                currentMeasured: Number(item.currentMeasured),
                accumulatedMeasured: Number(item.accumulatedMeasured),
                balanceQuantity: Number(item.balanceQuantity),
                currentValue: Number(item.currentValue),
                accumulatedValue: Number(item.accumulatedValue),
                percentageExecuted: Number(item.percentageExecuted),
                contractItem: item.contractItem ? {
                    ...item.contractItem,
                    quantity: Number(item.contractItem.quantity),
                    unitPrice: Number(item.contractItem.unitPrice),
                } : null,
            })),
            contract: {
                ...bulletin.contract,
                value: bulletin.contract.value ? Number(bulletin.contract.value) : null,
                items: bulletin.contract.items.map(i => ({
                    ...i,
                    quantity: Number(i.quantity),
                    unitPrice: Number(i.unitPrice),
                })),
            },
        }

        return { success: true, data }

    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao buscar boletim' }
    }
}

// ========================================
// DELETE BULLETIN (APENAS RASCUNHOS)
// ========================================

export async function deleteBulletin(bulletinId: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Check delete permission
        if (session.user.role !== "ADMIN" && !session.user.canDelete) {
            return { success: false, error: "Sem permissão para excluir" }
        }

        const bulletin = await prisma.measurementBulletin.findUnique({
            where: { id: bulletinId },
            include: { project: { select: { companyId: true } } }
        })

        if (!bulletin) {
            return { success: false, error: 'Boletim não encontrado' }
        }

        // Verify company access
        if (bulletin.project.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        if (bulletin.status !== 'DRAFT') {
            return { success: false, error: 'Apenas boletins em rascunho podem ser excluídos' }
        }

        await prisma.measurementBulletin.delete({
            where: { id: bulletinId }
        })

        await logDelete('MeasurementBulletin', bulletinId, bulletin.number, bulletin)

        revalidatePath('/measurements')
        return { success: true }

    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao excluir boletim' }
    }
}

// ========================================
// UPDATE BULLETIN ITEM - SALVAR EDIÇÃO DA GRID
// ========================================

export async function updateBulletinItem(itemId: string, currentMeasured: number) {
    try {
        const item = await prisma.measurementBulletinItem.findUnique({
            where: { id: itemId },
            include: { contractItem: true, bulletin: true }
        })

        if (!item) throw new Error("Item não encontrado")

        // Validar status do boletim
        if (item.bulletin.status !== 'DRAFT' && item.bulletin.status !== 'REJECTED') {
            throw new Error('Apenas boletins em rascunho podem ser editados')
        }

        // Recalcular valores
        const unitPrice = Number(item.contractItem.unitPrice)
        const previousMeasured = Number(item.previousMeasured)
        const newAccumulated = previousMeasured + currentMeasured
        const contracted = Number(item.contractedQuantity)

        // Update item and recalculate bulletin total atomically
        await prisma.$transaction(async (tx) => {
            await tx.measurementBulletinItem.update({
                where: { id: itemId },
                data: {
                    currentMeasured: currentMeasured,
                    accumulatedMeasured: newAccumulated,
                    balanceQuantity: contracted - newAccumulated,
                    currentValue: currentMeasured * unitPrice,
                    accumulatedValue: newAccumulated * unitPrice,
                    percentageExecuted: contracted > 0 ? (newAccumulated / contracted) * 100 : 0
                }
            })

            // Atualizar total do boletim
            const allItems = await tx.measurementBulletinItem.findMany({
                where: { bulletinId: item.bulletinId }
            })

            const newTotalValue = allItems.reduce((sum, i) => sum + Number(i.currentValue), 0)

            await tx.measurementBulletin.update({
                where: { id: item.bulletinId },
                data: { totalValue: newTotalValue }
            })
        })

        await logUpdate('MeasurementBulletinItem', itemId, item.description || 'N/A', { currentMeasured: Number(item.currentMeasured) }, { currentMeasured })

        revalidatePath(`/measurements/${item.bulletinId}`)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// ========================================
// COMENTÁRIOS
// ========================================

export async function addBulletinComment(
    bulletinId: string,
    data: { text: string; commentType: 'OBSERVATION' | 'QUESTION' | 'APPROVAL' | 'REJECTION'; isInternal?: boolean }
) {
    try {
        const session = await assertAuthenticated()
        if (!data.text || data.text.trim().length < 3) {
            return { success: false, error: 'Comentário deve ter no mínimo 3 caracteres' }
        }

        const comment = await prisma.bulletinComment.create({
            data: {
                text: data.text.trim(),
                commentType: data.commentType,
                isInternal: data.isInternal ?? false,
                bulletinId,
                authorId: session.user.id,
            },
            include: {
                author: { select: { name: true } }
            }
        })

        revalidatePath(`/measurements/${bulletinId}`)
        return { success: true, data: comment }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao adicionar comentário' }
    }
}

export async function deleteBulletinComment(commentId: string) {
    try {
        const session = await assertAuthenticated()
        const comment = await prisma.bulletinComment.findUnique({ where: { id: commentId } })
        if (!comment) return { success: false, error: 'Comentário não encontrado' }
        if (comment.authorId !== session.user.id && session.user.role !== 'ADMIN') {
            return { success: false, error: 'Apenas o autor ou ADMIN pode remover' }
        }

        await prisma.bulletinComment.delete({ where: { id: commentId } })
        revalidatePath(`/measurements/${comment.bulletinId}`)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao deletar comentário' }
    }
}

// ========================================
// ANEXOS
// ========================================

export async function deleteBulletinAttachment(attachmentId: string) {
    try {
        const attachment = await prisma.bulletinAttachment.findUnique({
            where: { id: attachmentId }
        })
        if (!attachment) return { success: false, error: 'Anexo não encontrado' }

        await prisma.bulletinAttachment.delete({ where: { id: attachmentId } })
        revalidatePath(`/measurements/${attachment.bulletinId}`)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao deletar anexo' }
    }
}

export async function saveBulletinAttachment(
    bulletinId: string,
    uploadedById: string,
    fileData: { fileName: string; fileType: string; fileSize: number; fileUrl: string; description?: string }
) {
    try {
        const attachment = await prisma.bulletinAttachment.create({
            data: {
                fileName: fileData.fileName,
                fileType: fileData.fileType,
                fileSize: fileData.fileSize,
                fileUrl: fileData.fileUrl,
                description: fileData.description || null,
                bulletinId,
                uploadedById,
            },
            include: {
                uploadedBy: { select: { name: true } }
            }
        })

        revalidatePath(`/measurements/${bulletinId}`)
        return { success: true, data: attachment }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao salvar anexo' }
    }
}

export async function updateBulletin(
    bulletinId: string,
    data: {
        referenceMonth?: string
        periodStart?: string
        periodEnd?: string
    }
) {
    try {
        const bulletin = await prisma.measurementBulletin.findUnique({
            where: { id: bulletinId },
        })

        if (!bulletin) return { success: false, error: "Boletim não encontrado" }
        if (bulletin.status !== 'DRAFT') {
            return { success: false, error: "Apenas boletins em rascunho podem ser editados" }
        }

        const updated = await prisma.measurementBulletin.update({
            where: { id: bulletinId },
            data: {
                ...(data.referenceMonth && { referenceMonth: data.referenceMonth }),
                ...(data.periodStart && { periodStart: new Date(data.periodStart) }),
                ...(data.periodEnd && { periodEnd: new Date(data.periodEnd) }),
            },
        })

        await logUpdate('MeasurementBulletin', bulletinId, updated.number, bulletin, updated)

        revalidatePath('/medicoes/boletins')
        revalidatePath(`/medicoes/boletins/${bulletinId}`)
        return { success: true, data: updated }
    } catch (error) {
        log.error({ err: error }, "Erro ao atualizar boletim")
        return { success: false, error: "Erro ao atualizar boletim" }
    }
}

// ========================================
// D4SIGN - ASSINATURA DIGITAL
// ========================================

/**
 * Prepare and initialize D4Sign digital signature process for a fully approved bulletin
 * This function sets up the document for D4Sign API integration (future implementation)
 */
export async function initD4SignProcess(bulletinId: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Verify bulletin exists and is in appropriate status for signing
        const bulletin = await prisma.measurementBulletin.findUnique({
            where: { id: bulletinId },
            select: {
                id: true,
                number: true,
                status: true,
                d4signDocumentUuid: true,
                d4signStatus: true,
                project: { select: { companyId: true } },
            }
        })

        if (!bulletin) {
            return { success: false, error: 'Boletim não encontrado' }
        }

        // Verify company access
        if (bulletin.project.companyId !== session.user.companyId) {
            return { success: false, error: 'Acesso negado' }
        }

        // Only allow if bulletin is fully approved (MANAGER_APPROVED)
        if (bulletin.status !== 'MANAGER_APPROVED' && bulletin.status !== 'APPROVED') {
            return {
                success: false,
                error: 'Boletim deve estar totalmente aprovado para iniciar assinatura digital'
            }
        }

        // Check if already has a D4Sign document
        if (bulletin.d4signDocumentUuid && bulletin.d4signStatus !== 'CANCELED') {
            return {
                success: false,
                error: 'Este boletim já possui um processo de assinatura em andamento'
            }
        }

        // Prepare D4Sign data structure (stub for future API integration)
        const d4signData = {
            documentName: `Boletim-${bulletin.number.replace(/\//g, '-')}`,
            documentType: 'PDF',
            signers: [
                {
                    email: session.user.email || session.user.username || 'system',
                    name: session.user.name || 'System',
                    role: 'APPROVER'
                }
            ],
            metadata: {
                bulletinId: bulletin.id,
                bulletinNumber: bulletin.number,
                preparedAt: new Date().toISOString(),
            }
        }

        // Update bulletin to mark that D4Sign process has been initiated
        const updated = await prisma.measurementBulletin.update({
            where: { id: bulletinId },
            data: {
                d4signStatus: 'DRAFT', // Document drafted, ready for signing
                // documentUuid will be set when actual API call is made
            }
        })

        revalidatePath(`/medicoes/boletins/${bulletinId}`)

        return {
            success: true,
            data: {
                bulletin: updated,
                d4signData: d4signData, // Return structure for API integration
                message: 'D4Sign process prepared. Next: integrate with D4Sign API to upload document'
            }
        }

    } catch (error: any) {
        log.error({ err: error }, 'Error initializing D4Sign')
        return { success: false, error: error.message || 'Erro ao inicializar assinatura digital' }
    }
}

/**
 * Check and update the D4Sign signature status for a bulletin
 * This function polls the D4Sign API for signature status (future implementation)
 */
export async function checkD4SignStatus(bulletinId: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        const bulletin = await prisma.measurementBulletin.findUnique({
            where: { id: bulletinId },
            select: {
                id: true,
                number: true,
                d4signDocumentUuid: true,
                d4signStatus: true,
                d4signSignedAt: true,
                d4signSignedFileUrl: true,
                project: { select: { companyId: true } },
            }
        })

        if (!bulletin) {
            return { success: false, error: 'Boletim não encontrado' }
        }

        // Verify company access
        if (bulletin.project.companyId !== session.user.companyId) {
            return { success: false, error: 'Acesso negado' }
        }

        if (!bulletin.d4signDocumentUuid) {
            return {
                success: false,
                error: 'Este boletim não possui um processo D4Sign ativo'
            }
        }

        // Stub: In production, this would call D4Sign API to check signature status
        // Example response structure for future integration:
        const statusCheckResponse = {
            documentUuid: bulletin.d4signDocumentUuid,
            currentStatus: bulletin.d4signStatus, // DRAFT, PROCESSING, SIGNED, CANCELED
            signingProgress: 0, // 0-100%
            signedAt: bulletin.d4signSignedAt,
            signedFileUrl: bulletin.d4signSignedFileUrl,
            message: 'D4Sign status check prepared. Next: integrate with D4Sign API to fetch current status'
        }

        return {
            success: true,
            data: statusCheckResponse
        }

    } catch (error: any) {
        log.error({ err: error }, 'Error checking D4Sign status')
        return { success: false, error: error.message || 'Erro ao verificar status de assinatura' }
    }
}

// ========================================
// PUXAR QUANTIDADES DOS DIÁRIOS DE OBRA
// ========================================

/**
 * Consulta atividades dos Diários de Obra (RDOs) aprovados no período do
 * boletim que possuem vinculação com itens de contrato. Retorna as
 * quantidades agrupadas por contractItemId para facilitar o preenchimento
 * do boletim de medição.
 *
 * Fluxo esperado na UI:
 *  1. Usuário cria/abre um boletim e clica "Importar do RDO"
 *  2. Front chama esta action com projectId, contractId e período
 *  3. Retorna mapa { contractItemId -> totalQuantity } + detalhes
 *  4. Usuário revisa e confirma; front atualiza os itens do boletim
 */
export async function getDailyReportQuantitiesForBulletin(params: {
    projectId: string
    contractId: string
    periodStart: string // ISO date
    periodEnd: string   // ISO date
}) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: 'Nao autenticado' }
        const user = session.user as { id: string; role: string; companyId: string }

        // Buscar atividades de RDOs aprovados no período que tenham contractItemId
        const activities = await prisma.dailyReportActivity.findMany({
            where: {
                contractItemId: { not: null },
                quantity: { not: null },
                report: {
                    projectId: params.projectId,
                    companyId: user.companyId,
                    status: 'APPROVED',
                    date: {
                        gte: new Date(params.periodStart),
                        lte: new Date(params.periodEnd),
                    },
                },
                // Filtrar apenas itens que pertencem ao contrato informado
                contractItem: {
                    contractId: params.contractId,
                },
            },
            include: {
                contractItem: {
                    select: { id: true, description: true, unit: true, unitPrice: true, quantity: true },
                },
                report: {
                    select: { id: true, date: true, reportNumber: true },
                },
            },
            orderBy: { report: { date: 'asc' } },
        })

        // Agrupar por contractItemId
        const grouped: Record<string, {
            contractItemId: string
            description: string
            unit: string
            totalQuantity: number
            details: Array<{
                reportId: string
                reportDate: string
                reportNumber: string | null
                activityDescription: string
                quantity: number
            }>
        }> = {}

        for (const act of activities) {
            const ciId = act.contractItemId!
            if (!grouped[ciId]) {
                grouped[ciId] = {
                    contractItemId: ciId,
                    description: act.contractItem?.description ?? '',
                    unit: act.contractItem?.unit ?? '',
                    totalQuantity: 0,
                    details: [],
                }
            }
            const qty = Number(act.quantity)
            grouped[ciId].totalQuantity += qty
            grouped[ciId].details.push({
                reportId: act.report.id,
                reportDate: act.report.date.toISOString(),
                reportNumber: act.report.reportNumber,
                activityDescription: act.description,
                quantity: qty,
            })
        }

        return {
            success: true,
            data: Object.values(grouped),
        }

    } catch (error: any) {
        log.error({ err: error }, '[getDailyReportQuantitiesForBulletin]')
        return { success: false, error: error.message || 'Erro ao buscar quantidades dos RDOs' }
    }
}
