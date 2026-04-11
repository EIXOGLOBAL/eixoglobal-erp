'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Plus, Loader2, FileSpreadsheet, ArrowRight } from "lucide-react"
import { createBudget } from "@/app/actions/budget-actions"
import { formatDate } from "@/lib/formatters"

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

interface Project {
    id: string
    name: string
}

interface Budget {
    id: string
    code: string | null
    name: string
    description: string | null
    projectId: string
    status: string
    totalValue: number
    createdAt: Date
    project: { id: string; name: string }
    _count: { items: number }
}

interface OrcamentosClientProps {
    budgets: Budget[]
    projects: Project[]
    companyId: string
}

const formSchema = z.object({
    name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
    code: z.string().optional(),
    description: z.string().optional(),
    projectId: z.string().min(1, "Selecione um projeto"),
})

type FormValues = z.infer<typeof formSchema>

function CreateBudgetDialog({
    companyId,
    projects,
    open,
    onOpenChange,
}: {
    companyId: string
    projects: Project[]
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { name: "", code: "", description: "", projectId: "" },
    })

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const result = await createBudget({ ...values, companyId })
            if (result.success) {
                toast({ title: "Orçamento criado!", description: `${values.name} foi criado com sucesso.` })
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
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Novo Orçamento</DialogTitle>
                    <DialogDescription>
                        Crie um novo orçamento vinculado a um projeto.
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
                                        <FormLabel>Nome do Orçamento *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: Orçamento Fase 1 - Fundação" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Código</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: ORC-001" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="projectId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Projeto *</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                name="description"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Descrição</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Descrição opcional do orçamento" {...field} />
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
                                Criar Orçamento
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export function OrcamentosClient({ budgets, projects, companyId }: OrcamentosClientProps) {
    const [createOpen, setCreateOpen] = useState(false)

    return (
        <>
            <div className="flex justify-end mb-4">
                <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Orçamento
                </Button>
            </div>

            {budgets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">Nenhum orçamento cadastrado</p>
                    <p className="text-sm mt-1">Crie um orçamento para começar.</p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Projeto</TableHead>
                            <TableHead className="text-right">Valor Total</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {budgets.map((budget) => (
                            <TableRow key={budget.id}>
                                <TableCell className="font-mono text-sm text-muted-foreground">
                                    {budget.code || "—"}
                                </TableCell>
                                <TableCell className="font-medium">
                                    <div>
                                        <p>{budget.name}</p>
                                        {budget.description && (
                                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                {budget.description}
                                            </p>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {budget.project.name}
                                </TableCell>
                                <TableCell className="text-right tabular-nums font-medium">
                                    {formatBRL(budget.totalValue)}
                                </TableCell>
                                <TableCell>
                                    <Badge className={STATUS_COLORS[budget.status] ?? ""}>
                                        {STATUS_LABELS[budget.status] ?? budget.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {formatDate(budget.createdAt)}
                                </TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link href={`/orcamentos/${budget.id}`}>
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            <CreateBudgetDialog
                companyId={companyId}
                projects={projects}
                open={createOpen}
                onOpenChange={setCreateOpen}
            />
        </>
    )
}
