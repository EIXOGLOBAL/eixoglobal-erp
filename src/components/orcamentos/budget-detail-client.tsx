'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
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
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
    ArrowLeft,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    CheckCircle,
    XCircle,
    DollarSign,
    FolderKanban,
    FileSpreadsheet,
    BarChart3,
} from "lucide-react"
import { BudgetVsActual } from "@/components/orcamentos/budget-vs-actual"
import {
    addBudgetItem,
    updateBudgetItem,
    deleteBudgetItem,
    approveBudget,
    rejectBudget,
} from "@/app/actions/budget-actions"

const STATUS_LABELS: Record<string, string> = {
    DRAFT: "Em Elaboração",
    APPROVED: "Aprovado",
    REJECTED: "Rejeitado",
    REVISED: "Revisado",
}

const STATUS_COLORS: Record<string, string> = {
    DRAFT: "bg-orange-100 text-orange-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
    REVISED: "bg-blue-100 text-blue-800",
}

const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
    }).format(value)

const itemSchema = z.object({
    code: z.string().optional(),
    description: z.string().min(2, "Descrição deve ter no mínimo 2 caracteres"),
    unit: z.string().min(1, "Unidade é obrigatória"),
    quantity: z.string().min(1, "Quantidade é obrigatória"),
    unitPrice: z.string().min(1, "Preço unitário é obrigatório"),
    category: z.string().optional(),
})

type ItemFormValues = z.infer<typeof itemSchema>

interface BudgetItem {
    id: string
    budgetId: string
    code: string | null
    description: string
    unit: string
    quantity: number
    unitPrice: number
    totalPrice: number
    category: string | null
    measuredQuantity?: number
    measuredPercentage?: number
}

interface Budget {
    id: string
    code: string | null
    name: string
    description: string | null
    projectId: string
    companyId: string
    status: string
    totalValue: number
    createdAt: Date
    updatedAt: Date
    items: BudgetItem[]
    project: { id: string; name: string; code: string | null }
}

interface BDIInfo {
    name: string
    percentage: number
}

interface BudgetDetailClientProps {
    budget: Budget
    companyId: string
    bdiInfo?: BDIInfo | null
}

function BudgetItemDialog({
    budgetId,
    item,
    open,
    onOpenChange,
    isDraft,
}: {
    budgetId: string
    item?: BudgetItem
    open: boolean
    onOpenChange: (open: boolean) => void
    isDraft: boolean
}) {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const isEdit = !!item

    const form = useForm<ItemFormValues>({
        resolver: zodResolver(itemSchema) as any,
        defaultValues: {
            code: item?.code ?? "",
            description: item?.description ?? "",
            unit: item?.unit ?? "",
            quantity: item ? String(item.quantity) : "",
            unitPrice: item ? String(item.unitPrice) : "",
            category: item?.category ?? "",
        },
    })

    const quantity = form.watch("quantity")
    const unitPrice = form.watch("unitPrice")
    const totalPreview = (Number(quantity) || 0) * (Number(unitPrice) || 0)

    async function onSubmit(values: ItemFormValues) {
        if (!isDraft) return
        setLoading(true)
        try {
            const parsedValues = {
                ...values,
                quantity: Number(values.quantity),
                unitPrice: Number(values.unitPrice),
            }
            const result = isEdit
                ? await updateBudgetItem(item!.id, budgetId, parsedValues)
                : await addBudgetItem(budgetId, parsedValues)

            if (result.success) {
                toast({
                    title: isEdit ? "Item atualizado!" : "Item adicionado!",
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
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Editar Item" : "Adicionar Item"}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? "Atualize os dados do item." : "Adicione um item ao orçamento."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Código</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: 01.01.001" {...field} />
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
                                        <FormControl>
                                            <Input placeholder="Ex: Estrutura" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Descrição *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Descrição do serviço ou material" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="unit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Unidade *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: m², m³, un" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quantidade *</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" min="0" placeholder="0" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="unitPrice"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Preço Unitário (R$) *</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" min="0" placeholder="0,00" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="col-span-2 rounded-md border bg-muted/50 p-3">
                                <p className="text-sm text-muted-foreground">Total do Item</p>
                                <p className="text-lg font-bold tabular-nums">{formatBRL(totalPreview)}</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {isEdit ? "Salvar Alterações" : "Adicionar Item"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export function BudgetDetailClient({ budget, companyId, bdiInfo }: BudgetDetailClientProps) {
    const { toast } = useToast()
    const router = useRouter()
    const [addItemOpen, setAddItemOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<BudgetItem | null>(null)
    const [approving, setApproving] = useState(false)
    const [rejecting, setRejecting] = useState(false)

    const isDraft = budget.status === "DRAFT"

    async function handleApprove() {
        setApproving(true)
        try {
            const result = await approveBudget(budget.id)
            if (result.success) {
                toast({ title: "Orçamento aprovado!", description: `${budget.name} foi aprovado.` })
                router.refresh()
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        } finally {
            setApproving(false)
        }
    }

    async function handleReject() {
        setRejecting(true)
        try {
            const result = await rejectBudget(budget.id)
            if (result.success) {
                toast({ title: "Orçamento rejeitado.", description: `${budget.name} foi rejeitado.` })
                router.refresh()
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        } finally {
            setRejecting(false)
        }
    }

    async function handleDeleteItem(itemId: string) {
        const result = await deleteBudgetItem(itemId, budget.id)
        if (result.success) {
            toast({ title: "Item removido." })
            router.refresh()
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <Button variant="ghost" size="icon" asChild aria-label="Voltar">
                        <Link href="/orcamentos">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-3xl font-bold tracking-tight">{budget.name}</h1>
                            {budget.code && (
                                <span className="text-muted-foreground font-mono text-sm">{budget.code}</span>
                            )}
                            <Badge className={STATUS_COLORS[budget.status] ?? ""}>
                                {STATUS_LABELS[budget.status] ?? budget.status}
                            </Badge>
                        </div>
                        {budget.description && (
                            <p className="text-muted-foreground mt-1">{budget.description}</p>
                        )}
                    </div>
                </div>
                {isDraft && (
                    <div className="flex gap-2 shrink-0">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Rejeitar
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Rejeitar Orçamento?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        O orçamento "{budget.name}" será marcado como rejeitado. Esta ação pode ser revertida.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleReject}
                                        className="bg-red-600 hover:bg-red-700"
                                    >
                                        {rejecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                        Rejeitar
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button className="bg-green-600 hover:bg-green-700">
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Aprovar
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Aprovar Orçamento?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        O orçamento "{budget.name}" será marcado como aprovado.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleApprove}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        {approving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                        Aprovar
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )}
            </div>

            {/* Info Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Custo Direto</CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tabular-nums">{formatBRL(budget.totalValue)}</div>
                        <p className="text-xs text-muted-foreground">{budget.items.length} item(ns) no orçamento</p>
                    </CardContent>
                </Card>
                {bdiInfo && bdiInfo.percentage > 0 && (
                    <Card className="border-teal-200 dark:border-teal-900">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Preço de Venda (c/ BDI)</CardTitle>
                            <DollarSign className="h-4 w-4 text-teal-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold tabular-nums text-teal-700 dark:text-teal-400">
                                {formatBRL(budget.totalValue * (1 + bdiInfo.percentage / 100))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                BDI: {bdiInfo.name} ({bdiInfo.percentage.toFixed(2)}%)
                            </p>
                        </CardContent>
                    </Card>
                )}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Projeto</CardTitle>
                        <FolderKanban className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-semibold truncate">{budget.project.name}</div>
                        {budget.project.code && (
                            <p className="text-xs text-muted-foreground font-mono">{budget.project.code}</p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Status</CardTitle>
                        <FileSpreadsheet className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <Badge className={`text-sm ${STATUS_COLORS[budget.status] ?? ""}`}>
                            {STATUS_LABELS[budget.status] ?? budget.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                            {isDraft ? "Edição habilitada" : "Orçamento bloqueado para edição"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="items">
                <TabsList>
                    <TabsTrigger value="general">Dados Gerais</TabsTrigger>
                    <TabsTrigger value="items">Itens do Orçamento</TabsTrigger>
                    <TabsTrigger value="comparison">
                        <BarChart3 className="h-4 w-4 mr-1.5" />
                        Orcado vs Realizado
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informações do Orçamento</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <dt className="text-muted-foreground font-medium">Nome</dt>
                                    <dd className="mt-1">{budget.name}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground font-medium">Código</dt>
                                    <dd className="mt-1 font-mono">{budget.code || "—"}</dd>
                                </div>
                                <div className="col-span-2">
                                    <dt className="text-muted-foreground font-medium">Descrição</dt>
                                    <dd className="mt-1">{budget.description || "—"}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground font-medium">Projeto</dt>
                                    <dd className="mt-1">{budget.project.name}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground font-medium">Status</dt>
                                    <dd className="mt-1">
                                        <Badge className={STATUS_COLORS[budget.status] ?? ""}>
                                            {STATUS_LABELS[budget.status] ?? budget.status}
                                        </Badge>
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground font-medium">Criado em</dt>
                                    <dd className="mt-1">
                                        {new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(budget.createdAt))}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground font-medium">Atualizado em</dt>
                                    <dd className="mt-1">
                                        {new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(budget.updatedAt))}
                                    </dd>
                                </div>
                            </dl>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="items" className="mt-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Itens do Orçamento</CardTitle>
                            {isDraft && (
                                <Button size="sm" onClick={() => setAddItemOpen(true)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Adicionar Item
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="p-0">
                            {budget.items.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm font-medium">Nenhum item adicionado</p>
                                    {isDraft && (
                                        <p className="text-xs mt-1">
                                            Clique em "Adicionar Item" para inserir o primeiro item.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="pl-6">Código</TableHead>
                                            <TableHead>Descrição</TableHead>
                                            <TableHead>Categoria</TableHead>
                                            <TableHead className="text-center">Un.</TableHead>
                                            <TableHead className="text-right">Qtd.</TableHead>
                                            <TableHead className="text-right">Medido Acum.</TableHead>
                                            <TableHead className="text-right">% Medido</TableHead>
                                            <TableHead className="text-right">Preço Unit.</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            {isDraft && <TableHead className="w-[80px] pr-6"></TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {budget.items.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="pl-6 font-mono text-xs text-muted-foreground">
                                                    {item.code || "—"}
                                                </TableCell>
                                                <TableCell className="font-medium max-w-[200px] truncate">
                                                    {item.description}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {item.category || "—"}
                                                </TableCell>
                                                <TableCell className="text-center text-sm">
                                                    {item.unit}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums text-sm">
                                                    {item.quantity.toLocaleString("pt-BR", { maximumFractionDigits: 3 })}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums text-sm">
                                                    {(item.measuredQuantity ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 })}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums text-sm">
                                                    <span className={
                                                        (item.measuredPercentage ?? 0) >= 100
                                                            ? "text-green-600 font-medium"
                                                            : (item.measuredPercentage ?? 0) > 0
                                                                ? "text-blue-600"
                                                                : "text-muted-foreground"
                                                    }>
                                                        {(item.measuredPercentage ?? 0).toFixed(1)}%
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums text-sm">
                                                    {formatBRL(item.unitPrice)}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums font-medium text-sm">
                                                    {formatBRL(item.totalPrice)}
                                                </TableCell>
                                                {isDraft && (
                                                    <TableCell className="pr-6">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon" aria-label="Excluir"
                                                                onClick={() => setEditingItem(item)}
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50" aria-label="Excluir">
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Remover Item?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            O item "{item.description}" será removido do orçamento permanentemente.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => handleDeleteItem(item.id)}
                                                                            className="bg-red-600 hover:bg-red-700"
                                                                        >
                                                                            Remover
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell colSpan={isDraft ? 8 : 8} className="pl-6 font-semibold">
                                                Total Custo Direto
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums font-bold text-base pr-0">
                                                {formatBRL(budget.totalValue)}
                                            </TableCell>
                                            {isDraft && <TableCell className="pr-6" />}
                                        </TableRow>
                                        {bdiInfo && bdiInfo.percentage > 0 && (
                                            <>
                                                <TableRow className="bg-teal-50/50 dark:bg-teal-950/20">
                                                    <TableCell colSpan={isDraft ? 8 : 8} className="pl-6 text-sm text-muted-foreground">
                                                        BDI ({bdiInfo.name} - {bdiInfo.percentage.toFixed(2)}%)
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums text-sm pr-0">
                                                        {formatBRL(budget.totalValue * bdiInfo.percentage / 100)}
                                                    </TableCell>
                                                    {isDraft && <TableCell className="pr-6" />}
                                                </TableRow>
                                                <TableRow className="bg-teal-50/80 dark:bg-teal-950/30">
                                                    <TableCell colSpan={isDraft ? 8 : 8} className="pl-6 font-semibold text-teal-700 dark:text-teal-400">
                                                        Preço de Venda
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums font-bold text-base pr-0 text-teal-700 dark:text-teal-400">
                                                        {formatBRL(budget.totalValue * (1 + bdiInfo.percentage / 100))}
                                                    </TableCell>
                                                    {isDraft && <TableCell className="pr-6" />}
                                                </TableRow>
                                            </>
                                        )}
                                    </TableFooter>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="comparison" className="mt-4">
                    <BudgetVsActual budgetId={budget.id} />
                </TabsContent>
            </Tabs>

            {/* Add Item Dialog */}
            <BudgetItemDialog
                budgetId={budget.id}
                open={addItemOpen}
                onOpenChange={setAddItemOpen}
                isDraft={isDraft}
            />

            {/* Edit Item Dialog */}
            {editingItem && (
                <BudgetItemDialog
                    budgetId={budget.id}
                    item={editingItem}
                    open={!!editingItem}
                    onOpenChange={(open) => { if (!open) setEditingItem(null) }}
                    isDraft={isDraft}
                />
            )}
        </div>
    )
}
