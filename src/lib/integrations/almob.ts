import { logger } from '@/lib/logger'

const log = logger.child({ module: 'almob' })

const BASE_URL = 'https://api.almob.com.br/api/public/v1'

function getToken() {
  return process.env.ALMOB_TOKEN
}

async function fetchAlmob<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  if (!token) throw new Error('ALMOB_TOKEN não configurado')

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options?.headers ?? {}),
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Almob API ${res.status}: ${body}`)
  }

  return res.json() as Promise<T>
}

export interface AlmobMaterial {
  id: string | number
  codigo?: string
  descricao: string
  unidade: string
  grupo?: string
  estoque_atual?: number
  estoque_minimo?: number
  preco_unitario?: number
}

export interface AlmobMovimento {
  id: string | number
  tipo: 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'
  material_id: string | number
  material_descricao?: string
  quantidade: number
  data: string
  obra_id?: string | number
  solicitante?: string
  observacao?: string
}

export interface AlmobPaginatedResponse<T> {
  data: T[]
  page: number
  total: number
  per_page: number
}

export async function getMateriais(params?: {
  page?: number
  per_page?: number
  search?: string
}): Promise<AlmobPaginatedResponse<AlmobMaterial>> {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.per_page) qs.set('per_page', String(params.per_page ?? 100))
  if (params?.search) qs.set('search', params.search)
  return fetchAlmob<AlmobPaginatedResponse<AlmobMaterial>>(`/materiais?${qs}`)
}

export async function getMovimentos(params?: {
  page?: number
  per_page?: number
  data_inicio?: string
  data_fim?: string
  obra_id?: string
}): Promise<AlmobPaginatedResponse<AlmobMovimento>> {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.per_page) qs.set('per_page', String(params.per_page ?? 100))
  if (params?.data_inicio) qs.set('data_inicio', params.data_inicio)
  if (params?.data_fim) qs.set('data_fim', params.data_fim)
  if (params?.obra_id) qs.set('obra_id', params.obra_id)
  return fetchAlmob<AlmobPaginatedResponse<AlmobMovimento>>(`/movimentos?${qs}`)
}

export async function getEstoque(): Promise<AlmobPaginatedResponse<AlmobMaterial & { estoque_atual: number }>> {
  return fetchAlmob(`/estoque`)
}

export async function testConnection(): Promise<boolean> {
  try {
    await fetchAlmob('/materiais?per_page=1')
    return true
  } catch (err) {
    log.warn({ err }, 'Almob connection test failed')
    return false
  }
}
