export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export function getPaginationArgs(params: PaginationParams = {}) {
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 25))
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize }
}

export function paginatedResponse<T>(data: T[], total: number, page: number, pageSize: number): PaginatedResult<T> {
  return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }
}
