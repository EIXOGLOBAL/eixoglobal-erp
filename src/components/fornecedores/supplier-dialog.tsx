'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { createSupplier, updateSupplier } from "@/app/actions/supplier-actions"
import { CepInput } from "@/components/ui/cep-input"
import { CnpjInput } from "@/components/ui/cnpj-input"

const formSchema = z.object({
    name: z.string().min(2, "Razao social deve ter no minimo 2 caracteres"),
    tradeName: z.string().optional().nullable(),
    cnpj: z.string().optional().nullable(),
    email: z.string().email("Email invalido").optional().nullable().or(z.literal("")),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    zipCode: z.string().optional().nullable(),
    category: z.enum(['MATERIALS', 'SERVICES', 'UTILITIES', 'RENT', 'TRANSPORT', 'TECHNOLOGY', 'OTHER']),
    notes: z.string().optional().nullable(),
})

type FormValues = z.infer<typeof formSchema>

export interface SupplierForDialog {
    id: string
    name: string
    tradeName: string | null
    cnpj: string | null
    email: string | null
    phone: string | null
    address: string | null
    city: string | null
    state: string | null
    zipCode: string | null
    category: string
    isActive: boolean
    notes: string | null
    rating: number | null
    _count: { fiscalNotes: number; documents: number; evaluations: number }
    expiringDocs: number
    expiredDocs: number
}

export function SupplierDialog({
    companyId,
    supplier,
    open,
    onOpenChange,
}: {
    companyId: string
    supplier?: SupplierForDialog
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const isEdit = !!supplier

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: supplier?.name ?? "",
            tradeName: supplier?.tradeName ?? "",
            cnpj: supplier?.cnpj ?? "",
            email: supplier?.email ?? "",
            phone: supplier?.phone ?? "",
            address: supplier?.address ?? "",
            city: supplier?.city ?? "",
            state: supplier?.state ?? "",
            zipCode: supplier?.zipCode ?? "",
            category: (supplier?.category as FormValues['category']) ?? "OTHER",
            notes: supplier?.notes ?? "",
        },
    })

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const payload = { ...values, companyId }
            const result = isEdit
                ? await updateSupplier(supplier!.id, payload)
                : await createSupplier(payload)

            if (result.success) {
                toast({
                    title: isEdit ? "Fornecedor atualizado!" : "Fornecedor cadastrado!",
                    description: `${values.name} foi ${isEdit ? "atualizado" : "cadastrado"} com sucesso.`,
                })
                onOpenChange(false)
                form.reset()
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? "Atualize os dados do fornecedor."
                            : "Cadastre um novo fornecedor ou prestador de servico."}
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
                                        <FormLabel>Razao Social *</FormLabel>
                                        <FormControl>
                                            <Input autoFocus placeholder="Ex: Fornecedora ABC Ltda" {...field} />
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
                                            <Input placeholder="Nome fantasia" {...field} value={field.value ?? ""} />
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
                                        <FormLabel>CNPJ / CPF</FormLabel>
                                        <FormControl>
                                            <CnpjInput
                                                value={field.value ?? ''}
                                                onChange={field.onChange}
                                                onDataFill={(data) => {
                                                    if (data.razaoSocial) form.setValue('name', data.razaoSocial)
                                                    if (data.nomeFantasia) form.setValue('tradeName', data.nomeFantasia)
                                                    if (data.email) form.setValue('email', data.email)
                                                    if (data.phone) form.setValue('phone', data.phone)
                                                    if (data.address) form.setValue('address', [data.address, data.neighborhood].filter(Boolean).join(', '))
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
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Categoria</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione a categoria" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="MATERIALS">Materiais</SelectItem>
                                                <SelectItem value="SERVICES">Servicos</SelectItem>
                                                <SelectItem value="UTILITIES">Concessionarias</SelectItem>
                                                <SelectItem value="RENT">Locacao</SelectItem>
                                                <SelectItem value="TRANSPORT">Transportadora</SelectItem>
                                                <SelectItem value="TECHNOLOGY">Tecnologia</SelectItem>
                                                <SelectItem value="OTHER">Outros</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="contato@empresa.com" {...field} value={field.value ?? ""} />
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
                                            <Input placeholder="(11) 99999-9999" {...field} value={field.value ?? ""} />
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
                                        <FormLabel>Endereco</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Rua, numero, complemento" {...field} value={field.value ?? ""} />
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
                                            <Input placeholder="Cidade" {...field} value={field.value ?? ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="state"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>UF</FormLabel>
                                            <FormControl>
                                                <Input placeholder="SP" maxLength={2} {...field} value={field.value ?? ""} />
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
                                                    value={field.value ?? ''}
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
                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Observacoes</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Informacoes adicionais" {...field} value={field.value ?? ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {isEdit ? "Salvar Alteracoes" : "Cadastrar"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
