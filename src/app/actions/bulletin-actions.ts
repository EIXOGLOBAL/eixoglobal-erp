'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createNotificationForMany, createNotification } from "./notification-actions"
import { notifyUser, notifyUsers } from "@/lib/sse-notifications"

// ========================================
// SCHEMAS DE VALIDAÇÃO
// ========================================

const bulletinItemSchema = z.object({
    contractItemId: z.string().uuid(),
    currentMeasured: z.number().min(0, "Quantidade deve ser positiva"),
    description: z.string().optional(),
})

const createBulletinSchema = z.object({
    projectId: z.string().uuid(),
    contractId: z.string().uuid(),
    referenceMonth: z.string(), // "01/2026"
    periodStart: z.string(), // ISO date
    periodEnd: z.string(), // ISO date
    items: z.array(bulletinItemSchema),
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

        // Calcular valores dos itens
        const bulletinItemsData = await Promise.all(
            itemsToProcess.map(async (item) => {
                const contractItem = await prisma.contractItem.findUnique({
                    where: { id: item.contractItemId }
                })

                if (!contractItem) {
                    throw new Error(`Item de contrato ${item.contractItemId} não encontrado`)
                }

                // Buscar medições anteriores deste item
                const previousBulletinItems = await prisma.measurementBulletinItem.findMany({
                    where: {
                        contractItemId: item.contractItemId,
                        bulletin: {
                            contractId: validated.contractId,
                            status: { not: 'REJECTED' }
                        }
                    }
                })

                const previousMeasured = previousBulletinItems.reduce(
                    (sum, bi) => sum + Number(bi.currentMeasured),
                    0
                )

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
                }
            })
        )

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
                status: 'DRAFT',
                projectId: validated.projectId,
                contractId: validated.contractId,
                createdById: userId,
                items: {
                    create: bulletinItemsData,
                }
            },
            include: {
                items: true,
                contract: true,
                project: true,
            }
        })

        revalidatePath('/measurements')
        revalidatePath(`/projects/${validated.projectId}`)

        return { success: true, data: bulletin }

    } catch (error: any) {
        console.error('Error creating bulletin:', error)
        return { success: false, error: error.message || 'Erro ao criar boletim' }
    }
}

// ========================================
// SUBMIT FOR APPROVAL - ENVIAR PARA APROVAÇÃO
// ========================================

export async function submitBulletinForApproval(bulletinId: string, userId: string) {
    try {
        const bulletin = await prisma.measurementBulletin.update({
            where: { id: bulletinId },
            data: {
                status: 'PENDING_APPROVAL',
                submittedAt: new Date(),
            },
            select: { id: true, number: true, project: { select: { companyId: true } } }
        })

        // Notify ADMIN/MANAGER about the submission
        const managers = await prisma.user.findMany({
            where: { companyId: bulletin.project.companyId, role: { in: ['ADMIN', 'MANAGER'] } },
            select: { id: true },
        })
        const managerIds = managers.map(m => m.id)
        const notifData = {
            type: 'BULLETIN_SUBMITTED',
            title: 'Boletim enviado para aprovação',
            message: `Boletim ${bulletin.number} aguarda aprovação.`,
            link: `/measurements/${bulletin.id}`,
        }
        await createNotificationForMany({ userIds: managerIds, companyId: bulletin.project.companyId, ...notifData })
        notifyUsers(managerIds, notifData)

        revalidatePath('/measurements')
        return { success: true, data: bulletin }

    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao enviar para aprovação' }
    }
}

// ========================================
// APPROVE BY ENGINEER
// ========================================

export async function approveByEngineer(data: z.infer<typeof approveBulletinSchema>, userId: string) {
    try {
        const validated = approveBulletinSchema.parse(data)

        const bulletin = await prisma.measurementBulletin.update({
            where: { id: validated.bulletinId },
            data: {
                approvedByEngineerAt: new Date(),
                engineerId: userId,
                status: 'APPROVED',
            },
            select: { id: true, number: true, createdById: true, project: { select: { companyId: true } } }
        })

        // Adicionar comentário se fornecido
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

        // Notify the bulletin creator
        const notifData = {
            type: 'BULLETIN_APPROVED',
            title: 'Boletim aprovado',
            message: `Boletim ${bulletin.number} foi aprovado.`,
            link: `/measurements/${bulletin.id}`,
        }
        await createNotification({ userId: bulletin.createdById, companyId: bulletin.project.companyId, ...notifData })
        notifyUser(bulletin.createdById, notifData)

        revalidatePath('/measurements')
        return { success: true, data: bulletin }

    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao aprovar boletim' }
    }
}

// ========================================
// REJECT BULLETIN
// ========================================

export async function rejectBulletin(data: z.infer<typeof rejectBulletinSchema>, userId: string) {
    try {
        const validated = rejectBulletinSchema.parse(data)

        const bulletin = await prisma.measurementBulletin.update({
            where: { id: validated.bulletinId },
            data: {
                status: 'REJECTED',
                rejectedAt: new Date(),
                rejectionReason: validated.reason,
            },
            select: { id: true, number: true, createdById: true, project: { select: { companyId: true } } }
        })

        // Adicionar comentário de rejeição
        await prisma.bulletinComment.create({
            data: {
                bulletinId: validated.bulletinId,
                authorId: userId,
                text: validated.reason,
                commentType: 'REJECTION',
            }
        })

        // Notify the bulletin creator
        const notifData = {
            type: 'BULLETIN_REJECTED',
            title: 'Boletim rejeitado',
            message: `Boletim ${bulletin.number} foi rejeitado: ${validated.reason}`,
            link: `/measurements/${bulletin.id}`,
        }
        await createNotification({ userId: bulletin.createdById, companyId: bulletin.project.companyId, ...notifData })
        notifyUser(bulletin.createdById, notifData)

        revalidatePath('/measurements')
        return { success: true, data: bulletin }

    } catch (error: any) {
        return { success: false, error: error.message || 'Erro ao rejeitar boletim' }
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
        const bulletin = await prisma.measurementBulletin.findUnique({
            where: { id: bulletinId }
        })

        if (!bulletin) {
            return { success: false, error: 'Boletim não encontrado' }
        }

        if (bulletin.status !== 'DRAFT') {
            return { success: false, error: 'Apenas boletins em rascunho podem ser excluídos' }
        }

        await prisma.measurementBulletin.delete({
            where: { id: bulletinId }
        })

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

        const updatedItem = await prisma.measurementBulletinItem.update({
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
        const allItems = await prisma.measurementBulletinItem.findMany({
            where: { bulletinId: item.bulletinId }
        })

        const newTotalValue = allItems.reduce((sum, i) => sum + Number(i.currentValue), 0)

        await prisma.measurementBulletin.update({
            where: { id: item.bulletinId },
            data: { totalValue: newTotalValue }
        })

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
    authorId: string,
    data: { text: string; commentType: 'OBSERVATION' | 'QUESTION' | 'APPROVAL' | 'REJECTION'; isInternal?: boolean }
) {
    try {
        if (!data.text || data.text.trim().length < 3) {
            return { success: false, error: 'Comentário deve ter no mínimo 3 caracteres' }
        }

        const comment = await prisma.bulletinComment.create({
            data: {
                text: data.text.trim(),
                commentType: data.commentType,
                isInternal: data.isInternal ?? false,
                bulletinId,
                authorId,
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
        const comment = await prisma.bulletinComment.findUnique({ where: { id: commentId } })
        if (!comment) return { success: false, error: 'Comentário não encontrado' }

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
