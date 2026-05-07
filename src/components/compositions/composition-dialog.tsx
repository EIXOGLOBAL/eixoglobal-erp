'use client'
import { useRouter } from 'next/navigation'

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
    FormDescription,
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
import { createCostComposition, updateCostComposition } from "@/app/actions/cost-composition-actions"
import { Plus, Loader2 } from "lucide-react"

const formSchema = z.object({
    code: z.string().min(1, "Código é obrigatório"),
    description: z.string().min(3, "Descrição deve ter no mínimo 3 caracteres"),
    unit: z.string().min(1, "Selecione uma unidade"),
    bdi: z.number().min(0, "BDI não pode ser negativo").max(100, "BDI não pode ser maior que 100%"),
    projectId: z.string().optional().nullable(),
})

type FormValues = z.infer<typeof formSchema>

// Unidades comuns
const COMMON_UNITS = [
    { value: 'm²', label: 'm² - Metro quadrado' },
    { value: 'm³', label: 'm³ - Metro cúbico' },
    { value: 'm', label: 'm - Metro linear' },
    { value: 'un', label: 'un - Unidade' },
    { value: 'sc', label: 'sc - Saco' },
    { value: 'kg', label: 'kg - Quilograma' },
    { value: 't', label: 't - Tonelada' },
    { value: 'h', label: 'h - Hora' },
    { value: 'vb', label: 'vb - Verba' },
    { value: 'cj', label: 'cj - Conjunto' },
]

interface CompositionDialogProps {
    companyId: string
    projects: any[]
    composition?: any
    trigger?: React.ReactNode
}

export function CompositionDialog({
    companyId,
    projects,
    composition,
    trigger
}: CompositionDialogProps) {
  const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            code: composition?.code || "",
            description: composition?.description || "",
            unit: composition?.unit || "",
            bdi: composition?.bdi ? Number(composition.bdi) : 25,
            projectId: composition?.projectId || null,
        }
    })

    useEffect(() => {
        if (open && composition) {
            form.reset({
                code: composition.code,
                description: composition.description,
                unit: composition.unit,
                bdi: Number(composition.bdi),
                projectId: composition.projectId || null,
            })
        }
    }, [open, composition, form])

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            // Tratar "__GLOBAL__" como null
            const dataToSubmit = {
                ...values,
                projectId: values.projectId === "__GLOBAL__" ? null : values.projectId
            }

            const result = composition
                ? await updateCostComposition(composition.id, dataToSubmit)
                : await createCostComposition(dataToSubmit, companyId)

            if (result.success) {
                toast({
                    title: composition ? "Composição Atualizada" : "Composição Criada",
                    description: `${values.code} foi ${composition ? 'atualizada' : 'criada'} com sucesso.`,
                })
                setOpen(false)
                form.reset()
                router.refresh()
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
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Composição
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{composition ? 'Editar Composição' : 'Nova Composição'}</DialogTitle>
                    <DialogDescription>
                        {composition ? 'Atualize as informações da composição.' : 'Cadastre uma nova composição de custos.'}
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
                                            <Input placeholder="Ex: ALV-001" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="unit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Unidade *</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {COMMON_UNITS.map((unit) => (
                                                    <SelectItem key={unit.value} value={unit.value}>
                                                        {unit.label}
                                                    </SelectItem>
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
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição *</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Descreva a composição..."
                                            className="resize-none"
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
                                name="projectId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Projeto (Opcional)</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value || undefined}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Global" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="__GLOBAL__">Global (Todos)</SelectItem>
                                                {projects.map((project) => (
                                                    <SelectItem key={project.id} value={project.id}>
                                                        {project.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Deixe como Global para usar em todos os projetos
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="bdi"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>BDI (%) *</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="25.00"
                                                {...field}
                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Benefícios e Despesas Indiretas
                                        </FormDescription>
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
                                {composition ? 'Atualizar' : 'Criar'} Composição
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
