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
import { createClient, updateClient } from '@/app/actions/client-actions'
import { CepInput } from '@/components/ui/cep-input'
import { CnpjInput } from '@/components/ui/cnpj-input'
import { CpfInput } from '@/components/ui/cpf-input'
import { Plus, Loader2 } from 'lucide-react'

const formSchema = z.object({
  type: z.enum(['COMPANY', 'INDIVIDUAL']).default('COMPANY'),
  companyName: z.string().optional(),
  tradeName: z.string().optional(),
  cnpj: z.string().optional(),
  personName: z.string().optional(),
  cpf: z.string().optional(),
  displayName: z.string().min(2, 'Nome de exibição é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  contactPerson: z.string().optional(),
  contactRole: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).default('ACTIVE'),
})

type FormValues = z.infer<typeof formSchema>

interface ClientDialogProps {
  companyId: string
  client?: any
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ClientDialog({
  companyId,
  client,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: ClientDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      type: client?.type || 'COMPANY',
      companyName: client?.companyName || '',
      tradeName: client?.tradeName || '',
      cnpj: client?.cnpj || '',
      personName: client?.personName || '',
      cpf: client?.cpf || '',
      displayName: client?.displayName || '',
      email: client?.email || '',
      phone: client?.phone || '',
      mobile: client?.mobile || '',
      address: client?.address || '',
      number: client?.number || '',
      complement: client?.complement || '',
      neighborhood: client?.neighborhood || '',
      city: client?.city || '',
      state: client?.state || '',
      zipCode: client?.zipCode || '',
      contactPerson: client?.contactPerson || '',
      contactRole: client?.contactRole || '',
      notes: client?.notes || '',
      status: client?.status || 'ACTIVE',
    },
  })

  const selectedType = form.watch('type')

  useEffect(() => {
    if (open && client) {
      form.reset({
        type: client.type || 'COMPANY',
        companyName: client.companyName || '',
        tradeName: client.tradeName || '',
        cnpj: client.cnpj || '',
        personName: client.personName || '',
        cpf: client.cpf || '',
        displayName: client.displayName || '',
        email: client.email || '',
        phone: client.phone || '',
        mobile: client.mobile || '',
        address: client.address || '',
        number: client.number || '',
        complement: client.complement || '',
        neighborhood: client.neighborhood || '',
        city: client.city || '',
        state: client.state || '',
        zipCode: client.zipCode || '',
        contactPerson: client.contactPerson || '',
        contactRole: client.contactRole || '',
        notes: client.notes || '',
        status: client.status || 'ACTIVE',
      })
    }
    if (!open && !client) {
      form.reset()
    }
  }, [open, client, form])

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const payload = { ...values, companyId }

      const result = client
        ? await updateClient(client.id, payload)
        : await createClient(payload)

      if (result.success) {
        toast({
          title: client ? 'Cliente Atualizado' : 'Cliente Criado',
          description: `${values.displayName} foi ${client ? 'atualizado' : 'cadastrado'} com sucesso.`,
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
              Novo Cliente
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          <DialogDescription>
            {client
              ? 'Atualize as informações do cliente.'
              : 'Cadastre um novo cliente no sistema.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Tipo PJ/PF Toggle */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Pessoa</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="COMPANY">Pessoa Jurídica (PJ)</SelectItem>
                      <SelectItem value="INDIVIDUAL">Pessoa Física (PF)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campos PJ */}
            {selectedType === 'COMPANY' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razão Social</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Construtora ABC Ltda" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tradeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Fantasia</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: ABC Construtora" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ</FormLabel>
                      <FormControl>
                        <CnpjInput
                          value={field.value || ''}
                          onChange={field.onChange}
                          onDataFill={(data) => {
                            if (data.razaoSocial) form.setValue('companyName', data.razaoSocial)
                            if (data.nomeFantasia) form.setValue('tradeName', data.nomeFantasia)
                            if (data.razaoSocial) form.setValue('displayName', data.nomeFantasia || data.razaoSocial)
                            if (data.email) form.setValue('email', data.email)
                            if (data.phone) form.setValue('phone', data.phone)
                            if (data.address) form.setValue('address', data.address)
                            if (data.neighborhood) form.setValue('neighborhood', data.neighborhood)
                            if (data.city) form.setValue('city', data.city)
                            if (data.state) form.setValue('state', data.state)
                            if (data.zipCode) form.setValue('zipCode', data.zipCode)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Campos PF */}
            {selectedType === 'INDIVIDUAL' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="personName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: João da Silva" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl>
                        <CpfInput
                          value={field.value || ''}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Nome de Exibição */}
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome de Exibição *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nome usado para identificação no sistema"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contato */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contato@empresa.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 0000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Celular</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Endereço */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rua/Logradouro</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Rua das Flores" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="complement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complemento</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Sala 301" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="neighborhood"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Centro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: São Paulo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UF</FormLabel>
                      <FormControl>
                        <Input placeholder="SP" maxLength={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <CepInput
                          value={field.value || ''}
                          onChange={field.onChange}
                          onAddressFill={(addr) => {
                            form.setValue('address', addr.street)
                            form.setValue('neighborhood', addr.neighborhood)
                            form.setValue('city', addr.city)
                            form.setValue('state', addr.state)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Responsável */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Responsável</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Ana Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo do Responsável</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Engenheira Responsável" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Ativo</SelectItem>
                      <SelectItem value="INACTIVE">Inativo</SelectItem>
                      <SelectItem value="BLOCKED">Bloqueado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Observações */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações adicionais sobre o cliente..."
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {client ? 'Atualizar' : 'Cadastrar'} Cliente
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
