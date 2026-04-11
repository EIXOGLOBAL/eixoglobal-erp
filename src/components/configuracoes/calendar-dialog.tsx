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
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { createWorkCalendar, updateWorkCalendar } from "@/app/actions/work-calendar-actions"
import { Plus, Loader2 } from "lucide-react"

const formSchema = z.object({
    name: z.string().min(1, "Nome e obrigatorio"),
    description: z.string().optional(),
    hoursPerDay: z.coerce.number().min(1, "Minimo 1 hora").max(24, "Maximo 24 horas"),
    isActive: z.boolean().default(true),
    monday: z.boolean().default(true),
    tuesday: z.boolean().default(true),
    wednesday: z.boolean().default(true),
    thursday: z.boolean().default(true),
    friday: z.boolean().default(true),
    saturday: z.boolean().default(false),
    sunday: z.boolean().default(false),
})

type FormValues = z.infer<typeof formSchema>

export interface CalendarFormData {
    id: string
    name: string
    description: string | null
    hoursPerDay: number
    isActive: boolean
    monday: boolean
    tuesday: boolean
    wednesday: boolean
    thursday: boolean
    friday: boolean
    saturday: boolean
    sunday: boolean
}

interface CalendarDialogProps {
    companyId: string
    calendar?: CalendarFormData
    trigger?: React.ReactNode
}

const WEEKDAYS = [
    { key: "monday" as const, label: "Segunda" },
    { key: "tuesday" as const, label: "Terca" },
    { key: "wednesday" as const, label: "Quarta" },
    { key: "thursday" as const, label: "Quinta" },
    { key: "friday" as const, label: "Sexta" },
    { key: "saturday" as const, label: "Sabado" },
    { key: "sunday" as const, label: "Domingo" },
]

export function CalendarDialog({ companyId, calendar, trigger }: CalendarDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: calendar?.name || "",
            description: calendar?.description || "",
            hoursPerDay: calendar?.hoursPerDay ?? 8,
            isActive: calendar?.isActive ?? true,
            monday: calendar?.monday ?? true,
            tuesday: calendar?.tuesday ?? true,
            wednesday: calendar?.wednesday ?? true,
            thursday: calendar?.thursday ?? true,
            friday: calendar?.friday ?? true,
            saturday: calendar?.saturday ?? false,
            sunday: calendar?.sunday ?? false,
        },
    })

    useEffect(() => {
        if (open && calendar) {
            form.reset({
                name: calendar.name,
                description: calendar.description || "",
                hoursPerDay: calendar.hoursPerDay,
                isActive: calendar.isActive,
                monday: calendar.monday,
                tuesday: calendar.tuesday,
                wednesday: calendar.wednesday,
                thursday: calendar.thursday,
                friday: calendar.friday,
                saturday: calendar.saturday,
                sunday: calendar.sunday,
            })
        } else if (open && !calendar) {
            form.reset({
                name: "",
                description: "",
                hoursPerDay: 8,
                isActive: true,
                monday: true,
                tuesday: true,
                wednesday: true,
                thursday: true,
                friday: true,
                saturday: false,
                sunday: false,
            })
        }
    }, [open, calendar, form])

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const data = { ...values, companyId }
            const result = calendar
                ? await updateWorkCalendar(calendar.id, data)
                : await createWorkCalendar(data)

            if (result.success) {
                toast({
                    title: calendar ? "Calendario Atualizado" : "Calendario Criado",
                    description: `${values.name} foi ${calendar ? 'atualizado' : 'criado'} com sucesso.`,
                })
                setOpen(false)
                form.reset()
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
                        Novo Calendario
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle>{calendar ? 'Editar Calendario' : 'Novo Calendario de Trabalho'}</DialogTitle>
                    <DialogDescription>
                        {calendar ? 'Atualize as informacoes do calendario.' : 'Defina a jornada de trabalho e dias uteis.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Jornada Padrao 44h" {...field} />
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
                                    <FormLabel>Descricao</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Descricao opcional" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="hoursPerDay"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Horas por Dia *</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.5" min="1" max="24" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-2">
                            <FormLabel>Dias Uteis</FormLabel>
                            <div className="grid grid-cols-4 gap-3">
                                {WEEKDAYS.map((day) => (
                                    <FormField
                                        key={day.key}
                                        control={form.control}
                                        name={day.key}
                                        render={({ field }) => (
                                            <FormItem className="flex items-center gap-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="cursor-pointer font-normal text-sm">
                                                    {day.label}
                                                </FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                ))}
                            </div>
                        </div>

                        <FormField
                            control={form.control}
                            name="isActive"
                            render={({ field }) => (
                                <FormItem className="flex items-center gap-2 space-y-0">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormLabel className="cursor-pointer font-normal">Calendario Ativo</FormLabel>
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
                                {calendar ? 'Atualizar' : 'Criar'} Calendario
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
