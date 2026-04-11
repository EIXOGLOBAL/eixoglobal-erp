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
import { useToast } from "@/hooks/use-toast"
import { addMaintenance } from "@/app/actions/equipment-actions"
import { Loader2, Wrench } from "lucide-react"

const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
    PREVENTIVE: "Preventiva",
    CORRECTIVE: "Corretiva",
    INSPECTION: "Inspeção",
}

const formSchema = z.object({
    type: z.enum(['PREVENTIVE', 'CORRECTIVE', 'INSPECTION']),
    description: z.string().min(1, "Descrição é obrigatória"),
    scheduledAt: z.string().min(1, "Data agendada é obrigatória"),
    provider: z.string().optional().or(z.literal('')),
    cost: z.string().optional().or(z.literal('')),
    notes: z.string().optional().or(z.literal('')),
})

type FormValues = z.infer<typeof formSchema>

interface MaintenanceDialogProps {
    equipmentId: string
    trigger?: React.ReactNode
}

export function MaintenanceDialog({ equipmentId, trigger }: MaintenanceDialogProps) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const { toast } = useToast()

    const form = useForm<FormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            type: 'PREVENTIVE',
            description: '',
            scheduledAt: new Date().toISOString().split('T')[0],
            provider: '',
            cost: '',
            notes: '',
        },
    })

    async function onSubmit(values: FormValues) {
        setIsLoading(true)
        try {
            const result = await addMaintenance(equipmentId, {
                type: values.type,
                description: values.description,
                scheduledAt: values.scheduledAt,
                provider: values.provider || null,
                cost: values.cost ? parseFloat(values.cost) : null,
                notes: values.notes || null,
            })

            if (result.success) {
                toast({
                    title: "Manutenção agendada",
                    description: "A manutenção foi agendada e o status do equipamento foi atualizado.",
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
            <DialogTrigger asChild>
                {trigger ?? (
                    <Button variant="outline">
                        <Wrench className="h-4 w-4 mr-2" />
                        Agendar Manutenção
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Agendar Manutenção</DialogTitle>
                    <DialogDescription>
                        Agende uma manutenção para este equipamento. O status será alterado para &quot;Em Manutenção&quot;.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Manutenção *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o tipo" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {Object.entries(MAINTENANCE_TYPE_LABELS).map(([value, label]) => (
                                                <SelectItem key={value} value={value}>{label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição *</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Descreva o serviço a ser realizado..."
                                            rows={3}
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
                                name="scheduledAt"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Data Agendada *</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="cost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Custo Estimado (R$)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" min="0" placeholder="0,00" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="provider"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Prestador de Serviço</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nome da empresa ou técnico" {...field} />
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
                                        <Textarea placeholder="Observações adicionais..." rows={2} {...field} />
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
                                Agendar Manutenção
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
