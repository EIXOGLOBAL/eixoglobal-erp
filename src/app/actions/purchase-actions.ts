'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { PurchaseOrderStatus } from "@/lib/generated/prisma/client"
import { createNotificationForMany } from "./notification-actions"
import { notifyUsers } from "@/lib/sse-notifications"
import { toNumber } from "@/lib/formatters"
import { getSession } from "@/lib/auth"
import { getPaginationArgs, paginatedResponse, type PaginationParams } from "@/lib/pagination"
import { buildWhereClause, type FilterParams } from "@/lib/filters"
import { logCreate, logUpdate, logDelete, logAction } from '@/lib/audit-logger'

// ============================================================================
// SCHEMAS
// ============================================================================

const orderSchema = z.object({
    supplierId: z.string().optional().nullable(),
    projectId: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    expectedAt: z.string().optional().nullable(),
    costCenterId: z.string().uuid().optional().nullable(),
})

const itemSchema = z.object({
    description: z.string().min(1, "Descrição é obrigatória"),
    unit: z.string().min(1, "Unidade é obrigatória"),
    quantity: z.coerce.number().min(0.001, "Quantidade deve ser maior que zero"),
    unitPrice: z.coerce.number().min(0, "Preço não pode ser negativo"),
    materialId: z.string().optional().nullable(),
})

// ============================================================================
// PEDIDOS DE COMPRA
// ============================================================================

export async function createPurchaseOrder(
    data: z.infer<typeof orderSchema>,
    companyId: string
) {
    try {
        const validated = orderSchema.parse(data)

        const number = `PC-${Date.now()}`

        const order = await prisma.purchaseOrder.create({
            data: {
                number,
                companyId,
                supplierId: validated.supplierId || null,
                projectId: validated.projectId || null,
                notes: validated.notes || null,
                expectedAt: validated.expectedAt ? new Date(validated.expectedAt) : null,
                status: 'DRAFT',
                totalValue: 0,
                costCenterId: validated.costCenterId || null,
            }
        })

        await logCreate('PurchaseOrder', order.id, order.number, validated)

        revalidatePath('/compras')
        return { success: true, data: order }
    } catch (error) {
        console.error("Erro ao criar pedido de compra:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar pedido de compra"
        }
    }
}

export async function updatePurchaseOrder(id: string, data: z.infer<typeof orderSchema>) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Verify order belongs to user's company
        const oldOrder = await prisma.purchaseOrder.findUnique({
            where: { id },
        })
        if (!oldOrder || oldOrder.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const validated = orderSchema.parse(data)

        const updated = await prisma.purchaseOrder.update({
            where: { id },
            data: {
                supplierId: validated.supplierId || null,
                projectId: validated.projectId || null,
                notes: validated.notes || null,
                expectedAt: validated.expectedAt ? new Date(validated.expectedAt) : null,
                costCenterId: validated.costCenterId || null,
            }
        })

        await logUpdate('PurchaseOrder', id, updated.number, oldOrder, updated)

        revalidatePath('/compras')
        revalidatePath(`/compras/${id}`)
        return { success: true, data: updated }
    } catch (error) {
        console.error("Erro ao atualizar pedido de compra:", error)
        return {
            success: false,
            error: "Erro ao atualizar pedido de compra"
        }
    }
}

export async function deletePurchaseOrder(id: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Check delete permission
        if (session.user.role !== "ADMIN" && !session.user.canDelete) {
            return { success: false, error: "Sem permissão para excluir" }
        }

        const order = await prisma.purchaseOrder.findUnique({ where: { id } })

        if (!order) {
            return { success: false, error: "Pedido não encontrado" }
        }

        // Verify company access
        if (order.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        if (order.status !== 'DRAFT') {
            return {
                success: false,
                error: "Apenas pedidos em Rascunho podem ser excluídos"
            }
        }

        await prisma.purchaseOrder.delete({ where: { id } })

        await logDelete('PurchaseOrder', id, order.number, order)

        revalidatePath('/compras')
        return { success: true }
    } catch (error) {
        console.error("Erro ao deletar pedido de compra:", error)
        return {
            success: false,
            error: "Erro ao deletar pedido de compra"
        }
    }
}

export async function getPurchaseOrders(params?: {
    companyId?: string
    pagination?: PaginationParams
    filters?: FilterParams
}) {
    try {
        const session = await getSession()
        if (!session?.user) return { success: true, data: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } }

        const { skip, take, page, pageSize } = getPaginationArgs(params?.pagination)
        const filterWhere = buildWhereClause(params?.filters || {}, ['number', 'notes'])
        const where = {
            companyId: params?.companyId || (session.user as any).companyId,
            ...filterWhere
        }

        const [orders, total] = await Promise.all([
            prisma.purchaseOrder.findMany({
                where,
                skip,
                take,
                include: {
                    supplier: {
                        select: { id: true, name: true }
                    },
                    project: {
                        select: { id: true, name: true }
                    },
                    _count: {
                        select: { items: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.purchaseOrder.count({ where })
        ])

        return { success: true, data: orders, pagination: paginatedResponse(orders, total, page, pageSize).pagination }
    } catch (error) {
        console.error("Erro ao buscar pedidos de compra:", error)
        return { success: false, error: "Erro ao buscar pedidos de compra", data: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } }
    }
}

export async function getPurchaseOrderById(id: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return null

        const order = await prisma.purchaseOrder.findUnique({
            where: { id },
            include: {
                supplier: true,
                project: {
                    select: { id: true, name: true }
                },
                items: {
                    include: {
                        material: {
                            select: { id: true, name: true, unit: true }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            }
        })

        // Verify company access
        if (!order || order.companyId !== session.user.companyId) {
            return null
        }

        return order
    } catch (error) {
        console.error("Erro ao buscar pedido de compra:", error)
        return null
    }
}

// ============================================================================
// ITENS DO PEDIDO
// ============================================================================

async function recalculateTotalValue(purchaseOrderId: string) {
    const items = await prisma.purchaseOrderItem.findMany({
        where: { purchaseOrderId },
        select: { totalPrice: true }
    })
    const totalValue = items.reduce((sum, item) => sum + toNumber(item.totalPrice), 0)
    await prisma.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { totalValue }
    })
    return totalValue
}

export async function addOrderItem(orderId: string, data: z.infer<typeof itemSchema>) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Verify order belongs to user's company
        const order = await prisma.purchaseOrder.findUnique({
            where: { id: orderId },
            select: { companyId: true }
        })
        if (!order || order.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const validated = itemSchema.parse(data)
        const totalPrice = validated.quantity * validated.unitPrice

        const item = await prisma.purchaseOrderItem.create({
            data: {
                purchaseOrderId: orderId,
                description: validated.description,
                unit: validated.unit,
                quantity: validated.quantity,
                unitPrice: validated.unitPrice,
                totalPrice,
                materialId: validated.materialId || null,
            }
        })

        await logCreate('PurchaseOrderItem', item.id, item.description, validated)

        await recalculateTotalValue(orderId)

        revalidatePath('/compras')
        revalidatePath(`/compras/${orderId}`)
        return { success: true, data: item }
    } catch (error) {
        console.error("Erro ao adicionar item:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao adicionar item"
        }
    }
}

export async function updateOrderItem(itemId: string, data: z.infer<typeof itemSchema>) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Verify item belongs to user's company
        const existing = await prisma.purchaseOrderItem.findUnique({
            where: { id: itemId },
            include: { purchaseOrder: { select: { companyId: true } } }
        })
        if (!existing || existing.purchaseOrder.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const validated = itemSchema.parse(data)
        const totalPrice = validated.quantity * validated.unitPrice

        const item = await prisma.purchaseOrderItem.update({
            where: { id: itemId },
            data: {
                description: validated.description,
                unit: validated.unit,
                quantity: validated.quantity,
                unitPrice: validated.unitPrice,
                totalPrice,
                materialId: validated.materialId || null,
            }
        })

        await logUpdate('PurchaseOrderItem', itemId, item.description, existing, item)

        await recalculateTotalValue(item.purchaseOrderId)

        revalidatePath('/compras')
        revalidatePath(`/compras/${item.purchaseOrderId}`)
        return { success: true, data: item }
    } catch (error) {
        console.error("Erro ao atualizar item:", error)
        return {
            success: false,
            error: "Erro ao atualizar item"
        }
    }
}

export async function deleteOrderItem(itemId: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Check delete permission
        if (session.user.role !== "ADMIN" && !session.user.canDelete) {
            return { success: false, error: "Sem permissão para excluir" }
        }

        const item = await prisma.purchaseOrderItem.findUnique({
            where: { id: itemId },
            include: { purchaseOrder: { select: { companyId: true } } }
        })

        if (!item) {
            return { success: false, error: "Item não encontrado" }
        }

        // Verify company access
        if (item.purchaseOrder.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const orderId = item.purchaseOrderId

        await prisma.purchaseOrderItem.delete({ where: { id: itemId } })

        await logDelete('PurchaseOrderItem', itemId, item.description, item)

        await recalculateTotalValue(orderId as string)

        revalidatePath('/compras')
        revalidatePath(`/compras/${orderId}`)
        return { success: true }
    } catch (error) {
        console.error("Erro ao deletar item:", error)
        return {
            success: false,
            error: "Erro ao deletar item"
        }
    }
}

export async function updateOrderStatus(id: string, status: PurchaseOrderStatus) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Verify order belongs to user's company
        const order = await prisma.purchaseOrder.findUnique({
            where: { id },
            select: { companyId: true }
        })
        if (!order || order.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const updated = await prisma.purchaseOrder.update({
            where: { id },
            data: {
                status,
                ...(status === 'RECEIVED' ? { receivedAt: new Date() } : {})
            },
            select: { id: true, number: true, companyId: true, projectId: true },
        })

        await logAction(status, 'PurchaseOrder', id, updated.number, `Status changed to ${status}`)

        // Notify on approval
        if (status === 'APPROVED') {
            const managers = await prisma.user.findMany({
                where: { companyId: updated.companyId, role: { in: ['ADMIN', 'MANAGER'] } },
                select: { id: true },
            })
            const managerIds = managers.map(m => m.id)
            const notifData = {
                type: 'PURCHASE_APPROVED',
                title: 'Pedido de compra aprovado',
                message: `Pedido ${updated.number} foi aprovado.`,
                link: `/compras/${updated.id}`,
            }
            await createNotificationForMany(managerIds, notifData)
            notifyUsers(managerIds, notifData)
        }

        // Sync inventory when order is received
        if (status === 'RECEIVED') {
            try {
                const items = await prisma.purchaseOrderItem.findMany({
                    where: { purchaseOrderId: id, materialId: { not: null } },
                    select: { materialId: true, quantity: true, unitPrice: true, description: true },
                })

                if (items.length > 0) {
                    await prisma.$transaction(async (tx) => {
                        for (const item of items) {
                            const materialId = item.materialId as string

                            const movement = await tx.inventoryMovement.create({
                                data: {
                                    type: 'IN',
                                    quantity: item.quantity,
                                    unitCost: item.unitPrice,
                                    documentNumber: updated.number,
                                    notes: `Recebimento OC #${updated.number}`,
                                    materialId,
                                    projectId: updated.projectId || null,
                                    userId: session.user!.id,
                                },
                            })

                            await tx.material.update({
                                where: { id: materialId },
                                data: {
                                    currentStock: { increment: item.quantity },
                                },
                            })

                            await logCreate('InventoryMovement', movement.id, `Recebimento OC #${updated.number}`, {
                                type: 'IN',
                                quantity: item.quantity,
                                materialId,
                                documentNumber: updated.number,
                            })
                        }
                    })
                }

                revalidatePath('/estoque')
            } catch (stockError) {
                console.error("Erro ao atualizar estoque (OC recebida):", stockError)
                // Stock sync failure does NOT block the status change
            }
        }

        revalidatePath('/compras')
        revalidatePath(`/compras/${id}`)
        return { success: true, data: updated }
    } catch (error) {
        console.error("Erro ao atualizar status:", error)
        return {
            success: false,
            error: "Erro ao atualizar status"
        }
    }
}
