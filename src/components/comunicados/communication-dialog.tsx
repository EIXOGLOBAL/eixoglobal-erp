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
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import {
  createCommunication,
  updateCommunication,
} from '@/app/actions/communication-actions'
import { Plus, Loader2 } from 'lucide-react'

const formSchema = z.object({
  title: z.string().min(1, 'Titulo e obrigatorio'),
  content: z.string().min(1, 'Conteudo e obrigatorio'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  isPinned: z.boolean().default(false),
  targetAudience: z.string().default('ALL'),
  expiresAt: z.string().optional().nullable(),
})

type FormValues = z.infer<typeof formSchema>

interface CommunicationItem {
  id: string
  title: string
  content: string
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  isPinned: boolean
  targetAudience: string
  expiresAt: Date | string | null
}

interface CommunicationDialogProps {
  communication?: CommunicationItem | null
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const audienceOptions = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ADMIN', label: 'Administradores' },
  { value: 'MANAGER', label: 'Gerentes' },
  { value: 'ENGINEER', label: 'Engenheiros' },
  { value: 'SUPERVISOR', label: 'Supervisores' },
  { value: 'SAFETY_OFFICER', label: 'Seguranca do Trabalho' },
  { value: 'ACCOUNTANT', label: 'Contadores' },
  { value: 'HR_ANALYST', label: 'RH' },
  { value: 'USER', label: 'Usuarios' },
]

export function CommunicationDialog({
  communication,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: CommunicationDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen

  function formatDateForInput(val: Date | string | null | undefined): string {
    if (!val) return ''
    const d = typeof val === 'string' ? new Date(val) : val
    if (isNaN(d.getTime())) return ''
    return d.toISOString().split('T')[0]
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      title: communication?.title || '',
      content: communication?.content || '',
      priority: communication?.priority || 'NORMAL',
      isPinned: communication?.isPinned || false,
      targetAudience: communication?.targetAudience || 'ALL',
      expiresAt: formatDateForInput(communication?.expiresAt) || '',
    },
  })

  useEffect(() => {
    if (open && communication) {
      form.reset({
        title: communication.title,
        content: communication.content,
        priority: communication.priority,
        isPinned: communication.isPinned,
        targetAudience: communication.targetAudience || 'ALL',
        expiresAt: formatDateForInput(communication.expiresAt) || '',
      })
    }
    if (!open && !communication) {
      form.reset({
        title: '',
        content: '',
        priority: 'NORMAL',
        isPinned: false,
        targetAudience: 'ALL',
        expiresAt: '',
      })
    }
  }, [open, communication, form])

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const payload = {
        ...values,
        expiresAt: values.expiresAt || null,
      }

      const result = communication
        ? await updateCommunication(communication.id, payload)
        : await createCommunication(payload)

      if (result.success) {
        toast({
          title: communication ? 'Comunicado Atualizado' : 'Comunicado Criado',
          description: `"${values.title}" foi ${communication ? 'atualizado' : 'publicado'} com sucesso.`,
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
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Comunicado
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {communication ? 'Editar Comunicado' : 'Novo Comunicado'}
          </DialogTitle>
          <DialogDescription>
            {communication
              ? 'Atualize as informacoes do comunicado.'
              : 'Publique um novo comunicado para a equipe.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titulo *</FormLabel>
                  <FormControl>
                    <Input
                      autoFocus
                      placeholder="Titulo do comunicado"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conteudo *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Texto do comunicado..."
                      rows={5}
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
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
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
                        <SelectItem value="LOW">Baixa</SelectItem>
                        <SelectItem value="NORMAL">Normal</SelectItem>
                        <SelectItem value="HIGH">Alta</SelectItem>
                        <SelectItem value="URGENT">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetAudience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Publico-Alvo</FormLabel>
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
                        {audienceOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Expiracao</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
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
              name="isPinned"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    Fixar no topo do mural
                  </FormLabel>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {communication ? 'Atualizar' : 'Publicar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
