'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { createBudget } from "@/app/actions/budget-actions"

const formSchema = z.object({
    name: z.string().min(2, "Nome deve ter no minimo 2 caracteres"),
    code: z.string().optional(),
    description: z.string().optional(),
    projectId: z.string().min(1, "Selecione um projeto"),
})

type FormValues = z.infer<typeof formSchema>

export interface ProjectOption {
    id: string
    name: string
}

export function BudgetDialog({
    companyId,
    projects,
    open,
    onOpenChange,
}: {
    companyId: string
    projects: ProjectOption[]
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { name: "", code: "", description: "", projectId: "" },
    })

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const result = await createBudget({ ...values, companyId })
            if (result.success) {
                toast({ title: "Orcamento criado!", description: `${values.name} foi criado com sucesso.` })
                onOpenChange(false)
                form.reset()
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Novo Orcamento</DialogTitle>
                    <DialogDescription>
                        Crie um novo orcamento vinculado a um projeto.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Nome do Orcamento *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: Orcamento Fase 1 - Fundacao" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Codigo</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: ORC-001" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
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
                                                {projects.map((p) => (
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
                                name="description"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Descricao</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Descricao opcional do orcamento" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Criar Orcamento
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
