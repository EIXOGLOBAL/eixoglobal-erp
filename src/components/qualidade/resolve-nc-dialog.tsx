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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { resolveNonConformity } from '@/app/actions/quality-actions'
import { Loader2 } from 'lucide-react'

const formSchema = z.object({
  resolution: z.string().min(1, 'Acao corretiva e obrigatoria'),
})

type FormValues = z.infer<typeof formSchema>

interface ResolveNcDialogProps {
  nonConformity: { id: string; description: string }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ResolveNcDialog({
  nonConformity,
  open,
  onOpenChange,
}: ResolveNcDialogProps) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      resolution: '',
    },
  })

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        const result = await resolveNonConformity(
          nonConformity.id,
          values.resolution
        )

        if (result.success) {
          toast({
            title: 'NC Resolvida',
            description: 'Nao conformidade resolvida com sucesso.',
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
          <DialogTitle>Resolver Nao Conformidade</DialogTitle>
          <DialogDescription>
            Descreva a acao corretiva aplicada para resolver esta NC.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          <strong>NC:</strong> {nonConformity.description}
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="resolution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acao Corretiva *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva a acao corretiva aplicada..."
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
                Resolver NC
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
