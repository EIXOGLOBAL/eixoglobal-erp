'use client'
import { useRouter } from 'next/navigation'

import { useState, useTransition } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
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
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { completeInspection } from '@/app/actions/safety-actions'
import { Loader2, Plus, Trash2 } from 'lucide-react'

const DEFAULT_CHECKLIST_ITEMS = [
  'EPI disponivel e em bom estado',
  'Sinalizacao adequada',
  'Area limpa e organizada',
  'Equipamentos em bom funcionamento',
  'Extintores dentro da validade',
]

const formSchema = z.object({
  score: z.coerce.number().min(0, 'Minimo 0').max(100, 'Maximo 100'),
  checklist: z.record(z.string(), z.boolean()),
  findings: z.array(
    z.object({
      item: z.string().min(1, 'Item e obrigatorio'),
      status: z.enum(['PASS', 'FAIL', 'OBSERVATION']),
      notes: z.string().optional(),
    })
  ),
  photos: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface CompleteInspectionDialogProps {
  inspectionId: string
  inspectionType: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CompleteInspectionDialog({
  inspectionId,
  inspectionType,
  open,
  onOpenChange,
}: CompleteInspectionDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [checklistItems, setChecklistItems] = useState<string[]>(DEFAULT_CHECKLIST_ITEMS)
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const { toast } = useToast()

  const defaultChecklist: Record<string, boolean> = {}
  DEFAULT_CHECKLIST_ITEMS.forEach((item) => {
    defaultChecklist[item] = false
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      score: 0,
      checklist: defaultChecklist,
      findings: [],
      photos: '',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'findings',
  })

  function addChecklistItem() {
    if (!newChecklistItem.trim()) return
    const item = newChecklistItem.trim()
    setChecklistItems((prev) => [...prev, item])
    const current = form.getValues('checklist')
    form.setValue('checklist', { ...current, [item]: false })
    setNewChecklistItem('')
  }

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        const photosArray = values.photos
          ? values.photos.split(',').map((p) => p.trim()).filter(Boolean)
          : []

        const result = await completeInspection(inspectionId, {
          checklist: values.checklist,
          score: values.score,
          findings: values.findings.length > 0 ? values.findings : undefined,
          photos: photosArray.length > 0 ? photosArray : undefined,
        })

        if (result.success) {
          toast({
            title: 'Inspecao Concluida',
            description: 'A inspecao foi concluida com sucesso.',
          })
          onOpenChange(false)
          form.reset()
          setChecklistItems(DEFAULT_CHECKLIST_ITEMS)
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
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Completar Inspecao</DialogTitle>
          <DialogDescription>
            Finalizar inspecao: {inspectionType}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="score"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pontuacao (0-100) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Checklist</FormLabel>
              <div className="space-y-2 rounded-md border p-3">
                {checklistItems.map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <Checkbox
                      checked={form.watch(`checklist.${item}`) || false}
                      onCheckedChange={(checked) => {
                        const current = form.getValues('checklist')
                        form.setValue('checklist', {
                          ...current,
                          [item]: checked === true,
                        })
                      }}
                    />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                  <Input
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    placeholder="Adicionar item ao checklist..."
                    className="text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addChecklistItem()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addChecklistItem}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>Achados / Findings</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({ item: '', status: 'OBSERVATION', notes: '' })
                  }
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Adicionar
                </Button>
              </div>
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-md border p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Achado {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <FormField
                    control={form.control}
                    name={`findings.${index}.item`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Descricao do achado" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name={`findings.${index}.status`}
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PASS">Aprovado</SelectItem>
                              <SelectItem value="FAIL">Reprovado</SelectItem>
                              <SelectItem value="OBSERVATION">
                                Observacao
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`findings.${index}.notes`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Notas" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>

            <FormField
              control={form.control}
              name="photos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fotos (URLs)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="URLs separadas por virgula"
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
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Completar Inspecao
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
