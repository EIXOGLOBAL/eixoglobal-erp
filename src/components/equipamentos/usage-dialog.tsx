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
import { addUsage } from "@/app/actions/equipment-actions"
import { Loader2, Play } from "lucide-react"

const formSchema = z.object({
    projectId: z.string().min(1, "Projeto é obrigatório"),
    startDate: z.string().min(1, "Data de início é obrigatória"),
    endDate: z.string().optional().or(z.literal('')),
    hours: z.string().optional().or(z.literal('')),
    days: z.string().optional().or(z.literal('')),
    operator: z.string().optional().or(z.literal('')),
    notes: z.string().optional().or(z.literal('')),
})

type FormValues = z.infer<typeof formSchema>

interface Project {
    id: string
    name: string
}

interface UsageDialogProps {
    equipmentId: string
    projects: Project[]
    trigger?: React.ReactNode
}

export function UsageDialog({ equipmentId, projects, trigger }: UsageDialogProps) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const { toast } = useToast()

    const form = useForm<FormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            projectId: '',
            startDate: new Date().toISOString().split('T')[0],
            endDate: '',
            hours: '',
            days: '',
            operator: '',
            notes: '',
        },
    })

    async function onSubmit(values: FormValues) {
        setIsLoading(true)
        try {
            const result = await addUsage(equipmentId, {
                projectId: values.projectId,
                startDate: values.startDate,
                endDate: values.endDate || null,
                hours: values.hours ? parseFloat(values.hours) : null,
                days: values.days ? parseFloat(values.days) : null,
                operator: values.operator || null,
                notes: values.notes || null,
            })

            if (result.success) {
                toast({
                    title: "Uso registrado",
                    description: "O uso do equipamento foi registrado com sucesso.",
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
                        <Play className="h-4 w-4 mr-2" />
                        Registrar Uso
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Registrar Uso de Equipamento</DialogTitle>
                    <DialogDescription>
                        Registre o uso deste equipamento em um projeto.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="projectId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Projeto *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o projeto" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {projects.map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
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
                                name="startDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Data de Início *</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="endDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Data de Término</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="hours"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Horas</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.5" min="0" placeholder="0" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="days"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Dias</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.5" min="0" placeholder="0" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="operator"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Operador</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nome do operador" {...field} />
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
                                        <Textarea placeholder="Observações sobre o uso..." rows={2} {...field} />
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
                                Registrar Uso
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
