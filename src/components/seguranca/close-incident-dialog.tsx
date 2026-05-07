'use client'
import { useRouter } from 'next/navigation'

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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { closeIncident } from '@/app/actions/safety-actions'
import { Loader2 } from 'lucide-react'

const formSchema = z.object({
  rootCause: z.string().min(1, 'Causa raiz e obrigatoria'),
  correctiveAction: z.string().min(1, 'Acao corretiva e obrigatoria'),
  preventiveAction: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface CloseIncidentDialogProps {
  incidentId: string
  incidentDescription: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CloseIncidentDialog({
  incidentId,
  incidentDescription,
  open,
  onOpenChange,
}: CloseIncidentDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      rootCause: '',
      correctiveAction: '',
      preventiveAction: '',
    },
  })

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        const result = await closeIncident(incidentId, {
          rootCause: values.rootCause,
          correctiveAction: values.correctiveAction,
          preventiveAction: values.preventiveAction || undefined,
        })

        if (result.success) {
          toast({
            title: 'Incidente Encerrado',
            description: 'O incidente foi encerrado com sucesso.',
          })
          onOpenChange(false)
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Encerrar Incidente</DialogTitle>
          <DialogDescription>
            Encerrar: {incidentDescription.substring(0, 80)}
            {incidentDescription.length > 80 ? '...' : ''}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="rootCause"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Causa Raiz *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva a causa raiz do incidente..."
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
              name="correctiveAction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acao Corretiva *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva a acao corretiva adotada..."
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
              name="preventiveAction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acao Preventiva</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva acoes preventivas para evitar recorrencia..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Encerrar Incidente
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
