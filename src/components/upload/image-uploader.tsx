'use client'

import { useState, useCallback, type DragEvent, type ChangeEvent } from 'react'
import { Upload, X, Image as ImageIcon, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import Image from 'next/image'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface ImageUploaderProps {
  /** Callback chamado quando o upload é concluído */
  onUploadComplete?: (result: UploadResult) => void
  /** Callback chamado quando ocorre um erro */
  onError?: (error: string) => void
  /** URL da imagem atual (para edição) */
  currentImageUrl?: string
  /** Categoria da imagem (product, logo, etc) */
  category?: 'product' | 'logo' | 'avatar'
  /** Prefixo customizado para o arquivo */
  prefix?: string
  /** Tamanho máximo em bytes (padrão: 5MB) */
  maxSize?: number
  /** Largura máxima do preview em pixels */
  previewWidth?: number
  /** Altura máxima do preview em pixels */
  previewHeight?: number
  /** Texto do botão */
  buttonText?: string
  /** Desabilitar o uploader */
  disabled?: boolean
  /** Usar upload direto (presigned URL) */
  useDirectUpload?: boolean
  /** Classe CSS customizada */
  className?: string
  /** Permitir remover imagem */
  allowRemove?: boolean
  /** Callback quando a imagem é removida */
  onRemove?: () => void
}

export interface UploadResult {
  key: string
  url: string
  fileName: string
  size: number
  contentType: string
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

// Tipos de imagem aceitos
const ACCEPTED_IMAGE_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
}

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024 // 5 MB

// ---------------------------------------------------------------------------
// Componente ImageUploader
// ---------------------------------------------------------------------------

export function ImageUploader({
  onUploadComplete,
  onError,
  currentImageUrl,
  category = 'product',
  prefix,
  maxSize = DEFAULT_MAX_SIZE,
  previewWidth = 300,
  previewHeight = 300,
  buttonText = 'Selecionar imagem',
  disabled = false,
  useDirectUpload = false,
  className = '',
  allowRemove = false,
  onRemove,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const [error, setError] = useState<string | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)

  // ---------------------------------------------------------------------------
  // Validação de imagem
  // ---------------------------------------------------------------------------

  const validateImage = useCallback(
    (file: File): string | null => {
      if (!ACCEPTED_IMAGE_TYPES[file.type as keyof typeof ACCEPTED_IMAGE_TYPES]) {
        return 'Tipo de arquivo não aceito. Use JPEG, PNG, GIF, WebP ou SVG.'
      }

      if (file.size > maxSize) {
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2)
        return `Imagem muito grande. Tamanho máximo: ${maxSizeMB} MB`
      }

      return null
    },
    [maxSize]
  )

  // ---------------------------------------------------------------------------
  // Upload server-side
  // ---------------------------------------------------------------------------

  const uploadServerSide = useCallback(
    async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', category)
      if (prefix) formData.append('prefix', prefix)
      formData.append('public', 'true') // Imagens geralmente são públicas

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao fazer upload')
      }

      return response.json()
    },
    [category, prefix]
  )

  // ---------------------------------------------------------------------------
  // Upload direto
  // ---------------------------------------------------------------------------

  const uploadDirect = useCallback(
    async (file: File) => {
      const params = new URLSearchParams({
        fileName: file.name,
        contentType: file.type,
        category,
      })
      if (prefix) params.append('prefix', prefix)

      const urlResponse = await fetch(`/api/storage/upload?${params}`)
      if (!urlResponse.ok) {
        const data = await urlResponse.json()
        throw new Error(data.error || 'Erro ao gerar URL de upload')
      }

      const { uploadUrl, key } = await urlResponse.json()

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!uploadResponse.ok) {
        throw new Error('Erro ao fazer upload da imagem')
      }

      return {
        success: true,
        key,
        url: key,
        fileName: file.name,
        size: file.size,
        contentType: file.type,
      }
    },
    [category, prefix]
  )

  // ---------------------------------------------------------------------------
  // Handler de upload
  // ---------------------------------------------------------------------------

  const handleUpload = useCallback(
    async (file: File) => {
      setStatus('uploading')
      setProgress(0)
      setError(null)

      try {
        const progressInterval = setInterval(() => {
          setProgress((prev) => Math.min(prev + 10, 90))
        }, 200)

        const result = useDirectUpload
          ? await uploadDirect(file)
          : await uploadServerSide(file)

        clearInterval(progressInterval)
        setProgress(100)
        setStatus('success')
        setUploadResult(result)

        if (onUploadComplete) {
          onUploadComplete(result)
        }
      } catch (err: any) {
        setStatus('error')
        const errorMessage = err.message || 'Erro ao fazer upload'
        setError(errorMessage)
        setPreviewUrl(null)

        if (onError) {
          onError(errorMessage)
        }
      }
    },
    [useDirectUpload, uploadDirect, uploadServerSide, onUploadComplete, onError]
  )

  // ---------------------------------------------------------------------------
  // Handlers de eventos
  // ---------------------------------------------------------------------------

  const handleFileSelect = useCallback(
    (file: File) => {
      const validationError = validateImage(file)
      if (validationError) {
        setStatus('error')
        setError(validationError)
        if (onError) onError(validationError)
        return
      }

      // Gera preview local
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)

      handleUpload(file)
    },
    [validateImage, handleUpload, onError]
  )

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled) return

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        handleFileSelect(files[0])
      }
    },
    [disabled, handleFileSelect]
  )

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFileSelect(files[0])
      }
    },
    [handleFileSelect]
  )

  const handleRemove = useCallback(() => {
    setPreviewUrl(null)
    setStatus('idle')
    setUploadResult(null)
    setError(null)
    if (onRemove) {
      onRemove()
    }
  }, [onRemove])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={`w-full ${className}`}>
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg overflow-hidden transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-300 dark:border-gray-700'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
        `}
        style={{ maxWidth: previewWidth, maxHeight: previewHeight }}
      >
        <input
          type="file"
          id="image-upload"
          className="hidden"
          accept={Object.keys(ACCEPTED_IMAGE_TYPES).join(',')}
          onChange={handleInputChange}
          disabled={disabled || status === 'uploading'}
        />

        {/* Preview da imagem */}
        {previewUrl && (
          <div className="relative w-full h-full min-h-[200px]">
            <Image
              src={previewUrl}
              alt="Preview"
              fill
              className="object-contain"
              unoptimized={previewUrl.startsWith('data:')}
            />

            {/* Overlay de loading */}
            {status === 'uploading' && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="text-center text-white">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin mb-2" />
                  <p className="text-sm">Enviando...</p>
                  <div className="mt-2 w-32 bg-gray-200 rounded-full h-1">
                    <div
                      className="bg-blue-600 h-1 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Overlay de sucesso */}
            {status === 'success' && (
              <div className="absolute top-2 right-2">
                <CheckCircle2 className="h-6 w-6 text-green-600 bg-white rounded-full" />
              </div>
            )}

            {/* Botão de remover */}
            {allowRemove && status !== 'uploading' && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-2 left-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                title="Remover imagem"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Estado inicial (sem preview) */}
        {!previewUrl && status !== 'error' && (
          <div className="p-8 text-center min-h-[200px] flex flex-col items-center justify-center">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Arraste uma imagem aqui ou clique para selecionar
            </p>
            <label
              htmlFor="image-upload"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors"
            >
              {buttonText}
            </label>
            <p className="mt-2 text-xs text-gray-500">
              JPEG, PNG, GIF, WebP ou SVG (máx. {(maxSize / (1024 * 1024)).toFixed(0)}MB)
            </p>
          </div>
        )}

        {/* Estado de erro */}
        {status === 'error' && (
          <div className="p-8 text-center min-h-[200px] flex flex-col items-center justify-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-600 mb-4" />
            <p className="text-sm font-medium text-red-600 mb-2">Erro no upload</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <label
              htmlFor="image-upload"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors"
            >
              Tentar novamente
            </label>
          </div>
        )}
      </div>
    </div>
  )
}
