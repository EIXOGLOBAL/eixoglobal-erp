'use client'
import { useRouter } from 'next/navigation'

import { useState } from "react"
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
    FormDescription,
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
import { createAdjustment } from "@/app/actions/contract-actions"
import { Plus, Loader2, TrendingUp, AlertCircle } from "lucide-react"

const formSchema = z.object({
    indexType: z.enum(['INCC', 'IPCA', 'IGP-M']),
    baseDate: z.string().min(1, "Data base é obrigatória"),
    adjustmentDate: z.string().min(1, "Data de reajuste é obrigatória"),
    oldIndex: z.number().min(0, "Índice anterior não pode ser negativo"),
    newIndex: z.number().min(0, "Índice novo não pode ser negativo"),
})

type FormValues = z.infer<typeof formSchema>

interface AdjustmentDialogProps {
    contractId: string
    currentValue?: number
}

export function AdjustmentDialog({
  contractId, currentValue = 0 }: AdjustmentDialogProps) {
  const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            indexType: 'INCC',
            baseDate: "",
            adjustmentDate: "",
            oldIndex: 0,
            newIndex: 0,
        }
    })

    const oldIndex = form.watch("oldIndex")
    const newIndex = form.watch("newIndex")

    // Calcular percentual de reajuste
    const percentage = oldIndex > 0
        ? ((newIndex - oldIndex) / oldIndex) * 100
        : 0

    // Calcular novo valor total do contrato após reajuste
    const newContractValue = currentValue * (1 + percentage / 100)
    const valueDifference = newContractValue - currentValue

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            // Validar que newIndex é maior que oldIndex
            if (values.newIndex <= values.oldIndex) {
                toast({
                    variant: "destructive",
                    title: "Erro de Validação",
                    description: "O índice novo deve ser maior que o índice anterior para um reajuste positivo.",
                })
                setLoading(false)
                return
            }

            const result = await createAdjustment(contractId, { ...values, percentage })

            if (result.success) {
                toast({
                    title: "Reajuste Aplicado",
                    description: `Todos os preços unitários foram reajustados em ${percentage.toFixed(2)}%.`,
                })
                setOpen(false)
                form.reset()
                router.refresh()
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
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Reajuste
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Novo Reajuste Contratual</DialogTitle>
                    <DialogDescription>
                        Aplique reajuste por índices econômicos (INCC, IPCA, IGP-M)
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="indexType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Índice *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="INCC">INCC - Índice Nacional de Custo da Construção</SelectItem>
                                            <SelectItem value="IPCA">IPCA - Índice de Preços ao Consumidor Amplo</SelectItem>
                                            <SelectItem value="IGP-M">IGP-M - Índice Geral de Preços do Mercado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="baseDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Data Base *</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Data de referência inicial
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="adjustmentDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Data de Reajuste *</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Data atual do reajuste
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="p-4 border rounded-lg bg-muted/50">
                            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                Variação do Índice
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="oldIndex"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Índice Anterior *</FormLabel>
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
                                    name="newIndex"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Índice Novo *</FormLabel>
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
                            </div>

                            {oldIndex > 0 && newIndex > 0 && (
                                <div className="mt-3 p-3 bg-background rounded">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium">Percentual de Reajuste:</span>
                                        <span className={`text-xl font-bold ${percentage >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                            {percentage >= 0 ? '+' : ''}{percentage.toFixed(4)}%
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Cálculo: ({newIndex} - {oldIndex}) / {oldIndex} × 100
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Impacto no Valor do Contrato */}
                        {currentValue > 0 && oldIndex > 0 && newIndex > 0 && (
                            <div className="p-4 border-2 border-green-200 rounded-lg bg-green-50/50">
                                <h4 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    Impacto no Valor do Contrato
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Valor Atual:</span>
                                        <span className="font-semibold">
                                            {new Intl.NumberFormat('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL',
                                            }).format(currentValue)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Acréscimo (+{percentage.toFixed(2)}%):</span>
                                        <span className="font-semibold text-green-700">
                                            {new Intl.NumberFormat('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL',
                                            }).format(valueDifference)}
                                        </span>
                                    </div>
                                    <div className="pt-2 border-t flex justify-between">
                                        <span className="font-semibold">Novo Valor Total:</span>
                                        <span className="text-lg font-bold text-green-700">
                                            {new Intl.NumberFormat('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL',
                                            }).format(newContractValue)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                                <strong>Atenção:</strong> Este reajuste será aplicado a <strong>TODOS os itens</strong> da planilha orçamentária,
                                recalculando os preços unitários automaticamente.
                            </p>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Aplicar Reajuste
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
