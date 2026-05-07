'use client'

import { useState, useEffect } from 'react'
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
import { createRental } from '@/app/actions/rental-actions'
import { BILLING_CYCLE_LABELS } from '@/lib/rental-icons'
import { Plus, Loader2 } from 'lucide-react'

const formSchema = z.object({
  itemId: z.string().uuid('Selecione um item'),
  projectId: z.string().optional(),
  billingCycle: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  unitRate: z.coerce.number().min(0, 'Valor deve ser maior ou igual a zero'),
  startDate: z.string().min(1, 'Data de início é obrigatória'),
  expectedEndDate: z.string().optional(),
  notes: z.string().optional(),
  costCenterId: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface RentalItem {
  id: string
  name: string
  type: string
  dailyRate?: number | null
  weeklyRate?: number | null
  monthlyRate?: number | null
}

interface Project {
  id: string
  name: string
}

interface CostCenter {
  id: string
  code: string
  name: string
  projectId?: string | null
}

interface RentalDialogProps {
  companyId: string
  items: RentalItem[]
  projects: Project[]
  costCenters?: CostCenter[]
  trigger?: React.ReactNode
}

export function RentalDialog({ companyId, items, projects, costCenters = [], trigger }: RentalDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      itemId: '',
      projectId: '',
      billingCycle: 'MONTHLY',
      unitRate: 0,
      startDate: '',
      expectedEndDate: '',
      notes: '',
      costCenterId: '',
    },
  })

  const watchedItemId = form.watch('itemId')
  const watchedCycle = form.watch('billingCycle')

  // Auto-fill rate when item or billing cycle changes
  useEffect(() => {
    if (!watchedItemId) return
    const selectedItem = items.find((i) => i.id === watchedItemId)
    if (!selectedItem) return

    const cycle = watchedCycle
    let rate: number | null = null
    if (cycle === 'DAILY') rate = selectedItem.dailyRate ?? null
    else if (cycle === 'WEEKLY') rate = selectedItem.weeklyRate ?? null
    else rate = selectedItem.monthlyRate ?? null

    if (rate != null) {
      form.setValue('unitRate', rate)
    }
  }, [watchedItemId, watchedCycle, items, form])

  async function onSubmit(values: FormValues) {
    setLoading(true)
    const result = await createRental({
      itemId: values.itemId,
      projectId: values.projectId || null,
      billingCycle: values.billingCycle,
      unitRate: values.unitRate,
      startDate: values.startDate,
      expectedEndDate: values.expectedEndDate || null,
      notes: values.notes || null,
      companyId,
      costCenterId: values.costCenterId || null,
    })
    setLoading(false)

    if (result.success) {
      toast({
        title: 'Locação registrada',
        description: 'A locação foi registrada com sucesso.',
      })
      setOpen(false)
      form.reset()
    } else {
      toast({
        title: 'Erro',
        description: result.error ?? 'Ocorreu um erro ao registrar a locação.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Locação
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Locação</DialogTitle>
          <DialogDescription>
            Registre uma locação de item para uma obra.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="itemId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Locado *</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === '__none__' ? null : v)} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o item" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
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
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Projeto (opcional)</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === '__none__' ? null : v)} value={field.value ?? '__none__'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sem projeto vinculado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
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

            {costCenters.length > 0 && (
              <FormField
                control={form.control}
                name="costCenterId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Centro de Custo (opcional)</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === '__none__' ? null : v)} value={field.value ?? '__none__'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sem centro de custo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhum</SelectItem>
                        {costCenters.map((cc) => (
                          <SelectItem key={cc.id} value={cc.id}>
                            {cc.code} — {cc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="billingCycle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciclo de Cobrança *</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === '__none__' ? null : v)} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(BILLING_CYCLE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
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
                name="unitRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor/Período (R$) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0,00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expectedEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prev. Devolução</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observações adicionais..." rows={2} {...field} />
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
                Registrar Locação
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
