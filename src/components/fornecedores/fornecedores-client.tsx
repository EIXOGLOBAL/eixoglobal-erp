'use client'

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
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
    Pencil,
    MoreHorizontal,
    Truck,
    CheckCircle,
    XCircle,
    Star,
    AlertTriangle,
    Eye,
    Search,
} from "lucide-react"
import { toggleSupplierStatus } from "@/app/actions/supplier-actions"
import { SupplierDialog, type SupplierForDialog } from "@/components/fornecedores/supplier-dialog"
import { ExportButton } from "@/components/ui/export-button"
import type { ExportColumn } from "@/lib/export-utils"

const supplierExportColumns: ExportColumn[] = [
    { key: 'name', label: 'Nome / Razao Social' },
    { key: 'tradeName', label: 'Nome Fantasia' },
    { key: 'cnpj', label: 'CNPJ / CPF' },
    { key: 'categoryPtBr', label: 'Categoria' },
    { key: 'ratingStr', label: 'Avaliacao' },
    { key: 'docsCount', label: 'Documentos' },
    { key: 'statusPtBr', label: 'Status' },
]

const CATEGORY_LABELS: Record<string, string> = {
    MATERIALS: "Materiais",
    SERVICES: "Servicos",
    UTILITIES: "Concessionarias",
    RENT: "Locacao",
    TRANSPORT: "Transportadora",
    TECHNOLOGY: "Tecnologia",
    OTHER: "Outros",
}

type Supplier = SupplierForDialog

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

export function FornecedoresClient({ suppliers, companyId }: FornecedoresClientProps) {
    const { toast } = useToast()
    const router = useRouter()
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
                <ExportButton
                    data={filteredSuppliers.map(s => ({
                        ...s,
                        tradeName: s.tradeName || '',
                        cnpj: s.cnpj || '',
                        categoryPtBr: CATEGORY_LABELS[s.category] ?? s.category,
                        ratingStr: s.rating !== null && s.rating !== undefined ? `${s.rating.toFixed(1)}` : 'Sem avaliacao',
                        docsCount: String(s._count.documents),
                        statusPtBr: s.isActive ? 'Ativo' : 'Inativo',
                    }))}
                    columns={supplierExportColumns}
                    filename="fornecedores"
                    title="Fornecedores"
                    sheetName="Fornecedores"
                    size="sm"
                />
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
                                            <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()} aria-label="Abrir menu de ações">
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
