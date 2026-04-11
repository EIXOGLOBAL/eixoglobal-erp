'use client'

import { useState, useTransition } from 'react'
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
import { createInspection } from '@/app/actions/safety-actions'
import { Plus, Loader2 } from 'lucide-react'

const formSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio'),
  projectId: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface InspectionDialogProps {
  projects: { id: string; name: string }[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function InspectionDialog({
  projects,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: InspectionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: '',
      projectId: '',
    },
  })

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        const result = await createInspection({
          name: values.name,
          projectId: values.projectId || undefined,
        })

        if (result.success) {
          toast({
            title: 'Inspecao Criada',
            description: 'A inspecao foi criada com sucesso.',
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
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Nova Inspecao
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Nova Inspecao</DialogTitle>
          <DialogDescription>
            Crie uma nova inspecao de seguranca do trabalho.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo / Nome da Inspecao *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Inspecao de EPI, Inspecao de Andaime"
                      {...field}
                    />
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
                  <FormLabel>Projeto</FormLabel>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Inspecao
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
