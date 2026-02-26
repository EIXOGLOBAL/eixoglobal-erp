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
import { createPurchaseOrder, updatePurchaseOrder } from "@/app/actions/purchase-actions"
import { Plus, Loader2 } from "lucide-react"

const formSchema = z.object({
    supplierId: z.string().optional().or(z.literal('')),
    projectId: z.string().optional().or(z.literal('')),
    notes: z.string().optional().or(z.literal('')),
    expectedAt: z.string().optional().or(z.literal('')),
    costCenterId: z.string().optional().or(z.literal('')),
})

type FormValues = z.infer<typeof formSchema>

interface Supplier {
    id: string
    name: string
}

interface Project {
    id: string
    name: string
}

interface CostCenter {
    id: string
    code: string
    name: string
    projectId?: string | null
}

interface PurchaseOrderDialogProps {
    companyId: string
    suppliers: Supplier[]
    projects: Project[]
    costCenters?: CostCenter[]
    order?: {
        id: string
        supplierId?: string | null
        projectId?: string | null
        notes?: string | null
        expectedAt?: Date | null
        costCenterId?: string | null
    }
    trigger?: React.ReactNode
}

export function PurchaseOrderDialog({
    companyId,
    suppliers,
    projects,
    costCenters = [],
    order,
    trigger,
}: PurchaseOrderDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const toDateInputValue = (d?: Date | null) => {
        if (!d) return ""
        const dt = new Date(d)
        return dt.toISOString().split('T')[0]
    }

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            supplierId: order?.supplierId || "",
            projectId: order?.projectId || "",
            notes: order?.notes || "",
            expectedAt: toDateInputValue(order?.expectedAt),
            costCenterId: order?.costCenterId || "",
        }
    })

    useEffect(() => {
        if (open) {
            form.reset({
                supplierId: order?.supplierId || "",
                projectId: order?.projectId || "",
                notes: order?.notes || "",
                expectedAt: toDateInputValue(order?.expectedAt),
                costCenterId: order?.costCenterId || "",
            })
        }
    }, [open, order, form])

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const data = {
                supplierId: values.supplierId || null,
                projectId: values.projectId || null,
                notes: values.notes || null,
                expectedAt: values.expectedAt || null,
                costCenterId: values.costCenterId || null,
            }

            const result = order
                ? await updatePurchaseOrder(order.id, data)
                : await createPurchaseOrder(data, companyId)

            if (result.success) {
                toast({
                    title: order ? "Pedido Atualizado" : "Pedido Criado",
                    description: order
                        ? "O pedido foi atualizado com sucesso."
                        : "Novo pedido de compra criado.",
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
        } catch {
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
                        Novo Pedido
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                    <DialogTitle>{order ? 'Editar Pedido' : 'Novo Pedido de Compra'}</DialogTitle>
                    <DialogDescription>
                        {order
                            ? 'Atualize as informacoes do pedido.'
                            : 'Preencha os dados para criar um novo pedido de compra.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="supplierId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fornecedor</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value || ""}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione um fornecedor..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="">Nenhum</SelectItem>
                                            {suppliers.map(s => (
                                                <SelectItem key={s.id} value={s.id}>
                                                    {s.name}
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
                            name="projectId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Projeto</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value || ""}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione um projeto..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="">Nenhum</SelectItem>
                                            {projects.map(p => (
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
                            name="expectedAt"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Data Prevista de Entrega</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {costCenters.length > 0 && (
                            <FormField
                                control={form.control}
                                name="costCenterId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Centro de Custo</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value || ""}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione um centro de custo..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="">Nenhum</SelectItem>
                                                {costCenters.map(cc => (
                                                    <SelectItem key={cc.id} value={cc.id}>
                                                        {cc.code} — {cc.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observacoes</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            rows={3}
                                            placeholder="Informacoes adicionais sobre o pedido..."
                                            {...field}
                                        />
                                    </FormControl>
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
                                {order ? 'Atualizar' : 'Criar'} Pedido
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
