'use client'

import { useState, useMemo } from 'react'
import {
  LayoutGrid,
  List,
  ChevronRight,
  Home,
  Search,
  FolderOpen,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { DocumentGrid } from './document-grid'
import { DocumentTable } from './document-table'
import { DocumentUploadDialog } from './document-upload-dialog'
import { FolderDialog } from './folder-dialog'

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
  parentId: string | null
  _count: { documents: number; children: number }
  createdAt: Date | string
}

interface BreadcrumbItem {
  id: string | null
  name: string
}

interface DocumentsClientProps {
  documents: DocumentItem[]
  folders: FolderItem[]
}

type ViewMode = 'grid' | 'list'

export function DocumentsClient({ documents, folders }: DocumentsClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Build breadcrumb path
  const breadcrumb = useMemo(() => {
    const items: BreadcrumbItem[] = [{ id: null, name: 'Documentos' }]
    if (!currentFolderId) return items

    const buildPath = (folderId: string): BreadcrumbItem[] => {
      const folder = folders.find(f => f.id === folderId)
      if (!folder) return []
      const parentPath = folder.parentId ? buildPath(folder.parentId) : []
      return [...parentPath, { id: folder.id, name: folder.name }]
    }

    return [...items, ...buildPath(currentFolderId)]
  }, [currentFolderId, folders])

  // Filter folders for current level
  const currentFolders = useMemo(() => {
    return folders.filter(f => f.parentId === currentFolderId)
  }, [folders, currentFolderId])

  // Filter documents for current folder + search
  const currentDocuments = useMemo(() => {
    let filtered = documents.filter(d => {
      if (currentFolderId === null) {
        // Root: show documents without folder
        return !d.folder?.id
      }
      return d.folder?.id === currentFolderId
    })

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      // When searching, search ALL documents, not just current folder
      filtered = documents.filter(d =>
        d.name.toLowerCase().includes(term) ||
        d.description?.toLowerCase().includes(term) ||
        d.category.toLowerCase().includes(term)
      )
    }

    return filtered
  }, [documents, currentFolderId, searchTerm])

  // All folders flat list for move operations
  const allFoldersList = useMemo(() => {
    return folders.map(f => ({ id: f.id, name: f.name }))
  }, [folders])

  const handleFolderClick = (folderId: string) => {
    setCurrentFolderId(folderId)
    setSearchTerm('')
  }

  const handleBreadcrumbClick = (folderId: string | null) => {
    setCurrentFolderId(folderId)
    setSearchTerm('')
  }

  const isEmpty = currentFolders.length === 0 && currentDocuments.length === 0

  return (
    <div className="space-y-4">
      {/* Toolbar: Breadcrumb + Search + View Toggle + Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Breadcrumb */}
        <nav className="flex items-center flex-1 min-w-0">
          <ol className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
            {breadcrumb.map((item, index) => {
              const isLast = index === breadcrumb.length - 1
              return (
                <li key={item.id ?? 'root'} className="flex items-center gap-1">
                  {index > 0 && (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                  )}
                  {isLast ? (
                    <span className="font-medium text-foreground flex items-center gap-1">
                      {index === 0 ? (
                        <>
                          <Home className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{item.name}</span>
                        </>
                      ) : (
                        <>{item.name}</>
                      )}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleBreadcrumbClick(item.id)}
                      className="hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      {index === 0 ? (
                        <>
                          <Home className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{item.name}</span>
                        </>
                      ) : (
                        <>{item.name}</>
                      )}
                    </button>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>

        {/* Search + View Toggle + Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar documentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 w-48 sm:w-56"
            />
          </div>
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-9 w-9 p-0 rounded-r-none"
              onClick={() => setViewMode('grid')}
              title="Visualizacao em Grade"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-9 w-9 p-0 rounded-l-none"
              onClick={() => setViewMode('list')}
              title="Visualizacao em Lista"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <FolderDialog
            mode="create"
            parentFolderId={currentFolderId || undefined}
          />
          <DocumentUploadDialog
            defaultFolderId={currentFolderId || undefined}
          />
        </div>
      </div>

      {/* Content */}
      {isEmpty && !searchTerm ? (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <EmptyState
              icon={currentFolderId ? FolderOpen : FileText}
              title={currentFolderId ? 'Pasta vazia' : 'Nenhum documento armazenado'}
              description={
                currentFolderId
                  ? 'Esta pasta ainda nao possui documentos. Faca upload ou mova documentos para ca.'
                  : 'Comece a fazer upload de documentos e organize-os por pastas e categorias.'
              }
            />
          </CardContent>
        </Card>
      ) : isEmpty && searchTerm ? (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <EmptyState
              icon={Search}
              title="Nenhum resultado encontrado"
              description={`Nenhum documento encontrado para "${searchTerm}".`}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {searchTerm
                ? `${currentDocuments.length} resultado${currentDocuments.length !== 1 ? 's' : ''} para "${searchTerm}"`
                : `${currentFolders.length > 0 ? `${currentFolders.length} pasta${currentFolders.length !== 1 ? 's' : ''}, ` : ''}${currentDocuments.length} documento${currentDocuments.length !== 1 ? 's' : ''}`
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            {viewMode === 'grid' ? (
              <DocumentGrid
                documents={currentDocuments}
                folders={searchTerm ? [] : currentFolders}
                allFolders={allFoldersList}
                onFolderClick={handleFolderClick}
              />
            ) : (
              <DocumentTable
                documents={currentDocuments}
                folders={searchTerm ? [] : currentFolders}
                allFolders={allFoldersList}
                onFolderClick={handleFolderClick}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
