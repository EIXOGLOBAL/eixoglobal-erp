'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { SpellCheckTextarea } from '@/components/ui/spell-check-textarea'
import { useToast } from "@/hooks/use-toast"
import {
    createSupplier,
    updateSupplier,
    deleteSupplier,
    toggleSupplierStatus,
} from "@/app/actions/supplier-actions"
import { CepInput } from "@/components/ui/cep-input"
import { CnpjInput } from "@/components/ui/cnpj-input"
import {
    Plus,
    MoreHorizontal,
    Pencil,
    Trash2,
    Building2,
    ToggleLeft,
    ToggleRight,
    Search,
} from "lucide-react"
import { ExportButton } from "@/components/ui/export-button"
import type { ExportColumn } from "@/lib/export-utils"

type Supplier = {
    id: string
    name: string
    tradeName: string | null
    cnpj: string | null
    email: string | null
    phone: string | null
    city: string | null
    state: string | null
    category: string
    isActive: boolean
    notes: string | null
    _count: { fiscalNotes: number }
}

const supplierSchema = z.object({
    name: z.string().min(2, "Razão social é obrigatória"),
    tradeName: z.string().optional(),
    cnpj: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    category: z.enum(['MATERIALS', 'SERVICES', 'UTILITIES', 'RENT', 'TRANSPORT', 'TECHNOLOGY', 'OTHER']),
    notes: z.string().optional(),
})

type FormValues = z.infer<typeof supplierSchema>

type SupplierCategory = 'MATERIALS' | 'SERVICES' | 'UTILITIES' | 'RENT' | 'TRANSPORT' | 'TECHNOLOGY' | 'OTHER'

const categoryLabels: Record<SupplierCategory, string> = {
    MATERIALS: 'Materiais',
    SERVICES: 'Serviços',
    UTILITIES: 'Concessionária',
    RENT: 'Aluguel/Locação',
    TRANSPORT: 'Transporte',
    TECHNOLOGY: 'Tecnologia',
    OTHER: 'Outros',
}

const categoryColors: Record<SupplierCategory, string> = {
    MATERIALS: 'bg-blue-100 text-blue-800 border-blue-200',
    SERVICES: 'bg-purple-100 text-purple-800 border-purple-200',
    UTILITIES: 'bg-orange-100 text-orange-800 border-orange-200',
    RENT: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    TRANSPORT: 'bg-green-100 text-green-800 border-green-200',
    TECHNOLOGY: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    OTHER: 'bg-gray-100 text-gray-800 border-gray-200',
}

function isCategoryKey(value: string): value is SupplierCategory {
    return value in categoryLabels
}

const supplierExportColumns: ExportColumn[] = [
    { key: 'name', label: 'Razao Social' },
    { key: 'tradeName', label: 'Nome Fantasia' },
    { key: 'cnpj', label: 'CNPJ' },
    { key: 'email', label: 'E-mail' },
    { key: 'phone', label: 'Telefone' },
    { key: 'location', label: 'Cidade/UF' },
    { key: 'categoryName', label: 'Categoria' },
    { key: 'docsCount', label: 'Documentos' },
    { key: 'statusLabel', label: 'Status' },
]

function mapSuppliersForExport(list: Supplier[]): Record<string, unknown>[] {
    return list.map(s => ({
        ...s,
        location: [s.city, s.state].filter(Boolean).join('/') || '',
        categoryName: categoryLabels[isCategoryKey(s.category) ? s.category : 'OTHER'],
        docsCount: s._count.fiscalNotes,
        statusLabel: s.isActive ? 'Ativo' : 'Inativo',
    }))
}

interface SuppliersClientProps {
    companyId: string
    suppliers: Supplier[]
}

export function SuppliersClient({ companyId, suppliers }: SuppliersClientProps) {
    const [open, setOpen] = useState(false)
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const form = useForm<FormValues>({
        resolver: zodResolver(supplierSchema),
        defaultValues: {
            name: '',
            tradeName: '',
            cnpj: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            state: '',
            zipCode: '',
            category: 'OTHER',
            notes: '',
        },
    })

    function openCreate() {
        setEditingSupplier(null)
        form.reset({
            name: '',
            tradeName: '',
            cnpj: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            state: '',
            zipCode: '',
            category: 'OTHER',
            notes: '',
        })
        setOpen(true)
    }

    function openEdit(supplier: Supplier) {
        setEditingSupplier(supplier)
        form.reset({
            name: supplier.name,
            tradeName: supplier.tradeName ?? '',
            cnpj: supplier.cnpj ?? '',
            email: supplier.email ?? '',
            phone: supplier.phone ?? '',
            address: '',
            city: supplier.city ?? '',
            state: supplier.state ?? '',
            zipCode: '',
            category: isCategoryKey(supplier.category) ? supplier.category : 'OTHER',
            notes: supplier.notes ?? '',
        })
        setOpen(true)
    }

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            if (editingSupplier) {
                const result = await updateSupplier(editingSupplier.id, {
                    ...values,
                    companyId,
                    isActive: editingSupplier.isActive,
                })
                if (result.success) {
                    toast({ title: "Fornecedor atualizado com sucesso!" })
                    setOpen(false)
                } else {
                    toast({
                        variant: "destructive",
                        title: "Erro",
                        description: result.error,
                    })
                }
            } else {
                const result = await createSupplier({
                    ...values,
                    companyId,
                    isActive: true,
                })
                if (result.success) {
                    toast({ title: "Fornecedor criado com sucesso!" })
                    setOpen(false)
                    form.reset()
                } else {
                    toast({
                        variant: "destructive",
                        title: "Erro",
                        description: result.error,
                    })
                }
            }
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete(supplier: Supplier) {
        const confirmed = window.confirm(
            `Tem certeza que deseja excluir o fornecedor "${supplier.name}"? Esta ação não pode ser desfeita.`
        )
        if (!confirmed) return

        const result = await deleteSupplier(supplier.id)
        if (result.success) {
            toast({ title: "Fornecedor excluído com sucesso!" })
        } else {
            toast({
                variant: "destructive",
                title: "Erro ao excluir",
                description: result.error,
            })
        }
    }

    async function handleToggleStatus(supplier: Supplier) {
        const result = await toggleSupplierStatus(supplier.id, !supplier.isActive)
        if (result.success) {
            toast({
                title: supplier.isActive
                    ? "Fornecedor desativado com sucesso!"
                    : "Fornecedor ativado com sucesso!",
            })
        } else {
            toast({
                variant: "destructive",
                title: "Erro",
                description: result.error,
            })
        }
    }

    const filteredSuppliers = suppliers.filter((s) => {
        const q = search.toLowerCase()
        return (
            s.name.toLowerCase().includes(q) ||
            (s.tradeName ?? '').toLowerCase().includes(q) ||
            (s.cnpj ?? '').toLowerCase().includes(q)
        )
    })

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome, fantasia ou CNPJ..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <ExportButton
                        data={mapSuppliersForExport(filteredSuppliers)}
                        columns={supplierExportColumns}
                        filename="fornecedores"
                        title="Fornecedores"
                        sheetName="Fornecedores"
                        size="sm"
                    />
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={openCreate}>
                                <Plus className="mr-2 h-4 w-4" />
                                Novo Fornecedor
                            </Button>
                        </DialogTrigger>

                    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                            </DialogTitle>
                        </DialogHeader>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                {/* Row 1: name */}
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Razão Social *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Razão social do fornecedor" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Row 1b: tradeName */}
                                <FormField
                                    control={form.control}
                                    name="tradeName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nome Fantasia</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nome fantasia (opcional)" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Row 2: cnpj + phone */}
                                <div className="grid grid-cols-2 gap-4">
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
                                        name="phone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Telefone</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="(00) 00000-0000" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Row 3: email */}
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>E-mail</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="contato@fornecedor.com.br" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Row 4: address */}
                                <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Endereço</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Rua, número, complemento" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Row 5: city + state + zipCode */}
                                <div className="grid grid-cols-3 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="city"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Cidade</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Cidade" {...field} />
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
                                                <FormLabel>Estado</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="UF" maxLength={2} {...field} />
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

                                {/* Row 6: category */}
                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Categoria *</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                value={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione uma categoria" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="MATERIALS">Materiais</SelectItem>
                                                    <SelectItem value="SERVICES">Serviços</SelectItem>
                                                    <SelectItem value="UTILITIES">Concessionária</SelectItem>
                                                    <SelectItem value="RENT">Aluguel/Locação</SelectItem>
                                                    <SelectItem value="TRANSPORT">Transporte</SelectItem>
                                                    <SelectItem value="TECHNOLOGY">Tecnologia</SelectItem>
                                                    <SelectItem value="OTHER">Outros</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Row 7: notes */}
                                <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Observações</FormLabel>
                                            <FormControl>
                                                <SpellCheckTextarea
                                                    placeholder="Informações adicionais sobre o fornecedor..."
                                                    rows={3}
                                                    spellCheckEnabled
                                                    autoCorrectOnBlur
                                                    fieldName="notes"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setOpen(false)}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={loading}>
                                        {loading
                                            ? "Salvando..."
                                            : editingSupplier
                                            ? "Salvar Alterações"
                                            : "Criar Fornecedor"}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fornecedor</TableHead>
                            <TableHead>CNPJ</TableHead>
                            <TableHead>Contato</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead className="text-center">Documentos</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-center">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSuppliers.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={7}
                                    className="text-center py-8 text-muted-foreground"
                                >
                                    {search
                                        ? "Nenhum fornecedor encontrado para a busca."
                                        : "Nenhum fornecedor cadastrado. Clique em \"Novo Fornecedor\" para começar."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredSuppliers.map((supplier) => {
                                const catKey = isCategoryKey(supplier.category)
                                    ? supplier.category
                                    : 'OTHER'
                                return (
                                    <TableRow key={supplier.id}>
                                        {/* Fornecedor */}
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                                <div>
                                                    <p className="font-medium">{supplier.name}</p>
                                                    {supplier.tradeName && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {supplier.tradeName}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* CNPJ */}
                                        <TableCell className="text-sm text-muted-foreground">
                                            {supplier.cnpj ?? '—'}
                                        </TableCell>

                                        {/* Contato */}
                                        <TableCell>
                                            <div className="space-y-0.5">
                                                {supplier.email && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {supplier.email}
                                                    </p>
                                                )}
                                                {supplier.phone && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {supplier.phone}
                                                    </p>
                                                )}
                                                {!supplier.email && !supplier.phone && (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Categoria */}
                                        <TableCell>
                                            <Badge
                                                className={categoryColors[catKey]}
                                                variant="outline"
                                            >
                                                {categoryLabels[catKey]}
                                            </Badge>
                                        </TableCell>

                                        {/* Documentos */}
                                        <TableCell className="text-center">
                                            <span className="text-sm font-medium">
                                                {supplier._count.fiscalNotes}
                                            </span>
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell className="text-center">
                                            {supplier.isActive ? (
                                                <Badge className="bg-green-100 text-green-800 border-green-200" variant="outline">
                                                    Ativo
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-gray-100 text-gray-600 border-gray-200" variant="outline">
                                                    Inativo
                                                </Badge>
                                            )}
                                        </TableCell>

                                        {/* Ações */}
                                        <TableCell className="text-center">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <span className="sr-only">Abrir menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() => openEdit(supplier)}
                                                    >
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => handleToggleStatus(supplier)}
                                                    >
                                                        {supplier.isActive ? (
                                                            <>
                                                                <ToggleLeft className="mr-2 h-4 w-4 text-orange-600" />
                                                                Desativar
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ToggleRight className="mr-2 h-4 w-4 text-green-600" />
                                                                Ativar
                                                            </>
                                                        )}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(supplier)}
                                                        className="text-red-600 focus:text-red-600"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Excluir
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
