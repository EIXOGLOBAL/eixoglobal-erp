/**
 * Table and data display utilities
 */

export interface Column<T> {
  id: string
  label: string
  sortable?: boolean
  filterable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  render?: (value: any, row: T) => React.ReactNode
}

export interface SortState {
  column: string | null
  direction: 'asc' | 'desc'
}

export interface PaginationState {
  page: number
  pageSize: number
  total: number
}

/**
 * Paginate array
 */
export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number
): { items: T[]; pagination: PaginationState } {
  const total = items.length
  const skip = (page - 1) * pageSize
  const paginatedItems = items.slice(skip, skip + pageSize)

  return {
    items: paginatedItems,
    pagination: {
      page,
      pageSize,
      total,
    },
  }
}

/**
 * Sort array
 */
export function sortData<T extends Record<string, any>>(
  items: T[],
  column: string,
  direction: 'asc' | 'desc'
): T[] {
  return [...items].sort((a, b) => {
    const aValue = a[column]
    const bValue = b[column]

    // Handle null/undefined
    if (aValue == null && bValue == null) return 0
    if (aValue == null) return direction === 'asc' ? 1 : -1
    if (bValue == null) return direction === 'asc' ? -1 : 1

    // Sort by type
    if (typeof aValue === 'string') {
      const comparison = aValue.localeCompare(bValue)
      return direction === 'asc' ? comparison : -comparison
    }

    if (typeof aValue === 'number') {
      return direction === 'asc' ? aValue - bValue : bValue - aValue
    }

    if (aValue instanceof Date && bValue instanceof Date) {
      return direction === 'asc'
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime()
    }

    // Fallback to string comparison
    const aStr = String(aValue)
    const bStr = String(bValue)
    const comparison = aStr.localeCompare(bStr)
    return direction === 'asc' ? comparison : -comparison
  })
}

/**
 * Filter array
 */
export function filterData<T extends Record<string, any>>(
  items: T[],
  filters: Record<string, any>
): T[] {
  return items.filter(item => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true

      const itemValue = item[key]
      if (itemValue == null) return false

      if (Array.isArray(value)) {
        return value.includes(itemValue)
      }

      if (typeof value === 'string') {
        return String(itemValue).toLowerCase().includes(value.toLowerCase())
      }

      return itemValue === value
    })
  })
}

/**
 * Select multiple rows
 */
export function toggleRowSelection(
  selectedRows: Set<string>,
  rowId: string
): Set<string> {
  const updated = new Set(selectedRows)
  if (updated.has(rowId)) {
    updated.delete(rowId)
  } else {
    updated.add(rowId)
  }
  return updated
}

/**
 * Select all rows
 */
export function selectAllRows<T extends { id: string }>(
  items: T[]
): Set<string> {
  return new Set(items.map(item => item.id))
}

/**
 * Get selected items
 */
export function getSelectedItems<T extends { id: string }>(
  items: T[],
  selectedRows: Set<string>
): T[] {
  return items.filter(item => selectedRows.has(item.id))
}

/**
 * Generate table row key
 */
export function getRowKey<T extends Record<string, any>>(
  row: T,
  index: number,
  idField: string = 'id'
): string {
  return row[idField] ? String(row[idField]) : String(index)
}

/**
 * Get column value
 */
export function getColumnValue<T extends Record<string, any>>(
  row: T,
  column: Column<T>
): any {
  return row[column.id]
}

/**
 * Export table to CSV
 */
export function exportTableToCSV<T extends Record<string, any>>(
  items: T[],
  columns: Column<T>[],
  filename: string
): void {
  const headers = columns.map(col => `"${col.label}"`).join(',')
  const rows = items.map(item =>
    columns
      .map(col => {
        const value = item[col.id]
        const stringValue = String(value || '')
        return `"${stringValue.replace(/"/g, '""')}"`
      })
      .join(',')
  )

  const csv = [headers, ...rows].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })

  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Format cell value for display
 */
export function formatCellValue(
  value: any,
  type: 'text' | 'number' | 'currency' | 'date' | 'boolean' = 'text'
): string {
  if (value == null) return '-'

  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(Number(value))

    case 'number':
      return new Intl.NumberFormat('pt-BR').format(Number(value))

    case 'date':
      return new Intl.DateTimeFormat('pt-BR').format(new Date(value))

    case 'boolean':
      return value ? 'Sim' : 'Não'

    default:
      return String(value)
  }
}

/**
 * Get column width class
 */
export function getColumnWidthClass(width?: string): string {
  if (!width) return 'w-auto'

  const widthMap: Record<string, string> = {
    'xs': 'w-12',
    'sm': 'w-24',
    'md': 'w-40',
    'lg': 'w-64',
    'xl': 'w-80',
  }

  return widthMap[width] || width
}

/**
 * Get text align class
 */
export function getAlignClass(align?: 'left' | 'center' | 'right'): string {
  const alignMap = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }
  return alignMap[align || 'left']
}
