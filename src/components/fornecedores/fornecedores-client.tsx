'use client'

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
    Plus,
    Pencil,
    MoreHorizontal,
    Loader2,
    Truck,
    CheckCircle,
    XCircle,
    Star,
    AlertTriangle,
    Eye,
    Search,
    Filter,
} from "lucide-react"
import { createSupplier, updateSupplier, toggleSupplierStatus } from "@/app/actions/supplier-actions"
import { CepInput } from "@/components/ui/cep-input"
import { CnpjInput } from "@/components/ui/cnpj-input"

const CATEGORY_LABELS: Record<string, string> = {
    MATERIALS: "Materiais",
    SERVICES: "Servicos",
    UTILITIES: "Concessionarias",
    RENT: "Locacao",
    TRANSPORT: "Transportadora",
    TECHNOLOGY: "Tecnologia",
    OTHER: "Outros",
}

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

interface Supplier {
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

interface FornecedoresClientProps {
    suppliers: Supplier[]
    companyId: string
}

function RatingStars({ rating }: { rating: number | null }) {
    if (rating === null || rating === undefined) {
        return <span className="text-muted-foreground text-xs">Sem avaliacao</span>
    }
    const fullStars = Math.floor(rating)
    const hasHalf = rating - fullStars >= 0.5
    return (
        <div className="flex items-center gap-1">
            {Array.from({ length: 5 }, (_, i) => (
                <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${
                        i < fullStars
                            ? "fill-yellow-400 text-yellow-400"
                            : i === fullStars && hasHalf
                              ? "fill-yellow-400/50 text-yellow-400"
                              : "text-gray-300"
                    }`}
                />
            ))}
            <span className="text-xs text-muted-foreground ml-1">{rating.toFixed(1)}</span>
        </div>
    )
}

function SupplierDialog({
    companyId,
    supplier,
    open,
    onOpenChange,
}: {
    companyId: string
    supplier?: Supplier
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                                            <Input placeholder="Ex: Fornecedora ABC Ltda" {...field} />
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

export function FornecedoresClient({ suppliers, companyId }: FornecedoresClientProps) {
    const { toast } = useToast()
    const router = useRouter()
    const [createOpen, setCreateOpen] = useState(false)
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)

    // Filters
    const [search, setSearch] = useState("")
    const [filterCategory, setFilterCategory] = useState<string>("ALL")
    const [filterMinRating, setFilterMinRating] = useState<string>("0")
    const [filterExpiringDocs, setFilterExpiringDocs] = useState(false)

    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(s => {
            // Search filter
            if (search) {
                const q = search.toLowerCase()
                const matchName = s.name.toLowerCase().includes(q)
                const matchTrade = s.tradeName?.toLowerCase().includes(q)
                const matchCnpj = s.cnpj?.toLowerCase().includes(q)
                if (!matchName && !matchTrade && !matchCnpj) return false
            }
            // Category filter
            if (filterCategory !== "ALL" && s.category !== filterCategory) return false
            // Min rating filter
            const minRating = parseFloat(filterMinRating)
            if (minRating > 0 && (s.rating === null || s.rating < minRating)) return false
            // Expiring docs filter
            if (filterExpiringDocs && s.expiringDocs === 0 && s.expiredDocs === 0) return false
            return true
        })
    }, [suppliers, search, filterCategory, filterMinRating, filterExpiringDocs])

    async function handleToggleStatus(supplier: Supplier) {
        const newStatus = !supplier.isActive
        const result = await toggleSupplierStatus(supplier.id, newStatus)
        if (result.success) {
            toast({
                title: `Fornecedor ${newStatus ? "ativado" : "inativado"}`,
                description: `${supplier.name} foi marcado como ${newStatus ? "ativo" : "inativo"}.`,
            })
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
    }

    return (
        <>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[250px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome, fantasia ou CNPJ..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todas Categorias</SelectItem>
                        <SelectItem value="MATERIALS">Materiais</SelectItem>
                        <SelectItem value="SERVICES">Servicos</SelectItem>
                        <SelectItem value="UTILITIES">Concessionarias</SelectItem>
                        <SelectItem value="RENT">Locacao</SelectItem>
                        <SelectItem value="TRANSPORT">Transportadora</SelectItem>
                        <SelectItem value="TECHNOLOGY">Tecnologia</SelectItem>
                        <SelectItem value="OTHER">Outros</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={filterMinRating} onValueChange={setFilterMinRating}>
                    <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Nota minima" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="0">Qualquer nota</SelectItem>
                        <SelectItem value="3">3+ estrelas</SelectItem>
                        <SelectItem value="4">4+ estrelas</SelectItem>
                        <SelectItem value="4.5">4.5+ estrelas</SelectItem>
                    </SelectContent>
                </Select>
                <Button
                    variant={filterExpiringDocs ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterExpiringDocs(!filterExpiringDocs)}
                >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Docs Vencendo
                </Button>
                <div className="flex-1" />
                <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Fornecedor
                </Button>
            </div>

            {filteredSuppliers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Truck className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">
                        {suppliers.length === 0 ? "Nenhum fornecedor cadastrado" : "Nenhum fornecedor corresponde aos filtros"}
                    </p>
                    <p className="text-sm mt-1">
                        {suppliers.length === 0
                            ? "Cadastre fornecedores para vincula-los as notas fiscais e compras."
                            : "Tente ajustar os filtros de busca."
                        }
                    </p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome / Razao Social</TableHead>
                            <TableHead>CNPJ / CPF</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>Avaliacao</TableHead>
                            <TableHead>Documentos</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSuppliers.map((supplier) => (
                            <TableRow
                                key={supplier.id}
                                className="cursor-pointer"
                                onClick={() => router.push(`/fornecedores/${supplier.id}`)}
                            >
                                <TableCell className="font-medium">
                                    <div>
                                        <p>{supplier.name}</p>
                                        {supplier.tradeName && (
                                            <p className="text-xs text-muted-foreground">{supplier.tradeName}</p>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground font-mono text-sm">
                                    {supplier.cnpj || "\u2014"}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">
                                        {CATEGORY_LABELS[supplier.category] ?? supplier.category}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <RatingStars rating={supplier.rating} />
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1">
                                        <span className="text-sm">{supplier._count.documents}</span>
                                        {supplier.expiredDocs > 0 && (
                                            <Badge variant="destructive" className="text-[10px] px-1 py-0">
                                                <AlertTriangle className="h-3 w-3 mr-0.5" />
                                                {supplier.expiredDocs} vencido(s)
                                            </Badge>
                                        )}
                                        {supplier.expiredDocs === 0 && supplier.expiringDocs > 0 && (
                                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px] px-1 py-0">
                                                <AlertTriangle className="h-3 w-3 mr-0.5" />
                                                {supplier.expiringDocs} vencendo
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {supplier.isActive ? (
                                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Ativo
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                                            <XCircle className="h-3 w-3 mr-1" />
                                            Inativo
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onSelect={() => router.push(`/fornecedores/${supplier.id}`)}>
                                                <Eye className="h-4 w-4 mr-2" />
                                                Ver Detalhes
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={(e) => {
                                                e.preventDefault()
                                                setEditingSupplier(supplier)
                                            }}>
                                                <Pencil className="h-4 w-4 mr-2" />
                                                Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onSelect={(e) => {
                                                e.preventDefault()
                                                handleToggleStatus(supplier)
                                            }}>
                                                {supplier.isActive ? (
                                                    <>
                                                        <XCircle className="h-4 w-4 mr-2" />
                                                        Inativar
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle className="h-4 w-4 mr-2" />
                                                        Ativar
                                                    </>
                                                )}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            <SupplierDialog
                companyId={companyId}
                open={createOpen}
                onOpenChange={setCreateOpen}
            />

            {editingSupplier && (
                <SupplierDialog
                    companyId={companyId}
                    supplier={editingSupplier}
                    open={!!editingSupplier}
                    onOpenChange={(open) => { if (!open) setEditingSupplier(null) }}
                />
            )}
        </>
    )
}
