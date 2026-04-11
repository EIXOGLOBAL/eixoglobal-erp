'use client'

import { useTransition } from 'react'
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
import { SpellCheckTextarea } from '@/components/ui/spell-check-textarea'
import { useToast } from '@/hooks/use-toast'
import { createNonConformity } from '@/app/actions/quality-actions'
import { Loader2 } from 'lucide-react'

const formSchema = z.object({
  description: z.string().min(1, 'Descricao e obrigatoria'),
  severity: z.string().min(1, 'Severidade e obrigatoria'),
  correctiveAction: z.string().optional(),
  responsibleId: z.string().optional(),
  dueDate: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface NonConformityDialogProps {
  checkpoint: { id: string; name: string }
  users?: { id: string; name: string }[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NonConformityDialog({
  checkpoint,
  users = [],
  open,
  onOpenChange,
}: NonConformityDialogProps) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      description: '',
      severity: '',
      correctiveAction: '',
      responsibleId: '',
      dueDate: '',
    },
  })

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        const payload: any = {
          description: values.description,
          severity: values.severity,
          correctiveAction: values.correctiveAction || undefined,
          responsibleId: values.responsibleId || undefined,
          dueDate: values.dueDate
            ? new Date(values.dueDate).toISOString()
            : undefined,
        }

        const result = await createNonConformity(checkpoint.id, payload)

        if (result.success) {
          toast({
            title: 'Nao Conformidade Registrada',
            description: `NC registrada para "${checkpoint.name}" com sucesso.`,
          })
          onOpenChange(false)
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar Nao Conformidade</DialogTitle>
          <DialogDescription>
            Registre uma nao conformidade para &quot;{checkpoint.name}&quot;.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descricao *</FormLabel>
                  <FormControl>
                    <SpellCheckTextarea
                      placeholder="Descreva a nao conformidade encontrada..."
                      className="resize-none"
                      rows={3}
                      fieldName="description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="severity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Severidade *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a severidade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="LOW">Baixa</SelectItem>
                      <SelectItem value="MEDIUM">Media</SelectItem>
                      <SelectItem value="HIGH">Alta</SelectItem>
                      <SelectItem value="CRITICAL">Critica</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="correctiveAction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acao Corretiva</FormLabel>
                  <FormControl>
                    <SpellCheckTextarea
                      placeholder="Descreva a acao corretiva sugerida..."
                      className="resize-none"
                      rows={2}
                      fieldName="correctiveAction"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {users.length > 0 && (
              <FormField
                control={form.control}
                name="responsibleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsavel</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o responsavel (opcional)" />
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

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prazo</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar NC
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
