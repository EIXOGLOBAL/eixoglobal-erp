'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'search' })

export interface SearchResult {
  id: string
  type: 'project' | 'contract' | 'employee' | 'client' | 'supplier'
  title: string
  subtitle?: string
  url: string
  icon?: string
}

export interface SearchResponse {
  projects: SearchResult[]
  contracts: SearchResult[]
  employees: SearchResult[]
  clients: SearchResult[]
  suppliers: SearchResult[]
}

/**
 * Global search across multiple resources
 * Returns grouped results limited to 5 per category
 */
export async function globalSearch(query: string): Promise<SearchResponse> {
  const results: SearchResponse = {
    projects: [],
    contracts: [],
    employees: [],
    clients: [],
    suppliers: [],
  }

  try {
    const session = await getSession()
    if (!session?.user) {
      return results
    }

    const companyId = (session.user as any).companyId
    const searchQuery = query.toLowerCase().trim()

    if (!searchQuery || searchQuery.length < 2) {
      return results
    }

    // Search Projects
    const projects = await prisma.project.findMany({
      where: {
        companyId,
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { code: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
      },
      take: 5,
    })

    results.projects = projects.map(p => ({
      id: p.id,
      type: 'project' as const,
      title: p.name,
      subtitle: `${p.code} • ${p.status}`,
      url: `/projetos/${p.id}`,
      icon: 'folder',
    }))

    // Search Contracts
    const contracts = await prisma.contract.findMany({
      where: {
        companyId,
        OR: [
          { identifier: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        identifier: true,
        status: true,
      },
      take: 5,
    })

    results.contracts = contracts.map(c => ({
      id: c.id,
      type: 'contract' as const,
      title: c.identifier,
      subtitle: `${c.status}`,
      url: `/contratos/${c.id}`,
      icon: 'file-text',
    }))

    // Search Employees
    const employees = await prisma.employee.findMany({
      where: {
        companyId,
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { document: { contains: searchQuery, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        jobTitle: true,
      },
      take: 5,
    })

    results.employees = employees.map(e => ({
      id: e.id,
      type: 'employee' as const,
      title: e.name,
      subtitle: e.jobTitle || '',
      url: `/rh/funcionarios/${e.id}`,
      icon: 'user',
    }))

    // Search Clients
    const clients = await prisma.client.findMany({
      where: {
        companyId,
        OR: [
          { displayName: { contains: searchQuery, mode: 'insensitive' } },
          { cnpj: { contains: searchQuery, mode: 'insensitive' } },
          { cpf: { contains: searchQuery, mode: 'insensitive' } },
          { email: { contains: searchQuery, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        displayName: true,
        type: true,
        cnpj: true,
        cpf: true,
      },
      take: 5,
    })

    results.clients = clients.map(c => ({
      id: c.id,
      type: 'client' as const,
      title: c.displayName,
      subtitle: c.type === 'COMPANY' ? (c.cnpj || '') : (c.cpf || ''),
      url: `/clientes/${c.id}`,
      icon: 'building',
    }))

    // Search Suppliers
    const suppliers = await prisma.supplier.findMany({
      where: {
        companyId,
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { cnpj: { contains: searchQuery, mode: 'insensitive' } },
          { email: { contains: searchQuery, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        cnpj: true,
        email: true,
      },
      take: 5,
    })

    results.suppliers = suppliers.map(s => ({
      id: s.id,
      type: 'supplier' as const,
      title: s.name,
      subtitle: s.cnpj || s.email || '',
      url: `/fornecedores/${s.id}`,
      icon: 'truck',
    }))

    return results
  } catch (error: any) {
    log.error({ err: error }, 'Search error')
    return results
  }
}

/**
 * Get recent searches for the current user
 */
export async function getRecentSearches(limit: number = 5) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return []
    }

    // Note: This would require a SearchHistory model in the schema
    // For now, returning empty array
    return []
  } catch (error) {
    log.error({ err: error }, 'Error fetching recent searches')
    return []
  }
}

/**
 * Save a search to history
 */
export async function saveSearch(query: string) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return { success: false }
    }

    // Note: This would require a SearchHistory model in the schema
    // For now, this is a placeholder
    return { success: true }
  } catch (error) {
    log.error({ err: error }, 'Error saving search')
    return { success: false }
  }
}
