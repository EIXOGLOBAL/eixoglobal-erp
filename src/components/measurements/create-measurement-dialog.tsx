'use client'

import { useState, useEffect, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { createMeasurementAction } from "@/app/actions/measurement-actions"
import { getContractItems } from "@/app/actions/contract-actions"
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
    FormDescription,
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

const formSchema = z.object({
    projectId: z.string().min(1, "Selecione um projeto"),
    contractItemId: z.string().min(1, "Selecione um item"),
    quantity: z.number().min(0.01, "Quantidade deve ser maior que 0"),
    unitPrice: z.number().optional(),
    date: z.string(),
    description: z.string().optional(),
    employeeId: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface CreateMeasurementDialogProps {
    projects: { id: string; name: string }[]
    employees: { id: string; name: string }[]
}

export function CreateMeasurementDialog({ projects, employees }: CreateMeasurementDialogProps) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const { toast } = useToast()
    const [contractItems, setContractItems] = useState<any[]>([])
    const [loadingItems, setLoadingItems] = useState(false)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            projectId: "",
            contractItemId: "",
            quantity: 0,
            unitPrice: 0,
            date: new Date().toISOString().split('T')[0],
            description: "",
            employeeId: "",
        }
    })

    const selectedProjectId = form.watch("projectId")
    const selectedContractItemId = form.watch("contractItemId")
    const selectedItem = contractItems.find(item => item.id === selectedContractItemId)

    useEffect(() => {
        if (selectedProjectId) {
            setLoadingItems(true)
            getContractItems(selectedProjectId)
                .then(res => {
                    if (res?.success && res.data) {
                        setContractItems(res.data)
                    } else {
                        setContractItems([])
                    }
                })
                .catch(() => setContractItems([]))
                .finally(() => setLoadingItems(false))
        } else {
            setContractItems([])
        }
    }, [selectedProjectId])

    async function onSubmit(values: FormValues) {
        startTransition(async () => {
            const result = await createMeasurementAction(values)

            if (result?.success) {
                toast({
                    title: "Sucesso!",
                    description: "Medição registrada com sucesso.",
                })
                setOpen(false)
                form.reset()
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro",
                    description: result?.error || "Erro ao criar medição",
                })
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>+ Nova Medição</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Registrar Medição</DialogTitle>
                    <DialogDescription>
                        Registre a quantidade executada de um item contratual.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="projectId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Projeto</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o projeto" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {projects.map((project) => (
                                                <SelectItem key={project.id} value={project.id}>
                                                    {project.name}
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
                            name="contractItemId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Item do Contrato</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        disabled={!selectedProjectId || loadingItems}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={
                                                    !selectedProjectId ? "Selecione um projeto primeiro" :
                                                        loadingItems ? "Carregando itens..." :
                                                            contractItems.length === 0 ? "Nenhum item encontrado" :
                                                                "Selecione o item"
                                                } />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {contractItems.map((item) => (
                                                <SelectItem key={item.id} value={item.id}>
                                                    <span className="font-medium">{item.contractIdentifier}</span>: {item.description}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    {selectedItem && (
                                        <FormDescription className="flex items-center gap-2 text-xs">
                                            <Info className="h-3 w-3" />
                                            Unid: {selectedItem.unit} | Preço: {Number(selectedItem.unitPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </FormDescription>
                                    )}
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quantidade</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
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
                                name="unitPrice"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Preço Unitário (Opcional)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder={selectedItem ? Number(selectedItem.unitPrice).toFixed(2) : "0.00"}
                                                {...field}
                                                value={field.value || ''}
                                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Data da Medição</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="employeeId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Executor (Opcional)</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o executor" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {employees.map((employee) => (
                                                <SelectItem key={employee.id} value={employee.id}>
                                                    {employee.name}
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
                                <FormItem>
                                    <FormLabel>Observações (Opcional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Detalhes adicionais sobre a medição..."
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? "Salvando..." : "Salvar Medição"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
