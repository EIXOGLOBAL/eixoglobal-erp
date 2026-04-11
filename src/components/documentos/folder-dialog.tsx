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
import { useToast } from '@/hooks/use-toast'
import { createFolder, renameFolder, getFolders } from '@/app/actions/document-actions'
import { FolderPlus, Loader2, Pencil } from 'lucide-react'

const formSchema = z.object({
  name: z.string().min(1, 'Nome da pasta e obrigatorio'),
  parentId: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface Folder {
  id: string
  name: string
}

interface FolderDialogProps {
  mode: 'create' | 'rename'
  folderId?: string
  currentName?: string
  parentFolderId?: string
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function FolderDialog({
  mode,
  folderId,
  currentName,
  parentFolderId,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: FolderDialogProps) {
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
      name: currentName || '',
      parentId: parentFolderId || undefined,
    },
  })

  useEffect(() => {
    if (open && mode === 'create') {
      getFolders().then((result) => {
        if (result.success && result.data) {
          setFolders(result.data.map((f: any) => ({ id: f.id, name: f.name })))
        }
      })
    }
    if (open && mode === 'rename' && currentName) {
      form.setValue('name', currentName)
    }
    if (!open) {
      form.reset({ name: currentName || '', parentId: parentFolderId || undefined })
    }
  }, [open, form, mode, currentName, parentFolderId])

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        if (mode === 'rename' && folderId) {
          const result = await renameFolder(folderId, values.name)
          if (result.success) {
            toast({
              title: 'Pasta Renomeada',
              description: `A pasta foi renomeada para "${values.name}".`,
            })
            setOpen(false)
            window.location.reload()
          } else {
            toast({ variant: 'destructive', title: 'Erro', description: result.error })
          }
        } else {
          const result = await createFolder({
            name: values.name,
            parentId: values.parentId || undefined,
          })
          if (result.success) {
            toast({
              title: 'Pasta Criada',
              description: `A pasta "${values.name}" foi criada com sucesso.`,
            })
            setOpen(false)
            window.location.reload()
          } else {
            toast({ variant: 'destructive', title: 'Erro', description: result.error })
          }
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

  const isRename = mode === 'rename'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant={isRename ? 'ghost' : 'outline'} size={isRename ? 'sm' : 'default'}>
              {isRename ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Nova Pasta
                </>
              )}
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isRename ? 'Renomear Pasta' : 'Nova Pasta'}</DialogTitle>
          <DialogDescription>
            {isRename
              ? 'Digite o novo nome para a pasta.'
              : 'Crie uma nova pasta para organizar seus documentos.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Pasta *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Projetos 2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isRename && (
              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pasta Pai</FormLabel>
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
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isRename ? 'Renomear' : 'Criar Pasta'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
