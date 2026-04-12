'use client'

import { useState, useCallback, type DragEvent, type ChangeEvent } from 'react'
import { Upload, X, File, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface FileUploaderProps {
  /** Callback chamado quando o upload é concluído */
  onUploadComplete?: (result: UploadResult) => void
  /** Callback chamado quando ocorre um erro */
  onError?: (error: string) => void
  /** Categoria do arquivo (invoice, product, contract, report) */
  category?: 'invoice' | 'product' | 'contract' | 'report'
  /** Prefixo customizado para o arquivo */
  prefix?: string
  /** Tipos de arquivo aceitos (ex: '.pdf,.xml') */
  accept?: string
  /** Tamanho máximo em bytes */
  maxSize?: number
  /** Texto do botão */
  buttonText?: string
  /** Descrição exibida na área de drop */
  description?: string
  /** Desabilitar o uploader */
  disabled?: boolean
  /** Usar upload direto (presigned URL) ao invés de server-side */
  useDirectUpload?: boolean
  /** Classe CSS customizada */
  className?: string
}

export interface UploadResult {
  key: string
  url: string
  fileName: string
  size: number
  contentType: string
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

// ---------------------------------------------------------------------------
// Componente FileUploader
// ---------------------------------------------------------------------------

export function FileUploader({
  onUploadComplete,
  onError,
  category,
  prefix,
  accept,
  maxSize,
  buttonText = 'Selecionar arquivo',
  description = 'Arraste e solte um arquivo aqui ou clique para selecionar',
  disabled = false,
  useDirectUpload = false,
  className = '',
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)

  // ---------------------------------------------------------------------------
  // Validação de arquivo
  // ---------------------------------------------------------------------------

  const validateFile = useCallback(
    (file: File): string | null => {
      if (maxSize && file.size > maxSize) {
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2)
        return `Arquivo muito grande. Tamanho máximo: ${maxSizeMB} MB`
      }

      if (accept) {
        const acceptedTypes = accept.split(',').map((t) => t.trim())
        const fileExt = `.${file.name.split('.').pop()?.toLowerCase()}`
        const isAccepted = acceptedTypes.some(
          (type) => type === fileExt || type === file.type
        )

        if (!isAccepted) {
          return `Tipo de arquivo não aceito. Aceitos: ${accept}`
        }
      }

      return null
    },
    [accept, maxSize]
  )

  // ---------------------------------------------------------------------------
  // Upload server-side (via FormData)
  // ---------------------------------------------------------------------------

  const uploadServerSide = useCallback(
    async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      if (category) formData.append('category', category)
      if (prefix) formData.append('prefix', prefix)

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
  // Upload direto (presigned URL)
  // ---------------------------------------------------------------------------

  const uploadDirect = useCallback(
    async (file: File) => {
      // 1. Obter presigned URL
      const params = new URLSearchParams({
        fileName: file.name,
        contentType: file.type,
      })
      if (category) params.append('category', category)
      if (prefix) params.append('prefix', prefix)

      const urlResponse = await fetch(`/api/storage/upload?${params}`)
      if (!urlResponse.ok) {
        const data = await urlResponse.json()
        throw new Error(data.error || 'Erro ao gerar URL de upload')
      }

      const { uploadUrl, key } = await urlResponse.json()

      // 2. Upload direto para R2
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!uploadResponse.ok) {
        throw new Error('Erro ao fazer upload do arquivo')
      }

      // 3. Retornar resultado
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
      setUploadResult(null)

      try {
        // Simula progresso (em produção, use XMLHttpRequest para progresso real)
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
      const validationError = validateFile(file)
      if (validationError) {
        setStatus('error')
        setError(validationError)
        if (onError) onError(validationError)
        return
      }

      setSelectedFile(file)
      handleUpload(file)
    },
    [validateFile, handleUpload, onError]
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

  const handleReset = useCallback(() => {
    setStatus('idle')
    setProgress(0)
    setSelectedFile(null)
    setError(null)
    setUploadResult(null)
  }, [])

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
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-300 dark:border-gray-700'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
        `}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled || status === 'uploading'}
        />

        {status === 'idle' && (
          <div className="space-y-4">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
              <label
                htmlFor="file-upload"
                className="mt-2 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors"
              >
                {buttonText}
              </label>
            </div>
          </div>
        )}

        {status === 'uploading' && selectedFile && (
          <div className="space-y-4">
            <Loader2 className="mx-auto h-12 w-12 text-blue-600 animate-spin" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Enviando {selectedFile.name}...
              </p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">{progress}%</p>
            </div>
          </div>
        )}

        {status === 'success' && uploadResult && (
          <div className="space-y-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Upload concluído!
              </p>
              <div className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <File className="h-4 w-4" />
                <span>{uploadResult.fileName}</span>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="mt-4 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Enviar outro arquivo
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-600">Erro no upload</p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{error}</p>
              <button
                type="button"
                onClick={handleReset}
                className="mt-4 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
