'use client'
import { useRouter } from 'next/navigation'

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createCompany, updateCompany } from "@/app/actions/company-actions"
import { CepInput } from "@/components/ui/cep-input"
import { CnpjInput } from "@/components/ui/cnpj-input"
import { Plus, Loader2 } from "lucide-react"

const formSchema = z.object({
    name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
    tradeName: z.string().optional(),
    cnpj: z.string().min(14, "CNPJ deve ter 14 dígitos"),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().max(2, "UF deve ter 2 caracteres").optional(),
    zipCode: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface CompanyDialogProps {
    company?: any
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function CompanyDialog({
  company, trigger, open: controlledOpen, onOpenChange }: CompanyDialogProps) {
  const router = useRouter()
    const [internalOpen, setInternalOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen
    const { toast } = useToast()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: company?.name || "",
            tradeName: company?.tradeName || "",
            cnpj: company?.cnpj || "",
            email: company?.email || "",
            phone: company?.phone || "",
            address: company?.address || "",
            city: company?.city || "",
            state: company?.state || "",
            zipCode: company?.zipCode || "",
        }
    })

    useEffect(() => {
        if (open && company) {
            form.reset({
                name: company.name || "",
                tradeName: company.tradeName || "",
                cnpj: company.cnpj || "",
                email: company.email || "",
                phone: company.phone || "",
                address: company.address || "",
                city: company.city || "",
                state: company.state || "",
                zipCode: company.zipCode || "",
            })
        }
    }, [open, company, form])

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const result = company
                ? await updateCompany(company.id, values)
                : await createCompany(values)

            if (result.success) {
                toast({
                    title: company ? "Empresa Atualizada" : "Empresa Cadastrada",
                    description: `${values.name} foi ${company ? 'atualizada' : 'cadastrada'} com sucesso.`,
                })
                setOpen(false)
                form.reset()
                router.refresh()
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro",
                    description: result.error,
                })
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro inesperado",
                description: "Tente novamente mais tarde.",
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
                            Nova Empresa
                        </Button>
                    )}
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{company ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
                    <DialogDescription>
                        {company ? 'Atualize os dados da empresa cliente.' : 'Cadastre uma nova empresa cliente.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Nome Empresarial / Razão Social *</FormLabel>
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
                                    <FormItem className="col-span-2">
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
                                        <FormLabel>CNPJ *</FormLabel>
                                        <FormControl>
                                            <CnpjInput
                                                value={field.value || ''}
                                                onChange={field.onChange}
                                                onDataFill={(data) => {
                                                    if (data.razaoSocial) form.setValue('name', data.razaoSocial)
                                                    if (data.email) form.setValue('email', data.email)
                                                    if (data.phone) form.setValue('phone', data.phone)
                                                    if (data.address) form.setValue('address', data.address)
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
                                name="email"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="email"
                                                placeholder="contato@empresa.com.br"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Endereço</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Rua, número, bairro" {...field} />
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
                                            <Input placeholder="São Paulo" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="state"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>UF</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="SP"
                                                maxLength={2}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="zipCode"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>CEP</FormLabel>
                                        <FormControl>
                                            <CepInput
                                                value={field.value || ''}
                                                onChange={field.onChange}
                                                onAddressFill={(addr) => {
                                                    form.setValue('address', [addr.street, addr.neighborhood].filter(Boolean).join(', '))
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

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {company ? 'Atualizar' : 'Cadastrar'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
