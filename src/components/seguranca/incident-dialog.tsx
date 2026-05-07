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
import { SpellCheckInput } from '@/components/ui/spell-check-input'
import { SpellCheckTextarea } from '@/components/ui/spell-check-textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { reportIncident } from '@/app/actions/safety-actions'
import { Plus, Loader2 } from 'lucide-react'

const INCIDENT_TYPES = [
  { value: 'ACCIDENT', label: 'Acidente' },
  { value: 'NEAR_MISS', label: 'Quase-Acidente' },
  { value: 'UNSAFE_CONDITION', label: 'Condicao Insegura' },
  { value: 'UNSAFE_ACT', label: 'Ato Inseguro' },
  { value: 'ENVIRONMENTAL', label: 'Ambiental' },
  { value: 'FIRST_AID', label: 'Primeiros Socorros' },
  { value: 'PPE_VIOLATION', label: 'Violacao EPI' },
] as const

const SEVERITY_OPTIONS = [
  { value: 'CRITICAL', label: 'Critica' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'LOW', label: 'Baixa' },
] as const

const formSchema = z.object({
  description: z.string().min(1, 'Descricao e obrigatoria'),
  type: z.enum(['ACCIDENT', 'NEAR_MISS', 'UNSAFE_CONDITION', 'UNSAFE_ACT', 'ENVIRONMENTAL', 'FIRST_AID', 'PPE_VIOLATION']),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  projectId: z.string().optional(),
  location: z.string().optional(),
  witnesses: z.string().optional(),
  createNonConformity: z.boolean().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface IncidentDialogProps {
  projects: { id: string; name: string }[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function IncidentDialog({
  projects,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: IncidentDialogProps) {
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
      description: '',
      type: 'ACCIDENT',
      severity: 'MEDIUM',
      projectId: '',
      location: '',
      witnesses: '',
      createNonConformity: false,
    },
  })

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        const witnessesArray = values.witnesses
          ? values.witnesses.split(',').map((w) => w.trim()).filter(Boolean)
          : []

        const result = await reportIncident({
          code: `INC-${Date.now()}`,
          title: values.description.substring(0, 100),
          description: values.description,
          type: values.type,
          severity: values.severity,
          projectId: values.projectId || undefined,
          location: values.location || undefined,
          witnesses: witnessesArray.length > 0 ? witnessesArray : undefined,
          createNonConformity: values.createNonConformity || false,
        })

        if (result.success) {
          toast({
            title: 'Incidente Registrado',
            description: 'O incidente foi registrado com sucesso.',
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
              Registrar Incidente
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Incidente</DialogTitle>
          <DialogDescription>
            Registre um novo incidente de seguranca do trabalho.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Incidente *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INCIDENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
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
                      {SEVERITY_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descricao *</FormLabel>
                  <FormControl>
                    <SpellCheckTextarea
                      placeholder="Descreva o incidente ocorrido..."
                      className="resize-none"
                      rows={4}
                      fieldName="description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Local</FormLabel>
                    <FormControl>
                      <SpellCheckInput placeholder="Ex: Bloco A, 3o andar" fieldName="location" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="witnesses"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Testemunhas</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nomes separados por virgula"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="createNonConformity"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Criar Nao Conformidade automaticamente
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Gera uma Nao Conformidade vinculada a este incidente no modulo de Qualidade.
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar Incidente
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
