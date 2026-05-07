'use client'
import { useRouter } from 'next/navigation'

import { useState, useEffect, useTransition, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { uploadDocument, getFolders } from '@/app/actions/document-actions'
import {
  Upload,
  Loader2,
  FileText,
  X,
  CloudUpload,
  FileImage,
  FileSpreadsheet,
  File as FileIcon,
} from 'lucide-react'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

const ALLOWED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg',
  '.txt', '.csv', '.zip', '.rar', '.7z', '.dwg', '.dxf',
]

const CATEGORY_OPTIONS = [
  { value: 'DRAWING', label: 'Desenho' },
  { value: 'SPECIFICATION', label: 'Especificacao' },
  { value: 'MEMORIAL', label: 'Memorial' },
  { value: 'ART_RRT', label: 'ART/RRT' },
  { value: 'PERMIT', label: 'Alvara' },
  { value: 'CONTRACT', label: 'Contrato' },
  { value: 'REPORT', label: 'Relatorio' },
  { value: 'PHOTO', label: 'Foto' },
  { value: 'INVOICE', label: 'Nota Fiscal' },
  { value: 'CERTIFICATE', label: 'Certificado' },
  { value: 'MANUAL', label: 'Manual' },
  { value: 'OTHER', label: 'Outro' },
] as const

const formSchema = z.object({
  name: z.string().min(1, 'Nome do documento e obrigatorio'),
  description: z.string().optional(),
  category: z.enum([
    'DRAWING', 'SPECIFICATION', 'MEMORIAL', 'ART_RRT', 'PERMIT',
    'CONTRACT', 'REPORT', 'PHOTO', 'INVOICE', 'CERTIFICATE', 'MANUAL', 'OTHER',
  ], { message: 'Categoria e obrigatoria' }),
  folderId: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface Folder {
  id: string
  name: string
}

interface DocumentUploadDialogProps {
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultFolderId?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <FileImage className="h-5 w-5 text-green-600" />
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
  if (mimeType === 'application/pdf') return <FileText className="h-5 w-5 text-red-600" />
  return <FileIcon className="h-5 w-5 text-blue-600" />
}

export function DocumentUploadDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
  defaultFolderId,
}: DocumentUploadDialogProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: '',
      description: '',
      category: undefined,
      folderId: defaultFolderId || undefined,
    },
  })

  useEffect(() => {
    if (open) {
      getFolders().then((result) => {
        if (result.success && result.data) {
          setFolders(result.data.map((f: any) => ({ id: f.id, name: f.name })))
        }
      })
    }
    if (!open) {
      form.reset({ name: '', description: '', category: undefined, folderId: defaultFolderId || undefined })
      setSelectedFile(null)
      setUploadProgress(0)
      setValidationError(null)
    }
  }, [open, form, defaultFolderId])

  const validateFile = useCallback((file: File): boolean => {
    setValidationError(null)

    if (file.size > MAX_FILE_SIZE) {
      setValidationError(`Arquivo muito grande (${formatFileSize(file.size)}). Maximo: 50 MB`)
      return false
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
      setValidationError(`Tipo de arquivo nao permitido: ${ext}`)
      return false
    }

    return true
  }, [])

  const handleFileSelect = useCallback((file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file)
      // Auto-preencher nome se vazio
      const currentName = form.getValues('name')
      if (!currentName) {
        const nameWithoutExt = file.name.replace(/\.[^.]+$/, '')
        form.setValue('name', nameWithoutExt)
      }
      // Auto-detectar categoria pela extensao
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext) {
        const currentCategory = form.getValues('category')
        if (!currentCategory) {
          if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
            form.setValue('category', 'PHOTO')
          } else if (ext === 'pdf') {
            form.setValue('category', 'OTHER')
          } else if (['doc', 'docx'].includes(ext)) {
            form.setValue('category', 'REPORT')
          } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
            form.setValue('category', 'SPECIFICATION')
          } else if (['dwg', 'dxf'].includes(ext)) {
            form.setValue('category', 'DRAWING')
          }
        }
      }
    }
  }, [validateFile, form])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  function onSubmit(values: FormValues) {
    if (!selectedFile) {
      setValidationError('Selecione um arquivo para enviar')
      return
    }

    startTransition(async () => {
      try {
        // 1. Upload do arquivo fisico via API route
        setUploadProgress(10)
        const formData = new FormData()
        formData.append('file', selectedFile)

        const uploadRes = await fetch('/api/upload/document', {
          method: 'POST',
          body: formData,
        })

        setUploadProgress(60)

        if (!uploadRes.ok) {
          const err = await uploadRes.json()
          throw new Error(err.error || 'Erro no upload')
        }

        const uploadResult = await uploadRes.json()
        setUploadProgress(80)

        // 2. Registrar no banco de dados via server action
        const result = await uploadDocument({
          name: values.name,
          description: values.description || undefined,
          category: values.category,
          folderId: values.folderId || undefined,
          filePath: uploadResult.url,
          fileSize: uploadResult.fileSize,
          mimeType: uploadResult.mimeType,
        })

        setUploadProgress(100)

        if (result.success) {
          toast({
            title: 'Documento Enviado',
            description: `O documento "${values.name}" foi enviado com sucesso.`,
          })
          setOpen(false)
          router.refresh()
        } else {
          toast({
            variant: 'destructive',
            title: 'Erro',
            description: result.error,
          })
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro no Upload',
          description: error instanceof Error ? error.message : 'Tente novamente mais tarde.',
        })
      } finally {
        setUploadProgress(0)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Enviar Documento
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Enviar Documento</DialogTitle>
          <DialogDescription>
            Arraste um arquivo ou clique para selecionar. Maximo 50 MB.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Drag & Drop Area */}
            <div
              className={`
                relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                transition-colors duration-200
                ${isDragOver
                  ? 'border-primary bg-primary/5'
                  : selectedFile
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={ALLOWED_EXTENSIONS.join(',')}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelect(file)
                }}
              />

              {selectedFile ? (
                <div className="flex items-center gap-3">
                  {getFileIcon(selectedFile.type)}
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedFile(null)
                      setValidationError(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <CloudUpload className="h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Arraste e solte um arquivo aqui ou <span className="text-primary font-medium">clique para selecionar</span>
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    PDF, DOC, XLS, imagens, DWG e outros (max 50 MB)
                  </p>
                </div>
              )}
            </div>

            {validationError && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}

            {uploadProgress > 0 && (
              <div className="space-y-1">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  {uploadProgress < 60 ? 'Enviando arquivo...' : uploadProgress < 100 ? 'Registrando documento...' : 'Concluido!'}
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Documento *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Planta Baixa - Pavimento 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descricao</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descricao do documento..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="folderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pasta</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Nenhuma (raiz)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {folders.map((folder) => (
                          <SelectItem key={folder.id} value={folder.id}>
                            {folder.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending || !selectedFile}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Documento
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
