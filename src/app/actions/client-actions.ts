'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getNextCode } from '@/lib/sequence'
import { getSession } from '@/lib/auth'
import { assertCanDelete } from '@/lib/permissions'

const clientSchema = z.object({
  type: z.enum(['COMPANY', 'INDIVIDUAL']).default('COMPANY'),
  companyName: z.string().optional(),
  tradeName: z.string().optional(),
  cnpj: z.string().optional(),
  personName: z.string().optional(),
  cpf: z.string().optional(),
  displayName: z.string().min(2, 'Nome de exibição é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  contactPerson: z.string().optional(),
  contactRole: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).default('ACTIVE'),
  companyId: z.string().uuid('Empresa inválida'),
})

export type ClientFormData = z.infer<typeof clientSchema>

export async function getClients(companyId?: string) {
  try {
    const clients = await prisma.client.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        _count: {
          select: {
            projects: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: clients }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao buscar clientes' }
  }
}

export async function getClientById(id: string) {
  try {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        projects: {
          include: {
            _count: {
              select: {
                bulletins: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!client) {
      return { success: false, error: 'Cliente não encontrado' }
    }

    // Serialize Decimal fields from projects
    const serialized = {
      ...client,
      projects: client.projects.map((p) => ({
        ...p,
        budget: Number(p.budget || 0),
      })),
    }

    return { success: true, data: serialized }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao buscar cliente' }
  }
}

export async function createClient(data: unknown) {
  try {
    const validated = clientSchema.parse(data)

    const code = await getNextCode('client', validated.companyId)

    const client = await prisma.client.create({
      data: {
        code,
        type: validated.type,
        companyName: validated.companyName || null,
        tradeName: validated.tradeName || null,
        cnpj: validated.cnpj || null,
        personName: validated.personName || null,
        cpf: validated.cpf || null,
        displayName: validated.displayName,
        email: validated.email || null,
        phone: validated.phone || null,
        mobile: validated.mobile || null,
        address: validated.address || null,
        number: validated.number || null,
        complement: validated.complement || null,
        neighborhood: validated.neighborhood || null,
        city: validated.city || null,
        state: validated.state || null,
        zipCode: validated.zipCode || null,
        contactPerson: validated.contactPerson || null,
        contactRole: validated.contactRole || null,
        notes: validated.notes || null,
        status: validated.status,
        companyId: validated.companyId,
      },
    })

    revalidatePath('/clientes')
    return { success: true, data: client }
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return { success: false, error: error.errors[0]?.message || 'Dados inválidos' }
    }
    return { success: false, error: error.message || 'Erro ao criar cliente' }
  }
}

export async function updateClient(id: string, data: unknown) {
  try {
    const validated = clientSchema.partial().parse(data)

    const client = await prisma.client.update({
      where: { id },
      data: {
        type: validated.type,
        companyName: validated.companyName || null,
        tradeName: validated.tradeName || null,
        cnpj: validated.cnpj || null,
        personName: validated.personName || null,
        cpf: validated.cpf || null,
        displayName: validated.displayName,
        email: validated.email || null,
        phone: validated.phone || null,
        mobile: validated.mobile || null,
        address: validated.address || null,
        number: validated.number || null,
        complement: validated.complement || null,
        neighborhood: validated.neighborhood || null,
        city: validated.city || null,
        state: validated.state || null,
        zipCode: validated.zipCode || null,
        contactPerson: validated.contactPerson || null,
        contactRole: validated.contactRole || null,
        notes: validated.notes || null,
        status: validated.status,
      },
    })

    revalidatePath('/clientes')
    revalidatePath(`/clientes/${id}`)
    return { success: true, data: client }
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return { success: false, error: error.errors[0]?.message || 'Dados inválidos' }
    }
    return { success: false, error: error.message || 'Erro ao atualizar cliente' }
  }
}

export async function changeClientStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED') {
  try {
    const client = await prisma.client.update({
      where: { id },
      data: { status },
    })

    revalidatePath('/clientes')
    revalidatePath(`/clientes/${id}`)
    return { success: true, data: client }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao alterar status do cliente' }
  }
}

export async function deleteClient(id: string) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return { success: false, error: 'Não autenticado' }
    }

    assertCanDelete(session.user)

    // Check for active projects
    const activeProjects = await prisma.project.findMany({
      where: {
        clientId: id,
        status: { notIn: ['COMPLETED', 'CANCELLED'] }
      }
    })

    if (activeProjects.length > 0) {
      return { success: false, error: `Não é possível deletar um cliente com ${activeProjects.length} projeto(s) ativo(s)` }
    }

    await prisma.client.delete({
      where: { id }
    })

    revalidatePath('/clientes')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao deletar cliente' }
  }
}
