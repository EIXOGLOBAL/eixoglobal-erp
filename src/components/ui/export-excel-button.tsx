'use client'

import { useState } from 'react'
import { Button } from './button'
import { Download } from 'lucide-react'
import { exportToExcel, type ExcelColumn } from '@/lib/excel-export'

interface ExportExcelButtonProps {
  data: Record<string, unknown>[]
  columns: ExcelColumn[]
  filename: string
  sheetName?: string
  className?: string
  size?: 'sm' | 'default'
}

export function ExportExcelButton({
  data, columns, filename, sheetName, className, size = 'sm'
}: ExportExcelButtonProps) {
  const [exporting, setExporting] = useState(false)
  
  async function handleExport() {
    setExporting(true)
    try {
      exportToExcel(data, columns, filename, sheetName)
    } finally {
      setExporting(false)
    }
  }
  
  return (
    <Button
      variant="outline"
      size={size}
      onClick={handleExport}
      disabled={exporting || data.length === 0}
      className={className}
      title={data.length === 0 ? 'Sem dados para exportar' : 'Exportar para Excel'}
    >
      <Download className="h-4 w-4 mr-1" />
      {exporting ? 'Exportando...' : 'Excel'}
    </Button>
  )
}
