export interface FilterParams {
  search?: string
  status?: string | string[]
  dateFrom?: string
  dateTo?: string
  [key: string]: any
}

export function buildWhereClause(filters: FilterParams, searchFields: string[] = []) {
  const where: any = {}

  if (filters.search && searchFields.length > 0) {
    where.OR = searchFields.map(field => ({ [field]: { contains: filters.search, mode: 'insensitive' } }))
  }

  if (filters.status) {
    where.status = Array.isArray(filters.status) ? { in: filters.status } : filters.status
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {}
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom)
    if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo)
  }

  return where
}
