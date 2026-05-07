/**
 * Pagination Helper
 *
 * Utilitários para paginação consistente em todo o sistema
 */

export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface PaginationResult<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

/**
 * Normaliza parâmetros de paginação — aceita undefined (sem paginação explícita)
 */
export function normalizePaginationParams(params?: PaginationParams): {
  page: number
  pageSize: number
  skip: number
  take: number
} {
  const page = Math.max(1, params?.page || 1)
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, params?.pageSize || DEFAULT_PAGE_SIZE)
  )
  const skip = (page - 1) * pageSize
  const take = pageSize

  return { page, pageSize, skip, take }
}

/**
 * Cria objeto de resultado paginado
 */
export function createPaginationResult<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): PaginationResult<T> {
  const totalPages = Math.ceil(total / pageSize)

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  }
}

/**
 * Helper para paginação com Prisma
 */
export async function paginateQuery<T, M extends { findMany: any; count: any }>(
  model: M,
  params: PaginationParams | undefined,
  query: {
    where?: any
    orderBy?: any
    select?: any
    include?: any
  } = {}
): Promise<PaginationResult<T>> {
  const { page, pageSize, skip, take } = normalizePaginationParams(params)

  const [data, total] = await Promise.all([
    model.findMany({
      ...query,
      skip,
      take,
    }),
    model.count({
      where: query.where,
    }),
  ])

  return createPaginationResult(data, total, page, pageSize)
}

/**
 * Extrai parâmetros de paginação de URL search params
 */
export function getPaginationFromSearchParams(
  searchParams: URLSearchParams | { [key: string]: string | string[] | undefined }
): PaginationParams {
  const getParam = (key: string): string | undefined => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) || undefined
    }
    const value = searchParams[key]
    return Array.isArray(value) ? value[0] : value
  }

  const page = parseInt(getParam('page') || '1', 10)
  const pageSize = parseInt(getParam('pageSize') || String(DEFAULT_PAGE_SIZE), 10)

  return { page, pageSize }
}

/**
 * Gera URL com parâmetros de paginação
 */
export function getPaginationUrl(
  baseUrl: string,
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
  additionalParams: Record<string, string> = {}
): string {
  const url = new URL(baseUrl, 'http://localhost')
  url.searchParams.set('page', String(page))
  url.searchParams.set('pageSize', String(pageSize))

  Object.entries(additionalParams).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  return url.pathname + url.search
}

/**
 * Alias para compatibilidade — aceita undefined sem crash
 */
export function getPaginationArgs(params?: PaginationParams) {
  return normalizePaginationParams(params)
}

/**
 * Alias para compatibilidade
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
) {
  return createPaginationResult(data, total, page, pageSize)
}
