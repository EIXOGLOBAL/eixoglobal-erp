'use client'

import { useEffect, useState } from 'react'
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { createRentalItem, updateRentalItem } from '@/app/actions/rental-actions'
import { RENTAL_TYPE_GROUPS, RENTAL_TYPE_LABELS } from '@/lib/rental-icons'
import { Plus, Loader2, Pencil } from 'lucide-react'

const formSchema = z.object({
  name: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  type: z.enum([
    'PROPERTY_RESIDENTIAL', 'PROPERTY_COMMERCIAL', 'PROPERTY_WAREHOUSE',
    'VEHICLE_TRUCK', 'VEHICLE_VAN', 'VEHICLE_CAR', 'VEHICLE_MOTORCYCLE',
    'EQUIPMENT_CRANE', 'EQUIPMENT_EXCAVATOR', 'EQUIPMENT_BULLDOZER', 'EQUIPMENT_MIXER',
    'EQUIPMENT_COMPRESSOR', 'EQUIPMENT_GENERATOR', 'EQUIPMENT_COMPACTOR', 'EQUIPMENT_PUMP',
    'EQUIPMENT_WELDER', 'EQUIPMENT_SCAFFOLD', 'OTHER',
  ]),
  description: z.string().optional(),
  supplier: z.string().optional(),
  supplierPhone: z.string().optional(),
  dailyRate: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
  weeklyRate: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
  monthlyRate: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
})

type FormValues = z.infer<typeof formSchema>

export interface RentalItemData {
  id: string
  name: string
  type: string
  description?: string | null
  supplier?: string | null
  supplierPhone?: string | null
  dailyRate?: number | null
  weeklyRate?: number | null
  monthlyRate?: number | null
}

interface RentalItemDialogProps {
  companyId: string
  item?: RentalItemData
  trigger?: React.ReactNode
  // Controlled mode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function RentalItemDialog({
  companyId,
  item,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: RentalItemDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const isEdit = Boolean(item)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  function setOpen(v: boolean) {
    if (isControlled) {
      controlledOnOpenChange?.(v)
    } else {
      setInternalOpen(v)
    }
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: item?.name ?? '',
      type: (item?.type as FormValues['type']) ?? 'EQUIPMENT_GENERATOR',
      description: item?.description ?? '',
      supplier: item?.supplier ?? '',
      supplierPhone: item?.supplierPhone ?? '',
      dailyRate: item?.dailyRate ?? '',
      weeklyRate: item?.weeklyRate ?? '',
      monthlyRate: item?.monthlyRate ?? '',
    },
  })

  // Reset form when dialog opens with new item
  useEffect(() => {
    if (open) {
      form.reset({
        name: item?.name ?? '',
        type: (item?.type as FormValues['type']) ?? 'EQUIPMENT_GENERATOR',
        description: item?.description ?? '',
        supplier: item?.supplier ?? '',
        supplierPhone: item?.supplierPhone ?? '',
        dailyRate: item?.dailyRate ?? '',
        weeklyRate: item?.weeklyRate ?? '',
        monthlyRate: item?.monthlyRate ?? '',
      })
    }
  }, [open, item]) // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(values: FormValues) {
    setLoading(true)
    const data = {
      name: values.name,
      type: values.type,
      description: values.description || undefined,
      supplier: values.supplier || undefined,
      supplierPhone: values.supplierPhone || undefined,
      dailyRate: values.dailyRate !== '' && values.dailyRate != null ? Number(values.dailyRate) : null,
      weeklyRate: values.weeklyRate !== '' && values.weeklyRate != null ? Number(values.weeklyRate) : null,
      monthlyRate: values.monthlyRate !== '' && values.monthlyRate != null ? Number(values.monthlyRate) : null,
      companyId,
    }

    const result = isEdit && item
      ? await updateRentalItem(item.id, data)
      : await createRentalItem(data)

    setLoading(false)

    if (result.success) {
      toast({
        title: isEdit ? 'Item atualizado' : 'Item cadastrado',
        description: `${values.name} foi ${isEdit ? 'atualizado' : 'cadastrado'} com sucesso.`,
      })
      setOpen(false)
      if (!isEdit) form.reset()
    } else {
      toast({
        title: 'Erro',
        description: result.error ?? 'Ocorreu um erro.',
        variant: 'destructive',
      })
    }
  }

  const dialogContent = (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Editar Item de Locação' : 'Cadastrar Item de Locação'}</DialogTitle>
        <DialogDescription>
          {isEdit ? 'Atualize os dados do item.' : 'Cadastre um item que pode ser locado para obras.'}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Item *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Gerador 5kVA - Leão Locações" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(RENTAL_TYPE_GROUPS).map(([group, types]) => (
                      <SelectGroup key={group}>
                        <SelectLabel>{group}</SelectLabel>
                        {types.map((type) => (
                          <SelectItem key={type} value={type}>
                            {RENTAL_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea placeholder="Descrição do item..." rows={2} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornecedor/Locadora</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da locadora" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="supplierPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="(11) 9 9999-9999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name="dailyRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diária (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="weeklyRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Semanal (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="monthlyRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mensal (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  )

  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant={isEdit ? 'outline' : 'default'}>
            {isEdit ? <Pencil className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {isEdit ? 'Editar Item' : 'Cadastrar Item'}
          </Button>
        )}
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  )
}
