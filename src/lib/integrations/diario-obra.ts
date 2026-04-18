import { logger } from '@/lib/logger'

const log = logger.child({ module: 'diario-obra' })

const BASE_URL = 'https://apiexterna.diariodeobra.app/v1'

function getToken() {
  return process.env.DIARIO_OBRA_TOKEN
}

async function fetchDO<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  if (!token) throw new Error('DIARIO_OBRA_TOKEN não configurado')

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Diário de Obra API ${res.status}: ${body}`)
  }

  return res.json() as Promise<T>
}

export interface DOReport {
  id: string
  data: string
  obra_id: string
  obra_nome?: string
  responsavel?: string
  situacao_tempo?: string
  efetivo_total?: number
  observacoes?: string
  created_at?: string
  updated_at?: string
}

export interface DOPaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  total: number
  per_page: number
}

export async function getRDOs(params?: {
  page?: number
  per_page?: number
  obra_id?: string
  data_inicio?: string
  data_fim?: string
}): Promise<DOPaginatedResponse<DOReport>> {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.per_page) qs.set('per_page', String(params.per_page ?? 50))
  if (params?.obra_id) qs.set('obra_id', params.obra_id)
  if (params?.data_inicio) qs.set('data_inicio', params.data_inicio)
  if (params?.data_fim) qs.set('data_fim', params.data_fim)

  return fetchDO<DOPaginatedResponse<DOReport>>(`/rdos?${qs}`)
}

export async function getRDOById(id: string): Promise<DOReport> {
  return fetchDO<DOReport>(`/rdos/${id}`)
}

export async function getObras(params?: { page?: number }): Promise<DOPaginatedResponse<{ id: string; nome: string; codigo?: string }>> {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  return fetchDO(`/obras?${qs}`)
}

export async function testConnection(): Promise<boolean> {
  try {
    await fetchDO('/obras?per_page=1')
    return true
  } catch (err) {
    log.warn({ err }, 'Diário de Obra connection test failed')
    return false
  }
}
