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
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createAmendment } from "@/app/actions/contract-actions"
import { Plus, Loader2, AlertCircle } from "lucide-react"

const formSchema = z.object({
    number: z.string().min(1, "Número do aditivo é obrigatório"),
    type: z.enum(['VALUE_CHANGE', 'DEADLINE_CHANGE', 'SCOPE_CHANGE', 'MIXED']),
    description: z.string().min(10, "Descrição deve ter no mínimo 10 caracteres"),
    justification: z.string().min(20, "Justificativa deve ter no mínimo 20 caracteres"),
    oldValue: z.number().optional().nullable(),
    newValue: z.number().optional().nullable(),
    oldEndDate: z.string().optional().nullable(),
    newEndDate: z.string().optional().nullable(),
})

type FormValues = z.infer<typeof formSchema>

interface AmendmentDialogProps {
    contractId: string
    currentValue?: number
    currentEndDate?: string
}

export function AmendmentDialog({
  contractId, currentValue, currentEndDate }: AmendmentDialogProps) {
  const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            number: "",
            type: 'VALUE_CHANGE',
            description: "",
            justification: "",
            oldValue: currentValue || 0,
            newValue: currentValue || 0,
            oldEndDate: currentEndDate || "",
            newEndDate: currentEndDate || "",
        }
    })

    const selectedType = form.watch("type")
    const newValue = form.watch("newValue")
    const oldValue = form.watch("oldValue")

    // Calcular diferença percentual de valor
    const valueDifference = oldValue && newValue
        ? ((newValue - oldValue) / oldValue) * 100
        : 0

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const result = await createAmendment(contractId, values)

            if (result.success) {
                toast({
                    title: "Termo Aditivo Criado",
                    description: `${values.number} foi registrado com sucesso.`,
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
                    Novo Termo Aditivo
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>Novo Termo Aditivo</DialogTitle>
                    <DialogDescription>
                        Registre alterações contratuais (valor, prazo ou escopo)
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Número do Aditivo *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: TA-001" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo de Alteração *</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="VALUE_CHANGE">Alteração de Valor</SelectItem>
                                                <SelectItem value="DEADLINE_CHANGE">Alteração de Prazo</SelectItem>
                                                <SelectItem value="SCOPE_CHANGE">Alteração de Escopo</SelectItem>
                                                <SelectItem value="MIXED">Misto (Valor + Prazo)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição *</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Descreva as alterações do termo aditivo..."
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Campos condicionais de VALOR */}
                        {(selectedType === 'VALUE_CHANGE' || selectedType === 'MIXED') && (
                            <div className="p-4 border rounded-lg bg-muted/50">
                                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    Alteração de Valor
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="oldValue"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Valor Anterior (R$)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="newValue"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Novo Valor (R$) *</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                {oldValue && newValue && (
                                    <div className="mt-3 p-2 bg-background rounded text-sm">
                                        <span className="text-muted-foreground">Diferença: </span>
                                        <span className={`font-bold ${valueDifference >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                            {valueDifference >= 0 ? '+' : ''}
                                            {valueDifference.toFixed(2)}%
                                            {' '}
                                            ({new Intl.NumberFormat('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL',
                                            }).format(newValue - oldValue)})
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Campos condicionais de PRAZO */}
                        {(selectedType === 'DEADLINE_CHANGE' || selectedType === 'MIXED') && (
                            <div className="p-4 border rounded-lg bg-muted/50">
                                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    Alteração de Prazo
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="oldEndDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Data de Término Anterior</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} value={field.value || ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="newEndDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nova Data de Término *</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} value={field.value || ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        )}

                        <FormField
                            control={form.control}
                            name="justification"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Justificativa *</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Justifique tecnicamente a necessidade do termo aditivo..."
                                            className="resize-none"
                                            rows={3}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Mínimo de 20 caracteres
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Registrar Termo Aditivo
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
