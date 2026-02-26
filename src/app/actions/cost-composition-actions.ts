'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// ============================================================================
// SCHEMAS DE VALIDAÇÃO
// ============================================================================

const compositionSchema = z.object({
    code: z.string().min(1, "Código é obrigatório"),
    description: z.string().min(3, "Descrição deve ter no mínimo 3 caracteres"),
    unit: z.string().min(1, "Unidade é obrigatória"),
    bdi: z.number().min(0, "BDI não pode ser negativo").max(100, "BDI não pode ser maior que 100%"),
    projectId: z.string().uuid().optional().nullable(),
})

const materialSchema = z.object({
    description: z.string().min(3, "Descrição deve ter no mínimo 3 caracteres"),
    unit: z.string().min(1, "Unidade é obrigatória"),
    coefficient: z.number().min(0, "Coeficiente não pode ser negativo"),
    unitCost: z.number().min(0, "Custo unitário não pode ser negativo"),
})

const laborSchema = z.object({
    description: z.string().min(3, "Descrição deve ter no mínimo 3 caracteres"),
    hours: z.number().min(0, "Horas não pode ser negativo"),
    hourlyRate: z.number().min(0, "Valor/hora não pode ser negativo"),
})

const equipmentSchema = z.object({
    description: z.string().min(3, "Descrição deve ter no mínimo 3 caracteres"),
    unit: z.string().min(1, "Unidade é obrigatória"),
    coefficient: z.number().min(0, "Coeficiente não pode ser negativo"),
    unitCost: z.number().min(0, "Custo unitário não pode ser negativo"),
})

// ============================================================================
// TIPOS DE RETORNO
// ============================================================================

type ActionResult<T = any> = {
    success: boolean
    data?: T
    error?: string
}

// ============================================================================
// FUNÇÕES AUXILIARES DE CÁLCULO
// ============================================================================

/**
 * Calcula o custo direto total de uma composição
 * Custo Direto = Σ(materiais) + Σ(mão de obra) + Σ(equipamentos)
 */
async function calculateDirectCost(compositionId: string): Promise<number> {
    // Buscar todos os insumos
    const materials = await prisma.compositionMaterial.findMany({
        where: { compositionId }
    })

    const labor = await prisma.compositionLabor.findMany({
        where: { compositionId }
    })

    const equipment = await prisma.compositionEquipment.findMany({
        where: { compositionId }
    })

    // Calcular custos
    const materialsCost = materials.reduce((sum, item) =>
        sum + (Number(item.coefficient) * Number(item.unitCost)), 0
    )

    const laborCost = labor.reduce((sum, item) =>
        sum + (Number(item.hours) * Number(item.hourlyRate)), 0
    )

    const equipmentCost = equipment.reduce((sum, item) =>
        sum + (Number(item.coefficient) * Number(item.unitCost)), 0
    )

    return materialsCost + laborCost + equipmentCost
}

/**
 * Recalcula e atualiza o custo direto e preço de venda de uma composição
 */
async function recalculateComposition(compositionId: string) {
    const composition = await prisma.costComposition.findUnique({
        where: { id: compositionId }
    })

    if (!composition) {
        throw new Error("Composição não encontrada")
    }

    const directCost = await calculateDirectCost(compositionId)
    const bdi = Number(composition.bdi)
    const salePrice = directCost * (1 + bdi / 100)

    await prisma.costComposition.update({
        where: { id: compositionId },
        data: {
            directCost,
            salePrice,
        }
    })
}

// ============================================================================
// CRUD DE COMPOSIÇÕES
// ============================================================================

export async function createCostComposition(
    data: z.infer<typeof compositionSchema>,
    companyId: string
): Promise<ActionResult> {
    try {
        const validated = compositionSchema.parse(data)

        // Verificar se código já existe
        const existing = await prisma.costComposition.findFirst({
            where: {
                code: validated.code,
                companyId,
                projectId: validated.projectId || null,
            }
        })

        if (existing) {
            return {
                success: false,
                error: "Já existe uma composição com este código"
            }
        }

        const composition = await prisma.costComposition.create({
            data: {
                code: validated.code,
                description: validated.description,
                unit: validated.unit,
                bdi: validated.bdi,
                directCost: 0, // Será calculado quando insumos forem adicionados
                salePrice: 0,
                companyId,
                projectId: validated.projectId || null,
            },
            include: {
                project: true,
            }
        })

        revalidatePath('/composicoes')
        revalidatePath('/composicoes/' + composition.id)

        return {
            success: true,
            data: composition,
        }
    } catch (error) {
        console.error("Erro ao criar composição:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar composição"
        }
    }
}

export async function updateCostComposition(
    id: string,
    data: z.infer<typeof compositionSchema>
): Promise<ActionResult> {
    try {
        const validated = compositionSchema.parse(data)

        const composition = await prisma.costComposition.update({
            where: { id },
            data: {
                code: validated.code,
                description: validated.description,
                unit: validated.unit,
                bdi: validated.bdi,
                projectId: validated.projectId || null,
            },
            include: {
                project: true,
            }
        })

        // Recalcular preço de venda com novo BDI
        await recalculateComposition(id)

        revalidatePath('/composicoes')
        revalidatePath('/composicoes/' + id)

        return {
            success: true,
            data: composition,
        }
    } catch (error) {
        console.error("Erro ao atualizar composição:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao atualizar composição"
        }
    }
}

export async function deleteCostComposition(id: string): Promise<ActionResult> {
    try {
        // Verificar se há dependências (pode adicionar verificações futuras aqui)

        await prisma.costComposition.delete({
            where: { id }
        })

        revalidatePath('/composicoes')

        return { success: true }
    } catch (error) {
        console.error("Erro ao deletar composição:", error)
        return {
            success: false,
            error: "Erro ao deletar composição"
        }
    }
}

export async function getCostCompositions(companyId: string, projectId?: string) {
    try {
        const compositions = await prisma.costComposition.findMany({
            where: {
                companyId,
                ...(projectId && { projectId }),
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                _count: {
                    select: {
                        materials: true,
                        labor: true,
                        equipment: true,
                    }
                }
            },
            orderBy: {
                code: 'asc'
            }
        })

        // Converter Decimal para Number
        return compositions.map(comp => ({
            ...comp,
            bdi: Number(comp.bdi),
            directCost: Number(comp.directCost),
            salePrice: Number(comp.salePrice),
        }))
    } catch (error) {
        console.error("Erro ao buscar composições:", error)
        return []
    }
}

export async function getCostCompositionById(id: string) {
    try {
        const composition = await prisma.costComposition.findUnique({
            where: { id },
            include: {
                project: true,
                materials: {
                    orderBy: { id: 'asc' }
                },
                labor: {
                    orderBy: { id: 'asc' }
                },
                equipment: {
                    orderBy: { id: 'asc' }
                }
            }
        })

        if (!composition) {
            return null
        }

        // Converter Decimal para Number
        return {
            ...composition,
            project: composition.project,
            bdi: Number(composition.bdi),
            directCost: Number(composition.directCost),
            salePrice: Number(composition.salePrice),
            materials: composition.materials.map(m => ({
                ...m,
                coefficient: Number(m.coefficient),
                unitCost: Number(m.unitCost),
            })),
            labor: composition.labor.map(l => ({
                ...l,
                hours: Number(l.hours),
                hourlyRate: Number(l.hourlyRate),
            })),
            equipment: composition.equipment.map(e => ({
                ...e,
                coefficient: Number(e.coefficient),
                unitCost: Number(e.unitCost),
            })),
        }
    } catch (error) {
        console.error("Erro ao buscar composição:", error)
        return null
    }
}

/**
 * Duplica uma composição incluindo todos os seus insumos
 */
export async function duplicateCostComposition(
    id: string,
    newCode: string
): Promise<ActionResult> {
    try {
        const original = await prisma.costComposition.findUnique({
            where: { id },
            include: {
                materials: true,
                labor: true,
                equipment: true,
            }
        })

        if (!original) {
            return {
                success: false,
                error: "Composição original não encontrada"
            }
        }

        // Verificar se novo código já existe
        const existing = await prisma.costComposition.findFirst({
            where: {
                code: newCode,
                companyId: original.companyId,
                projectId: original.projectId,
            }
        })

        if (existing) {
            return {
                success: false,
                error: "Já existe uma composição com este código"
            }
        }

        // Criar nova composição
        const newComposition = await prisma.costComposition.create({
            data: {
                code: newCode,
                description: `${original.description} (Cópia)`,
                unit: original.unit,
                bdi: original.bdi,
                directCost: original.directCost,
                salePrice: original.salePrice,
                companyId: original.companyId,
                projectId: original.projectId,
            }
        })

        // Duplicar materiais
        if (original.materials.length > 0) {
            await prisma.compositionMaterial.createMany({
                data: original.materials.map(m => ({
                    compositionId: newComposition.id,
                    description: m.description,
                    unit: m.unit,
                    coefficient: m.coefficient,
                    unitCost: m.unitCost,
                    totalCost: m.totalCost,
                }))
            })
        }

        // Duplicar mão de obra
        if (original.labor.length > 0) {
            await prisma.compositionLabor.createMany({
                data: original.labor.map(l => ({
                    compositionId: newComposition.id,
                    description: l.description,
                    hours: l.hours,
                    hourlyRate: l.hourlyRate,
                    totalCost: l.totalCost,
                }))
            })
        }

        // Duplicar equipamentos
        if (original.equipment.length > 0) {
            await prisma.compositionEquipment.createMany({
                data: original.equipment.map(e => ({
                    compositionId: newComposition.id,
                    description: e.description,
                    unit: e.unit,
                    coefficient: e.coefficient,
                    unitCost: e.unitCost,
                    totalCost: e.totalCost,
                }))
            })
        }

        revalidatePath('/composicoes')

        return {
            success: true,
            data: newComposition,
        }
    } catch (error) {
        console.error("Erro ao duplicar composição:", error)
        return {
            success: false,
            error: "Erro ao duplicar composição"
        }
    }
}

// ============================================================================
// GESTÃO DE MATERIAIS
// ============================================================================

export async function addMaterial(
    compositionId: string,
    data: z.infer<typeof materialSchema>
): Promise<ActionResult> {
    try {
        const validated = materialSchema.parse(data)

        const material = await prisma.compositionMaterial.create({
            data: {
                compositionId,
                description: validated.description,
                unit: validated.unit,
                coefficient: validated.coefficient,
                unitCost: validated.unitCost,
                totalCost: validated.coefficient * validated.unitCost,
            }
        })

        // Recalcular custos da composição
        await recalculateComposition(compositionId)

        revalidatePath('/composicoes/' + compositionId)

        return {
            success: true,
            data: material,
        }
    } catch (error) {
        console.error("Erro ao adicionar material:", error)
        return {
            success: false,
            error: "Erro ao adicionar material"
        }
    }
}

export async function updateMaterial(
    materialId: string,
    data: z.infer<typeof materialSchema>
): Promise<ActionResult> {
    try {
        const validated = materialSchema.parse(data)

        const material = await prisma.compositionMaterial.update({
            where: { id: materialId },
            data: {
                description: validated.description,
                unit: validated.unit,
                coefficient: validated.coefficient,
                unitCost: validated.unitCost,
                totalCost: validated.coefficient * validated.unitCost,
            }
        })

        // Recalcular custos da composição
        await recalculateComposition(material.compositionId)

        revalidatePath('/composicoes/' + material.compositionId)

        return {
            success: true,
            data: material,
        }
    } catch (error) {
        console.error("Erro ao atualizar material:", error)
        return {
            success: false,
            error: "Erro ao atualizar material"
        }
    }
}

export async function deleteMaterial(materialId: string): Promise<ActionResult> {
    try {
        const material = await prisma.compositionMaterial.findUnique({
            where: { id: materialId }
        })

        if (!material) {
            return {
                success: false,
                error: "Material não encontrado"
            }
        }

        const compositionId = material.compositionId

        await prisma.compositionMaterial.delete({
            where: { id: materialId }
        })

        // Recalcular custos da composição
        await recalculateComposition(compositionId)

        revalidatePath('/composicoes/' + compositionId)

        return { success: true }
    } catch (error) {
        console.error("Erro ao deletar material:", error)
        return {
            success: false,
            error: "Erro ao deletar material"
        }
    }
}

// ============================================================================
// GESTÃO DE MÃO DE OBRA
// ============================================================================

export async function addLabor(
    compositionId: string,
    data: z.infer<typeof laborSchema>
): Promise<ActionResult> {
    try {
        const validated = laborSchema.parse(data)

        const labor = await prisma.compositionLabor.create({
            data: {
                compositionId,
                description: validated.description,
                hours: validated.hours,
                hourlyRate: validated.hourlyRate,
                totalCost: validated.hours * validated.hourlyRate,
            }
        })

        await recalculateComposition(compositionId)
        revalidatePath('/composicoes/' + compositionId)

        return {
            success: true,
            data: labor,
        }
    } catch (error) {
        console.error("Erro ao adicionar mão de obra:", error)
        return {
            success: false,
            error: "Erro ao adicionar mão de obra"
        }
    }
}

export async function updateLabor(
    laborId: string,
    data: z.infer<typeof laborSchema>
): Promise<ActionResult> {
    try {
        const validated = laborSchema.parse(data)

        const labor = await prisma.compositionLabor.update({
            where: { id: laborId },
            data: {
                description: validated.description,
                hours: validated.hours,
                hourlyRate: validated.hourlyRate,
                totalCost: validated.hours * validated.hourlyRate,
            }
        })

        await recalculateComposition(labor.compositionId)
        revalidatePath('/composicoes/' + labor.compositionId)

        return {
            success: true,
            data: labor,
        }
    } catch (error) {
        console.error("Erro ao atualizar mão de obra:", error)
        return {
            success: false,
            error: "Erro ao atualizar mão de obra"
        }
    }
}

export async function deleteLabor(laborId: string): Promise<ActionResult> {
    try {
        const labor = await prisma.compositionLabor.findUnique({
            where: { id: laborId }
        })

        if (!labor) {
            return {
                success: false,
                error: "Mão de obra não encontrada"
            }
        }

        const compositionId = labor.compositionId

        await prisma.compositionLabor.delete({
            where: { id: laborId }
        })

        await recalculateComposition(compositionId)
        revalidatePath('/composicoes/' + compositionId)

        return { success: true }
    } catch (error) {
        console.error("Erro ao deletar mão de obra:", error)
        return {
            success: false,
            error: "Erro ao deletar mão de obra"
        }
    }
}

// ============================================================================
// GESTÃO DE EQUIPAMENTOS
// ============================================================================

export async function addEquipment(
    compositionId: string,
    data: z.infer<typeof equipmentSchema>
): Promise<ActionResult> {
    try {
        const validated = equipmentSchema.parse(data)

        const equipment = await prisma.compositionEquipment.create({
            data: {
                compositionId,
                description: validated.description,
                unit: validated.unit,
                coefficient: validated.coefficient,
                unitCost: validated.unitCost,
                totalCost: validated.coefficient * validated.unitCost,
            }
        })

        await recalculateComposition(compositionId)
        revalidatePath('/composicoes/' + compositionId)

        return {
            success: true,
            data: equipment,
        }
    } catch (error) {
        console.error("Erro ao adicionar equipamento:", error)
        return {
            success: false,
            error: "Erro ao adicionar equipamento"
        }
    }
}

export async function updateEquipment(
    equipmentId: string,
    data: z.infer<typeof equipmentSchema>
): Promise<ActionResult> {
    try {
        const validated = equipmentSchema.parse(data)

        const equipment = await prisma.compositionEquipment.update({
            where: { id: equipmentId },
            data: {
                description: validated.description,
                unit: validated.unit,
                coefficient: validated.coefficient,
                unitCost: validated.unitCost,
                totalCost: validated.coefficient * validated.unitCost,
            }
        })

        await recalculateComposition(equipment.compositionId)
        revalidatePath('/composicoes/' + equipment.compositionId)

        return {
            success: true,
            data: equipment,
        }
    } catch (error) {
        console.error("Erro ao atualizar equipamento:", error)
        return {
            success: false,
            error: "Erro ao atualizar equipamento"
        }
    }
}

export async function deleteEquipment(equipmentId: string): Promise<ActionResult> {
    try {
        const equipment = await prisma.compositionEquipment.findUnique({
            where: { id: equipmentId }
        })

        if (!equipment) {
            return {
                success: false,
                error: "Equipamento não encontrado"
            }
        }

        const compositionId = equipment.compositionId

        await prisma.compositionEquipment.delete({
            where: { id: equipmentId }
        })

        await recalculateComposition(compositionId)
        revalidatePath('/composicoes/' + compositionId)

        return { success: true }
    } catch (error) {
        console.error("Erro ao deletar equipamento:", error)
        return {
            success: false,
            error: "Erro ao deletar equipamento"
        }
    }
}
