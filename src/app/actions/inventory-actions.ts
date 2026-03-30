'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"
import { assertCanDelete } from "@/lib/permissions"
import { createNotificationForMany } from "./notification-actions"
import { notifyUsers } from "@/lib/sse-notifications"
import { getPaginationArgs, paginatedResponse, type PaginationParams } from "@/lib/pagination"
import { buildWhereClause, type FilterParams } from "@/lib/filters"

// ============================================================================
// SCHEMAS
// ============================================================================

const materialSchema = z.object({
    code: z.string().min(1, "Código é obrigatório"),
    name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
    description: z.string().optional().nullable(),
    unit: z.string().min(1, "Unidade é obrigatória"),
    category: z.enum(['CEMENT', 'STEEL', 'SAND', 'GRAVEL', 'BRICK', 'WOOD', 'PAINT', 'ELECTRICAL', 'PLUMBING', 'OTHER']),
    minStock: z.number().min(0, "Estoque mínimo não pode ser negativo"),
    currentStock: z.number().min(0, "Estoque atual não pode ser negativo"),
    unitCost: z.number().min(0, "Custo unitário não pode ser negativo"),
    supplier: z.string().optional().nullable(),
    companyId: z.string().uuid(),
})

const movementSchema = z.object({
    materialId: z.string().uuid(),
    type: z.enum(['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT']),
    quantity: z.number().min(0.01, "Quantidade deve ser maior que zero"),
    unitCost: z.number().min(0).optional(),
    projectId: z.string().uuid().optional().nullable(),
    notes: z.string().optional().nullable(),
    documentNumber: z.string().optional().nullable(),
})

// ============================================================================
// CRUD DE MATERIAIS
// ============================================================================

export async function createMaterial(data: z.infer<typeof materialSchema>) {
    try {
        const validated = materialSchema.parse(data)

        const existing = await prisma.material.findFirst({
            where: {
                code: validated.code,
                companyId: validated.companyId,
            }
        })

        if (existing) {
            return {
                success: false,
                error: "Já existe um material com este código"
            }
        }

        const material = await prisma.material.create({
            data: {
                code: validated.code,
                name: validated.name,
                description: validated.description,
                unit: validated.unit,
                category: validated.category,
                minStock: validated.minStock,
                currentStock: validated.currentStock,
                unitCost: validated.unitCost,
                supplier: validated.supplier,
                companyId: validated.companyId,
            }
        })

        revalidatePath('/estoque')
        return { success: true, data: material }
    } catch (error) {
        console.error("Erro ao criar material:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar material"
        }
    }
}

export async function updateMaterial(id: string, data: z.infer<typeof materialSchema>) {
    try {
        const validated = materialSchema.parse(data)

        const material = await prisma.material.update({
            where: { id },
            data: {
                code: validated.code,
                name: validated.name,
                description: validated.description,
                unit: validated.unit,
                category: validated.category,
                minStock: validated.minStock,
                currentStock: validated.currentStock,
                unitCost: validated.unitCost,
                supplier: validated.supplier,
            }
        })

        revalidatePath('/estoque')
        return { success: true, data: material }
    } catch (error) {
        console.error("Erro ao atualizar material:", error)
        return {
            success: false,
            error: "Erro ao atualizar material"
        }
    }
}

export async function deleteMaterial(id: string) {
    const session = await getSession()
    if (!session) return { success: false, error: 'Não autenticado' }

    try {
        assertCanDelete(session.user)
    } catch (e) {
        return { success: false, error: (e as Error).message }
    }

    try {
        const material = await prisma.material.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        movements: true,
                    }
                }
            }
        })

        if (!material) {
            return { success: false, error: "Material não encontrado" }
        }

        if (material._count.movements > 0) {
            return {
                success: false,
                error: "Não é possível excluir materiais com movimentações. Ajuste o estoque para zero."
            }
        }

        await prisma.material.delete({
            where: { id }
        })

        revalidatePath('/estoque')
        return { success: true }
    } catch (error) {
        console.error("Erro ao deletar material:", error)
        return {
            success: false,
            error: "Erro ao deletar material"
        }
    }
}

export async function getMaterials(params?: {
    companyId?: string
    pagination?: PaginationParams
    filters?: FilterParams
}) {
    try {
        const session = await getSession()
        if (!session?.user) return { success: true, data: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } }

        const { skip, take, page, pageSize } = getPaginationArgs(params?.pagination)
        const filterWhere = buildWhereClause(params?.filters || {}, ['name', 'code', 'category'])
        const where = {
            companyId: params?.companyId || (session.user as any).companyId,
            ...filterWhere
        }

        const [materials, total] = await Promise.all([
            prisma.material.findMany({
                where,
                skip,
                take,
                include: {
                    _count: {
                        select: {
                            movements: true,
                        }
                    }
                },
                orderBy: { name: 'asc' }
            }),
            prisma.material.count({ where })
        ])

        // Converter Decimal para Number
        const mapped = materials.map(m => ({
            ...m,
            minStock: Number(m.minStock),
            currentStock: Number(m.currentStock),
            unitCost: Number(m.unitCost),
        }))

        return { success: true, data: mapped, pagination: paginatedResponse(mapped, total, page, pageSize).pagination }
    } catch (error) {
        console.error("Erro ao buscar materiais:", error)
        return { success: false, error: "Erro ao buscar materiais", data: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } }
    }
}

export async function getMaterialById(id: string) {
    try {
        const material = await prisma.material.findUnique({
            where: { id },
            include: {
                movements: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                    include: {
                        project: {
                            select: {
                                id: true,
                                name: true,
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        movements: true,
                    }
                }
            }
        })

        if (!material) return null

        return {
            ...material,
            minStock: Number(material.minStock),
            currentStock: Number(material.currentStock),
            unitCost: Number(material.unitCost),
            movements: material.movements.map(m => ({
                ...m,
                quantity: Number(m.quantity),
                unitCost: m.unitCost ? Number(m.unitCost) : null,
            }))
        }
    } catch (error) {
        console.error("Erro ao buscar material:", error)
        return null
    }
}

export async function changeMaterialStatus(id: string, isActive: boolean) {
    try {
        const material = await prisma.material.update({
            where: { id },
            data: { isActive },
        })
        revalidatePath('/estoque')
        return { success: true, data: material }
    } catch (error) {
        console.error("Erro ao alterar status do material:", error)
        return { success: false, error: "Erro ao alterar status do material" }
    }
}

// ============================================================================
// MOVIMENTAÇÕES DE ESTOQUE
// ============================================================================

export async function createMovement(data: z.infer<typeof movementSchema>) {
    try {
        const session = await getSession()
        if (!session?.user?.id) {
            return { success: false, error: "Não autenticado" }
        }
        const userId = session.user.id

        const validated = movementSchema.parse(data)

        // Buscar material atual
        const material = await prisma.material.findUnique({
            where: { id: validated.materialId }
        })

        if (!material) {
            return { success: false, error: "Material não encontrado" }
        }

        const currentStock = Number(material.currentStock)
        let newStock = currentStock

        // Calcular novo estoque baseado no tipo de movimentação
        switch (validated.type) {
            case 'IN':
                newStock = currentStock + validated.quantity
                break
            case 'OUT':
                if (currentStock < validated.quantity) {
                    return {
                        success: false,
                        error: `Estoque insuficiente. Disponível: ${currentStock} ${material.unit}`
                    }
                }
                newStock = currentStock - validated.quantity
                break
            case 'ADJUSTMENT':
                newStock = validated.quantity
                break
        }

        // Criar movimentação e atualizar estoque de forma atômica
        const movement = await prisma.$transaction(async (tx) => {
            const mov = await tx.inventoryMovement.create({
                data: {
                    materialId: validated.materialId,
                    type: validated.type,
                    quantity: validated.quantity,
                    unitCost: validated.unitCost || Number(material.unitCost),
                    projectId: validated.projectId,
                    notes: validated.notes,
                    documentNumber: validated.documentNumber,
                    userId,
                }
            })

            // Atualizar estoque do material no mesmo transaction
            await tx.material.update({
                where: { id: validated.materialId },
                data: { currentStock: newStock }
            })

            return mov
        })

        // Low stock alert
        const minStock = Number(material.minStock)
        if (validated.type === 'OUT' && minStock > 0 && newStock <= minStock) {
            const admins = await prisma.user.findMany({
                where: { companyId: material.companyId, role: { in: ['ADMIN', 'MANAGER', 'ENGINEER'] } },
                select: { id: true },
            })
            const adminIds = admins.map(a => a.id)
            const notifData = {
                type: 'LOW_STOCK',
                title: 'Estoque abaixo do mínimo',
                message: `"${material.name}" está com ${newStock} ${material.unit} (mínimo: ${minStock}).`,
                link: `/estoque`,
            }
            await createNotificationForMany(adminIds, notifData)
            notifyUsers(adminIds, notifData)
        }

        revalidatePath('/estoque')
        revalidatePath(`/estoque/${validated.materialId}`)

        return { success: true, data: movement }
    } catch (error) {
        console.error("Erro ao criar movimentação:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar movimentação"
        }
    }
}

export async function getMovements(companyId: string, materialId?: string, projectId?: string) {
    try {
        const movements = await prisma.inventoryMovement.findMany({
            where: {
                material: { companyId },
                ...(materialId && { materialId }),
                ...(projectId && { projectId }),
            },
            include: {
                material: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        unit: true,
                    }
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        })

        return movements.map(m => ({
            ...m,
            quantity: Number(m.quantity),
            unitCost: m.unitCost ? Number(m.unitCost) : null,
        }))
    } catch (error) {
        console.error("Erro ao buscar movimentações:", error)
        return []
    }
}

// ============================================================================
// RELATÓRIOS E ALERTAS
// ============================================================================

export async function getLowStockMaterials(companyId: string) {
    try {
        const materials = await prisma.material.findMany({
            where: { companyId },
            orderBy: { currentStock: 'asc' }
        })

        // Filter in JS since SQLite/Prisma doesn't support cross-column comparison natively
        return materials
            .map(m => ({
                ...m,
                minStock: Number(m.minStock),
                currentStock: Number(m.currentStock),
                unitCost: Number(m.unitCost),
            }))
            .filter(m => m.currentStock <= m.minStock && m.minStock > 0)
    } catch (error) {
        console.error("Erro ao buscar materiais com estoque baixo:", error)
        return []
    }
}

export async function getInventoryValue(companyId: string) {
    try {
        const materials = await prisma.material.findMany({
            where: { companyId },
            select: {
                currentStock: true,
                unitCost: true,
            }
        })

        const totalValue = materials.reduce((sum, m) => {
            return sum + (Number(m.currentStock) * Number(m.unitCost))
        }, 0)

        return {
            success: true,
            data: {
                totalValue,
                itemsCount: materials.length,
            }
        }
    } catch (error) {
        console.error("Erro ao calcular valor do estoque:", error)
        return {
            success: false,
            error: "Erro ao calcular valor do estoque"
        }
    }
}
