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
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { addLabor, updateLabor } from "@/app/actions/cost-composition-actions"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
    description: z.string().min(3, "Descrição deve ter no mínimo 3 caracteres"),
    hours: z.number().min(0, "Horas não pode ser negativo"),
    hourlyRate: z.number().min(0, "Valor/hora não pode ser negativo"),
})

type FormValues = z.infer<typeof formSchema>

interface LaborDialogProps {
    compositionId: string
    labor?: any
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function LaborDialog({ compositionId, labor, open, onOpenChange }: LaborDialogProps) {
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            description: labor?.description || "",
            hours: labor?.hours ? Number(labor.hours) : 0,
            hourlyRate: labor?.hourlyRate ? Number(labor.hourlyRate) : 0,
        }
    })

    const hours = form.watch("hours")
    const hourlyRate = form.watch("hourlyRate")
    const total = (hours || 0) * (hourlyRate || 0)

    useEffect(() => {
        if (open && labor) {
            form.reset({
                description: labor.description,
                hours: Number(labor.hours),
                hourlyRate: Number(labor.hourlyRate),
            })
        } else if (open && !labor) {
            form.reset({
                description: "",
                hours: 0,
                hourlyRate: 0,
            })
        }
    }, [open, labor, form])

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const result = labor
                ? await updateLabor(labor.id, values)
                : await addLabor(compositionId, values)

            if (result.success) {
                toast({
                    title: labor ? "Mão de Obra Atualizada" : "Mão de Obra Adicionada",
                    description: `${values.description} foi ${labor ? 'atualizada' : 'adicionada'} com sucesso.`,
                })
                onOpenChange(false)
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{labor ? 'Editar Mão de Obra' : 'Adicionar Mão de Obra'}</DialogTitle>
                    <DialogDescription>
                        {labor ? 'Atualize as informações da mão de obra.' : 'Adicione nova mão de obra à composição.'}
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
                                            placeholder="Ex: Pedreiro com encargos"
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="hours"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Horas *</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.0001"
                                                placeholder="0.0000"
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
                                name="hourlyRate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Valor/Hora (R$) *</FormLabel>
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
                                <span className="text-sm font-medium">Total da Mão de Obra:</span>
                                <span className="text-xl font-bold text-green-700">
                                    {new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL',
                                    }).format(total)}
                                </span>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {labor ? 'Atualizar' : 'Adicionar'} Mão de Obra
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
