'use client'

import { useCallback, useMemo } from 'react'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'

type FilterValue = string | string[] | number | null

interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
}

export interface UseUrlFiltersReturn {
  filters: Record<string, FilterValue>
  setFilter: (key: string, value: FilterValue) => void
  clearFilters: () => void
  sortBy: SortConfig | null
  setSortBy: (field: string, direction?: 'asc' | 'desc') => void
}

function parseValue(raw: string | string[] | null): FilterValue {
  if (raw === null) return null

  if (Array.isArray(raw)) {
    return raw
  }

  // Tenta converter para number se for numérico
  const asNumber = Number(raw)
  if (raw !== '' && !isNaN(asNumber) && isFinite(asNumber)) {
    return asNumber
  }

  return raw
}

/**
 * Hook para persistir filtros e ordenação na URL via searchParams.
 *
 * @param filterKeys - Lista de chaves de filtro que o hook deve rastrear.
 *   Apenas essas chaves serão lidas/escritas nos searchParams.
 */
export function useUrlFilters(filterKeys: string[]): UseUrlFiltersReturn {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  // Lê os filtros atuais da URL
  const filters = useMemo(() => {
    const result: Record<string, FilterValue> = {}

    for (const key of filterKeys) {
      const all = searchParams.getAll(key)
      if (all.length === 0) {
        result[key] = null
      } else if (all.length === 1) {
        result[key] = parseValue(all[0]!)
      } else {
        result[key] = all
      }
    }

    return result
  }, [searchParams, filterKeys])

  // Lê a ordenação atual da URL
  const sortBy = useMemo<SortConfig | null>(() => {
    const field = searchParams.get('sortBy')
    const direction = searchParams.get('sortDir')

    if (!field) return null

    return {
      field,
      direction: direction === 'desc' ? 'desc' : 'asc',
    }
  }, [searchParams])

  // Cria um novo URLSearchParams preservando params existentes
  const buildParams = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString())
      updater(params)
      return params
    },
    [searchParams]
  )

  // Define ou remove um filtro individual
  const setFilter = useCallback(
    (key: string, value: FilterValue) => {
      const params = buildParams((p) => {
        // Remove todas as entradas anteriores dessa chave
        p.delete(key)

        if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
          // Valor vazio: remove o param
          return
        }

        if (Array.isArray(value)) {
          for (const v of value) {
            p.append(key, String(v))
          }
        } else {
          p.set(key, String(value))
        }
      })

      router.push(`${pathname}?${params.toString()}`)
    },
    [buildParams, pathname, router]
  )

  // Limpa todos os filtros (mantém sortBy/sortDir se existirem)
  const clearFilters = useCallback(() => {
    const params = buildParams((p) => {
      for (const key of filterKeys) {
        p.delete(key)
      }
    })

    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }, [buildParams, filterKeys, pathname, router])

  // Define a ordenação
  const setSortBy = useCallback(
    (field: string, direction: 'asc' | 'desc' = 'asc') => {
      const params = buildParams((p) => {
        if (!field) {
          p.delete('sortBy')
          p.delete('sortDir')
        } else {
          p.set('sortBy', field)
          p.set('sortDir', direction)
        }
      })

      router.push(`${pathname}?${params.toString()}`)
    },
    [buildParams, pathname, router]
  )

  return {
    filters,
    setFilter,
    clearFilters,
    sortBy,
    setSortBy,
  }
}
