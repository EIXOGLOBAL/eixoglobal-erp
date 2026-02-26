'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getNextCode } from "@/lib/sequence"

const contractorSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  document: z.string().optional(),
  type: z.enum(['COMPANY', 'INDIVIDUAL']),
})

export async function createContractor(data: z.infer<typeof contractorSchema>, companyId: string) {
  try {
    const validated = contractorSchema.parse(data)
    const code = await getNextCode('contractor', companyId)
    const contractor = await prisma.contractor.create({
      data: {
        code,
        name: validated.name,
        document: validated.document || null,
        type: validated.type,
        companyId,
      },
    })
    revalidatePath('/empreiteiras')
    return { success: true, data: contractor }
  } catch (error: any) {
    if (error.issues) return { success: false, error: error.issues[0]?.message }
    return { success: false, error: error.message || "Erro ao criar empreiteira" }
  }
}

export async function updateContractor(id: string, data: z.infer<typeof contractorSchema>) {
  try {
    const validated = contractorSchema.parse(data)
    const contractor = await prisma.contractor.update({
      where: { id },
      data: {
        name: validated.name,
        document: validated.document || null,
        type: validated.type,
      },
    })
    revalidatePath('/empreiteiras')
    return { success: true, data: contractor }
  } catch (error: any) {
    if (error.issues) return { success: false, error: error.issues[0]?.message }
    return { success: false, error: error.message || "Erro ao atualizar empreiteira" }
  }
}

export async function deleteContractor(id: string) {
  try {
    const contractor = await prisma.contractor.findUnique({
      where: { id },
      include: { _count: { select: { contracts: true } } }
    })
    if (!contractor) return { success: false, error: "Empreiteira não encontrada" }
    if (contractor._count.contracts > 0) {
      return { success: false, error: "Não é possível excluir empreiteira com contratos vinculados" }
    }
    await prisma.contractor.delete({ where: { id } })
    revalidatePath('/empreiteiras')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao excluir empreiteira" }
  }
}

export async function getContractors(companyId: string) {
  try {
    const contractors = await prisma.contractor.findMany({
      where: { companyId },
      include: {
        _count: { select: { contracts: true } }
      },
      orderBy: { name: 'asc' }
    })
    return { success: true, data: contractors }
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao buscar empreiteiras" }
  }
}

export async function changeContractorStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED') {
  try {
    const contractor = await prisma.contractor.update({
      where: { id },
      data: { status },
    })
    revalidatePath('/empreiteiras')
    return { success: true, data: contractor }
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao alterar status da empreiteira" }
  }
}
