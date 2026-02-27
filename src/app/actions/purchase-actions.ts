'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { PurchaseOrderStatus } from "@/lib/generated/prisma"
import { createNotificationForMany } from "./notification-actions"
import { notifyUsers } from "@/lib/sse-notifications"
import { toNumber } from "@/lib/formatters"

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
        const validated = orderSchema.parse(data)

        const order = await prisma.purchaseOrder.update({
            where: { id },
            data: {
                supplierId: validated.supplierId || null,
                projectId: validated.projectId || null,
                notes: validated.notes || null,
                expectedAt: validated.expectedAt ? new Date(validated.expectedAt) : null,
                costCenterId: validated.costCenterId || null,
            }
        })

        revalidatePath('/compras')
        revalidatePath(`/compras/${id}`)
        return { success: true, data: order }
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
        const order = await prisma.purchaseOrder.findUnique({ where: { id } })

        if (!order) {
            return { success: false, error: "Pedido não encontrado" }
        }

        if (order.status !== 'DRAFT') {
            return {
                success: false,
                error: "Apenas pedidos em Rascunho podem ser excluídos"
            }
        }

        await prisma.purchaseOrder.delete({ where: { id } })

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

export async function getPurchaseOrders(companyId: string) {
    try {
        const orders = await prisma.purchaseOrder.findMany({
            where: { companyId },
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
        })

        return orders
    } catch (error) {
        console.error("Erro ao buscar pedidos de compra:", error)
        return []
    }
}

export async function getPurchaseOrderById(id: string) {
    try {
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
        const item = await prisma.purchaseOrderItem.findUnique({
            where: { id: itemId }
        })

        if (!item) {
            return { success: false, error: "Item não encontrado" }
        }

        const orderId = item.purchaseOrderId

        await prisma.purchaseOrderItem.delete({ where: { id: itemId } })

        await recalculateTotalValue(orderId)

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
        const order = await prisma.purchaseOrder.update({
            where: { id },
            data: {
                status,
                ...(status === 'RECEIVED' ? { receivedAt: new Date() } : {})
            },
            select: { id: true, number: true, companyId: true },
        })

        // Notify on approval
        if (status === 'APPROVED') {
            const managers = await prisma.user.findMany({
                where: { companyId: order.companyId, role: { in: ['ADMIN', 'MANAGER'] } },
                select: { id: true },
            })
            const managerIds = managers.map(m => m.id)
            const notifData = {
                type: 'PURCHASE_APPROVED',
                title: 'Pedido de compra aprovado',
                message: `Pedido ${order.number} foi aprovado.`,
                link: `/compras/${order.id}`,
            }
            await createNotificationForMany({ userIds: managerIds, companyId: order.companyId, ...notifData })
            notifyUsers(managerIds, notifData)
        }

        revalidatePath('/compras')
        revalidatePath(`/compras/${id}`)
        return { success: true, data: order }
    } catch (error) {
        console.error("Erro ao atualizar status:", error)
        return {
            success: false,
            error: "Erro ao atualizar status"
        }
    }
}
