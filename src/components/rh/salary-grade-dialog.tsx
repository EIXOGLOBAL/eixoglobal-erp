'use client'

import { useState, useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
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
import { useToast } from "@/hooks/use-toast"
import { createSalaryGrade, updateSalaryGrade } from "@/app/actions/salary-table-actions"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Plus, Loader2 } from "lucide-react"

const formSchema = z.object({
    jobTitle: z.string().min(2, "Cargo é obrigatório"),
    level: z.string().optional(),
    baseSalary: z.coerce.number().min(0, "Salário base inválido"),
    hoursPerMonth: z.coerce.number().min(1, "Horas/mês inválido").default(220),
    benefits: z.coerce.number().min(0).default(0),
    taxRate: z.coerce.number().min(0).max(100).default(0),
    tableId: z.string().uuid(),
})

type FormValues = z.infer<typeof formSchema>

interface SalaryGradeDialogProps {
    tableId: string
    grade?: {
        id: string
        jobTitle: string
        level: string | null
        baseSalary: number
        costPerHour: number
        hoursPerMonth: number
        benefits: number
        taxRate: number
    }
    trigger?: React.ReactNode
}

function CostPerHourPreview({ baseSalary, benefits, taxRate, hoursPerMonth }: {
    baseSalary: number
    benefits: number
    taxRate: number
    hoursPerMonth: number
}) {
    const costPerHour = hoursPerMonth > 0
        ? (baseSalary + benefits) * (1 + taxRate / 100) / hoursPerMonth
        : 0

    const fmt = (v: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

    return (
        <div className="rounded-md bg-muted p-3 text-sm">
            <p className="text-muted-foreground mb-1">Custo/Hora calculado automaticamente:</p>
            <p className="font-bold text-lg">{fmt(costPerHour)}<span className="text-xs font-normal text-muted-foreground">/h</span></p>
            <p className="text-xs text-muted-foreground mt-1">
                = (Salário + Benefícios) × (1 + Encargos%) / Horas/Mês
            </p>
        </div>
    )
}

function GradeFormWatcher({ control }: { control: any }) {
    const baseSalary = useWatch({ control, name: 'baseSalary' }) ?? 0
    const benefits = useWatch({ control, name: 'benefits' }) ?? 0
    const taxRate = useWatch({ control, name: 'taxRate' }) ?? 0
    const hoursPerMonth = useWatch({ control, name: 'hoursPerMonth' }) ?? 220

    return (
        <CostPerHourPreview
            baseSalary={Number(baseSalary)}
            benefits={Number(benefits)}
            taxRate={Number(taxRate)}
            hoursPerMonth={Number(hoursPerMonth)}
        />
    )
}

export function SalaryGradeDialog({ tableId, grade, trigger }: SalaryGradeDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            jobTitle: grade?.jobTitle || "",
            level: grade?.level || "",
            baseSalary: grade?.baseSalary ?? 0,
            hoursPerMonth: grade?.hoursPerMonth ?? 220,
            benefits: grade?.benefits ?? 0,
            taxRate: grade?.taxRate ?? 0,
            tableId,
        },
    })

    useEffect(() => {
        if (open && grade) {
            form.reset({
                jobTitle: grade.jobTitle,
                level: grade.level || "",
                baseSalary: grade.baseSalary,
                hoursPerMonth: grade.hoursPerMonth,
                benefits: grade.benefits,
                taxRate: grade.taxRate,
                tableId,
            })
        } else if (open && !grade) {
            form.reset({
                jobTitle: "",
                level: "",
                baseSalary: 0,
                hoursPerMonth: 220,
                benefits: 0,
                taxRate: 0,
                tableId,
            })
        }
    }, [open, grade, tableId, form])

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const result = grade
                ? await updateSalaryGrade(grade.id, values)
                : await createSalaryGrade(values)

            if (result.success) {
                toast({
                    title: grade ? "Grade Atualizado" : "Grade Criado",
                    description: `${values.jobTitle}${values.level ? ' – ' + values.level : ''} foi ${grade ? 'atualizado' : 'criado'} com sucesso.`,
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
                        Adicionar Grade
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>{grade ? 'Editar Grade Salarial' : 'Novo Grade Salarial'}</DialogTitle>
                    <DialogDescription>
                        {grade ? 'Atualize as informações do grade salarial.' : 'Cadastre um novo cargo/nível na tabela salarial.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="jobTitle"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cargo *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: Pedreiro" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="level"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nível</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: Júnior, Sênior" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="baseSalary"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Salário Base (R$) *</FormLabel>
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
                                name="hoursPerMonth"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Horas / Mês *</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="1"
                                                placeholder="220"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="benefits"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Benefícios Mensais (R$)</FormLabel>
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
                                name="taxRate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Encargos Trabalhistas (%)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <GradeFormWatcher control={form.control} />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {grade ? 'Atualizar' : 'Adicionar'} Grade
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
