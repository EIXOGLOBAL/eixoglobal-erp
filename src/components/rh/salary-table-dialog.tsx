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
import { createSalaryTable, updateSalaryTable } from "@/app/actions/salary-table-actions"
import { Plus, Loader2 } from "lucide-react"

const formSchema = z.object({
    name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
    description: z.string().optional(),
    effectiveDate: z.string().min(1, "Data de vigência é obrigatória"),
    isActive: z.boolean().default(true),
})

type FormValues = z.infer<typeof formSchema>

interface SalaryTableDialogProps {
    companyId: string
    salaryTable?: {
        id: string
        name: string
        description: string | null
        effectiveDate: Date
        isActive: boolean
    }
    trigger?: React.ReactNode
}

export function SalaryTableDialog({ companyId, salaryTable, trigger }: SalaryTableDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: salaryTable?.name || "",
            description: salaryTable?.description || "",
            effectiveDate: salaryTable?.effectiveDate
                ? new Date(salaryTable.effectiveDate).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0],
            isActive: salaryTable?.isActive ?? true,
        },
    })

    useEffect(() => {
        if (open && salaryTable) {
            form.reset({
                name: salaryTable.name,
                description: salaryTable.description || "",
                effectiveDate: new Date(salaryTable.effectiveDate).toISOString().split('T')[0],
                isActive: salaryTable.isActive,
            })
        } else if (open && !salaryTable) {
            form.reset({
                name: "",
                description: "",
                effectiveDate: new Date().toISOString().split('T')[0],
                isActive: true,
            })
        }
    }, [open, salaryTable, form])

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const data = { ...values, companyId }
            const result = salaryTable
                ? await updateSalaryTable(salaryTable.id, data)
                : await createSalaryTable(data)

            if (result.success) {
                toast({
                    title: salaryTable ? "Tabela Atualizada" : "Tabela Criada",
                    description: `${values.name} foi ${salaryTable ? 'atualizada' : 'criada'} com sucesso.`,
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
                        Nova Tabela
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{salaryTable ? 'Editar Tabela Salarial' : 'Nova Tabela Salarial'}</DialogTitle>
                    <DialogDescription>
                        {salaryTable ? 'Atualize as informações da tabela salarial.' : 'Crie uma nova tabela salarial para sua empresa.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome da Tabela *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Tabela 2026 - Obra" {...field} />
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
                                        <Input placeholder="Descrição opcional" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="effectiveDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Data de Vigência *</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

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
                                    <FormLabel className="cursor-pointer font-normal">Tabela Ativa</FormLabel>
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
                                {salaryTable ? 'Atualizar' : 'Criar'} Tabela
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
