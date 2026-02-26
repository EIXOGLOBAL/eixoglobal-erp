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
import { createMaterial, updateMaterial } from "@/app/actions/inventory-actions"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Plus, Loader2 } from "lucide-react"

const formSchema = z.object({
    code: z.string().min(1, "Código é obrigatório"),
    name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
    description: z.string().optional().or(z.literal('')),
    unit: z.string().min(1, "Unidade é obrigatória"),
    category: z.enum(['CEMENT', 'STEEL', 'SAND', 'GRAVEL', 'BRICK', 'WOOD', 'PAINT', 'ELECTRICAL', 'PLUMBING', 'OTHER']),
    minStock: z.number().min(0, "Estoque mínimo não pode ser negativo"),
    currentStock: z.number().min(0, "Estoque não pode ser negativo"),
    unitCost: z.number().min(0, "Custo não pode ser negativo"),
    supplier: z.string().optional().or(z.literal('')),
})

type FormValues = z.infer<typeof formSchema>

const CATEGORIES = [
    { value: 'CEMENT', label: 'Cimento' },
    { value: 'STEEL', label: 'Aço/Ferro' },
    { value: 'SAND', label: 'Areia' },
    { value: 'GRAVEL', label: 'Brita/Pedra' },
    { value: 'BRICK', label: 'Tijolos/Blocos' },
    { value: 'WOOD', label: 'Madeira' },
    { value: 'PAINT', label: 'Tintas' },
    { value: 'ELECTRICAL', label: 'Elétrico' },
    { value: 'PLUMBING', label: 'Hidráulico' },
    { value: 'OTHER', label: 'Outros' },
]

interface MaterialDialogProps {
    companyId: string
    material?: any
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function MaterialDialog({ companyId, material, trigger, open: controlledOpen, onOpenChange }: MaterialDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen
    const { toast } = useToast()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            code: material?.code || "",
            name: material?.name || "",
            description: material?.description || "",
            unit: material?.unit || "un",
            category: material?.category || 'OTHER',
            minStock: material?.minStock ? Number(material.minStock) : 0,
            currentStock: material?.currentStock ? Number(material.currentStock) : 0,
            unitCost: material?.unitCost ? Number(material.unitCost) : 0,
            supplier: material?.supplier || "",
        }
    })

    useEffect(() => {
        if (open && material) {
            form.reset({
                code: material.code,
                name: material.name,
                description: material.description || "",
                unit: material.unit,
                category: material.category,
                minStock: Number(material.minStock),
                currentStock: Number(material.currentStock),
                unitCost: Number(material.unitCost),
                supplier: material.supplier || "",
            })
        }
    }, [open, material, form])

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const data = {
                ...values,
                description: values.description || null,
                supplier: values.supplier || null,
                companyId,
            }

            const result = material
                ? await updateMaterial(material.id, data)
                : await createMaterial(data)

            if (result.success) {
                toast({
                    title: material ? "Material Atualizado" : "Material Cadastrado",
                    description: `${values.name} foi ${material ? 'atualizado' : 'cadastrado'} com sucesso.`,
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
            {!isControlled && (
                <DialogTrigger asChild>
                    {trigger || (
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Novo Material
                        </Button>
                    )}
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{material ? 'Editar Material' : 'Novo Material'}</DialogTitle>
                    <DialogDescription>
                        {material ? 'Atualize as informações do material.' : 'Cadastre um novo material no estoque.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Código *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: CIM-001" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Categoria *</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {CATEGORIES.map(c => (
                                                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Cimento CP-II 50kg" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição</FormLabel>
                                    <FormControl>
                                        <Textarea rows={2} placeholder="Descrição detalhada..." {...field} />
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
                                        <FormControl>
                                            <Input placeholder="Ex: sc, m³, kg, un" {...field} />
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
                            <FormField
                                control={form.control}
                                name="supplier"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fornecedor</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nome do fornecedor" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="currentStock"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Estoque Atual</FormLabel>
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
                                name="minStock"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Estoque Mínimo</FormLabel>
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
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {material ? 'Atualizar' : 'Cadastrar'} Material
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
