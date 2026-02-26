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
import { addMaterial, updateMaterial } from "@/app/actions/cost-composition-actions"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
    description: z.string().min(3, "Descrição deve ter no mínimo 3 caracteres"),
    unit: z.string().min(1, "Selecione uma unidade"),
    coefficient: z.number().min(0, "Coeficiente não pode ser negativo"),
    unitCost: z.number().min(0, "Custo unitário não pode ser negativo"),
})

type FormValues = z.infer<typeof formSchema>

const COMMON_UNITS = [
    { value: 'm²', label: 'm²' },
    { value: 'm³', label: 'm³' },
    { value: 'm', label: 'm' },
    { value: 'un', label: 'un' },
    { value: 'sc', label: 'sc' },
    { value: 'kg', label: 'kg' },
    { value: 't', label: 't' },
    { value: 'l', label: 'l' },
]

interface MaterialDialogProps {
    compositionId: string
    material?: any
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function MaterialDialog({ compositionId, material, open, onOpenChange }: MaterialDialogProps) {
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            description: material?.description || "",
            unit: material?.unit || "",
            coefficient: material?.coefficient ? Number(material.coefficient) : 0,
            unitCost: material?.unitCost ? Number(material.unitCost) : 0,
        }
    })

    const coefficient = form.watch("coefficient")
    const unitCost = form.watch("unitCost")
    const total = (coefficient || 0) * (unitCost || 0)

    useEffect(() => {
        if (open && material) {
            form.reset({
                description: material.description,
                unit: material.unit,
                coefficient: Number(material.coefficient),
                unitCost: Number(material.unitCost),
            })
        } else if (open && !material) {
            form.reset({
                description: "",
                unit: "",
                coefficient: 0,
                unitCost: 0,
            })
        }
    }, [open, material, form])

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const result = material
                ? await updateMaterial(material.id, values)
                : await addMaterial(compositionId, values)

            if (result.success) {
                toast({
                    title: material ? "Material Atualizado" : "Material Adicionado",
                    description: `${values.description} foi ${material ? 'atualizado' : 'adicionado'} com sucesso.`,
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
                    <DialogTitle>{material ? 'Editar Material' : 'Adicionar Material'}</DialogTitle>
                    <DialogDescription>
                        {material ? 'Atualize as informações do material.' : 'Adicione um novo material à composição.'}
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
                                            placeholder="Ex: Bloco cerâmico 14x19x39cm"
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
                                name="coefficient"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Coeficiente *</FormLabel>
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
                                name="unitCost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Custo Unit. (R$) *</FormLabel>
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
                                <span className="text-sm font-medium">Total do Material:</span>
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
                                {material ? 'Atualizar' : 'Adicionar'} Material
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
