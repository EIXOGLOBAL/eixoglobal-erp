'use client'
import { useRouter } from 'next/navigation'

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { addOrderItem, updateOrderItem, deleteOrderItem } from "@/app/actions/purchase-actions"
import { Plus, Pencil, Trash2, Loader2, Package } from "lucide-react"

const UNITS = [
    { value: 'm²', label: 'm² - Metro Quadrado' },
    { value: 'm³', label: 'm³ - Metro Cubico' },
    { value: 'un', label: 'un - Unidade' },
    { value: 'kg', label: 'kg - Quilograma' },
    { value: 'm', label: 'm - Metro Linear' },
    { value: 'l', label: 'l - Litro' },
    { value: 'hr', label: 'hr - Hora' },
    { value: 'vb', label: 'vb - Verba' },
    { value: 'cj', label: 'cj - Conjunto' },
    { value: 'sc', label: 'sc - Saco' },
    { value: 't', label: 't - Tonelada' },
    { value: 'gl', label: 'gl - Galao' },
]

const itemFormSchema = z.object({
    description: z.string().min(1, "Descricao e obrigatoria"),
    unit: z.string().min(1, "Unidade e obrigatoria"),
    quantity: z.coerce.number().min(0.001, "Quantidade deve ser maior que zero"),
    unitPrice: z.coerce.number().min(0, "Preco nao pode ser negativo"),
    materialId: z.string().optional().or(z.literal('')),
})

type ItemFormValues = z.infer<typeof itemFormSchema>

interface OrderItem {
    id: string
    description: string
    unit: string
    quantity: number
    unitPrice: number
    totalPrice: number
    materialId?: string | null
    material?: { id: string; name: string; unit: string } | null
}

interface Material {
    id: string
    name: string
    unit: string
    code: string
}

interface OrderItemsClientProps {
    orderId: string
    items: OrderItem[]
    materials: Material[]
    totalValue: number
}

export function OrderItemsClient({
  orderId, items, materials, totalValue }: OrderItemsClientProps) {
  const router = useRouter()
    const { toast } = useToast()
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<OrderItem | null>(null)
    const [loading, setLoading] = useState(false)

    const fmt = (n: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

    const fmtNum = (n: number) =>
        new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(n)

    const form = useForm<ItemFormValues>({
        resolver: zodResolver(itemFormSchema) as any,
        defaultValues: {
            description: "",
            unit: "un",
            quantity: 1,
            unitPrice: 0,
            materialId: "",
        }
    })

    const watchQuantity = form.watch('quantity')
    const watchUnitPrice = form.watch('unitPrice')
    const computedTotal = (Number(watchQuantity) || 0) * (Number(watchUnitPrice) || 0)

    useEffect(() => {
        if (dialogOpen) {
            if (editingItem) {
                form.reset({
                    description: editingItem.description,
                    unit: editingItem.unit,
                    quantity: editingItem.quantity,
                    unitPrice: editingItem.unitPrice,
                    materialId: editingItem.materialId || "",
                })
            } else {
                form.reset({
                    description: "",
                    unit: "un",
                    quantity: 1,
                    unitPrice: 0,
                    materialId: "",
                })
            }
        }
    }, [dialogOpen, editingItem, form])

    function openAddDialog() {
        setEditingItem(null)
        setDialogOpen(true)
    }

    function openEditDialog(item: OrderItem) {
        setEditingItem(item)
        setDialogOpen(true)
    }

    async function handleDelete(itemId: string, description: string) {
        if (!confirm(`Remover o item "${description}"?`)) return

        const result = await deleteOrderItem(itemId)
        if (result.success) {
            toast({ title: "Item Removido", description: `"${description}" foi removido.` })
            router.refresh()
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
    }

    async function onSubmit(values: ItemFormValues) {
        setLoading(true)
        try {
            const data = {
                description: values.description,
                unit: values.unit,
                quantity: Number(values.quantity),
                unitPrice: Number(values.unitPrice),
                materialId: values.materialId || null,
            }

            const result = editingItem
                ? await updateOrderItem(editingItem.id, data)
                : await addOrderItem(orderId, data)

            if (result.success) {
                toast({
                    title: editingItem ? "Item Atualizado" : "Item Adicionado",
                    description: editingItem
                        ? `"${values.description}" foi atualizado.`
                        : `"${values.description}" foi adicionado ao pedido.`,
                })
                setDialogOpen(false)
                router.refresh()
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
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
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Itens do Pedido</CardTitle>
                    <Button size="sm" onClick={openAddDialog}>
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Item
                    </Button>
                </CardHeader>
                <CardContent>
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <Package className="h-8 w-8 text-muted-foreground mb-2 opacity-30" />
                            <p className="text-muted-foreground text-sm">Nenhum item adicionado ao pedido.</p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-3"
                                onClick={openAddDialog}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Adicionar Primeiro Item
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Descricao</TableHead>
                                    <TableHead>Material</TableHead>
                                    <TableHead className="text-center">Unidade</TableHead>
                                    <TableHead className="text-right">Qtd</TableHead>
                                    <TableHead className="text-right">Preco Unit.</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="w-[80px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.description}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {item.material?.name || "—"}
                                        </TableCell>
                                        <TableCell className="text-center">{item.unit}</TableCell>
                                        <TableCell className="text-right">{fmtNum(item.quantity)}</TableCell>
                                        <TableCell className="text-right">{fmt(item.unitPrice)}</TableCell>
                                        <TableCell className="text-right font-medium">{fmt(item.totalPrice)}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon" aria-label="Editar"
                                                    className="h-8 w-8"
                                                    onClick={() => openEditDialog(item)}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon" aria-label="Excluir"
                                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleDelete(item.id, item.description)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
                {items.length > 0 && (
                    <CardFooter className="flex justify-end border-t pt-4">
                        <div className="text-right">
                            <span className="text-sm text-muted-foreground mr-4">Total Geral:</span>
                            <span className="text-xl font-bold">{fmt(totalValue)}</span>
                        </div>
                    </CardFooter>
                )}
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Editar Item' : 'Adicionar Item'}</DialogTitle>
                        <DialogDescription>
                            {editingItem
                                ? 'Atualize as informações do item.'
                                : 'Adicione um novo item ao pedido de compra.'}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Descricao *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: Cimento CP-II 50kg" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="materialId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Material do Estoque (opcional)</FormLabel>
                                        <Select
                                            onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                                            value={field.value || ""}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Vincular a material..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="__none__">Nenhum</SelectItem>
                                                {materials.map(m => (
                                                    <SelectItem key={m.id} value={m.id}>
                                                        [{m.code}] {m.name} ({m.unit})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="unit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Unidade *</FormLabel>
                                            <Select onValueChange={(v) => field.onChange(v === '__none__' ? null : v)} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {UNITS.map(u => (
                                                        <SelectItem key={u.value} value={u.value}>
                                                            {u.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="quantity"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Quantidade *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.001"
                                                    min="0.001"
                                                    placeholder="0.000"
                                                    {...field}
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
                                            <FormLabel>Preco Unitario (R$) *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="0,00"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Total em tempo real */}
                            <div className="rounded-lg bg-muted/50 p-3 text-right">
                                <span className="text-sm text-muted-foreground">Total do item: </span>
                                <span className="font-bold text-lg">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(computedTotal)}
                                </span>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editingItem ? 'Atualizar' : 'Adicionar'} Item
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </>
    )
}
