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
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import {
    createCostCenter,
    updateCostCenter,
    deleteCostCenter,
    toggleCostCenterStatus,
} from "@/app/actions/cost-center-actions"
import {
    Plus,
    MoreHorizontal,
    Pencil,
    Trash2,
    Layers,
    ToggleLeft,
    ToggleRight,
    Search,
    GitBranch,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

type CostCenterType = 'OPERATIONAL' | 'ADMINISTRATIVE' | 'FINANCIAL' | 'COMMERCIAL' | 'OTHER'

type ParentInfo = {
    id: string
    name: string
    code: string
}

type ProjectInfo = {
    id: string
    name: string
}

type CostCenter = {
    id: string
    code: string
    name: string
    description: string | null
    type: CostCenterType
    isActive: boolean
    companyId: string
    parentId: string | null
    parent: ParentInfo | null
    projectId: string | null
    project: ProjectInfo | null
    _count: { children: number }
    createdAt: Date
    updatedAt: Date
}

// ─── Constants ────────────────────────────────────────────────────────────────

const typeLabels: Record<CostCenterType, string> = {
    OPERATIONAL: 'Operacional',
    ADMINISTRATIVE: 'Administrativo',
    FINANCIAL: 'Financeiro',
    COMMERCIAL: 'Comercial',
    OTHER: 'Outro',
}

const typeColors: Record<CostCenterType, string> = {
    OPERATIONAL: 'bg-blue-100 text-blue-800 border-blue-200',
    ADMINISTRATIVE: 'bg-purple-100 text-purple-800 border-purple-200',
    FINANCIAL: 'bg-green-100 text-green-800 border-green-200',
    COMMERCIAL: 'bg-orange-100 text-orange-800 border-orange-200',
    OTHER: 'bg-gray-100 text-gray-800 border-gray-200',
}

function isCostCenterType(value: string): value is CostCenterType {
    return value in typeLabels
}

// ─── Form Schema ──────────────────────────────────────────────────────────────

const formSchema = z.object({
    code: z.string().min(1, "Código é obrigatório"),
    name: z.string().min(2, "Nome é obrigatório"),
    description: z.string().optional(),
    type: z.enum(['OPERATIONAL', 'ADMINISTRATIVE', 'FINANCIAL', 'COMMERCIAL', 'OTHER']),
    isActive: z.boolean(),
    parentId: z.string().optional(),
    projectId: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface CostCentersClientProps {
    companyId: string
    costCenters: CostCenter[]
    projects?: ProjectInfo[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CostCentersClient({ companyId, costCenters, projects = [] }: CostCentersClientProps) {
    const [open, setOpen] = useState(false)
    const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(null)
    const [search, setSearch] = useState('')
    const [filterType, setFilterType] = useState<CostCenterType | 'ALL'>('ALL')
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'active' | 'inactive'>('ALL')
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            code: '',
            name: '',
            description: '',
            type: 'OPERATIONAL',
            isActive: true,
            parentId: '',
            projectId: '',
        },
    })

    // ── Dialog Helpers ──────────────────────────────────────────────────────

    function openCreate() {
        setEditingCostCenter(null)
        form.reset({
            code: '',
            name: '',
            description: '',
            type: 'OPERATIONAL',
            isActive: true,
            parentId: '',
            projectId: '',
        })
        setOpen(true)
    }

    function openEdit(cc: CostCenter) {
        setEditingCostCenter(cc)
        form.reset({
            code: cc.code,
            name: cc.name,
            description: cc.description ?? '',
            type: isCostCenterType(cc.type) ? cc.type : 'OPERATIONAL',
            isActive: cc.isActive,
            parentId: cc.parentId ?? '',
            projectId: cc.projectId ?? '',
        })
        setOpen(true)
    }

    // ── Submit ──────────────────────────────────────────────────────────────

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const payload = {
                code: values.code,
                name: values.name,
                description: values.description || null,
                type: values.type,
                isActive: values.isActive,
                parentId: values.parentId && values.parentId !== '' ? values.parentId : null,
                projectId: values.projectId && values.projectId !== '' ? values.projectId : null,
                companyId,
            }

            if (editingCostCenter) {
                const result = await updateCostCenter(editingCostCenter.id, payload)
                if (result.success) {
                    toast({ title: "Centro de custo atualizado com sucesso!" })
                    setOpen(false)
                } else {
                    toast({
                        variant: "destructive",
                        title: "Erro",
                        description: result.error,
                    })
                }
            } else {
                const result = await createCostCenter(payload)
                if (result.success) {
                    toast({ title: "Centro de custo criado com sucesso!" })
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

    // ── Actions ─────────────────────────────────────────────────────────────

    async function handleDelete(cc: CostCenter) {
        const confirmed = window.confirm(
            `Tem certeza que deseja excluir o centro de custo "${cc.name}"? Esta ação não pode ser desfeita.`
        )
        if (!confirmed) return

        const result = await deleteCostCenter(cc.id)
        if (result.success) {
            toast({ title: "Centro de custo excluído com sucesso!" })
        } else {
            toast({
                variant: "destructive",
                title: "Erro ao excluir",
                description: result.error,
            })
        }
    }

    async function handleToggleStatus(cc: CostCenter) {
        const result = await toggleCostCenterStatus(cc.id, !cc.isActive)
        if (result.success) {
            toast({
                title: cc.isActive
                    ? "Centro de custo desativado com sucesso!"
                    : "Centro de custo ativado com sucesso!",
            })
        } else {
            toast({
                variant: "destructive",
                title: "Erro",
                description: result.error,
            })
        }
    }

    // ── Filtering ───────────────────────────────────────────────────────────

    const filtered = costCenters.filter((cc) => {
        const q = search.toLowerCase()
        const matchesSearch =
            cc.code.toLowerCase().includes(q) || cc.name.toLowerCase().includes(q)
        const matchesType = filterType === 'ALL' || cc.type === filterType
        const matchesStatus =
            filterStatus === 'ALL' ||
            (filterStatus === 'active' && cc.isActive) ||
            (filterStatus === 'inactive' && !cc.isActive)
        return matchesSearch && matchesType && matchesStatus
    })

    // Available parents (exclude self when editing)
    const availableParents = costCenters.filter(
        (cc) => !editingCostCenter || cc.id !== editingCostCenter.id
    )

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Filters */}
                <div className="flex flex-1 flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative min-w-[200px] flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por código ou nome..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {/* Filter by type */}
                    <Select
                        value={filterType}
                        onValueChange={(v) => setFilterType(v as CostCenterType | 'ALL')}
                    >
                        <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todos os tipos</SelectItem>
                            <SelectItem value="OPERATIONAL">Operacional</SelectItem>
                            <SelectItem value="ADMINISTRATIVE">Administrativo</SelectItem>
                            <SelectItem value="FINANCIAL">Financeiro</SelectItem>
                            <SelectItem value="COMMERCIAL">Comercial</SelectItem>
                            <SelectItem value="OTHER">Outro</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Filter by status */}
                    <Select
                        value={filterStatus}
                        onValueChange={(v) => setFilterStatus(v as 'ALL' | 'active' | 'inactive')}
                    >
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todos</SelectItem>
                            <SelectItem value="active">Ativo</SelectItem>
                            <SelectItem value="inactive">Inativo</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* New button */}
                <Button onClick={openCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Centro
                </Button>
            </div>

            {/* Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Layers className="h-5 w-5" />
                            {editingCostCenter ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
                        </DialogTitle>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            {/* Code + Name */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Código *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ex: CC-001" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nome *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nome do centro" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Type */}
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo *</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione o tipo" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="OPERATIONAL">Operacional</SelectItem>
                                                <SelectItem value="ADMINISTRATIVE">Administrativo</SelectItem>
                                                <SelectItem value="FINANCIAL">Financeiro</SelectItem>
                                                <SelectItem value="COMMERCIAL">Comercial</SelectItem>
                                                <SelectItem value="OTHER">Outro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Parent */}
                            <FormField
                                control={form.control}
                                name="parentId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Centro Pai (opcional)</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value ?? ''}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Nenhum (centro raiz)" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="">Nenhum (centro raiz)</SelectItem>
                                                {availableParents.map((cc) => (
                                                    <SelectItem key={cc.id} value={cc.id}>
                                                        {cc.code} — {cc.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Project */}
                            {projects.length > 0 && (
                                <FormField
                                    control={form.control}
                                    name="projectId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Projeto (opcional)</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value ?? ''}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Global (sem projeto)" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="">Global (sem projeto)</SelectItem>
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
                            )}

                            {/* isActive */}
                            <FormField
                                control={form.control}
                                name="isActive"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                        <div className="space-y-0.5">
                                            <FormLabel>Ativo</FormLabel>
                                            <p className="text-xs text-muted-foreground">
                                                Indica se o centro de custo está em operação
                                            </p>
                                        </div>
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {/* Description */}
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Descrição</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Descrição ou observações sobre este centro de custo..."
                                                rows={3}
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
                                        : editingCostCenter
                                        ? "Salvar Alterações"
                                        : "Criar Centro"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Centro Pai</TableHead>
                            <TableHead>Projeto</TableHead>
                            <TableHead className="text-center">Sub-centros</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-center">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    className="text-center py-8 text-muted-foreground"
                                >
                                    {search || filterType !== 'ALL' || filterStatus !== 'ALL'
                                        ? "Nenhum centro de custo encontrado para os filtros aplicados."
                                        : "Nenhum centro de custo cadastrado. Clique em \"Novo Centro\" para começar."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((cc) => {
                                const typeKey = isCostCenterType(cc.type) ? cc.type : 'OTHER'
                                const hasChildren = cc._count.children > 0
                                return (
                                    <TableRow key={cc.id}>
                                        {/* Código */}
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                                                <span className="font-mono font-medium text-sm">
                                                    {cc.code}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Nome */}
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{cc.name}</p>
                                                {cc.description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                                        {cc.description}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Tipo */}
                                        <TableCell>
                                            <Badge
                                                className={typeColors[typeKey]}
                                                variant="outline"
                                            >
                                                {typeLabels[typeKey]}
                                            </Badge>
                                        </TableCell>

                                        {/* Centro Pai */}
                                        <TableCell>
                                            {cc.parent ? (
                                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                    <GitBranch className="h-3.5 w-3.5 shrink-0" />
                                                    <span className="font-mono">{cc.parent.code}</span>
                                                    <span className="text-foreground/70">{cc.parent.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </TableCell>

                                        {/* Projeto */}
                                        <TableCell>
                                            {cc.project ? (
                                                <span className="text-sm text-muted-foreground">{cc.project.name}</span>
                                            ) : (
                                                <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600">Global</Badge>
                                            )}
                                        </TableCell>

                                        {/* Sub-centros */}
                                        <TableCell className="text-center">
                                            <span className="text-sm font-medium">
                                                {cc._count.children}
                                            </span>
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell className="text-center">
                                            {cc.isActive ? (
                                                <Badge
                                                    className="bg-green-100 text-green-800 border-green-200"
                                                    variant="outline"
                                                >
                                                    Ativo
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    className="bg-red-100 text-red-700 border-red-200"
                                                    variant="outline"
                                                >
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
                                                    <DropdownMenuItem onClick={() => openEdit(cc)}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => handleToggleStatus(cc)}
                                                    >
                                                        {cc.isActive ? (
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
                                                        onClick={() => !hasChildren && handleDelete(cc)}
                                                        disabled={hasChildren}
                                                        className={
                                                            hasChildren
                                                                ? "text-muted-foreground cursor-not-allowed"
                                                                : "text-red-600 focus:text-red-600"
                                                        }
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        {hasChildren
                                                            ? `Excluir (${cc._count.children} sub-centros)`
                                                            : "Excluir"}
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
