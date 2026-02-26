'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface ExportPDFButtonProps {
  type: 'executive' | 'project' | 'financial' | 'hr'
  companyId?: string
  projectId?: string
  label?: string
  period?: { start: string; end: string }
}

const defaultLabels: Record<string, string> = {
  executive: 'Relatorio Executivo',
  project: 'Relatorio do Projeto',
  financial: 'Relatorio Financeiro',
  hr: 'Relatorio de RH',
}

export function ExportPDFButton({
  type,
  companyId,
  projectId,
  label,
  period,
}: ExportPDFButtonProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const buttonLabel = label || defaultLabels[type] || 'Exportar PDF'

  async function handleExport() {
    setLoading(true)

    try {
      // Periodo padrao: ultimos 30 dias
      const defaultPeriod = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      }

      const body: Record<string, unknown> = {
        type,
        period: period || defaultPeriod,
      }

      if (companyId) body.companyId = companyId
      if (projectId) body.projectId = projectId

      const response = await fetch('/api/reports/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const errorMessage =
          errorData?.error || `Erro ao gerar relatorio (${response.status})`
        throw new Error(errorMessage)
      }

      // Receber blob e disparar download
      const blob = await response.blob()

      // Extrair filename do header Content-Disposition se disponivel
      const disposition = response.headers.get('Content-Disposition')
      let filename = `relatorio-eixo-global-${type}.pdf`
      if (disposition) {
        const match = disposition.match(/filename="?([^";\n]+)"?/)
        if (match?.[1]) {
          filename = match[1]
        }
      }

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()

      // Limpar
      setTimeout(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }, 100)

      toast({
        title: 'PDF gerado com sucesso',
        description: `O arquivo "${filename}" foi baixado.`,
      })
    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      toast({
        title: 'Erro ao gerar PDF',
        description:
          error instanceof Error
            ? error.message
            : 'Ocorreu um erro inesperado. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleExport}
      disabled={loading}
      variant="outline"
      size="sm"
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="mr-2 h-4 w-4" />
      )}
      {loading ? 'Gerando PDF...' : buttonLabel}
    </Button>
  )
}
