'use client'

import { useState, useRef, useCallback, type ChangeEvent, type DragEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  validateExternalUrl,
  detectProvider,
  getProviderLabel,
  getProviderColor,
  type LinkProvider,
} from '@/lib/link-providers'
import {
  Upload,
  Link as LinkIcon,
  X,
  FileText,
  Image,
  Cloud,
  HardDrive,
  Globe,
  Database,
  Paperclip,
  ExternalLink,
  File,
  FileSpreadsheet,
  FileArchive,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FileAttachmentItem {
  type: 'file'
  id: string
  file: File
  name: string
  size: number
  mimeType: string
}

export interface LinkAttachmentItem {
  type: 'link'
  id: string
  url: string
  label: string
  description: string
  provider: LinkProvider
}

export type AttachmentItem = FileAttachmentItem | LinkAttachmentItem

export interface FileOrLinkAttachmentProps {
  /** Accepted file types (e.g. "image/*,.pdf,.docx") */
  accept?: string
  /** Max file size in bytes (default: 10MB) */
  maxSize?: number
  /** Called when the attachment list changes (files) */
  onFileChange?: (files: FileAttachmentItem[]) => void
  /** Called when the attachment list changes (links) */
  onLinkChange?: (links: LinkAttachmentItem[]) => void
  /** Current list of attachments (controlled) */
  value?: AttachmentItem[]
  /** Class name for root container */
  className?: string
  /** Whether the component is disabled */
  disabled?: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PROVIDER_ICONS: Record<LinkProvider, typeof LinkIcon> = {
  'google-drive': HardDrive,
  dropbox: Cloud,
  onedrive: Cloud,
  sharepoint: Globe,
  s3: Database,
  generic: LinkIcon,
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv'))
    return FileSpreadsheet
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive'))
    return FileArchive
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('word'))
    return FileText
  return File
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FileOrLinkAttachment({
  accept,
  maxSize = 10 * 1024 * 1024,
  onFileChange,
  onLinkChange,
  value,
  className,
  disabled = false,
}: FileOrLinkAttachmentProps) {
  const [internalItems, setInternalItems] = useState<AttachmentItem[]>([])
  const items = value ?? internalItems

  const [dragOver, setDragOver] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkLabel, setLinkLabel] = useState('')
  const [linkDescription, setLinkDescription] = useState('')
  const [linkError, setLinkError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Derive file/link lists for callbacks
  const fileItems = items.filter((i): i is FileAttachmentItem => i.type === 'file')
  const linkItems = items.filter((i): i is LinkAttachmentItem => i.type === 'link')

  const updateItems = useCallback(
    (next: AttachmentItem[]) => {
      if (!value) {
        setInternalItems(next)
      }
      const nextFiles = next.filter((i): i is FileAttachmentItem => i.type === 'file')
      const nextLinks = next.filter((i): i is LinkAttachmentItem => i.type === 'link')
      onFileChange?.(nextFiles)
      onLinkChange?.(nextLinks)
    },
    [value, onFileChange, onLinkChange]
  )

  // ── File handling ──────────────────────────────────────────────────────────

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || disabled) return

    const newItems: FileAttachmentItem[] = []

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]!
      if (file.size > maxSize) {
        continue // skip oversized
      }
      newItems.push({
        type: 'file',
        id: generateId(),
        file,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
      })
    }

    if (newItems.length > 0) {
      updateItems([...items, ...newItems])
    }
  }

  function onFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (!disabled) setDragOver(true)
  }

  function onDragLeave() {
    setDragOver(false)
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  // ── Link handling ──────────────────────────────────────────────────────────

  function handleAddLink() {
    if (disabled) return

    const result = validateExternalUrl(linkUrl)
    if (!result.valid) {
      setLinkError(result.error ?? 'URL inválida')
      return
    }

    const newLink: LinkAttachmentItem = {
      type: 'link',
      id: generateId(),
      url: linkUrl.trim(),
      label: linkLabel.trim() || linkUrl.trim(),
      description: linkDescription.trim(),
      provider: result.provider,
    }

    updateItems([...items, newLink])
    setLinkUrl('')
    setLinkLabel('')
    setLinkDescription('')
    setLinkError('')
  }

  // Live provider detection for preview
  const detectedProvider = linkUrl.trim().startsWith('https://')
    ? detectProvider(linkUrl.trim())
    : null

  // ── Remove item ────────────────────────────────────────────────────────────

  function removeItem(id: string) {
    if (disabled) return
    updateItems(items.filter((item) => item.id !== id))
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={cn('space-y-4', className)}>
      <Tabs defaultValue="file">
        <TabsList className="w-full">
          <TabsTrigger value="file" className="flex-1" disabled={disabled}>
            <Upload className="h-4 w-4 mr-1.5" />
            Enviar Arquivo
          </TabsTrigger>
          <TabsTrigger value="link" className="flex-1" disabled={disabled}>
            <LinkIcon className="h-4 w-4 mr-1.5" />
            Link Externo
          </TabsTrigger>
        </TabsList>

        {/* ── File Upload Tab ─────────────────────────────────────────────── */}
        <TabsContent value="file">
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50',
              disabled && 'opacity-50 pointer-events-none'
            )}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={accept}
              multiple
              onChange={onFileInputChange}
              disabled={disabled}
            />

            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Arraste e solte arquivos aqui</p>
              <p className="text-xs text-muted-foreground">
                Tamanho máximo: {formatFileSize(maxSize)} por arquivo
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Selecionar arquivo
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ── External Link Tab ───────────────────────────────────────────── */}
        <TabsContent value="link">
          <div
            className={cn(
              'space-y-3 rounded-lg border p-4',
              disabled && 'opacity-50 pointer-events-none'
            )}
          >
            {/* URL input */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="link-url">
                URL do link *
              </label>
              <div className="relative">
                <Input
                  id="link-url"
                  placeholder="https://drive.google.com/..."
                  value={linkUrl}
                  onChange={(e) => {
                    setLinkUrl(e.target.value)
                    if (linkError) setLinkError('')
                  }}
                  disabled={disabled}
                  aria-invalid={!!linkError}
                  className={cn(
                    'pr-10',
                    linkError && 'border-destructive'
                  )}
                />
                {detectedProvider && (
                  <ProviderBadge provider={detectedProvider} className="absolute right-2 top-1/2 -translate-y-1/2" />
                )}
              </div>
              {linkError && (
                <p className="text-xs text-destructive">{linkError}</p>
              )}
            </div>

            {/* Label */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="link-label">
                Rótulo (opcional)
              </label>
              <Input
                id="link-label"
                placeholder="Ex: Planilha de orçamento"
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                disabled={disabled}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="link-description">
                Descrição (opcional)
              </label>
              <Input
                id="link-description"
                placeholder="Breve descrição do conteúdo"
                value={linkDescription}
                onChange={(e) => setLinkDescription(e.target.value)}
                disabled={disabled}
              />
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddLink}
              disabled={disabled || !linkUrl.trim()}
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Adicionar Link
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Attachment list ──────────────────────────────────────────────────── */}
      {items.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <Paperclip className="h-7 w-7 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum anexo</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Anexos ({items.length})
          </p>
          {items.map((item) =>
            item.type === 'file' ? (
              <FileAttachmentRow
                key={item.id}
                item={item}
                onRemove={() => removeItem(item.id)}
                disabled={disabled}
              />
            ) : (
              <LinkAttachmentRow
                key={item.id}
                item={item}
                onRemove={() => removeItem(item.id)}
                disabled={disabled}
              />
            )
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProviderBadge({
  provider,
  className,
}: {
  provider: LinkProvider
  className?: string
}) {
  const Icon = PROVIDER_ICONS[provider]
  const color = getProviderColor(provider)

  return (
    <span
      className={cn('inline-flex items-center gap-1', className)}
      title={getProviderLabel(provider)}
    >
      <Icon className={cn('h-4 w-4', color)} />
    </span>
  )
}

function FileAttachmentRow({
  item,
  onRemove,
  disabled,
}: {
  item: FileAttachmentItem
  onRemove: () => void
  disabled: boolean
}) {
  const Icon = getFileIcon(item.mimeType)

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
      <div className="h-10 w-10 bg-muted flex items-center justify-center rounded border shrink-0">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(item.size)}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-destructive hover:text-destructive shrink-0"
        onClick={onRemove}
        disabled={disabled}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Remover anexo</span>
      </Button>
    </div>
  )
}

function LinkAttachmentRow({
  item,
  onRemove,
  disabled,
}: {
  item: LinkAttachmentItem
  onRemove: () => void
  disabled: boolean
}) {
  const ProviderIcon = PROVIDER_ICONS[item.provider]
  const providerColor = getProviderColor(item.provider)

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
      <div className="h-10 w-10 bg-muted flex items-center justify-center rounded border shrink-0">
        <ProviderIcon className={cn('h-5 w-5', providerColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate">{item.label}</p>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground shrink-0"
            title="Abrir link"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {getProviderLabel(item.provider)}
          {item.description && ` — ${item.description}`}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-destructive hover:text-destructive shrink-0"
        onClick={onRemove}
        disabled={disabled}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Remover anexo</span>
      </Button>
    </div>
  )
}
