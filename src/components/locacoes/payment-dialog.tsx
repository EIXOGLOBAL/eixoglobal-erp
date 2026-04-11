'use client'

import { useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CurrencyInput } from '@/components/ui/currency-input'
import { useToast } from '@/hooks/use-toast'
import { addRentalPayment } from '@/app/actions/rental-actions'
import { DollarSign, Loader2 } from 'lucide-react'

const formSchema = z.object({
  amount: z.coerce.number().min(0.01, 'Valor deve ser maior que zero'),
  paidDate: z.string().min(1, 'Data do pagamento é obrigatória'),
  referenceMonth: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface PaymentDialogProps {
  rentalId: string
  trigger?: React.ReactNode
}

export function PaymentDialog({ rentalId, trigger }: PaymentDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      amount: 0,
      paidDate: new Date().toISOString().split('T')[0],
      referenceMonth: '',
      notes: '',
    },
  })

  async function onSubmit(values: FormValues) {
    setLoading(true)
    const result = await addRentalPayment({
      rentalId,
      amount: values.amount,
      paidDate: values.paidDate,
      referenceMonth: values.referenceMonth || null,
      notes: values.notes || null,
    })
    setLoading(false)

    if (result.success) {
      toast({
        title: 'Pagamento registrado',
        description: 'O pagamento foi registrado com sucesso.',
      })
      setOpen(false)
      form.reset({
        amount: 0,
        paidDate: new Date().toISOString().split('T')[0],
        referenceMonth: '',
        notes: '',
      })
    } else {
      toast({
        title: 'Erro',
        description: result.error ?? 'Ocorreu um erro ao registrar o pagamento.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <DollarSign className="h-4 w-4 mr-2" />
            Registrar Pagamento
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
          <DialogDescription>
            Registre um pagamento realizado para esta locação.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Pago (R$) *</FormLabel>
                  <FormControl>
                    <CurrencyInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="R$ 0,00"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paidDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data do Pagamento *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="referenceMonth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mês de Referência</FormLabel>
                  <FormControl>
                    <Input
                      type="month"
                      placeholder="2026-01"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observações sobre o pagamento..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
