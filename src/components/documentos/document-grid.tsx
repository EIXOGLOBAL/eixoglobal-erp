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
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
import { Loader2 } from 'lucide-react'

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

interface DocumentGridProps {
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

function getDocumentIcon(mimeType: string, category: string) {
  if (mimeType.startsWith('image/')) return <FileImage className="h-10 w-10 text-green-500" />
  if (mimeType === 'application/pdf') return <FileText className="h-10 w-10 text-red-500" />
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv'))
    return <FileSpreadsheet className="h-10 w-10 text-emerald-600" />
  if (mimeType.includes('word') || mimeType.includes('document'))
    return <FileText className="h-10 w-10 text-blue-600" />
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
    return <Presentation className="h-10 w-10 text-orange-500" />
  if (category === 'DRAWING') return <FileText className="h-10 w-10 text-purple-500" />
  return <FileIcon className="h-10 w-10 text-gray-500" />
}

function isPreviewable(mimeType: string): boolean {
  return mimeType.startsWith('image/') || mimeType === 'application/pdf'
}

export function DocumentGrid({ documents, folders, allFolders, onFolderClick }: DocumentGridProps) {
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {/* Folders */}
        {folders.map((folder) => (
          <Card
            key={folder.id}
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
            onClick={() => onFolderClick(folder.id)}
          >
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <FolderOpen className="h-10 w-10 text-amber-500 group-hover:text-amber-600 transition-colors" />
              <p className="text-sm font-medium truncate w-full">{folder.name}</p>
              <p className="text-xs text-muted-foreground">
                {folder._count.documents} doc{folder._count.documents !== 1 ? 's' : ''}
                {folder._count.children > 0 && `, ${folder._count.children} pasta${folder._count.children !== 1 ? 's' : ''}`}
              </p>
            </CardContent>
          </Card>
        ))}

        {/* Documents */}
        {documents.map((doc) => (
          <Card key={doc.id} className="group hover:shadow-md transition-all relative">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              {/* Context Menu */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
              </div>

              {/* Icon */}
              <div
                className={`cursor-pointer ${isPreviewable(doc.mimeType) ? 'hover:opacity-80' : ''}`}
                onClick={() => isPreviewable(doc.mimeType) ? setPreviewDoc(doc) : handleDownload(doc)}
              >
                {getDocumentIcon(doc.mimeType, doc.category)}
              </div>

              <p className="text-xs font-medium truncate w-full" title={doc.name}>{doc.name}</p>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {CATEGORY_LABELS[doc.category] || doc.category}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {formatFileSize(doc.fileSize)} - v{doc.version}
              </p>
            </CardContent>
          </Card>
        ))}
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
