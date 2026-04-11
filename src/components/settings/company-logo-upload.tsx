'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Upload, ImageIcon, Loader2, Trash2, X } from 'lucide-react'

// ---------------------------------------------------------------------------
// Constantes de validação (espelham o backend)
// ---------------------------------------------------------------------------

const MAX_SIZE = 2 * 1024 * 1024 // 2 MB
const ACCEPTED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
]
const ACCEPTED_EXTENSIONS = '.png,.jpg,.jpeg,.svg,.webp'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CompanyLogoUploadProps {
  /** URL atual do logotipo (pode ser null se não houver) */
  currentLogoUrl?: string | null
  /** Callback executado após upload bem-sucedido — recebe a nova URL */
  onUploadSuccess?: (url: string) => void
  /** Callback executado ao remover o logotipo */
  onRemove?: () => void
  className?: string
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function CompanyLogoUpload({
  currentLogoUrl,
  onUploadSuccess,
  onRemove,
  className,
}: CompanyLogoUploadProps) {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl ?? null)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  // ---- Validação client-side ----
  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Formato não suportado. Use PNG, JPG, SVG ou WebP.'
    }
    if (file.size > MAX_SIZE) {
      return `Arquivo muito grande (${formatBytes(file.size)}). Máximo: 2 MB.`
    }
    return null
  }

  // ---- Selecionar arquivo (input ou drop) ----
  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file)
    if (error) {
      toast({ variant: 'destructive', title: 'Arquivo inválido', description: error })
      return
    }

    setSelectedFile(file)

    // Gerar preview local
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }, [toast])

  // ---- Upload para o servidor ----
  async function handleUpload() {
    if (!selectedFile) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const res = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar logotipo')
      }

      const newUrl = data.url + '?t=' + Date.now()
      setLogoUrl(newUrl)
      setPreview(null)
      setSelectedFile(null)
      onUploadSuccess?.(data.url)

      toast({ title: 'Logotipo atualizado com sucesso!' })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro no upload',
        description: err.message || 'Tente novamente.',
      })
    } finally {
      setUploading(false)
    }
  }

  // ---- Cancelar preview ----
  function handleCancelPreview() {
    setPreview(null)
    setSelectedFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  // ---- Remover logotipo ----
  function handleRemove() {
    setLogoUrl(null)
    setPreview(null)
    setSelectedFile(null)
    if (inputRef.current) inputRef.current.value = ''
    onRemove?.()
  }

  // ---- Handlers de drag-and-drop ----
  function handleDrag(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  function handleDragIn(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items?.length) {
      setDragActive(true)
    }
  }

  function handleDragOut(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  // ---- Imagem exibida (preview tem prioridade) ----
  const displayUrl = preview ?? logoUrl

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Logotipo da Empresa</CardTitle>
        <CardDescription>
          Envie o logotipo da sua empresa. Formatos aceitos: PNG, JPG, SVG ou
          WebP. Tamanho máximo: 2 MB.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Área de visualização / drop zone */}
        <div
          onDragOver={handleDrag}
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={cn(
            'relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer',
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
            uploading && 'pointer-events-none opacity-60'
          )}
        >
          {displayUrl ? (
            <div className="relative">
              <img
                src={displayUrl}
                alt="Logotipo da empresa"
                className="max-h-32 max-w-[280px] object-contain"
              />
              {preview && (
                <span className="absolute -top-2 -right-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                  Preview
                </span>
              )}
            </div>
          ) : (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">
                  Arraste uma imagem aqui ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, SVG ou WebP - Máximo 2 MB
                </p>
              </div>
            </>
          )}

          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* Input oculto */}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={handleInputChange}
        />

        {/* Botões de ação */}
        <div className="flex flex-wrap items-center gap-2">
          {preview && selectedFile ? (
            <>
              <Button onClick={handleUpload} disabled={uploading} size="sm">
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Salvar logotipo
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelPreview}
                disabled={uploading}
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {logoUrl ? 'Alterar logotipo' : 'Selecionar arquivo'}
              </Button>
              {logoUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  disabled={uploading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remover
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
