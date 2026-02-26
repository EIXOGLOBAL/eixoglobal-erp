'use client'

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { addContractItem, updateContractItem } from "@/app/actions/contract-actions"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Plus, Loader2 } from "lucide-react"

const formSchema = z.object({
    description: z.string().min(3, "Descrição deve ter no mínimo 3 caracteres"),
    unit: z.string().min(1, "Selecione uma unidade"),
    quantity: z.number().min(0.01, "Quantidade deve ser maior que zero"),
    unitPrice: z.number().min(0, "Preço unitário não pode ser negativo"),
})

type FormValues = z.infer<typeof formSchema>

// Unidades comuns na construção civil
const COMMON_UNITS = [
    { value: 'm²', label: 'm² - Metro quadrado' },
    { value: 'm³', label: 'm³ - Metro cúbico' },
    { value: 'm', label: 'm - Metro linear' },
    { value: 'un', label: 'un - Unidade' },
    { value: 'sc', label: 'sc - Saco' },
    { value: 'kg', label: 'kg - Quilograma' },
    { value: 't', label: 't - Tonelada' },
    { value: 'h', label: 'h - Hora' },
    { value: 'vb', label: 'vb - Verba' },
    { value: 'cj', label: 'cj - Conjunto' },
]

interface ContractItemDialogProps {
    contractId: string
    item?: any
    trigger?: React.ReactNode
}

export function ContractItemDialog({ contractId, item, trigger }: ContractItemDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            description: item?.description || "",
            unit: item?.unit || "",
            quantity: item?.quantity ? Number(item.quantity) : 0,
            unitPrice: item?.unitPrice ? Number(item.unitPrice) : 0,
        }
    })

    // Calcular total automaticamente
    const quantity = form.watch("quantity")
    const unitPrice = form.watch("unitPrice")
    const total = (quantity || 0) * (unitPrice || 0)

    useEffect(() => {
        if (open && item) {
            form.reset({
                description: item.description,
                unit: item.unit,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
            })
        }
    }, [open, item, form])

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const result = item
                ? await updateContractItem(item.id, values)
                : await addContractItem(contractId, values)

            if (result.success) {
                toast({
                    title: item ? "Item Atualizado" : "Item Adicionado",
                    description: `${values.description} foi ${item ? 'atualizado' : 'adicionado'} com sucesso.`,
                })
                setOpen(false)
                form.reset()
                window.location.reload()
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
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Item
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{item ? 'Editar Item' : 'Adicionar Item'}</DialogTitle>
                    <DialogDescription>
                        {item ? 'Atualize as informações do item.' : 'Adicione um novo item à planilha orçamentária.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição *</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Ex: Alvenaria de blocos cerâmicos 14x19x39cm"
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="unit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Unidade *</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {COMMON_UNITS.map((unit) => (
                                                    <SelectItem key={unit.value} value={unit.value}>
                                                        {unit.label}
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
                                name="quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quantidade *</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                {...field}
                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                            />
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
                                        <FormLabel>Preço Unit. (R$) *</FormLabel>
                                        <FormControl>
                                            <CurrencyInput
                                                value={field.value}
                                                onChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Total calculado */}
                        <div className="p-4 bg-muted rounded-lg">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">Total do Item:</span>
                                <span className="text-xl font-bold text-green-700">
                                    {new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL',
                                    }).format(total)}
                                </span>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {item ? 'Atualizar' : 'Adicionar'} Item
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
