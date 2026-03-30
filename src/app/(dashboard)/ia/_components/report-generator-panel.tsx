'use client'

import { useState, useEffect } from 'react'
import { generateReport, AIReport } from '@/app/actions/ai-actions'
import { getProjects } from '@/app/actions/project-actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2, Download, Eye } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ReportGeneratorPanelProps {
  companyId: string
}

interface Project {
  id: string
  name: string
}

export function ReportGeneratorPanel({ companyId }: ReportGeneratorPanelProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [reportType, setReportType] = useState<'executive' | 'technical' | 'financial'>('executive')
  const [report, setReport] = useState<AIReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    const loadProjects = async () => {
      const result = await getProjects({ companyId })
      if (result.success && result.data) {
        setProjects(
          result.data.map((p) => ({
            id: p.id,
            name: p.name,
          }))
        )
        if (result.data.length > 0) {
          setSelectedProjectId(result.data[0].id)
        }
      }
    }
    loadProjects()
  }, [companyId])

  const handleGenerate = async () => {
    if (!selectedProjectId) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Selecione um projeto',
      })
      return
    }

    setLoading(true)
    setError(null)
    setReport(null)

    try {
      const result = await generateReport(selectedProjectId, reportType)
      if ('error' in result) {
        setError(result.error)
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: result.error,
        })
      } else {
        setReport(result)
        setShowPreview(true)
        toast({
          title: 'Sucesso',
          description: 'Relatório gerado com sucesso',
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar relatório'
      setError(message)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: message,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!report) return

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      background: white;
    }
    h1, h2, h3 { color: #1e40af; margin-top: 24px; margin-bottom: 12px; }
    h1 { border-bottom: 3px solid #1e40af; padding-bottom: 12px; }
    h2 { margin-top: 20px; }
    .meta { font-size: 12px; color: #666; margin-bottom: 24px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th { background-color: #f3f4f6; font-weight: bold; }
    ul, ol { margin: 12px 0 12px 24px; }
    li { margin-bottom: 8px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <h1>${report.title}</h1>
  <div class="meta">
    <p><strong>Tipo:</strong> ${reportType === 'executive' ? 'Executivo' : reportType === 'technical' ? 'Técnico' : 'Financeiro'}</p>
    <p><strong>Gerado em:</strong> ${new Date(report.generatedAt).toLocaleString('pt-BR')}</p>
  </div>
  <div class="content">
    ${report.content}
  </div>
  <div class="footer">
    <p>Relatório gerado automaticamente pelo Assistente de IA do ERP Eixo Global</p>
  </div>
</body>
</html>
    `

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `relatorio-${reportType}-${new Date().toISOString().split('T')[0]}.html`
    )
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: 'Sucesso',
      description: 'Relatório baixado com sucesso',
    })
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuração do Relatório</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {projects.length === 0 ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
              Nenhum projeto disponível. Crie um projeto primeiro.
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Projeto</label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um projeto" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Relatório</label>
                  <Select value={reportType} onValueChange={(value) => setReportType(value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="executive">Executivo</SelectItem>
                      <SelectItem value="technical">Técnico</SelectItem>
                      <SelectItem value="financial">Financeiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full md:w-auto"
                size="lg"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Gerando...' : 'Gerar Relatório'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-900">Erro</p>
                <p className="text-sm text-red-800 mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Preview */}
      {report && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{report.title}</CardTitle>
                  <CardDescription className="text-xs">
                    Gerado em {new Date(report.generatedAt).toLocaleString('pt-BR')}
                  </CardDescription>
                </div>
                <Badge variant="outline">
                  {reportType === 'executive' ? 'Executivo' : reportType === 'technical' ? 'Técnico' : 'Financeiro'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  {showPreview ? 'Ocultar' : 'Visualizar'} Pré-visualização
                </Button>
                <Button
                  size="sm"
                  onClick={handleDownload}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Baixar HTML
                </Button>
              </div>
            </CardContent>
          </Card>

          {showPreview && (
            <Card>
              <CardContent className="pt-6">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: report.content }}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
