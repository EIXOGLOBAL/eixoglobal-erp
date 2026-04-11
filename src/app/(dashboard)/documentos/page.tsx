import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  FileText,
  FolderOpen,
  Upload,
  Clock,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/formatters'
import { DocumentActionsBar } from '@/components/documentos/document-actions-bar'
import { DocumentRowActions } from '@/components/documentos/document-row-actions'

export const dynamic = 'force-dynamic'

const CATEGORY_LABELS: Record<string, string> = {
  DRAWING: 'Desenho',
  SPECIFICATION: 'Especificacao',
  MEMORIAL: 'Memorial',
  ART_RRT: 'ART/RRT',
  PERMIT: 'Alvara',
  CONTRACT: 'Contrato',
  REPORT: 'Relatorio',
  PHOTO: 'Foto',
  INVOICE: 'Nota Fiscal',
  CERTIFICATE: 'Certificado',
  MANUAL: 'Manual',
  OTHER: 'Outro',
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function DocumentosPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const companyId = session.user?.companyId
  if (!companyId) redirect('/login')

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [documents, totalCount, recentCount, categoryCounts, folders] = await Promise.all([
    prisma.documentFile.findMany({
      where: { companyId },
      include: {
        uploadedBy: { select: { name: true } },
        folder: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.documentFile.count({ where: { companyId } }),
    prisma.documentFile.count({
      where: { companyId, createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.documentFile.groupBy({
      by: ['category'],
      where: { companyId },
      _count: { id: true },
    }),
    prisma.documentFolder.count({ where: { companyId } }),
  ])

  const categoriesUsed = categoryCounts.length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gestao de Documentos
          </h1>
          <p className="text-muted-foreground">
            Armazenamento e controle de versao de documentos
          </p>
        </div>
        <DocumentActionsBar />
      </div>

      {/* KPI Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Indicadores Principais
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Total Documentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-700">
                    {totalCount}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Armazenados
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Pastas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-700">
                    {folders}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Organizadas
                  </p>
                </div>
                <FolderOpen className="h-8 w-8 text-purple-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Categorias em Uso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-700">
                    {categoriesUsed}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tipos diferentes
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                Uploads Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-700">
                    {recentCount}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ultimos 7 dias
                  </p>
                </div>
                <Upload className="h-8 w-8 text-green-600/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Category Breakdown */}
      {categoryCounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Documentos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categoryCounts.map((c) => (
                <Badge key={c.category} variant="outline" className="text-xs">
                  {CATEGORY_LABELS[c.category] || c.category}: {c._count.id}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents Table */}
      {documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <EmptyState
              icon={FileText}
              title="Nenhum documento armazenado"
              description="Comece a fazer upload de documentos e organize-os por categorias."
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4">Nome</th>
                    <th className="text-left py-2 pr-4">Categoria</th>
                    <th className="text-left py-2 pr-4">Pasta</th>
                    <th className="text-left py-2 pr-4">Enviado por</th>
                    <th className="text-right py-2 pr-4">Tamanho</th>
                    <th className="text-center py-2 pr-4">Versao</th>
                    <th className="text-center py-2 pr-4">Status</th>
                    <th className="text-right py-2 pr-4">Data</th>
                    <th className="text-center py-2">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <span className="font-medium">{doc.name}</span>
                        {doc.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {doc.description}
                          </p>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className="text-xs">
                          {CATEGORY_LABELS[doc.category] || doc.category}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground text-xs">
                        {doc.folder?.name || '—'}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground text-xs">
                        {doc.uploadedBy?.name || '—'}
                      </td>
                      <td className="py-2 pr-4 text-right text-muted-foreground text-xs font-mono">
                        {formatFileSize(doc.fileSize)}
                      </td>
                      <td className="py-2 pr-4 text-center text-muted-foreground text-xs">
                        v{doc.version}
                      </td>
                      <td className="py-2 pr-4 text-center">
                        <Badge
                          className={
                            doc.status === 'APPROVED'
                              ? 'bg-green-100 text-green-800 text-xs'
                              : doc.status === 'DRAFT'
                                ? 'bg-gray-100 text-gray-800 text-xs'
                                : 'bg-orange-100 text-orange-800 text-xs'
                          }
                        >
                          {doc.status === 'APPROVED'
                            ? 'Aprovado'
                            : doc.status === 'DRAFT'
                              ? 'Rascunho'
                              : doc.status}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-right text-muted-foreground text-xs">
                        {formatDate(doc.createdAt)}
                      </td>
                      <td className="py-2 text-center">
                        <DocumentRowActions
                          documentId={doc.id}
                          documentName={doc.name}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalCount > 50 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Exibindo 50 de {totalCount} documentos
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
