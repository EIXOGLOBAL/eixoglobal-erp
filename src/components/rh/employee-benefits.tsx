'use client'
import { useRouter } from 'next/navigation'

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { CurrencyInput } from "@/components/ui/currency-input"
import {
    addEmployeeBenefit,
    updateEmployeeBenefit,
    deleteEmployeeBenefit,
} from "@/app/actions/employee-actions"
import { Plus, MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react"

const benefitTypes: Record<string, { label: string; color: string }> = {
    PRODUCAO: { label: 'Produção', color: 'bg-green-100 text-green-700' },
    GRATIFICACAO: { label: 'Gratificação', color: 'bg-blue-100 text-blue-700' },
    AJUDA_CUSTO: { label: 'Ajuda de Custo', color: 'bg-purple-100 text-purple-700' },
    DIARIA: { label: 'Diária', color: 'bg-orange-100 text-orange-700' },
    OUTRO: { label: 'Outro', color: 'bg-gray-100 text-gray-700' },
}

const benefitSchema = z.object({
    name: z.string().min(2, "Nome obrigatório"),
    type: z.enum(['PRODUCAO', 'GRATIFICACAO', 'AJUDA_CUSTO', 'DIARIA', 'OUTRO']),
    value: z.number().min(0),
    isActive: z.boolean(),
})

type BenefitFormValues = z.infer<typeof benefitSchema>

interface Benefit {
    id: string
    name: string
    type: string
    value: number
    isActive: boolean
}

function BenefitDialog({
    employeeId,
    benefit,
    open,
    onOpenChange,
}: {
    employeeId: string
    benefit?: Benefit
    open: boolean
    onOpenChange: (v: boolean) => void
}) {
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const form = useForm<BenefitFormValues>({
        resolver: zodResolver(benefitSchema),
        defaultValues: {
            name: benefit?.name || '',
            type: (benefit?.type as BenefitFormValues['type']) || 'OUTRO',
            value: benefit?.value || 0,
            isActive: benefit?.isActive ?? true,
        },
    })

    useEffect(() => {
        form.reset({
            name: benefit?.name || '',
            type: (benefit?.type as BenefitFormValues['type']) || 'OUTRO',
            value: benefit?.value || 0,
            isActive: benefit?.isActive ?? true,
        })
    }, [benefit, form])

    async function onSubmit(values: BenefitFormValues) {
        setLoading(true)
        try {
            const result = benefit
                ? await updateEmployeeBenefit(benefit.id, employeeId, values)
                : await addEmployeeBenefit(employeeId, values)

            if (result.success) {
                toast({ title: benefit ? 'Benefício atualizado' : 'Benefício adicionado' })
                onOpenChange(false)
                router.refresh()
            } else {
                toast({ variant: 'destructive', title: 'Erro', description: result.error })
            }
        } catch {
            toast({ variant: 'destructive', title: 'Erro inesperado' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle>{benefit ? 'Editar Benefício' : 'Novo Benefício Variável'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {Object.entries(benefitTypes).map(([key, { label }]) => (
                                                <SelectItem key={key} value={key}>{label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Produção Julho, Gratificação por Meta" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="value"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Valor Mensal (R$) *</FormLabel>
                                    <FormControl>
                                        <CurrencyInput
                                            value={field.value}
                                            onChange={(v) => field.onChange(v || 0)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="isActive"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-md border p-3">
                                    <FormLabel className="mb-0">Ativo</FormLabel>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {benefit ? 'Atualizar' : 'Adicionar'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export function EmployeeBenefits({
  employeeId, benefits }: { employeeId: string; benefits: Benefit[] }) {
  const router = useRouter()
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editBenefit, setEditBenefit] = useState<Benefit | undefined>()
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const { toast } = useToast()

    const activeBenefits = benefits.filter(b => b.isActive)
    const totalActive = activeBenefits.reduce((sum, b) => sum + b.value, 0)
    const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

    function openCreate() {
        setEditBenefit(undefined)
        setDialogOpen(true)
    }

    function openEdit(b: Benefit) {
        setEditBenefit(b)
        setDialogOpen(true)
    }

    async function handleDelete(benefitId: string) {
        setDeletingId(benefitId)
        try {
            const result = await deleteEmployeeBenefit(benefitId, employeeId)
            if (result.success) {
                toast({ title: 'Benefício removido' })
                router.refresh()
            } else {
                toast({ variant: 'destructive', title: 'Erro', description: result.error })
            }
        } catch {
            toast({ variant: 'destructive', title: 'Erro inesperado' })
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-muted-foreground">
                        {activeBenefits.length} benefício{activeBenefits.length !== 1 ? 's' : ''} ativo{activeBenefits.length !== 1 ? 's' : ''}
                        {activeBenefits.length > 0 && (
                            <span className="ml-2 font-semibold text-foreground">
                                Total: {formatBRL(totalActive)}/mês
                            </span>
                        )}
                    </p>
                </div>
                <Button size="sm" onClick={openCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Benefício
                </Button>
            </div>

            {benefits.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-right">Valor/mês</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {benefits.map(b => {
                            const typeInfo = (benefitTypes[b.type] || benefitTypes.OUTRO)!
                            const isDeleting = deletingId === b.id
                            return (
                                <TableRow key={b.id} className={!b.isActive ? 'opacity-50' : undefined}>
                                    <TableCell>
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeInfo.color}`}>
                                            {typeInfo.label}
                                        </span>
                                    </TableCell>
                                    <TableCell className="font-medium">{b.name}</TableCell>
                                    <TableCell className="text-right font-mono">
                                        {formatBRL(b.value)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={b.isActive ? 'default' : 'outline'}>
                                            {b.isActive ? 'Ativo' : 'Inativo'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" disabled={isDeleting} aria-label="Excluir benefício">
                                                    {isDeleting
                                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                                        : <MoreHorizontal className="h-4 w-4" />
                                                    }
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openEdit(b)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() => handleDelete(b.id)}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Remover
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                        {activeBenefits.length > 0 && (
                            <TableRow className="bg-muted/30 font-semibold">
                                <TableCell colSpan={2} className="text-right text-sm">Total Ativo:</TableCell>
                                <TableCell className="text-right font-mono">{formatBRL(totalActive)}</TableCell>
                                <TableCell colSpan={2} />
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            ) : (
                <div className="text-center py-10 text-muted-foreground text-sm">
                    Nenhum benefício variável cadastrado.
                    <br />
                    <span className="text-xs">Ex: Produção, Gratificação, Ajuda de Custo, Diária</span>
                </div>
            )}

            <BenefitDialog
                employeeId={employeeId}
                benefit={editBenefit}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
        </div>
    )
}
