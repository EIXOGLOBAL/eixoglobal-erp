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
  HardDrive,
  Upload,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DocumentsClient } from '@/components/documentos/documents-client'

export const dynamic = 'force-dynamic'

const CATEGORY_LABELS: Record<string, string> = {
  DRAWING: 'Desenho',
  SPECIFICATION: 'Especificação',
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
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export default async function DocumentosPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const companyId = session.user?.companyId
  if (!companyId) redirect('/login')

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [
    documents,
    totalCount,
    recentCount,
    categoryCounts,
    foldersList,
    totalSizeAgg,
  ] = await Promise.all([
    prisma.documentFile.findMany({
      where: { companyId },
      include: {
        uploadedBy: { select: { name: true } },
        folder: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
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
    prisma.documentFolder.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        parentId: true,
        createdAt: true,
        _count: { select: { documents: true, children: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.documentFile.aggregate({
      where: { companyId },
      _sum: { fileSize: true },
    }),
  ])

  const totalSize = totalSizeAgg._sum.fileSize || 0
  const folderCount = foldersList.length

  // Serializar datas para o client component
  const serializedDocuments = documents.map((doc) => ({
    id: doc.id,
    name: doc.name,
    description: doc.description,
    category: doc.category,
    filePath: doc.filePath,
    fileSize: doc.fileSize,
    mimeType: doc.mimeType,
    version: doc.version,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    uploadedBy: doc.uploadedBy,
    folder: doc.folder,
  }))

  const serializedFolders = foldersList.map((f) => ({
    id: f.id,
    name: f.name,
    parentId: f.parentId || null,
    _count: f._count,
    createdAt: f.createdAt.toISOString(),
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Gestão de Documentos
        </h1>
        <p className="text-muted-foreground">
          Armazenamento e controle de versão de documentos
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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
                  {folderCount}
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
              Tamanho Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-700">
                  {formatFileSize(totalSize)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Em disco
                </p>
              </div>
              <HardDrive className="h-8 w-8 text-orange-600/20" />
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
                  Últimos 7 dias
                </p>
              </div>
              <Upload className="h-8 w-8 text-green-600/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {categoryCounts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
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

      {/* Documents Client (Grid/List, Folder Navigation, Search) */}
      <DocumentsClient
        documents={serializedDocuments}
        folders={serializedFolders}
      />
    </div>
  )
}
