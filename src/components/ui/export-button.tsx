'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, Printer, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  exportToCSV,
  exportToPDF,
  exportToExcel,
  type ExportColumn,
  type ExportToPDFOptions,
} from '@/lib/export-utils'

interface ExportButtonProps {
  /** Array of data objects to export */
  data: Record<string, unknown>[]
  /** Column definitions with key, label, and optional format */
  columns: ExportColumn[]
  /** Base filename for the exported file (without extension) */
  filename: string
  /** Title displayed in the PDF header */
  title?: string
  /** PDF export options (orientation, company name, etc.) */
  pdfOptions?: ExportToPDFOptions
  /** Excel sheet name */
  sheetName?: string
  /** Button visual variant */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'xs'
  /** Additional CSS classes */
  className?: string
}

/**
 * Reusable dropdown button for exporting table data to CSV, PDF, or Excel.
 * All labels are in PT-BR. Shows a loading spinner during export.
 */
export function ExportButton({
  data,
  columns,
  filename,
  title,
  pdfOptions,
  sheetName,
  variant = 'outline',
  size = 'default',
  className = '',
}: ExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleExportCSV = async () => {
    try {
      setIsLoading(true)
      exportToCSV(data, columns, filename)
    } catch (error) {
      console.error('Erro ao exportar CSV:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportPDF = async () => {
    try {
      setIsLoading(true)
      exportToPDF(title || filename, data, columns, pdfOptions)
    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportExcel = async () => {
    try {
      setIsLoading(true)
      exportToExcel(data, columns, filename, sheetName)
    } catch (error) {
      console.error('Erro ao exportar Excel:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const isEmpty = !data || data.length === 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={isLoading || isEmpty}
          className={className}
          title={isEmpty ? 'Sem dados para exportar' : 'Exportar dados'}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {isLoading ? 'Exportando...' : 'Exportar'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV} disabled={isLoading}>
          <FileText className="mr-2 h-4 w-4" />
          <span>Exportar CSV</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF} disabled={isLoading}>
          <Printer className="mr-2 h-4 w-4" />
          <span>Exportar PDF</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel} disabled={isLoading}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          <span>Exportar Excel</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
