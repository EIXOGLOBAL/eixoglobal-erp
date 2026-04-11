/**
 * Utility functions for exporting data to CSV, PDF (via print), and Excel formats.
 * All formatting follows PT-BR conventions (dd/mm/yyyy dates, comma decimal separator).
 */

import * as XLSX from 'xlsx'

export interface ExportColumn {
  key: string
  label: string
  format?: (value: unknown) => string
}

export interface ExportToPDFOptions {
  orientation?: 'portrait' | 'landscape'
  companyName?: string
  companySubtitle?: string
  pageSize?: 'A4' | 'Letter'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a value for PT-BR display (dates -> dd/mm/yyyy, numbers -> comma decimal) */
function formatValuePTBR(value: unknown): string {
  if (value === null || value === undefined) return ''

  // Date instances
  if (value instanceof Date) {
    return new Intl.DateTimeFormat('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(value)
  }

  // ISO date strings (yyyy-mm-dd or full ISO)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const d = new Date(value)
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('pt-BR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d)
    }
  }

  // Numbers -> comma decimal separator
  if (typeof value === 'number') {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    }).format(value)
  }

  return String(value)
}

/** Resolve a cell value using column definition */
function resolveCell(item: Record<string, unknown>, col: ExportColumn): string {
  const raw = item[col.key]
  if (col.format) return col.format(raw)
  return formatValuePTBR(raw)
}

/** Trigger browser download from a Blob */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  // Cleanup after a short delay so the download starts
  setTimeout(() => {
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, 100)
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

/**
 * Exports data to CSV with UTF-8 BOM for proper PT-BR display in Excel.
 * Dates are formatted as dd/mm/yyyy. Numbers use comma as decimal separator.
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string
): void {
  if (!data.length) {
    console.warn('exportToCSV: nenhum dado para exportar')
    return
  }

  // Separator is semicolon for PT-BR Excel compatibility
  const SEP = ';'

  // Header row
  const headerLine = columns
    .map((col) => `"${col.label.replace(/"/g, '""')}"`)
    .join(SEP)

  // Data rows
  const dataLines = data.map((item) =>
    columns
      .map((col) => {
        const value = resolveCell(item, col)
        // Escape double-quotes and wrap in quotes
        return `"${value.replace(/"/g, '""')}"`
      })
      .join(SEP)
  )

  const csvContent = [headerLine, ...dataLines].join('\r\n')

  // BOM + content
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], {
    type: 'text/csv;charset=utf-8;',
  })

  const safeName = filename.replace(/\.csv$/i, '')
  downloadBlob(blob, `${safeName}.csv`)
}

// ---------------------------------------------------------------------------
// PDF Export (via hidden iframe + window.print)
// ---------------------------------------------------------------------------

/**
 * Creates a hidden iframe with a styled HTML table and triggers the browser
 * print dialog (which allows saving as PDF).
 * Header includes title + generation date. Footer shows timestamp.
 */
export function exportToPDF(
  title: string,
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  options: ExportToPDFOptions = {}
): void {
  if (!data.length) {
    console.warn('exportToPDF: nenhum dado para exportar')
    return
  }

  const {
    orientation = 'landscape',
    companyName = 'Eixo Global ERP',
    companySubtitle = '',
    pageSize = 'A4',
  } = options

  const now = new Date()
  const dateStr = new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(now)

  // Build table header
  const thCells = columns
    .map(
      (col) =>
        `<th style="border:1px solid #cbd5e1;padding:6px 10px;background:#1e40af;color:#fff;font-size:11px;font-weight:600;text-align:left;white-space:nowrap;">${col.label}</th>`
    )
    .join('')

  // Build table rows
  const tbodyRows = data
    .map((item, idx) => {
      const bgColor = idx % 2 === 0 ? '#fff' : '#f1f5f9'
      const cells = columns
        .map(
          (col) =>
            `<td style="border:1px solid #e2e8f0;padding:5px 10px;font-size:10px;background:${bgColor};">${resolveCell(item, col)}</td>`
        )
        .join('')
      return `<tr>${cells}</tr>`
    })
    .join('')

  const subtitleHtml = companySubtitle
    ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">${companySubtitle}</div>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page {
      size: ${pageSize} ${orientation};
      margin: 15mm;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; }
    .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1e40af; padding-bottom: 8px; margin-bottom: 16px; }
    .header-left h1 { font-size: 16px; color: #1e40af; margin: 0; }
    .header-left h2 { font-size: 13px; color: #334155; font-weight: 400; margin-top: 2px; }
    .header-right { text-align: right; font-size: 10px; color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; }
    .total-rows { font-size: 10px; color: #64748b; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>${companyName}</h1>
      ${subtitleHtml}
      <h2>${title}</h2>
    </div>
    <div class="header-right">
      Gerado em: ${dateStr}
    </div>
  </div>
  <table>
    <thead><tr>${thCells}</tr></thead>
    <tbody>${tbodyRows}</tbody>
  </table>
  <div class="total-rows">Total de registros: ${data.length}</div>
  <div class="footer">
    <span>${companyName} - Sistema ERP</span>
    <span>${dateStr}</span>
  </div>
</body>
</html>`

  // Create hidden iframe, write content, and trigger print
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  document.body.appendChild(iframe)

  const iframeDoc = iframe.contentWindow?.document
  if (!iframeDoc) {
    console.error('exportToPDF: falha ao criar iframe')
    document.body.removeChild(iframe)
    return
  }

  iframeDoc.open()
  iframeDoc.write(html)
  iframeDoc.close()

  // Wait for content to render, then print
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      // Remove iframe after print dialog closes
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
    }, 250)
  }

  // Fallback: if onload doesn't fire (some browsers), trigger after a delay
  setTimeout(() => {
    if (document.body.contains(iframe)) {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe)
        }
      }, 1000)
    }
  }, 1500)
}

// ---------------------------------------------------------------------------
// Excel Export
// ---------------------------------------------------------------------------

/**
 * Exports data to .xlsx using the xlsx library.
 * Applies PT-BR formatting (dates, currency, numbers) and auto-sized columns.
 */
export function exportToExcel(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string,
  sheetName: string = 'Dados'
): void {
  if (!data.length) {
    console.warn('exportToExcel: nenhum dado para exportar')
    return
  }

  // Header row
  const headers = columns.map((col) => col.label)

  // Data rows - apply column formatters or PT-BR defaults
  const rows = data.map((item) =>
    columns.map((col) => {
      const raw = item[col.key]
      if (col.format) return col.format(raw)
      return formatValuePTBR(raw)
    })
  )

  const wsData = [headers, ...rows]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Auto-size columns based on content width
  const colWidths = columns.map((col, colIdx) => {
    let maxLen = col.label.length
    for (const row of rows) {
      const cellLen = String(row[colIdx] ?? '').length
      if (cellLen > maxLen) maxLen = cellLen
    }
    return { wch: Math.min(Math.max(maxLen + 2, 10), 50) }
  })
  ws['!cols'] = colWidths

  // Style header row (bold) - works with xlsx-style compatible builds
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c })
    if (ws[addr]) {
      ws[addr].s = { font: { bold: true } }
    }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  const safeName = filename.replace(/\.xlsx$/i, '')
  const dateStamp = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `${safeName}_${dateStamp}.xlsx`)
}

// ---------------------------------------------------------------------------
// Formatting helpers (re-exported for use across the ERP)
// ---------------------------------------------------------------------------

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
 * Formats date and time in Brazilian format (dd/mm/yyyy HH:mm:ss)
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
 * Formats number with thousands separator (PT-BR)
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
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
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
