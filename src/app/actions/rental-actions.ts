'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================================================
// SCHEMAS
// ============================================================================

const rentalItemSchema = z.object({
  name: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  type: z.enum([
    'PROPERTY_RESIDENTIAL', 'PROPERTY_COMMERCIAL', 'PROPERTY_WAREHOUSE',
    'VEHICLE_TRUCK', 'VEHICLE_VAN', 'VEHICLE_CAR', 'VEHICLE_MOTORCYCLE',
    'EQUIPMENT_CRANE', 'EQUIPMENT_EXCAVATOR', 'EQUIPMENT_BULLDOZER', 'EQUIPMENT_MIXER',
    'EQUIPMENT_COMPRESSOR', 'EQUIPMENT_GENERATOR', 'EQUIPMENT_COMPACTOR', 'EQUIPMENT_PUMP',
    'EQUIPMENT_WELDER', 'EQUIPMENT_SCAFFOLD', 'OTHER',
  ]),
  description: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  supplierPhone: z.string().optional().nullable(),
  dailyRate: z.coerce.number().min(0).optional().nullable(),
  weeklyRate: z.coerce.number().min(0).optional().nullable(),
  monthlyRate: z.coerce.number().min(0).optional().nullable(),
  companyId: z.string().uuid(),
})

const rentalSchema = z.object({
  itemId: z.string().uuid(),
  projectId: z.string().uuid().optional().nullable(),
  billingCycle: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).default('MONTHLY'),
  unitRate: z.coerce.number().min(0),
  startDate: z.string().min(1, 'Data de início é obrigatória'),
  expectedEndDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  companyId: z.string().uuid(),
  costCenterId: z.string().uuid().optional().nullable(),
})

const paymentSchema = z.object({
  rentalId: z.string().uuid(),
  amount: z.coerce.number().min(0.01, 'Valor deve ser maior que zero'),
  paidDate: z.string().min(1, 'Data do pagamento é obrigatória'),
  referenceMonth: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  costCenterId: z.string().uuid().optional().nullable(),
})

// ============================================================================
// RENTAL ITEMS
// ============================================================================

export async function getRentalItems(companyId?: string) {
  try {
    const items = await prisma.rentalItem.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        _count: { select: { rentals: true } },
      },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: items }
  } catch (error) {
    console.error('Erro ao buscar itens de locação:', error)
    return { success: false, error: 'Erro ao buscar itens de locação', data: [] }
  }
}

export async function getRentalItemById(id: string) {
  try {
    const item = await prisma.rentalItem.findUnique({
      where: { id },
      include: {
        rentals: {
          include: {
            project: { select: { id: true, name: true } },
            payments: { orderBy: { paidDate: 'desc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!item) return { success: false, error: 'Item não encontrado' }
    return { success: true, data: item }
  } catch (error) {
    console.error('Erro ao buscar item de locação:', error)
    return { success: false, error: 'Erro ao buscar item de locação' }
  }
}

export async function createRentalItem(data: z.infer<typeof rentalItemSchema>) {
  try {
    const validated = rentalItemSchema.parse(data)
    const item = await prisma.rentalItem.create({
      data: {
        name: validated.name,
        type: validated.type,
        description: validated.description,
        supplier: validated.supplier,
        supplierPhone: validated.supplierPhone,
        dailyRate: validated.dailyRate != null ? validated.dailyRate : null,
        weeklyRate: validated.weeklyRate != null ? validated.weeklyRate : null,
        monthlyRate: validated.monthlyRate != null ? validated.monthlyRate : null,
        companyId: validated.companyId,
      },
    })
    revalidatePath('/locacoes')
    return { success: true, data: item }
  } catch (error) {
    console.error('Erro ao criar item de locação:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar item de locação',
    }
  }
}

export async function updateRentalItem(id: string, data: z.infer<typeof rentalItemSchema>) {
  try {
    const validated = rentalItemSchema.parse(data)
    const item = await prisma.rentalItem.update({
      where: { id },
      data: {
        name: validated.name,
        type: validated.type,
        description: validated.description,
        supplier: validated.supplier,
        supplierPhone: validated.supplierPhone,
        dailyRate: validated.dailyRate != null ? validated.dailyRate : null,
        weeklyRate: validated.weeklyRate != null ? validated.weeklyRate : null,
        monthlyRate: validated.monthlyRate != null ? validated.monthlyRate : null,
      },
    })
    revalidatePath('/locacoes')
    return { success: true, data: item }
  } catch (error) {
    console.error('Erro ao atualizar item de locação:', error)
    return { success: false, error: 'Erro ao atualizar item de locação' }
  }
}

export async function deleteRentalItem(id: string) {
  try {
    const activeRentals = await prisma.rental.findFirst({
      where: { itemId: id, status: 'ACTIVE' },
    })
    if (activeRentals) {
      return { success: false, error: 'Não é possível excluir item com locação ativa.' }
    }
    await prisma.rentalItem.delete({ where: { id } })
    revalidatePath('/locacoes')
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir item:', error)
    return { success: false, error: 'Erro ao excluir item de locação' }
  }
}

// ============================================================================
// RENTALS
// ============================================================================

export async function getRentals(filters?: {
  companyId?: string
  projectId?: string
  status?: string
}) {
  try {
    const where: Record<string, unknown> = {}
    if (filters?.companyId) where.companyId = filters.companyId
    if (filters?.projectId) where.projectId = filters.projectId
    if (filters?.status) where.status = filters.status

    const rentals = await prisma.rental.findMany({
      where,
      include: {
        item: true,
        project: { select: { id: true, name: true } },
        payments: { orderBy: { paidDate: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: rentals }
  } catch (error) {
    console.error('Erro ao buscar locações:', error)
    return { success: false, error: 'Erro ao buscar locações', data: [] }
  }
}

export async function getRentalById(id: string) {
  try {
    const rental = await prisma.rental.findUnique({
      where: { id },
      include: {
        item: true,
        project: { select: { id: true, name: true } },
        payments: { orderBy: { paidDate: 'desc' } },
      },
    })
    if (!rental) return { success: false, error: 'Locação não encontrada' }
    return { success: true, data: rental }
  } catch (error) {
    console.error('Erro ao buscar locação:', error)
    return { success: false, error: 'Erro ao buscar locação' }
  }
}

export async function createRental(data: z.infer<typeof rentalSchema>) {
  try {
    const validated = rentalSchema.parse(data)
    const rental = await prisma.rental.create({
      data: {
        itemId: validated.itemId,
        projectId: validated.projectId ?? null,
        billingCycle: validated.billingCycle,
        unitRate: validated.unitRate,
        startDate: new Date(validated.startDate),
        expectedEndDate: validated.expectedEndDate ? new Date(validated.expectedEndDate) : null,
        notes: validated.notes,
        companyId: validated.companyId,
        status: 'ACTIVE',
        totalPaid: 0,
        costCenterId: validated.costCenterId ?? null,
      },
    })
    revalidatePath('/locacoes')
    return { success: true, data: rental }
  } catch (error) {
    console.error('Erro ao criar locação:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar locação',
    }
  }
}

export async function returnRental(id: string, actualEndDate: string) {
  try {
    const rental = await prisma.rental.update({
      where: { id },
      data: {
        status: 'RETURNED',
        actualEndDate: new Date(actualEndDate),
      },
    })
    revalidatePath('/locacoes')
    revalidatePath(`/locacoes/${id}`)
    return { success: true, data: rental }
  } catch (error) {
    console.error('Erro ao devolver locação:', error)
    return { success: false, error: 'Erro ao devolver locação' }
  }
}

export async function cancelRental(id: string) {
  try {
    const rental = await prisma.rental.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })
    revalidatePath('/locacoes')
    revalidatePath(`/locacoes/${id}`)
    return { success: true, data: rental }
  } catch (error) {
    console.error('Erro ao cancelar locação:', error)
    return { success: false, error: 'Erro ao cancelar locação' }
  }
}

// ============================================================================
// PAYMENTS
// ============================================================================

export async function addRentalPayment(data: z.infer<typeof paymentSchema>) {
  try {
    const validated = paymentSchema.parse(data)
    const payment = await prisma.rentalPayment.create({
      data: {
        rentalId: validated.rentalId,
        amount: validated.amount,
        paidDate: new Date(validated.paidDate),
        referenceMonth: validated.referenceMonth ?? null,
        notes: validated.notes ?? null,
        projectId: validated.projectId ?? null,
        costCenterId: validated.costCenterId ?? null,
      },
    })
    // Update totalPaid on rental
    const allPayments = await prisma.rentalPayment.findMany({
      where: { rentalId: validated.rentalId },
    })
    const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0)
    await prisma.rental.update({
      where: { id: validated.rentalId },
      data: { totalPaid },
    })
    revalidatePath('/locacoes')
    revalidatePath(`/locacoes/${validated.rentalId}`)
    return { success: true, data: payment }
  } catch (error) {
    console.error('Erro ao registrar pagamento:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao registrar pagamento',
    }
  }
}

export async function getRentalPayments(rentalId: string) {
  try {
    const payments = await prisma.rentalPayment.findMany({
      where: { rentalId },
      orderBy: { paidDate: 'desc' },
    })
    return { success: true, data: payments }
  } catch (error) {
    console.error('Erro ao buscar pagamentos:', error)
    return { success: false, error: 'Erro ao buscar pagamentos', data: [] }
  }
}

// ============================================================================
// KPIs
// ============================================================================

export async function getRentalKPIs(companyId: string) {
  try {
    const activeRentals = await prisma.rental.findMany({
      where: { companyId, status: 'ACTIVE' },
      include: { item: true },
    })

    const overdueRentals = await prisma.rental.count({
      where: { companyId, status: 'OVERDUE' },
    })

    // Custo mensal estimado (normalizado para mensal)
    const monthlyCost = activeRentals.reduce((sum, r) => {
      const rate = Number(r.unitRate)
      if (r.billingCycle === 'DAILY') return sum + rate * 30
      if (r.billingCycle === 'WEEKLY') return sum + rate * 4
      return sum + rate
    }, 0)

    // Contagem por categoria
    const properties = activeRentals.filter(r =>
      r.item.type.startsWith('PROPERTY_')
    ).length
    const vehicles = activeRentals.filter(r =>
      r.item.type.startsWith('VEHICLE_')
    ).length
    const equipment = activeRentals.filter(r =>
      r.item.type.startsWith('EQUIPMENT_') || r.item.type === 'OTHER'
    ).length

    return {
      success: true,
      data: {
        activeCount: activeRentals.length,
        overdueCount: overdueRentals,
        monthlyCost,
        properties,
        vehicles,
        equipment,
      },
    }
  } catch (error) {
    console.error('Erro ao calcular KPIs:', error)
    return {
      success: false,
      error: 'Erro ao calcular KPIs',
      data: {
        activeCount: 0,
        overdueCount: 0,
        monthlyCost: 0,
        properties: 0,
        vehicles: 0,
        equipment: 0,
      },
    }
  }
}
