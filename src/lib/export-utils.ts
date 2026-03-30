/**
 * Utility functions for exporting data to various formats
 */

export interface ExportColumn {
  key: string
  label: string
  format?: (value: any) => string
}

/**
 * Exports data to CSV format with BOM for Excel compatibility
 */
export function exportToCSV(
  data: any[],
  filename: string,
  columns: ExportColumn[]
): void {
  if (data.length === 0) {
    console.warn('No data to export')
    return
  }

  // CSV header
  const headers = columns.map(col => `"${col.label}"`).join(',')

  // CSV rows
  const rows = data.map(item =>
    columns
      .map(col => {
        let value = item[col.key]
        if (col.format) {
          value = col.format(value)
        }
        // Escape quotes and wrap in quotes
        const stringValue = String(value || '')
        return `"${stringValue.replace(/"/g, '""')}"`
      })
      .join(',')
  )

  // Combine and add BOM for Excel
  const csv = [headers, ...rows].join('\n')
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })

  // Trigger download
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
 * Formats currency value in Brazilian Real
 */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return 'R$ 0,00'
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num)
}

/**
 * Formats date in Brazilian format (dd/mm/yyyy)
 */
export function formatDate(date: Date | string): string {
  if (!date) return ''
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateObj)
}

/**
 * Formats date and time in Brazilian format (dd/mm/yyyy HH:mm)
 */
export function formatDateTime(date: Date | string): string {
  if (!date) return ''
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(dateObj)
}

/**
 * Formats percentage
 */
export function formatPercent(value: number | string, decimals = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return `${num.toFixed(decimals)}%`
}

/**
 * Formats number with thousands separator
 */
export function formatNumber(value: number | string, decimals = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

/**
 * Formats time duration (seconds to HH:mm:ss)
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/**
 * Truncates text with ellipsis
 */
export function truncateText(text: string, length: number): string {
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}

/**
 * Capitalizes first letter of each word
 */
export function capitalizeWords(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Converts bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}
