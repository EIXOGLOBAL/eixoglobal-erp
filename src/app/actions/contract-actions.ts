'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getSession } from "@/lib/auth"
import { getPaginationArgs, paginatedResponse, type PaginationParams } from "@/lib/pagination"
import { buildWhereClause, type FilterParams } from "@/lib/filters"

// ========================================
// SCHEMAS ZOD
// ========================================

const contractSchema = z.object({
  identifier: z.string().min(3, "Identificador deve ter no mínimo 3 caracteres"),
  description: z.string().optional(),
  value: z.number().min(0, "Valor não pode ser negativo").optional(),
  startDate: z.string().min(1, "Data de início é obrigatória"),
  endDate: z.string().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED', 'DRAFT']).default('DRAFT'),
  projectId: z.string().uuid("Projeto inválido"),
  contractorId: z.string().uuid("Contratada inválida").optional().nullable(),
  // Additional fields from schema
  contractNumber: z.string().optional().nullable(),
  contractType: z.enum(['PUBLIC', 'PRIVATE', 'FRAMEWORK', 'OTHER']).optional().nullable(),
  modalidade: z.string().optional().nullable(),
  object: z.string().optional().nullable(),
  warrantyValue: z.number().min(0).optional().nullable(),
  warrantyExpiry: z.string().optional().nullable(),
  executionDeadline: z.number().optional().nullable(),
  baselineEndDate: z.string().optional().nullable(),
  reajusteIndex: z.enum(['INCC', 'IPCA', 'IGP_M', 'CUSTOM']).optional().nullable(),
  reajusteBaseDate: z.string().optional().nullable(),
  fiscalName: z.string().optional().nullable(),
  witnessNames: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  retentionPercent: z.number().min(0).max(100).optional().nullable(),
}).refine((data) => {
  if (data.endDate) {
    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)
    return endDate >= startDate
  }
  return true
}, {
  message: "Data de término deve ser igual ou posterior à data de início",
  path: ["endDate"]
})

const contractItemSchema = z.object({
  description: z.string().min(3, "Descrição deve ter no mínimo 3 caracteres"),
  unit: z.string().min(1, "Unidade é obrigatória"),
  quantity: z.number().min(0.01, "Quantidade deve ser maior que zero"),
  unitPrice: z.number().min(0, "Preço unitário não pode ser negativo"),
})

const amendmentSchema = z.object({
  number: z.string().min(1, "Número do aditivo é obrigatório"),
  description: z.string().min(10, "Descrição deve ter no mínimo 10 caracteres"),
  type: z.enum(['VALUE_CHANGE', 'DEADLINE_CHANGE', 'SCOPE_CHANGE', 'MIXED']),
  oldValue: z.number().optional().nullable(),
  newValue: z.number().optional().nullable(),
  oldEndDate: z.string().optional().nullable(),
  newEndDate: z.string().optional().nullable(),
  justification: z.string().min(20, "Justificativa deve ter no mínimo 20 caracteres"),
})

const adjustmentSchema = z.object({
  indexType: z.enum(['INCC', 'IPCA', 'IGP-M']),
  baseDate: z.string().min(1, "Data base é obrigatória"),
  adjustmentDate: z.string().min(1, "Data de reajuste é obrigatória"),
  oldIndex: z.number().min(0, "Índice anterior deve ser positivo"),
  newIndex: z.number().min(0, "Índice novo deve ser positivo"),
  percentage: z.number(),
})

// ========================================
// CRUD DE CONTRATOS
// ========================================

export async function createContract(data: z.infer<typeof contractSchema>, companyId: string) {
  try {
    const validated = contractSchema.parse(data)

    const contract = await prisma.contract.create({
      data: {
        identifier: validated.identifier,
        description: validated.description,
        value: validated.value || 0,
        startDate: new Date(validated.startDate),
        endDate: validated.endDate ? new Date(validated.endDate) : null,
        status: validated.status,
        projectId: validated.projectId,
        contractorId: validated.contractorId || null,
        companyId,
        // Additional fields
        contractNumber: validated.contractNumber || null,
        contractType: validated.contractType || null,
        modalidade: validated.modalidade || null,
        object: validated.object || null,
        warrantyValue: validated.warrantyValue || null,
        warrantyExpiry: validated.warrantyExpiry ? new Date(validated.warrantyExpiry) : null,
        executionDeadline: validated.executionDeadline || null,
        baselineEndDate: validated.baselineEndDate ? new Date(validated.baselineEndDate) : null,
        reajusteIndex: validated.reajusteIndex || null,
        reajusteBaseDate: validated.reajusteBaseDate ? new Date(validated.reajusteBaseDate) : null,
        fiscalName: validated.fiscalName || null,
        witnessNames: validated.witnessNames || null,
        paymentTerms: validated.paymentTerms || null,
        retentionPercent: validated.retentionPercent || null,
      },
      include: {
        project: true,
        contractor: true,
      }
    })

    revalidatePath('/contratos')
    return { success: true, data: contract }
  } catch (error: any) {
    console.error("Error creating contract:", error)
    return { success: false, error: error.message || "Erro ao criar contrato" }
  }
}

export async function updateContract(id: string, data: z.infer<typeof contractSchema>) {
  try {
    const validated = contractSchema.parse(data)

    const contract = await prisma.contract.update({
      where: { id },
      data: {
        identifier: validated.identifier,
        description: validated.description,
        value: validated.value || 0,
        startDate: new Date(validated.startDate),
        endDate: validated.endDate ? new Date(validated.endDate) : null,
        status: validated.status,
        projectId: validated.projectId,
        contractorId: validated.contractorId || null,
        // Additional fields
        contractNumber: validated.contractNumber || null,
        contractType: validated.contractType || null,
        modalidade: validated.modalidade || null,
        object: validated.object || null,
        warrantyValue: validated.warrantyValue || null,
        warrantyExpiry: validated.warrantyExpiry ? new Date(validated.warrantyExpiry) : null,
        executionDeadline: validated.executionDeadline || null,
        baselineEndDate: validated.baselineEndDate ? new Date(validated.baselineEndDate) : null,
        reajusteIndex: validated.reajusteIndex || null,
        reajusteBaseDate: validated.reajusteBaseDate ? new Date(validated.reajusteBaseDate) : null,
        fiscalName: validated.fiscalName || null,
        witnessNames: validated.witnessNames || null,
        paymentTerms: validated.paymentTerms || null,
        retentionPercent: validated.retentionPercent || null,
      },
      include: {
        project: true,
        contractor: true,
      }
    })

    revalidatePath('/contratos')
    revalidatePath(`/contratos/${id}`)
    return { success: true, data: contract }
  } catch (error: any) {
    console.error("Error updating contract:", error)
    return { success: false, error: error.message || "Erro ao atualizar contrato" }
  }
}

export async function deleteContract(id: string) {
  try {
    // Verificar se o contrato é DRAFT
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            items: true,
            bulletins: true
          }
        }
      }
    })

    if (!contract) {
      return { success: false, error: "Contrato não encontrado" }
    }

    if (contract.status !== 'DRAFT') {
      return { success: false, error: "Apenas contratos em rascunho podem ser excluídos" }
    }

    if (contract._count.bulletins > 0) {
      return { success: false, error: "Não é possível excluir contrato com boletins de medição vinculados" }
    }

    await prisma.contract.delete({
      where: { id }
    })

    revalidatePath('/contratos')
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting contract:", error)
    return { success: false, error: error.message || "Erro ao excluir contrato" }
  }
}

export async function getContracts(params?: {
  projectId?: string
  companyId?: string
  pagination?: PaginationParams
  filters?: FilterParams
}) {
  try {
    const session = await getSession()
    if (!session?.user) return { success: true, data: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } }

    const { skip, take, page, pageSize } = getPaginationArgs(params?.pagination)
    const filterWhere = buildWhereClause(params?.filters || {}, ['identifier', 'description'])
    const where = {
      ...(params?.projectId && { projectId: params.projectId }),
      ...(params?.companyId ? { companyId: params.companyId } : { companyId: (session.user as any).companyId }),
      ...filterWhere
    }

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        skip,
        take,
        include: {
          project: {
            select: { id: true, name: true }
          },
          contractor: {
            select: { id: true, name: true }
          },
          _count: {
            select: {
              items: true,
              amendments: true,
              adjustments: true,
              bulletins: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.contract.count({ where })
    ])

    // Converter Decimals para numbers
    const serialized = contracts.map(c => ({
      ...c,
      value: Number(c.value)
    }))

    return { success: true, data: serialized, pagination: paginatedResponse(serialized, total, page, pageSize).pagination }
  } catch (error: any) {
    console.error("Error fetching contracts:", error)
    return { success: false, error: error.message || "Erro ao buscar contratos", data: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } }
  }
}

export async function getContractById(id: string) {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        project: true,
        contractor: true,
        items: {
          include: {
            bulletinItems: {
              include: {
                bulletin: { select: { status: true } }
              }
            }
          }
        },
        amendments: {
          orderBy: { createdAt: 'desc' }
        },
        adjustments: {
          orderBy: { adjustmentDate: 'desc' }
        },
        bulletins: {
          select: {
            id: true,
            number: true,
            referenceMonth: true,
            status: true,
            totalValue: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!contract) {
      return { success: false, error: "Contrato não encontrado" }
    }

    // Converter Decimals para numbers
    const serialized = {
      ...contract,
      value: contract.value ? Number(contract.value) : null,
      items: contract.items.map(item => {
        // Calcular quantidade medida (somente boletins aprovados - APPROVED status or with billedAt timestamp)
        const measuredQty = item.bulletinItems
          .filter(bi => bi.bulletin.status === 'APPROVED' || bi.bulletin.status === 'MANAGER_APPROVED')
          .reduce((sum, bi) => sum + Number(bi.currentMeasured || 0), 0)
        return {
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          measuredQuantity: measuredQty,
          bulletinItems: undefined, // Não enviar ao cliente
        }
      }),
      amendments: contract.amendments.map(a => ({
        ...a,
        oldValue: a.oldValue ? Number(a.oldValue) : null,
        newValue: a.newValue ? Number(a.newValue) : null,
      })),
      adjustments: contract.adjustments.map(a => ({
        ...a,
        oldIndex: Number(a.oldIndex),
        newIndex: Number(a.newIndex),
        percentage: Number(a.percentage),
      })),
      bulletins: contract.bulletins.map(b => ({
        ...b,
        totalValue: Number(b.totalValue)
      }))
    }

    return { success: true, data: serialized }
  } catch (error: any) {
    console.error("Error fetching contract:", error)
    return { success: false, error: error.message || "Erro ao buscar contrato" }
  }
}

// ========================================
// CRUD DE ITENS DO CONTRATO
// ========================================

export async function addContractItem(contractId: string, data: z.infer<typeof contractItemSchema>) {
  try {
    const validated = contractItemSchema.parse(data)

    const item = await prisma.contractItem.create({
      data: {
        description: validated.description,
        unit: validated.unit,
        quantity: validated.quantity,
        unitPrice: validated.unitPrice,
        contractId,
      }
    })

    // Recalcular valor total do contrato
    await recalculateContractValue(contractId)

    revalidatePath(`/contratos/${contractId}`)
    return { success: true, data: item }
  } catch (error: any) {
    console.error("Error adding contract item:", error)
    return { success: false, error: error.message || "Erro ao adicionar item" }
  }
}

export async function updateContractItem(itemId: string, data: z.infer<typeof contractItemSchema>) {
  try {
    const validated = contractItemSchema.parse(data)

    const item = await prisma.contractItem.update({
      where: { id: itemId },
      data: {
        description: validated.description,
        unit: validated.unit,
        quantity: validated.quantity,
        unitPrice: validated.unitPrice,
      },
      include: { contract: true }
    })

    // Recalcular valor total do contrato
    await recalculateContractValue(item.contractId)

    revalidatePath(`/contratos/${item.contractId}`)
    return { success: true, data: item }
  } catch (error: any) {
    console.error("Error updating contract item:", error)
    return { success: false, error: error.message || "Erro ao atualizar item" }
  }
}

export async function deleteContractItem(itemId: string) {
  try {
    // Verificar se há medições vinculadas a este item
    const item = await prisma.contractItem.findUnique({
      where: { id: itemId },
      include: {
        _count: {
          select: { bulletinItems: true }
        }
      }
    })

    if (!item) {
      return { success: false, error: "Item não encontrado" }
    }

    if (item._count.bulletinItems > 0) {
      return { success: false, error: "Não é possível excluir item com medições vinculadas" }
    }

    const contractId = item.contractId

    await prisma.contractItem.delete({
      where: { id: itemId }
    })

    // Recalcular valor total do contrato
    await recalculateContractValue(contractId)

    revalidatePath(`/contratos/${contractId}`)
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting contract item:", error)
    return { success: false, error: error.message || "Erro ao excluir item" }
  }
}

// ========================================
// ADITIVOS (AMENDMENTS)
// ========================================

export async function createAmendment(contractId: string, data: z.infer<typeof amendmentSchema>) {
  try {
    const validated = amendmentSchema.parse(data)

    // Criar aditivo
    const amendment = await prisma.contractAmendment.create({
      data: {
        number: validated.number,
        description: validated.description,
        type: validated.type,
        oldValue: validated.oldValue,
        newValue: validated.newValue,
        oldEndDate: validated.oldEndDate ? new Date(validated.oldEndDate) : null,
        newEndDate: validated.newEndDate ? new Date(validated.newEndDate) : null,
        justification: validated.justification,
        contractId,
      }
    })

    // Atualizar contrato baseado no tipo de aditivo
    const updateData: any = {}

    if (validated.type === 'VALUE_CHANGE' || validated.type === 'MIXED') {
      if (validated.newValue !== undefined && validated.newValue !== null) {
        updateData.value = validated.newValue
      }
    }

    if (validated.type === 'DEADLINE_CHANGE' || validated.type === 'MIXED') {
      if (validated.newEndDate) {
        updateData.endDate = new Date(validated.newEndDate)
      }
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.contract.update({
        where: { id: contractId },
        data: updateData
      })
    }

    revalidatePath(`/contratos/${contractId}`)
    return { success: true, data: amendment }
  } catch (error: any) {
    console.error("Error creating amendment:", error)
    return { success: false, error: error.message || "Erro ao criar aditivo" }
  }
}

// ========================================
// REAJUSTES (ADJUSTMENTS)
// ========================================

export async function createAdjustment(contractId: string, data: z.infer<typeof adjustmentSchema>) {
  try {
    const validated = adjustmentSchema.parse(data)

    // Calcular percentual se não fornecido
    const percentage = validated.percentage ||
      ((validated.newIndex - validated.oldIndex) / validated.oldIndex) * 100

    // Wrap all operations in a transaction for atomicity
    const adjustment = await prisma.$transaction(async (tx) => {
      // Get current contract to calculate old and new values
      const contract = await tx.contract.findUnique({
        where: { id: contractId },
        include: { items: true }
      })

      if (!contract) {
        throw new Error("Contrato não encontrado")
      }

      // Criar reajuste
      const adj = await tx.contractAdjustment.create({
        data: {
          indexType: validated.indexType,
          baseDate: new Date(validated.baseDate),
          adjustmentDate: new Date(validated.adjustmentDate),
          oldIndex: validated.oldIndex,
          newIndex: validated.newIndex,
          percentage: percentage,
          baseValue: contract.value || 0,
          contractId,
        }
      })

      // Recalcular todos os preços unitários dos itens do contrato
      const items = contract.items
      let newTotalValue = 0

      for (const item of items) {
        const currentPrice = Number(item.unitPrice)
        const newPrice = currentPrice * (1 + percentage / 100)

        await tx.contractItem.update({
          where: { id: item.id },
          data: { unitPrice: newPrice }
        })

        newTotalValue += Number(item.quantity) * newPrice
      }

      const oldContractValue = Number(contract.value || 0)
      const adjustedValue = newTotalValue

      // Update adjustment with calculated values
      await tx.contractAdjustment.update({
        where: { id: adj.id },
        data: {
          adjustedValue: adjustedValue
        }
      })

      // Update contract value
      await tx.contract.update({
        where: { id: contractId },
        data: { value: adjustedValue }
      })

      // Create or update associated amendment to track the adjustment
      const amendmentNumber = `ADJ-${new Date().getFullYear()}/${String(Date.now()).slice(-6)}`

      await tx.contractAmendment.create({
        data: {
          number: amendmentNumber,
          description: `Reajuste automático ${validated.indexType}: ${percentage.toFixed(4)}%`,
          type: 'VALUE_CHANGE',
          oldValue: oldContractValue,
          newValue: adjustedValue,
          justification: `Reajuste de índice ${validated.indexType} de ${validated.oldIndex} para ${validated.newIndex}`,
          contractId,
        }
      })

      return adj
    })

    revalidatePath(`/contratos/${contractId}`)
    return { success: true, data: adjustment }
  } catch (error: any) {
    console.error("Error creating adjustment:", error)
    return { success: false, error: error.message || "Erro ao criar reajuste" }
  }
}

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

async function recalculateContractValue(contractId: string) {
  try {
    const items = await prisma.contractItem.findMany({
      where: { contractId }
    })

    const totalValue = items.reduce((sum, item) => {
      return sum + (Number(item.quantity) * Number(item.unitPrice))
    }, 0)

    await prisma.contract.update({
      where: { id: contractId },
      data: { value: totalValue }
    })
  } catch (error) {
    console.error("Error recalculating contract value:", error)
  }
}

// Função original mantida para compatibilidade
export async function getContractItems(projectId: string) {
  if (!projectId) return { success: true, data: [] }

  try {
    // Find contracts for the project, then get their items
    const contracts = await prisma.contract.findMany({
      where: {
        projectId,
        status: 'ACTIVE'
      },
      include: { items: true }
    })

    // Flatten items from all active contracts
    // We include contract info to help distinguish items if needed
    const items = contracts.flatMap(c => c.items.map(i => ({
      id: i.id,
      description: i.description,
      unit: i.unit,
      unitPrice: Number(i.unitPrice), // Convert Decimal to number for client
      contractIdentifier: c.identifier
    })))

    return { success: true, data: items }
  } catch (error) {
    console.error("Error fetching contract items:", error)
    return { success: false, error: "Failed to fetch contract items" }
  }
}
