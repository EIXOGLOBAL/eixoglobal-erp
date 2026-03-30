'use client'

import { useState } from 'react'
import { Download, FileText, Sheet, File } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { exportToCSV, type ExportColumn } from '@/lib/export-utils'

interface ExportButtonProps {
  data: any[]
  columns: ExportColumn[]
  filename: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  className?: string
}

/**
 * Dropdown button with export options: CSV, Excel, PDF
 * Handles the export logic client-side
 */
export function ExportButton({
  data,
  columns,
  filename,
  variant = 'outline',
  size = 'default',
  className = '',
}: ExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleExportCSV = () => {
    try {
      setIsLoading(true)
      exportToCSV(data, filename, columns)
    } catch (error) {
      console.error('Error exporting to CSV:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportExcel = async () => {
    try {
      setIsLoading(true)
      // Dynamic import for xlsx to reduce bundle size
      const XLSX = await import('xlsx')

      // Prepare data
      const wsData = [columns.map(col => col.label), ...data.map(item =>
        columns.map(col => {
          let value = item[col.key]
          if (col.format) {
            value = col.format(value)
          }
          return value ?? ''
        })
      )]

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(wsData)

      // Auto-size columns
      const columnWidths = columns.map(col => ({
        wch: Math.max(col.label.length, 12),
      }))
      ws['!cols'] = columnWidths

      // Create workbook and add worksheet
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Dados')

      // Trigger download
      XLSX.writeFile(wb, `${filename}.xlsx`)
    } catch (error) {
      console.error('Error exporting to Excel:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportPDF = async () => {
    try {
      setIsLoading(true)
      // Note: jsPDF and jspdf-autotable packages are required for PDF export
      // Install with: npm install jspdf jspdf-autotable
      console.error('PDF export requires jsPDF package to be installed')
      alert('PDF export requires jsPDF package to be installed')
      setIsLoading(false)
      return

      // Dynamic import for jsPDF to reduce bundle size
      // const { jsPDF } = await import('jspdf')
      // const autoTable = await import('jspdf-autotable')

      // const doc = new jsPDF()
      //
      // // Add title
      // doc.setFontSize(14)
      // doc.text(filename, 14, 15)
      //
      // // Prepare table data
      // const tableData = data.map(item =>
      //   columns.map(col => {
      //     let value = item[col.key]
      //     if (col.format) {
      //       value = col.format(value)
      //     }
      //     return value ?? ''
      //   })
      // )
      //
      // // Add table
      // autoTable(doc, {
      //   head: [columns.map(col => col.label)],
      //   body: tableData,
      //   startY: 25,
      //   margin: { top: 20 },
      //   styles: {
      //     fontSize: 10,
      //     cellPadding: 3,
      //     halign: 'left',
      //     valign: 'middle',
      //   },
      //   headStyles: {
      //     fillColor: [59, 130, 246],
      //     textColor: [255, 255, 255],
      //     fontStyle: 'bold',
      //   },
      //   alternateRowStyles: {
      //     fillColor: [245, 247, 250],
      //   },
      // })
      //
      // doc.save(`${filename}.pdf`)
    } catch (error) {
      console.error('Error exporting to PDF:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={isLoading || data.length === 0}
          className={className}
        >
          <Download className="mr-2 h-4 w-4" />
          {isLoading ? 'Exportando...' : 'Exportar'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV} disabled={isLoading}>
          <FileText className="mr-2 h-4 w-4" />
          <span>Exportar CSV</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel} disabled={isLoading}>
          <Sheet className="mr-2 h-4 w-4" />
          <span>Exportar Excel</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF} disabled={isLoading}>
          <File className="mr-2 h-4 w-4" />
          <span>Exportar PDF</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
