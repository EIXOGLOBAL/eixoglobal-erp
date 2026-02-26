'use client'

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
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { createMovement } from "@/app/actions/inventory-actions"
import { ArrowUpDown, Loader2, TrendingUp, TrendingDown, RotateCcw, SlidersHorizontal } from "lucide-react"

const formSchema = z.object({
    type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
    quantity: z.number().min(0.001, "Quantidade deve ser maior que zero"),
    unitCost: z.number().min(0).optional(),
    documentNumber: z.string().optional().or(z.literal('')),
    notes: z.string().optional().or(z.literal('')),
})

type FormValues = z.infer<typeof formSchema>

const MOVEMENT_TYPES = [
    { value: 'IN', label: 'Entrada', icon: TrendingUp, color: 'text-green-600', description: 'Adicionar ao estoque' },
    { value: 'OUT', label: 'Saída', icon: TrendingDown, color: 'text-red-600', description: 'Retirar do estoque' },
    { value: 'ADJUSTMENT', label: 'Ajuste', icon: SlidersHorizontal, color: 'text-blue-600', description: 'Ajustar para quantidade exata' },
]

interface MovementDialogProps {
    material: any
    companyId: string
    trigger?: React.ReactNode
}

export function MovementDialog({ material, companyId, trigger }: MovementDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            type: 'IN',
            quantity: 0,
            unitCost: material?.unitCost ? Number(material.unitCost) : 0,
            documentNumber: "",
            notes: "",
        }
    })

    const movementType = form.watch('type')
    const quantity = form.watch('quantity')

    function getNewStock() {
        const current = Number(material?.currentStock || 0)
        const qty = Number(quantity || 0)
        switch (movementType) {
            case 'IN': return current + qty
            case 'OUT': return current - qty
            case 'ADJUSTMENT': return qty
            default: return current
        }
    }

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            // Use dev user ID as fallback
            const result = await createMovement({
                materialId: material.id,
                type: values.type,
                quantity: values.quantity,
                unitCost: values.unitCost || undefined,
                documentNumber: values.documentNumber || null,
                notes: values.notes || null,
            })

            if (result.success) {
                const typeLabel = MOVEMENT_TYPES.find(t => t.value === values.type)?.label
                toast({
                    title: `${typeLabel} Registrada`,
                    description: `${values.quantity} ${material.unit} de ${material.name}. Estoque: ${getNewStock()} ${material.unit}`,
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

    const newStock = getNewStock()
    const isOutOfStock = movementType === 'OUT' && newStock < 0

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        <ArrowUpDown className="mr-2 h-4 w-4" />
                        Movimentar
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Movimentação de Estoque</DialogTitle>
                    <DialogDescription>
                        <span className="font-medium">{material?.name}</span> — Estoque atual:{' '}
                        <Badge variant="outline">{material?.currentStock} {material?.unit}</Badge>
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Movimentação *</FormLabel>
                                    <div className="grid grid-cols-3 gap-2">
                                        {MOVEMENT_TYPES.map((type) => {
                                            const Icon = type.icon
                                            return (
                                                <button
                                                    key={type.value}
                                                    type="button"
                                                    onClick={() => field.onChange(type.value)}
                                                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${
                                                        field.value === type.value
                                                            ? 'border-primary bg-primary/5'
                                                            : 'border-muted hover:border-muted-foreground/50'
                                                    }`}
                                                >
                                                    <Icon className={`h-5 w-5 ${type.color}`} />
                                                    <span className="text-xs font-medium">{type.label}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {movementType === 'ADJUSTMENT' ? 'Nova Quantidade' : 'Quantidade'} * ({material?.unit})
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.001"
                                                placeholder="0"
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
                                        <FormLabel>Custo Unitário (R$)</FormLabel>
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

                        {/* Preview do novo estoque */}
                        <div className={`p-3 rounded-lg text-sm ${isOutOfStock ? 'bg-red-50 border border-red-200' : 'bg-muted'}`}>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Estoque atual:</span>
                                <span>{material?.currentStock} {material?.unit}</span>
                            </div>
                            <div className="flex justify-between font-medium mt-1">
                                <span>Estoque após movimentação:</span>
                                <span className={isOutOfStock ? 'text-red-600' : newStock < (material?.minStock || 0) ? 'text-orange-600' : 'text-green-600'}>
                                    {newStock} {material?.unit}
                                </span>
                            </div>
                            {isOutOfStock && (
                                <p className="text-red-600 text-xs mt-1">⚠ Estoque insuficiente para esta saída</p>
                            )}
                        </div>

                        <FormField
                            control={form.control}
                            name="documentNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nº Documento</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: NF-001, OS-123" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observações</FormLabel>
                                    <FormControl>
                                        <Textarea rows={2} placeholder="Informações adicionais..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading || isOutOfStock}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Registrar Movimentação
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
