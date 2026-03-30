/**
 * Search and filtering utilities
 */

export interface SearchOptions {
  query: string
  caseSensitive?: boolean
  fuzzy?: boolean
  limit?: number
}

export interface SearchResult<T> {
  item: T
  score: number
  highlights?: string[]
}

/**
 * Perform fuzzy search on array
 */
export function fuzzySearch<T extends Record<string, any>>(
  items: T[],
  query: string,
  fields: (keyof T)[],
  options: Partial<SearchOptions> = {}
): SearchResult<T>[] {
  const { caseSensitive = false, limit = 10 } = options

  const normalizeString = (str: string) =>
    caseSensitive ? str : str.toLowerCase()

  const normalizedQuery = normalizeString(query)
  const results: SearchResult<T>[] = []

  items.forEach(item => {
    let totalScore = 0
    const highlights: string[] = []

    fields.forEach(field => {
      const value = normalizeString(String(item[field] || ''))
      const fieldScore = calculateFuzzyScore(normalizedQuery, value)

      if (fieldScore > 0) {
        totalScore += fieldScore
        highlights.push(String(item[field]))
      }
    })

    if (totalScore > 0) {
      results.push({
        item,
        score: totalScore,
        highlights,
      })
    }
  })

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * Calculate fuzzy score between two strings
 */
export function calculateFuzzyScore(query: string, text: string): number {
  if (!query) return 0
  if (text === query) return 100
  if (text.includes(query)) return 50

  let score = 0
  let lastIndex = 0

  for (let i = 0; i < query.length; i++) {
    const char = query[i]
    const index = text.indexOf(char, lastIndex)

    if (index === -1) return 0
    if (index === lastIndex) score += 2
    else if (index === lastIndex + 1) score += 1

    lastIndex = index + 1
  }

  return score
}

/**
 * Highlight search matches in text
 */
export function highlightMatches(text: string, query: string): string {
  if (!query) return text

  const regex = new RegExp(`(${query})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

/**
 * Build filter from URL search params
 */
export interface FilterCriteria {
  [key: string]: string | number | boolean | string[]
}

export function buildFilterFromParams(params: URLSearchParams): FilterCriteria {
  const filters: FilterCriteria = {}

  params.forEach((value, key) => {
    if (value.includes(',')) {
      filters[key] = value.split(',')
    } else if (value === 'true' || value === 'false') {
      filters[key] = value === 'true'
    } else if (!isNaN(Number(value))) {
      filters[key] = Number(value)
    } else {
      filters[key] = value
    }
  })

  return filters
}

/**
 * Apply filters to array
 */
export function applyFilters<T extends Record<string, any>>(
  items: T[],
  filters: FilterCriteria
): T[] {
  return items.filter(item => {
    return Object.entries(filters).every(([key, value]) => {
      const itemValue = item[key]

      if (Array.isArray(value)) {
        return value.includes(itemValue)
      }

      if (typeof value === 'string') {
        return String(itemValue).toLowerCase().includes(String(value).toLowerCase())
      }

      return itemValue === value
    })
  })
}

/**
 * Get unique values from field
 */
export function getUniqueValues<T extends Record<string, any>>(
  items: T[],
  field: keyof T
): any[] {
  return Array.from(new Set(items.map(item => item[field]).filter(Boolean)))
}

/**
 * Sort array by multiple fields
 */
export interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
}

export function sortByMultiple<T extends Record<string, any>>(
  items: T[],
  config: SortConfig[]
): T[] {
  return [...items].sort((a, b) => {
    for (const { field, direction } of config) {
      const aValue = a[field]
      const bValue = b[field]

      if (aValue === bValue) continue

      const comparison = aValue < bValue ? -1 : 1
      return direction === 'asc' ? comparison : -comparison
    }

    return 0
  })
}

/**
 * Debounce function for search input
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return function debounced(...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      fn(...args)
    }, delay)
  }
}

/**
 * Throttle function for search input
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCallTime = 0

  return function throttled(...args: Parameters<T>) {
    const now = Date.now()
    if (now - lastCallTime >= delay) {
      lastCallTime = now
      fn(...args)
    }
  }
}
