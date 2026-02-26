import * as XLSX from 'xlsx'

export interface ExcelColumn {
  header: string
  key: string
  width?: number
  format?: 'currency' | 'date' | 'percent' | 'text' | 'number'
}

export function exportToExcel(
  data: Record<string, unknown>[],
  columns: ExcelColumn[],
  filename: string,
  sheetName = 'Dados'
): void {
  const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  
  // Build header row
  const headers = columns.map(c => c.header)
  
  // Build data rows
  const rows = data.map(row => {
    return columns.map(col => {
      const val = row[col.key]
      if (val === null || val === undefined) return ''
      if (col.format === 'currency') return fmt.format(Number(val))
      if (col.format === 'date' && val) return new Date(val as string).toLocaleDateString('pt-BR')
      if (col.format === 'percent') return `${Number(val).toFixed(1)}%`
      if (col.format === 'number') return Number(val)
      return String(val)
    })
  })
  
  const wsData = [headers, ...rows]
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  
  // Set column widths
  ws['!cols'] = columns.map(c => ({ wch: c.width ?? 20 }))
  
  // Style header row (bold)
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C })
    if (!ws[addr]) continue
    ws[addr].s = { font: { bold: true } }
  }
  
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`)
}
