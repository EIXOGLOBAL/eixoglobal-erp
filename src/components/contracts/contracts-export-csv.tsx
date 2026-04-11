'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from "@/lib/formatters"

interface Contract {
  id: string
  identifier: string
  description?: string | null
  value?: number | null
  startDate: Date
  endDate?: Date | null
  status: string
  project?: { name: string } | null
  contractor?: { name: string } | null
  _count?: { items?: number; amendments?: number; bulletins?: number } | null
}

interface ContractsExportCSVProps {
  contracts: Contract[]
}

export function ContractsExportCSV({ contracts }: ContractsExportCSVProps) {
  const { toast } = useToast()

  const generateCSV = () => {
    const headers = [
      'Identificador',
      'Descrição',
      'Projeto',
      'Contratada',
      'Valor do Contrato',
      'Data de Início',
      'Data de Término',
      'Status',
      'Itens',
      'Aditivos',
      'Boletins',
    ]

    const rows = contracts.map(c => [
      c.identifier,
      c.description || '',
      c.project?.name || '',
      c.contractor?.name || '',
      c.value ? c.value.toString() : '0',
      formatDate(c.startDate),
      c.endDate ? formatDate(c.endDate) : '',
      c.status,
      c._count?.items?.toString() || '0',
      c._count?.amendments?.toString() || '0',
      c._count?.bulletins?.toString() || '0',
    ])

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row.map(cell => {
          // Escape quotes and wrap in quotes if contains comma
          const escaped = String(cell).replace(/"/g, '""')
          return escaped.includes(',') ? `"${escaped}"` : escaped
        }).join(',')
      ),
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `contratos-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: 'Exportação Realizada',
      description: `${contracts.length} contrato(s) exportado(s) para CSV`,
    })
  }

  if (!contracts || contracts.length === 0) {
    return null
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={generateCSV}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Exportar CSV
    </Button>
  )
}
