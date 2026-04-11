'use client'

import { useState, useEffect, useTransition } from 'react'
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
import { useToast } from '@/hooks/use-toast'
import { uploadDocument, getFolders } from '@/app/actions/document-actions'
import { Upload, Loader2 } from 'lucide-react'

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
    'DRAWING',
    'SPECIFICATION',
    'MEMORIAL',
    'ART_RRT',
    'PERMIT',
    'CONTRACT',
    'REPORT',
    'PHOTO',
    'INVOICE',
    'CERTIFICATE',
    'MANUAL',
    'OTHER',
  ], { message: 'Categoria e obrigatoria' }),
  folderId: z.string().optional(),
  fileName: z.string().min(1, 'Arquivo e obrigatorio'),
})

type FormValues = z.infer<typeof formSchema>

interface Folder {
  id: string
  name: string
}

interface UploadDocumentDialogProps {
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function UploadDocumentDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
}: UploadDocumentDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [folders, setFolders] = useState<Folder[]>([])
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
      folderId: undefined,
      fileName: '',
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
      form.reset()
    }
  }, [open, form])

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        const result = await uploadDocument({
          name: values.name,
          description: values.description || undefined,
          category: values.category,
          folderId: values.folderId || undefined,
          filePath: `/uploads/${values.fileName}`,
          fileSize: 0,
          mimeType: 'application/octet-stream',
        })

        if (result.success) {
          toast({
            title: 'Documento Enviado',
            description: `O documento "${values.name}" foi cadastrado com sucesso.`,
          })
          setOpen(false)
          form.reset()
          window.location.reload()
        } else {
          toast({
            variant: 'destructive',
            title: 'Erro',
            description: result.error,
          })
        }
      } catch {
        toast({
          variant: 'destructive',
          title: 'Erro inesperado',
          description: 'Tente novamente mais tarde.',
        })
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
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Enviar Documento</DialogTitle>
          <DialogDescription>
            Cadastre um novo documento no sistema.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      rows={3}
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
                          <SelectValue placeholder="Nenhuma" />
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

            <FormField
              control={form.control}
              name="fileName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arquivo *</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        field.onChange(file?.name || '')
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
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
