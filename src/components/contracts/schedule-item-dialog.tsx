'use client'

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import {
    createFinancialScheduleItem,
    updateFinancialScheduleItem,
} from "@/app/actions/financial-schedule-actions"
import { Plus, Pencil, Loader2 } from "lucide-react"

const formSchema = z.object({
    month: z.number().int().min(1, "Mês deve estar entre 1 e 36").max(36, "Mês deve estar entre 1 e 36"),
    percentage: z.number().min(0, "Percentual não pode ser negativo").max(100, "Percentual não pode exceder 100%"),
    value: z.number().min(0, "Valor não pode ser negativo"),
    dueDate: z.string().optional().nullable(),
})

type FormValues = z.infer<typeof formSchema>

export interface ScheduleItemData {
    id: string
    month: number
    percentage: number
    value: number
    dueDate: string | Date | null
}

interface ScheduleItemDialogProps {
    contractId: string
    item?: ScheduleItemData | null
    trigger?: React.ReactNode
}

export function ScheduleItemDialog({ contractId, item, trigger }: ScheduleItemDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()
    const router = useRouter()
    const isEditing = !!item

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            month: item?.month ?? 1,
            percentage: item?.percentage ?? 0,
            value: item?.value ?? 0,
            dueDate: item?.dueDate
                ? (typeof item.dueDate === 'string'
                    ? item.dueDate.split('T')[0]
                    : new Date(item.dueDate).toISOString().split('T')[0])
                : null,
        },
    })

    useEffect(() => {
        if (open && item) {
            form.reset({
                month: item.month,
                percentage: item.percentage,
                value: item.value,
                dueDate: item.dueDate
                    ? (typeof item.dueDate === 'string'
                        ? item.dueDate.split('T')[0]
                        : new Date(item.dueDate).toISOString().split('T')[0])
                    : null,
            })
        } else if (open && !item) {
            form.reset({
                month: 1,
                percentage: 0,
                value: 0,
                dueDate: null,
            })
        }
    }, [open, item, form])

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const payload = {
                contractId,
                month: values.month,
                percentage: values.percentage,
                value: values.value,
                dueDate: values.dueDate ? new Date(values.dueDate + 'T03:00:00Z').toISOString() : null,
            }

            const result = isEditing
                ? await updateFinancialScheduleItem(item!.id, payload)
                : await createFinancialScheduleItem(payload)

            if (result.success) {
                toast({
                    title: isEditing ? "Parcela atualizada" : "Parcela criada",
                    description: isEditing
                        ? "A parcela do cronograma foi atualizada com sucesso."
                        : "A parcela foi adicionada ao cronograma financeiro.",
                })
                setOpen(false)
                form.reset()
                router.refresh()
            } else {
                toast({
                    title: "Erro",
                    description: result.error || "Ocorreu um erro ao salvar a parcela.",
                    variant: "destructive",
                })
            }
        } catch {
            toast({
                title: "Erro",
                description: "Erro inesperado ao salvar a parcela.",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ?? (
                    <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Parcela
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Editar Parcela" : "Nova Parcela do Cronograma"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Altere os dados da parcela do cronograma financeiro."
                            : "Adicione uma nova parcela ao cronograma financeiro do contrato."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="month"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mês</FormLabel>
                                        <Select
                                            value={String(field.value)}
                                            onValueChange={(v) => field.onChange(Number(v))}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione o mês" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Array.from({ length: 36 }, (_, i) => i + 1).map((m) => (
                                                    <SelectItem key={m} value={String(m)}>
                                                        Mês {m}
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
                                name="percentage"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Percentual (%)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                placeholder="0,00"
                                                value={field.value || ''}
                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="value"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Valor Previsto (R$)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="0,00"
                                            value={field.value || ''}
                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="dueDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Data de Vencimento</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="date"
                                            value={field.value || ''}
                                            onChange={(e) => field.onChange(e.target.value || null)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={loading}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {isEditing ? "Salvar Alterações" : "Adicionar Parcela"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
