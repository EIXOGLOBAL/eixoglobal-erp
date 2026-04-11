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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { addHoliday } from "@/app/actions/work-calendar-actions"
import { Plus, Loader2 } from "lucide-react"

const formSchema = z.object({
    name: z.string().min(1, "Nome e obrigatorio"),
    date: z.string().min(1, "Data e obrigatoria"),
    type: z.enum(["NACIONAL", "ESTADUAL", "MUNICIPAL", "PONTE"]),
    recurring: z.boolean().default(false),
})

type FormValues = z.infer<typeof formSchema>

const HOLIDAY_TYPES = [
    { value: "NACIONAL", label: "Nacional" },
    { value: "ESTADUAL", label: "Estadual" },
    { value: "MUNICIPAL", label: "Municipal" },
    { value: "PONTE", label: "Ponte" },
]

interface HolidayDialogProps {
    calendarId: string
    trigger?: React.ReactNode
}

export function HolidayDialog({ calendarId, trigger }: HolidayDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: "",
            date: "",
            type: "NACIONAL",
            recurring: false,
        },
    })

    useEffect(() => {
        if (open) {
            form.reset({
                name: "",
                date: "",
                type: "NACIONAL",
                recurring: false,
            })
        }
    }, [open, form])

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const result = await addHoliday({
                ...values,
                calendarId,
            })

            if (result.success) {
                toast({
                    title: "Feriado Adicionado",
                    description: `${values.name} foi adicionado ao calendario.`,
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
                    <Button size="sm" variant="outline">
                        <Plus className="mr-2 h-3.5 w-3.5" />
                        Adicionar Feriado
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>Adicionar Feriado</DialogTitle>
                    <DialogDescription>
                        Cadastre um novo feriado no calendario de trabalho.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome do Feriado *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Natal" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Data *</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
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
                                            {HOLIDAY_TYPES.map((type) => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
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
                            name="recurring"
                            render={({ field }) => (
                                <FormItem className="flex items-center gap-2 space-y-0">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormLabel className="cursor-pointer font-normal">
                                        Feriado recorrente (repete todo ano)
                                    </FormLabel>
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
                                Adicionar Feriado
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
