'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getNextCode } from '@/lib/sequence'
import { getSession } from '@/lib/auth'
import { assertAuthenticated, assertCompanyAccess } from '@/lib/auth-helpers'
import { assertCanDelete } from '@/lib/permissions'
import { getPaginationArgs, paginatedResponse, type PaginationParams } from '@/lib/pagination'
import { buildWhereClause, type FilterParams } from '@/lib/filters'
import { logCreate, logUpdate, logDelete, logAction } from '@/lib/audit-logger'

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

export async function getClients(params?: {
  companyId?: string
  pagination?: PaginationParams
  filters?: FilterParams
}) {
  try {
    const session = await getSession()
    if (!session?.user) return { success: true, data: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } }

    const { skip, take, page, pageSize } = getPaginationArgs(params?.pagination)
    const filterWhere = buildWhereClause(params?.filters || {}, ['displayName', 'cnpj', 'cpf'])
    const where = {
      companyId: (session.user as any).companyId,
      ...filterWhere
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take,
        include: {
          _count: {
            select: {
              projects: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.client.count({ where })
    ])

    return { success: true, data: clients, pagination: paginatedResponse(clients, total, page, pageSize).pagination }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao buscar clientes', data: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } }
  }
}

export async function getClientById(id: string) {
  try {
    const session = await assertAuthenticated()

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

    if (client.companyId) {
      await assertCompanyAccess(session, client.companyId)
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
    const session = await getSession()
    if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

    // Check write permission - USER role cannot create
    if (session.user.role === 'USER') {
      return { success: false, error: 'Sem permissão para criar cliente' }
    }

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

    await logCreate('Client', client.id, client.displayName, validated)

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
    const session = await getSession()
    if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

    // Check write permission - USER role cannot update
    if (session.user.role === 'USER') {
      return { success: false, error: 'Sem permissão para editar cliente' }
    }

    const validated = clientSchema.partial().parse(data)

    // Only include fields that were actually provided (not undefined)
    const updateData: any = {
      ...(validated.type !== undefined && { type: validated.type }),
      ...(validated.companyName !== undefined && { companyName: validated.companyName }),
      ...(validated.tradeName !== undefined && { tradeName: validated.tradeName }),
      ...(validated.cnpj !== undefined && { cnpj: validated.cnpj }),
      ...(validated.personName !== undefined && { personName: validated.personName }),
      ...(validated.cpf !== undefined && { cpf: validated.cpf }),
      ...(validated.displayName !== undefined && { displayName: validated.displayName }),
      ...(validated.email !== undefined && { email: validated.email }),
      ...(validated.phone !== undefined && { phone: validated.phone }),
      ...(validated.mobile !== undefined && { mobile: validated.mobile }),
      ...(validated.address !== undefined && { address: validated.address }),
      ...(validated.number !== undefined && { number: validated.number }),
      ...(validated.complement !== undefined && { complement: validated.complement }),
      ...(validated.neighborhood !== undefined && { neighborhood: validated.neighborhood }),
      ...(validated.city !== undefined && { city: validated.city }),
      ...(validated.state !== undefined && { state: validated.state }),
      ...(validated.zipCode !== undefined && { zipCode: validated.zipCode }),
      ...(validated.contactPerson !== undefined && { contactPerson: validated.contactPerson }),
      ...(validated.contactRole !== undefined && { contactRole: validated.contactRole }),
      ...(validated.notes !== undefined && { notes: validated.notes }),
      ...(validated.status !== undefined && { status: validated.status }),
    }

    const oldData = await prisma.client.findUnique({ where: { id } })

    const client = await prisma.client.update({
      where: { id },
      data: updateData,
    })

    await logUpdate('Client', id, client.displayName, oldData, client)

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
    const session = await getSession()
    if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

    // Check write permission - USER role cannot change status
    if (session.user.role === 'USER') {
      return { success: false, error: 'Sem permissão para alterar status do cliente' }
    }

    const client = await prisma.client.update({
      where: { id },
      data: { status },
    })

    await logAction(status === 'BLOCKED' ? 'BLOCK' : 'STATUS_CHANGE', 'Client', id, client.displayName, `Status alterado para ${status}`)

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

    const old = await prisma.client.findUnique({ where: { id } })

    await prisma.client.delete({
      where: { id }
    })

    if (old) {
      await logDelete('Client', id, old.displayName, old)
    }

    revalidatePath('/clientes')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao deletar cliente' }
  }
}
