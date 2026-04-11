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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { performInspection } from '@/app/actions/quality-actions'
import { Loader2 } from 'lucide-react'

const formSchema = z.object({
  result: z.enum(['PASSED', 'FAILED', 'CONDITIONAL'], {
    message: 'Resultado e obrigatorio',
  }),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface InspectionDialogProps {
  checkpoint: { id: string; name: string }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InspectionDialog({
  checkpoint,
  open,
  onOpenChange,
}: InspectionDialogProps) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      result: undefined,
      notes: '',
    },
  })

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        const result = await performInspection(checkpoint.id, {
          result: values.result,
          notes: values.notes,
        })

        if (result.success) {
          toast({
            title: 'Inspecao Realizada',
            description: `Inspecao de "${checkpoint.name}" registrada com sucesso.`,
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
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Realizar Inspecao</DialogTitle>
          <DialogDescription>
            Registre o resultado da inspecao para &quot;{checkpoint.name}&quot;.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="result"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resultado *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o resultado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PASSED">Aprovado</SelectItem>
                      <SelectItem value="FAILED">Reprovado</SelectItem>
                      <SelectItem value="CONDITIONAL">Condicional</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observacoes sobre a inspecao..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
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
                Registrar Inspecao
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
