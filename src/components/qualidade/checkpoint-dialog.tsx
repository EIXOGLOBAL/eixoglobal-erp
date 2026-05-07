'use client'
import { useRouter } from 'next/navigation'

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
import { createCheckpoint, updateCheckpoint } from '@/app/actions/quality-actions'
import { Plus, Loader2 } from 'lucide-react'

const formSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no minimo 2 caracteres'),
  description: z.string().optional(),
  category: z.string().optional(),
  projectId: z.string().min(1, 'Projeto e obrigatorio'),
  inspectorId: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface CheckpointDialogProps {
  companyId: string
  checkpoint?: any
  projects: { id: string; name: string }[]
  users?: { id: string; name: string }[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CheckpointDialog({
  companyId,
  checkpoint,
  projects,
  users = [],
  trigger,
  open: controlledOpen,
  onOpenChange,
}: CheckpointDialogProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: checkpoint?.name || '',
      description: checkpoint?.description || '',
      category: checkpoint?.category || '',
      projectId: checkpoint?.projectId || '',
      inspectorId: checkpoint?.inspectorId || '',
    },
  })

  useEffect(() => {
    if (open && checkpoint) {
      form.reset({
        name: checkpoint.name || '',
        description: checkpoint.description || '',
        category: checkpoint.category || '',
        projectId: checkpoint.projectId || '',
        inspectorId: checkpoint.inspectorId || '',
      })
    }
    if (!open && !checkpoint) {
      form.reset({
        name: '',
        description: '',
        category: '',
        projectId: '',
        inspectorId: '',
      })
    }
  }, [open, checkpoint, form])

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        const payload = {
          name: values.name,
          description: values.description,
          category: values.category,
          projectId: values.projectId,
          companyId,
          inspectorId: values.inspectorId || undefined,
        }

        const result = checkpoint
          ? await updateCheckpoint(checkpoint.id, payload as any)
          : await createCheckpoint(payload as any)

        if (result.success) {
          toast({
            title: checkpoint ? 'Checkpoint Atualizado' : 'Checkpoint Criado',
            description: `${values.name} foi ${checkpoint ? 'atualizado' : 'criado'} com sucesso.`,
          })
          setOpen(false)
          form.reset()
          router.refresh()
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
              <Plus className="mr-2 h-4 w-4" />
              Novo Checkpoint
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {checkpoint ? 'Editar Checkpoint' : 'Novo Checkpoint'}
          </DialogTitle>
          <DialogDescription>
            {checkpoint
              ? 'Atualize as informações do ponto de controle.'
              : 'Cadastre um novo ponto de controle de qualidade.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Verificacao de fundacao" {...field} />
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
                      placeholder="Descreva o ponto de controle..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Estrutural, Eletrica, Hidraulica" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Projeto *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o projeto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {users.length > 0 && (
              <FormField
                control={form.control}
                name="inspectorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inspetor</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o inspetor (opcional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
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
                {checkpoint ? 'Atualizar' : 'Criar'} Checkpoint
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
