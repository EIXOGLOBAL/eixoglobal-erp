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
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { createEquipment, updateEquipment } from "@/app/actions/equipment-actions"
import { Plus, Loader2, Pencil } from "lucide-react"

const EQUIPMENT_TYPE_LABELS: Record<string, string> = {
    VEHICLE: "Veículo",
    CRANE: "Guindaste/Grua",
    EXCAVATOR: "Escavadeira",
    CONCRETE_MIXER: "Betoneira",
    COMPRESSOR: "Compressor",
    GENERATOR: "Gerador",
    SCAFFOLD: "Andaime",
    FORMWORK: "Forma/Escoramento",
    PUMP: "Bomba",
    TOOL: "Ferramenta",
    OTHER: "Outro",
}

const formSchema = z.object({
    code: z.string().min(1, "Código é obrigatório"),
    name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
    type: z.enum([
        'VEHICLE', 'CRANE', 'EXCAVATOR', 'CONCRETE_MIXER', 'COMPRESSOR',
        'GENERATOR', 'SCAFFOLD', 'FORMWORK', 'PUMP', 'TOOL', 'OTHER'
    ]),
    brand: z.string().optional().or(z.literal('')),
    model: z.string().optional().or(z.literal('')),
    year: z.string().optional().or(z.literal('')),
    costPerHour: z.string().optional().or(z.literal('')),
    costPerDay: z.string().optional().or(z.literal('')),
    isOwned: z.boolean().default(true),
    notes: z.string().optional().or(z.literal('')),
})

type FormValues = z.infer<typeof formSchema>

interface EquipmentDialogProps {
    companyId: string
    equipment?: {
        id: string
        code: string
        name: string
        type: string
        brand: string | null
        model: string | null
        year: number | null
        costPerHour: number | null
        costPerDay: number | null
        isOwned: boolean
        notes: string | null
    }
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function EquipmentDialog({ companyId, equipment, trigger, open: controlledOpen, onOpenChange }: EquipmentDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen
    const { toast } = useToast()
    const isEditing = Boolean(equipment)

    const form = useForm<FormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            code: equipment?.code ?? '',
            name: equipment?.name ?? '',
            type: (equipment?.type as FormValues['type']) ?? 'OTHER',
            brand: equipment?.brand ?? '',
            model: equipment?.model ?? '',
            year: equipment?.year ? String(equipment.year) : '',
            costPerHour: equipment?.costPerHour != null ? String(equipment.costPerHour) : '',
            costPerDay: equipment?.costPerDay != null ? String(equipment.costPerDay) : '',
            isOwned: equipment?.isOwned ?? true,
            notes: equipment?.notes ?? '',
        },
    })

    async function onSubmit(values: FormValues) {
        setIsLoading(true)
        try {
            const payload = {
                code: values.code,
                name: values.name,
                type: values.type,
                brand: values.brand || null,
                model: values.model || null,
                year: values.year ? parseInt(values.year) : null,
                costPerHour: values.costPerHour ? parseFloat(values.costPerHour) : null,
                costPerDay: values.costPerDay ? parseFloat(values.costPerDay) : null,
                isOwned: values.isOwned,
                notes: values.notes || null,
            }

            const result = isEditing
                ? await updateEquipment(equipment!.id, payload)
                : await createEquipment(payload, companyId)

            if (result.success) {
                toast({
                    title: isEditing ? "Equipamento atualizado" : "Equipamento criado",
                    description: isEditing
                        ? "As alterações foram salvas com sucesso."
                        : "O equipamento foi cadastrado com sucesso.",
                })
                setOpen(false)
                form.reset()
            } else {
                toast({
                    title: "Erro",
                    description: result.error ?? "Ocorreu um erro inesperado",
                    variant: "destructive",
                })
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {!isControlled && (
                <DialogTrigger asChild>
                    {trigger ?? (
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Novo Equipamento
                        </Button>
                    )}
                </DialogTrigger>
            )}
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Editar Equipamento" : "Novo Equipamento"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Atualize os dados do equipamento."
                            : "Cadastre um novo equipamento no sistema."}
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
                                            <Input placeholder="EQP-001" {...field} />
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
                                        <FormLabel>Tipo *</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione o tipo" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Object.entries(EQUIPMENT_TYPE_LABELS).map(([value, label]) => (
                                                    <SelectItem key={value} value={value}>{label}</SelectItem>
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
                                        <Input placeholder="Ex: Escavadeira CAT 320" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="brand"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Marca</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: Caterpillar" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="model"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Modelo</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: 320 GX" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="year"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Ano</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="2022" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="costPerHour"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Custo por Hora (R$)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" placeholder="0,00" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="costPerDay"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Custo por Dia (R$)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" placeholder="0,00" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="isOwned"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center gap-3 space-y-0">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormLabel className="cursor-pointer">Equipamento próprio (desmarcado = locado)</FormLabel>
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
                                        <Textarea
                                            placeholder="Informações adicionais sobre o equipamento..."
                                            rows={3}
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
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {isEditing ? "Salvar Alterações" : "Criar Equipamento"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
