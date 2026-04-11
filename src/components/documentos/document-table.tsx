'use client'

import { useState, useTransition } from 'react'
import {
  FileText,
  FileImage,
  FileSpreadsheet,
  File as FileIcon,
  FolderOpen,
  MoreVertical,
  Download,
  Pencil,
  FolderInput,
  Trash2,
  Eye,
  Presentation,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { deleteDocument, renameDocument, moveDocument } from '@/app/actions/document-actions'
import { formatDate } from '@/lib/formatters'

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

interface DocumentItem {
  id: string
  name: string
  description?: string | null
  category: string
  filePath: string
  fileSize: number
  mimeType: string
  version: number
  status: string
  createdAt: Date | string
  uploadedBy?: { name: string | null } | null
  folder?: { id: string; name: string } | null
}

interface FolderItem {
  id: string
  name: string
  _count: { documents: number; children: number }
  createdAt: Date | string
}

interface DocumentTableProps {
  documents: DocumentItem[]
  folders: FolderItem[]
  allFolders: Array<{ id: string; name: string }>
  onFolderClick: (folderId: string) => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileTypeIcon(mimeType: string, category: string, size: string = 'h-4 w-4') {
  if (mimeType.startsWith('image/')) return <FileImage className={`${size} text-green-500`} />
  if (mimeType === 'application/pdf') return <FileText className={`${size} text-red-500`} />
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv'))
    return <FileSpreadsheet className={`${size} text-emerald-600`} />
  if (mimeType.includes('word') || mimeType.includes('document'))
    return <FileText className={`${size} text-blue-600`} />
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
    return <Presentation className={`${size} text-orange-500`} />
  if (category === 'DRAWING') return <FileText className={`${size} text-purple-500`} />
  return <FileIcon className={`${size} text-gray-500`} />
}

function getFileType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'Imagem'
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Planilha'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'Documento'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'Apresentacao'
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'Arquivo'
  if (mimeType.includes('dwg') || mimeType.includes('dxf')) return 'Desenho CAD'
  if (mimeType === 'text/csv') return 'CSV'
  if (mimeType === 'text/plain') return 'Texto'
  return 'Outro'
}

function isPreviewable(mimeType: string): boolean {
  return mimeType.startsWith('image/') || mimeType === 'application/pdf'
}

export function DocumentTable({ documents, folders, allFolders, onFolderClick }: DocumentTableProps) {
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null)
  const [renameDoc, setRenameDoc] = useState<DocumentItem | null>(null)
  const [moveDoc, setMoveDoc] = useState<DocumentItem | null>(null)
  const [newName, setNewName] = useState('')
  const [targetFolderId, setTargetFolderId] = useState<string>('')
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  function handleDownload(doc: DocumentItem) {
    const link = document.createElement('a')
    link.href = doc.filePath
    link.download = doc.name
    link.click()
  }

  function handleRename() {
    if (!renameDoc || !newName.trim()) return
    startTransition(async () => {
      const result = await renameDocument(renameDoc.id, newName.trim())
      if (result.success) {
        toast({ title: 'Documento Renomeado', description: `Renomeado para "${newName.trim()}"` })
        setRenameDoc(null)
        window.location.reload()
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: result.error })
      }
    })
  }

  function handleMove() {
    if (!moveDoc) return
    startTransition(async () => {
      const result = await moveDocument(moveDoc.id, targetFolderId === '__root__' ? null : targetFolderId || null)
      if (result.success) {
        toast({ title: 'Documento Movido', description: 'Documento movido com sucesso.' })
        setMoveDoc(null)
        window.location.reload()
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: result.error })
      }
    })
  }

  function handleDelete(doc: DocumentItem) {
    if (!confirm(`Excluir o documento "${doc.name}"? Esta acao nao pode ser desfeita.`)) return
    startTransition(async () => {
      const result = await deleteDocument(doc.id)
      if (result.success) {
        toast({ title: 'Documento Excluido', description: `"${doc.name}" foi excluido.` })
        window.location.reload()
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: result.error })
      }
    })
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="text-left py-2 pr-4 font-medium">Nome</th>
              <th className="text-left py-2 pr-4 font-medium">Tipo</th>
              <th className="text-right py-2 pr-4 font-medium">Tamanho</th>
              <th className="text-left py-2 pr-4 font-medium hidden md:table-cell">Pasta</th>
              <th className="text-left py-2 pr-4 font-medium hidden lg:table-cell">Enviado por</th>
              <th className="text-right py-2 pr-4 font-medium hidden sm:table-cell">Data</th>
              <th className="text-center py-2 font-medium w-10">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {/* Folders */}
            {folders.map((folder) => (
              <tr
                key={`folder-${folder.id}`}
                className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onFolderClick(folder.id)}
              >
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="font-medium">{folder.name}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-4 text-muted-foreground text-xs">Pasta</td>
                <td className="py-2.5 pr-4 text-right text-muted-foreground text-xs">
                  {folder._count.documents} item{folder._count.documents !== 1 ? 's' : ''}
                </td>
                <td className="py-2.5 pr-4 hidden md:table-cell text-muted-foreground text-xs">--</td>
                <td className="py-2.5 pr-4 hidden lg:table-cell text-muted-foreground text-xs">--</td>
                <td className="py-2.5 pr-4 text-right hidden sm:table-cell text-muted-foreground text-xs">
                  {formatDate(folder.createdAt)}
                </td>
                <td className="py-2.5 text-center" />
              </tr>
            ))}

            {/* Documents */}
            {documents.map((doc) => (
              <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    {getFileTypeIcon(doc.mimeType, doc.category)}
                    <div className="min-w-0">
                      <span className="font-medium block truncate max-w-[200px] lg:max-w-[300px]">{doc.name}</span>
                      {doc.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {doc.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 hidden sm:inline-flex">
                      {CATEGORY_LABELS[doc.category] || doc.category}
                    </Badge>
                    <Badge
                      className={`text-[10px] px-1.5 py-0 shrink-0 hidden lg:inline-flex ${
                        doc.status === 'APPROVED'
                          ? 'bg-green-100 text-green-800'
                          : doc.status === 'DRAFT'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      v{doc.version}
                    </Badge>
                  </div>
                </td>
                <td className="py-2.5 pr-4 text-muted-foreground text-xs">
                  {getFileType(doc.mimeType)}
                </td>
                <td className="py-2.5 pr-4 text-right text-muted-foreground text-xs font-mono">
                  {formatFileSize(doc.fileSize)}
                </td>
                <td className="py-2.5 pr-4 hidden md:table-cell text-muted-foreground text-xs">
                  {doc.folder?.name || '--'}
                </td>
                <td className="py-2.5 pr-4 hidden lg:table-cell text-muted-foreground text-xs">
                  {doc.uploadedBy?.name || '--'}
                </td>
                <td className="py-2.5 pr-4 text-right hidden sm:table-cell text-muted-foreground text-xs">
                  {formatDate(doc.createdAt)}
                </td>
                <td className="py-2.5 text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isPreviewable(doc.mimeType) && (
                        <DropdownMenuItem onClick={() => setPreviewDoc(doc)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleDownload(doc)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => { setRenameDoc(doc); setNewName(doc.name) }}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Renomear
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setMoveDoc(doc); setTargetFolderId(doc.folder?.id || '__root__') }}>
                        <FolderInput className="h-4 w-4 mr-2" />
                        Mover
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(doc)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Preview Modal */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewDoc?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center overflow-auto max-h-[70vh]">
            {previewDoc?.mimeType.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewDoc.filePath}
                alt={previewDoc.name}
                className="max-w-full max-h-[65vh] object-contain rounded"
              />
            ) : previewDoc?.mimeType === 'application/pdf' ? (
              <iframe
                src={previewDoc.filePath}
                className="w-full h-[65vh] border rounded"
                title={previewDoc.name}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Modal */}
      <Dialog open={!!renameDoc} onOpenChange={() => setRenameDoc(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Renomear Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Novo nome"
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRenameDoc(null)}>Cancelar</Button>
              <Button onClick={handleRename} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Renomear
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Move Modal */}
      <Dialog open={!!moveDoc} onOpenChange={() => setMoveDoc(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Mover Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione a pasta de destino para &quot;{moveDoc?.name}&quot;
            </p>
            <Select value={targetFolderId} onValueChange={setTargetFolderId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a pasta..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__root__">Raiz (sem pasta)</SelectItem>
                {allFolders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMoveDoc(null)}>Cancelar</Button>
              <Button onClick={handleMove} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mover
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
